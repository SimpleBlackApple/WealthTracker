using Microsoft.EntityFrameworkCore;
using WealthTrackerServer.Models;

namespace WealthTrackerServer.Services;

public class SimulationTradingService : ISimulationTradingService
{
  private readonly ApplicationDbContext _context;
  private readonly SimulationFeeCalculator _feeCalculator;

  public SimulationTradingService(ApplicationDbContext context)
  {
    _context = context;
    _feeCalculator = new SimulationFeeCalculator();
  }

  public async Task<SimulationPortfolio> CreatePortfolioAsync(
    int userId,
    string name,
    decimal initialCash)
  {
    if (string.IsNullOrWhiteSpace(name))
      throw new InvalidOperationException("Portfolio name is required");
    if (initialCash <= 0)
      throw new InvalidOperationException("Initial cash must be greater than 0");

    var portfolio = new SimulationPortfolio
    {
      UserId = userId,
      Name = name.Trim(),
      InitialCash = initialCash,
      CurrentCash = initialCash,
      CreatedAt = DateTime.UtcNow,
      FeeSettingsJson = FeeSettingsSerializer.Serialize(new FeeSettings())
    };

    _context.SimulationPortfolios.Add(portfolio);
    await _context.SaveChangesAsync();
    return portfolio;
  }

  public async Task<SimulationPortfolio?> GetPortfolioAsync(int portfolioId, int userId)
  {
    return await _context.SimulationPortfolios
      .Include(p => p.Positions)
      .AsNoTracking()
      .FirstOrDefaultAsync(p => p.Id == portfolioId && p.UserId == userId);
  }

  public async Task<List<SimulationPortfolio>> GetUserPortfoliosAsync(int userId)
  {
    var portfolios = await _context.SimulationPortfolios
      .Where(p => p.UserId == userId)
      .OrderBy(p => p.CreatedAt)
      .AsNoTracking()
      .ToListAsync();

    if (portfolios.Count > 0) return portfolios;

    // Auto-create a default portfolio for first-time users (per plan).
    var defaultPortfolio = new SimulationPortfolio
    {
      UserId = userId,
      Name = "My First Portfolio",
      InitialCash = 100_000m,
      CurrentCash = 100_000m,
      CreatedAt = DateTime.UtcNow,
      FeeSettingsJson = FeeSettingsSerializer.Serialize(new FeeSettings())
    };

    _context.SimulationPortfolios.Add(defaultPortfolio);
    await _context.SaveChangesAsync();

    return new List<SimulationPortfolio> { defaultPortfolio };
  }

  public async Task<SimulationTransaction> ExecuteTradeAsync(
    int portfolioId,
    int userId,
    string symbol,
    string? exchange,
    TransactionType type,
    int quantity,
    decimal price,
    OrderType orderType,
    decimal? limitPrice = null,
    decimal? stopPrice = null)
  {
    if (string.IsNullOrWhiteSpace(symbol))
      throw new InvalidOperationException("Symbol is required");
    if (quantity <= 0)
      throw new InvalidOperationException("Quantity must be greater than 0");
    if (price <= 0)
      throw new InvalidOperationException("Price must be greater than 0");

    var now = DateTime.UtcNow;

    var portfolio = await _context.SimulationPortfolios
      .Include(p => p.Positions)
      .FirstOrDefaultAsync(p => p.Id == portfolioId && p.UserId == userId);

    if (portfolio == null)
      throw new InvalidOperationException("Portfolio not found");

    var normalizedSymbol = symbol.Trim().ToUpperInvariant();

    AccrueBorrowCosts(portfolio, now);

    var longPosition = portfolio.Positions
      .FirstOrDefault(p => p.Symbol == normalizedSymbol && !p.IsShort);
    var shortPosition = portfolio.Positions
      .FirstOrDefault(p => p.Symbol == normalizedSymbol && p.IsShort);

    if (type == TransactionType.Buy && shortPosition != null)
      throw new InvalidOperationException("Cannot buy while short. Use cover.");
    if (type == TransactionType.Sell && longPosition == null)
      throw new InvalidOperationException("No long position to sell");
    if (type == TransactionType.Short && longPosition != null)
      throw new InvalidOperationException("Cannot short while long. Sell first.");
    if (type == TransactionType.Cover && shortPosition == null)
      throw new InvalidOperationException("No short position to cover");

    if (orderType == OrderType.Limit && limitPrice == null)
      throw new InvalidOperationException("Limit price is required for limit orders");
    if (orderType == OrderType.StopLoss && stopPrice == null)
      throw new InvalidOperationException("Stop price is required for stop-loss orders");

    var shouldExecuteNow = ShouldExecuteNow(type, orderType, price, limitPrice, stopPrice);

    if (!shouldExecuteNow)
    {
      var pendingTransaction = new SimulationTransaction
      {
        PortfolioId = portfolio.Id,
        Symbol = normalizedSymbol,
        Exchange = exchange,
        Type = type,
        OrderType = orderType,
        Quantity = quantity,
        Price = price,
        Status = TransactionStatus.Pending,
        CreatedAt = now,
        Notes = "Order placed (not auto-executed in MVP)"
      };

      var order = new SimulationOrder
      {
        PortfolioId = portfolio.Id,
        Symbol = normalizedSymbol,
        Exchange = exchange,
        Type = type,
        OrderType = orderType,
        Quantity = quantity,
        LimitPrice = limitPrice,
        StopPrice = stopPrice,
        Status = OrderStatus.Open,
        CreatedAt = now,
        Transaction = pendingTransaction
      };

      _context.SimulationTransactions.Add(pendingTransaction);
      _context.SimulationOrders.Add(order);
      await _context.SaveChangesAsync();
      return pendingTransaction;
    }

    var settings = portfolio.FeeSettings;
    var fees = _feeCalculator.CalculateFees(
      type,
      quantity,
      price,
      orderType,
      limitPrice,
      stopPrice,
      exchange,
      settings);

    var totalFees = fees.TotalFees;

    var transaction = new SimulationTransaction
    {
      PortfolioId = portfolio.Id,
      Symbol = normalizedSymbol,
      Exchange = exchange,
      Type = type,
      OrderType = orderType,
      Quantity = quantity,
      Price = price,
      Commission = fees.Commission,
      TAFFee = fees.TAFFee,
      SECFee = fees.SECFee,
      LocateFee = fees.LocateFee,
      TotalFees = totalFees,
      Fee = totalFees,
      Status = TransactionStatus.Executed,
      CreatedAt = now,
      ExecutedAt = now
    };

    ApplyTrade(portfolio, longPosition, shortPosition, transaction, totalFees, now);

    portfolio.LastTradeAt = now;
    await _context.SaveChangesAsync();
    return transaction;
  }

  public async Task<List<SimulationTransaction>> GetTransactionHistoryAsync(
    int portfolioId,
    int userId,
    int page = 1,
    int pageSize = 50)
  {
    if (page <= 0) page = 1;
    if (pageSize <= 0) pageSize = 50;

    var ownsPortfolio = await _context.SimulationPortfolios
      .AnyAsync(p => p.Id == portfolioId && p.UserId == userId);

    if (!ownsPortfolio)
      throw new InvalidOperationException("Portfolio not found");

    return await _context.SimulationTransactions
      .Where(t => t.PortfolioId == portfolioId)
      .OrderByDescending(t => t.CreatedAt)
      .Skip((page - 1) * pageSize)
      .Take(pageSize)
      .AsNoTracking()
      .ToListAsync();
  }

  public async Task<List<SimulationOrder>> GetOpenOrdersAsync(int portfolioId, int userId)
  {
    var ownsPortfolio = await _context.SimulationPortfolios
      .AnyAsync(p => p.Id == portfolioId && p.UserId == userId);

    if (!ownsPortfolio)
      throw new InvalidOperationException("Portfolio not found");

    return await _context.SimulationOrders
      .Where(o => o.PortfolioId == portfolioId && o.Status == OrderStatus.Open)
      .OrderByDescending(o => o.CreatedAt)
      .AsNoTracking()
      .ToListAsync();
  }

  public async Task<bool> CancelOrderAsync(int orderId, int userId)
  {
    var order = await _context.SimulationOrders
      .Include(o => o.Portfolio)
      .Include(o => o.Transaction)
      .FirstOrDefaultAsync(o => o.Id == orderId);

    if (order == null) return false;
    if (order.Portfolio.UserId != userId) return false;
    if (order.Status != OrderStatus.Open) return false;

    order.Status = OrderStatus.Cancelled;
    if (order.Transaction != null)
    {
      order.Transaction.Status = TransactionStatus.Cancelled;
      order.Transaction.Notes = "Order cancelled";
    }

    await _context.SaveChangesAsync();
    return true;
  }

  public async Task<PortfolioSummary> GetPortfolioSummaryAsync(int portfolioId, int userId)
  {
    var portfolio = await _context.SimulationPortfolios
      .Include(p => p.Positions)
      .FirstOrDefaultAsync(p => p.Id == portfolioId && p.UserId == userId);

    if (portfolio == null)
      throw new InvalidOperationException("Portfolio not found");

    AccrueBorrowCosts(portfolio, DateTime.UtcNow);
    await _context.SaveChangesAsync();

    var summary = new PortfolioSummary
    {
      Cash = portfolio.CurrentCash
    };

    var positions = portfolio.Positions
      .OrderByDescending(p => p.UpdatedAt)
      .ThenBy(p => p.Symbol)
      .ToList();

    decimal equityValue = 0m;
    decimal totalRealized = 0m;
    decimal totalUnrealized = 0m;

    foreach (var position in positions)
    {
      var currentPrice = position.CurrentPrice;
      var positionValue = currentPrice == null
        ? (decimal?)null
        : (position.IsShort ? -1m : 1m) * position.Quantity * currentPrice.Value;

      var totalCost = (position.IsShort ? -1m : 1m) * position.Quantity * position.AverageCost;

      decimal? unrealized = null;
      decimal? unrealizedPct = null;
      if (currentPrice != null)
      {
        unrealized = position.IsShort
          ? (position.AverageCost - currentPrice.Value) * position.Quantity
          : (currentPrice.Value - position.AverageCost) * position.Quantity;
        unrealizedPct = totalCost == 0m ? null : unrealized / Math.Abs(totalCost);
      }

      if (positionValue != null) equityValue += positionValue.Value;
      totalRealized += position.RealizedPL;
      totalUnrealized += unrealized ?? 0m;

      summary.Positions.Add(new PositionWithPL
      {
        PositionId = position.Id,
        Symbol = position.Symbol,
        Exchange = position.Exchange,
        Quantity = position.Quantity,
        IsShort = position.IsShort,
        AverageCost = position.AverageCost,
        CurrentPrice = position.CurrentPrice,
        TotalCost = Math.Abs(totalCost),
        CurrentValue = positionValue == null ? null : Math.Abs(positionValue.Value),
        UnrealizedPL = unrealized,
        UnrealizedPLPercentage = unrealizedPct,
        RealizedPL = position.RealizedPL,
        BorrowCost = position.BorrowCost ?? 0m
      });
    }

    summary.EquityValue = equityValue;
    summary.TotalValue = summary.Cash + summary.EquityValue;
    summary.TotalPL = totalRealized + totalUnrealized;
    summary.TotalPLPercentage =
      portfolio.InitialCash == 0m ? 0m : summary.TotalPL / portfolio.InitialCash;

    return summary;
  }

  private static void AccrueBorrowCosts(SimulationPortfolio portfolio, DateTime now)
  {
    var settings = portfolio.FeeSettings;
    if (settings.Mode == FeeMode.ZeroFees) return;
    if (!settings.EnableShortFees) return;
    if (settings.OvernightBorrowRate <= 0m) return;

    foreach (var position in portfolio.Positions.Where(p => p.IsShort && p.Quantity > 0))
    {
      var notionalPrice = position.CurrentPrice ?? position.AverageCost;
      if (notionalPrice <= 0m) continue;

      var elapsed = now - position.UpdatedAt;
      if (elapsed.TotalHours < 1) continue;

      var days = (decimal)elapsed.TotalDays;
      var notional = position.Quantity * notionalPrice;
      var cost = notional * settings.OvernightBorrowRate * (days / 365m);

      if (cost <= 0m) continue;

      portfolio.CurrentCash -= cost;
      position.BorrowCost = (position.BorrowCost ?? 0m) + cost;
      position.RealizedPL -= cost;
      position.UpdatedAt = now;
    }
  }

  private static bool ShouldExecuteNow(
    TransactionType type,
    OrderType orderType,
    decimal currentPrice,
    decimal? limitPrice,
    decimal? stopPrice)
  {
    return orderType switch
    {
      OrderType.Market => true,
      OrderType.Limit => limitPrice != null && IsMarketableLimit(type, currentPrice, limitPrice.Value),
      OrderType.StopLoss => stopPrice != null && IsTriggeredStop(type, currentPrice, stopPrice.Value),
      _ => true
    };
  }

  private static bool IsMarketableLimit(TransactionType type, decimal currentPrice, decimal limitPrice)
  {
    return type switch
    {
      TransactionType.Buy or TransactionType.Cover => limitPrice >= currentPrice,
      TransactionType.Sell or TransactionType.Short => limitPrice <= currentPrice,
      _ => false
    };
  }

  private static bool IsTriggeredStop(TransactionType type, decimal currentPrice, decimal stopPrice)
  {
    // stop loss is generally used for sells/cover; we treat both as market orders when triggered
    return type switch
    {
      TransactionType.Sell => currentPrice <= stopPrice,
      TransactionType.Cover => currentPrice >= stopPrice,
      TransactionType.Short => currentPrice >= stopPrice,
      TransactionType.Buy => currentPrice <= stopPrice,
      _ => false
    };
  }

  private void ApplyTrade(
    SimulationPortfolio portfolio,
    SimulationPosition? longPosition,
    SimulationPosition? shortPosition,
    SimulationTransaction transaction,
    decimal totalFees,
    DateTime now)
  {
    var notional = transaction.Quantity * transaction.Price;

    switch (transaction.Type)
    {
      case TransactionType.Buy:
        {
          var cost = notional + totalFees;
          if (portfolio.CurrentCash < cost)
            throw new InvalidOperationException("Insufficient cash balance");

          portfolio.CurrentCash -= cost;
          transaction.TotalAmount = cost;

          if (longPosition == null)
          {
            longPosition = new SimulationPosition
            {
              PortfolioId = portfolio.Id,
              Symbol = transaction.Symbol,
              Exchange = transaction.Exchange,
              Quantity = transaction.Quantity,
              AverageCost = transaction.Price,
              CurrentPrice = transaction.Price,
              LastPriceUpdate = now,
              RealizedPL = 0m,
              IsShort = false,
              BorrowCost = 0m,
              CreatedAt = now,
              UpdatedAt = now
            };
            portfolio.Positions.Add(longPosition);
          }
          else
          {
            var totalQty = longPosition.Quantity + transaction.Quantity;
            var newAvg = ((longPosition.AverageCost * longPosition.Quantity) +
                (transaction.Price * transaction.Quantity)) /
              totalQty;

            longPosition.Quantity = totalQty;
            longPosition.AverageCost = newAvg;
            longPosition.CurrentPrice = transaction.Price;
            longPosition.LastPriceUpdate = now;
            longPosition.UpdatedAt = now;
          }

          break;
        }
      case TransactionType.Sell:
        {
          if (longPosition == null || longPosition.Quantity < transaction.Quantity)
            throw new InvalidOperationException("Insufficient shares to sell");

          var proceeds = notional - totalFees;
          portfolio.CurrentCash += proceeds;
          transaction.TotalAmount = proceeds;

          var realized = (transaction.Price - longPosition.AverageCost) *
            transaction.Quantity - totalFees;
          longPosition.RealizedPL += realized;
          longPosition.Quantity -= transaction.Quantity;
          longPosition.CurrentPrice = transaction.Price;
          longPosition.LastPriceUpdate = now;
          longPosition.UpdatedAt = now;

          if (longPosition.Quantity == 0)
          {
            portfolio.Positions.Remove(longPosition);
            _context.SimulationPositions.Remove(longPosition);
          }

          break;
        }
      case TransactionType.Short:
        {
          // Require 50% additional cash margin (150% total collateral including proceeds).
          var marginRequirement = (notional * 0.5m) + totalFees;
          if (portfolio.CurrentCash < marginRequirement)
            throw new InvalidOperationException("Insufficient cash collateral for short");

          var proceeds = notional - totalFees;
          portfolio.CurrentCash += proceeds;
          transaction.TotalAmount = proceeds;

          if (shortPosition == null)
          {
            shortPosition = new SimulationPosition
            {
              PortfolioId = portfolio.Id,
              Symbol = transaction.Symbol,
              Exchange = transaction.Exchange,
              Quantity = transaction.Quantity,
              AverageCost = transaction.Price,
              CurrentPrice = transaction.Price,
              LastPriceUpdate = now,
              RealizedPL = 0m,
              IsShort = true,
              BorrowCost = 0m,
              CreatedAt = now,
              UpdatedAt = now
            };
            portfolio.Positions.Add(shortPosition);
          }
          else
          {
            var totalQty = shortPosition.Quantity + transaction.Quantity;
            var newAvg = ((shortPosition.AverageCost * shortPosition.Quantity) +
                (transaction.Price * transaction.Quantity)) /
              totalQty;

            shortPosition.Quantity = totalQty;
            shortPosition.AverageCost = newAvg;
            shortPosition.CurrentPrice = transaction.Price;
            shortPosition.LastPriceUpdate = now;
            shortPosition.UpdatedAt = now;
          }

          break;
        }
      case TransactionType.Cover:
        {
          if (shortPosition == null || shortPosition.Quantity < transaction.Quantity)
            throw new InvalidOperationException("Insufficient shares to cover");

          var cost = notional + totalFees;
          if (portfolio.CurrentCash < cost)
            throw new InvalidOperationException("Insufficient cash balance");

          portfolio.CurrentCash -= cost;
          transaction.TotalAmount = cost;

          var realized = (shortPosition.AverageCost - transaction.Price) *
            transaction.Quantity - totalFees;
          shortPosition.RealizedPL += realized;
          shortPosition.Quantity -= transaction.Quantity;
          shortPosition.CurrentPrice = transaction.Price;
          shortPosition.LastPriceUpdate = now;
          shortPosition.UpdatedAt = now;

          if (shortPosition.Quantity == 0)
          {
            portfolio.Positions.Remove(shortPosition);
            _context.SimulationPositions.Remove(shortPosition);
          }

          break;
        }
      default:
        throw new InvalidOperationException("Unsupported transaction type");
    }

    _context.SimulationTransactions.Add(transaction);
  }
}
