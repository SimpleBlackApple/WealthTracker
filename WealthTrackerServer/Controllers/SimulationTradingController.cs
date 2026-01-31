using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using WealthTrackerServer.Models;
using WealthTrackerServer.Services;

namespace WealthTrackerServer.Controllers;

[ApiController]
[Route("api/simulation")]
[Authorize]
public class SimulationTradingController : ControllerBase
{
  private readonly ISimulationTradingService _tradingService;

  public SimulationTradingController(ISimulationTradingService tradingService)
  {
    _tradingService = tradingService;
  }

  [HttpPost("portfolios")]
  public async Task<ActionResult<SimulationPortfolioDto>> CreatePortfolio(
    [FromBody] CreatePortfolioRequest request)
  {
    var userId = GetUserId();
    try
    {
      var portfolio = await _tradingService.CreatePortfolioAsync(
        userId,
        request.Name,
        request.InitialCash);
      return Ok(ToDto(portfolio));
    }
    catch (InvalidOperationException ex)
    {
      return BadRequest(new { error = ex.Message });
    }
  }

  [HttpGet("portfolios")]
  public async Task<ActionResult<List<SimulationPortfolioDto>>> GetUserPortfolios()
  {
    var userId = GetUserId();
    var portfolios = await _tradingService.GetUserPortfoliosAsync(userId);
    return Ok(portfolios.Select(ToDto).ToList());
  }

  [HttpGet("portfolios/{id:int}")]
  public async Task<ActionResult<SimulationPortfolioDetailsDto>> GetPortfolio(int id)
  {
    var userId = GetUserId();
    var portfolio = await _tradingService.GetPortfolioAsync(id, userId);
    if (portfolio == null) return NotFound();

    return Ok(new SimulationPortfolioDetailsDto(
      ToDto(portfolio),
      portfolio.Positions.Select(ToDto).ToList()));
  }

  [HttpGet("portfolios/{id:int}/summary")]
  public async Task<ActionResult<PortfolioSummaryDto>> GetPortfolioSummary(int id)
  {
    var userId = GetUserId();
    try
    {
      var summary = await _tradingService.GetPortfolioSummaryAsync(id, userId);
      return Ok(ToDto(summary));
    }
    catch (InvalidOperationException ex)
    {
      return BadRequest(new { error = ex.Message });
    }
  }

  [HttpPost("portfolios/{id:int}/trades")]
  public async Task<ActionResult<SimulationTransactionDto>> ExecuteTrade(
    int id,
    [FromBody] ExecuteTradeRequest request)
  {
    var userId = GetUserId();
    try
    {
      var type = ParseTransactionType(request.Type);
      var orderType = ParseOrderType(request.OrderType);

      var transaction = await _tradingService.ExecuteTradeAsync(
        id,
        userId,
        request.Symbol,
        request.Exchange,
        type,
        request.Quantity,
        request.Price,
        orderType,
        request.LimitPrice,
        request.StopPrice);

      return Ok(ToDto(transaction));
    }
    catch (InvalidOperationException ex)
    {
      return BadRequest(new { error = ex.Message });
    }
  }

  [HttpGet("portfolios/{id:int}/transactions")]
  public async Task<ActionResult<List<SimulationTransactionDto>>> GetTransactions(
    int id,
    [FromQuery] int page = 1,
    [FromQuery] int pageSize = 50)
  {
    var userId = GetUserId();
    try
    {
      var transactions = await _tradingService.GetTransactionHistoryAsync(
        id,
        userId,
        page,
        pageSize);
      return Ok(transactions.Select(ToDto).ToList());
    }
    catch (InvalidOperationException ex)
    {
      return BadRequest(new { error = ex.Message });
    }
  }

  [HttpGet("portfolios/{id:int}/orders")]
  public async Task<ActionResult<List<SimulationOrderDto>>> GetOpenOrders(int id)
  {
    var userId = GetUserId();
    try
    {
      var orders = await _tradingService.GetOpenOrdersAsync(id, userId);
      return Ok(orders.Select(ToDto).ToList());
    }
    catch (InvalidOperationException ex)
    {
      return BadRequest(new { error = ex.Message });
    }
  }

  [HttpDelete("orders/{id:int}")]
  public async Task<IActionResult> CancelOrder(int id)
  {
    var userId = GetUserId();
    var cancelled = await _tradingService.CancelOrderAsync(id, userId);
    if (!cancelled) return NotFound();
    return Ok(new { success = true });
  }

  private int GetUserId()
  {
    var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
    if (!int.TryParse(userIdClaim, out var userId))
      throw new InvalidOperationException("Invalid token");
    return userId;
  }

  private static TransactionType ParseTransactionType(string type)
  {
    return type.Trim().ToLowerInvariant() switch
    {
      "buy" => TransactionType.Buy,
      "sell" => TransactionType.Sell,
      "short" => TransactionType.Short,
      "cover" => TransactionType.Cover,
      _ => throw new InvalidOperationException("Invalid transaction type")
    };
  }

  private static OrderType ParseOrderType(string type)
  {
    return type.Trim().ToLowerInvariant() switch
    {
      "market" => OrderType.Market,
      "limit" => OrderType.Limit,
      "stoploss" => OrderType.StopLoss,
      "stop_loss" => OrderType.StopLoss,
      "stop-loss" => OrderType.StopLoss,
      _ => throw new InvalidOperationException("Invalid order type")
    };
  }

  private static SimulationPortfolioDto ToDto(SimulationPortfolio p) =>
    new(
      p.Id,
      p.UserId,
      p.Name,
      p.InitialCash,
      p.CurrentCash,
      p.CreatedAt,
      p.LastTradeAt);

  private static SimulationPositionDto ToDto(SimulationPosition p) =>
    new(
      p.Id,
      p.PortfolioId,
      p.Symbol,
      p.Exchange,
      p.Quantity,
      p.IsShort,
      p.AverageCost,
      p.CurrentPrice,
      p.LastPriceUpdate,
      p.RealizedPL,
      p.BorrowCost ?? 0m,
      p.CreatedAt,
      p.UpdatedAt);

  private static SimulationTransactionDto ToDto(SimulationTransaction t) =>
    new(
      t.Id,
      t.PortfolioId,
      t.Symbol,
      t.Exchange,
      ToWire(t.Type),
      ToWire(t.OrderType),
      t.Quantity,
      t.Price,
      t.Fee,
      t.TotalAmount,
      ToWire(t.Status),
      t.CreatedAt,
      t.ExecutedAt,
      t.Notes,
      new FeesBreakdownDto(
        t.Commission,
        t.TAFFee,
        t.SECFee,
        t.LocateFee,
        t.TotalFees));

  private static SimulationOrderDto ToDto(SimulationOrder o) =>
    new(
      o.Id,
      o.PortfolioId,
      o.Symbol,
      o.Exchange,
      ToWire(o.Type),
      ToWire(o.OrderType),
      o.Quantity,
      o.LimitPrice,
      o.StopPrice,
      ToWire(o.Status),
      o.CreatedAt,
      o.ExpiresAt,
      o.FilledAt,
      o.TransactionId);

  private static PortfolioSummaryDto ToDto(PortfolioSummary s) =>
    new(
      s.TotalValue,
      s.Cash,
      s.EquityValue,
      s.TotalPL,
      s.TotalPLPercentage,
      s.TodayRealizedPL,
      s.Positions.Select(p => new PositionWithPLDto(
        p.PositionId,
        p.Symbol,
        p.Exchange,
        p.Quantity,
        p.IsShort,
        p.AverageCost,
        p.CurrentPrice,
        p.TotalCost,
        p.CurrentValue,
        p.UnrealizedPL,
        p.UnrealizedPLPercentage,
        p.RealizedPL,
        p.BorrowCost)).ToList());

  private static string ToWire(TransactionType t) =>
    t switch
    {
      TransactionType.Buy => "buy",
      TransactionType.Sell => "sell",
      TransactionType.Short => "short",
      TransactionType.Cover => "cover",
      _ => "buy"
    };

  private static string ToWire(OrderType t) =>
    t switch
    {
      OrderType.Market => "market",
      OrderType.Limit => "limit",
      OrderType.StopLoss => "stopLoss",
      _ => "market"
    };

  private static string ToWire(TransactionStatus s) =>
    s switch
    {
      TransactionStatus.Pending => "pending",
      TransactionStatus.Executed => "executed",
      TransactionStatus.Cancelled => "cancelled",
      TransactionStatus.Failed => "failed",
      _ => "executed"
    };

  private static string ToWire(OrderStatus s) =>
    s switch
    {
      OrderStatus.Open => "open",
      OrderStatus.Filled => "filled",
      OrderStatus.Cancelled => "cancelled",
      OrderStatus.Expired => "expired",
      _ => "open"
    };
}

public record CreatePortfolioRequest(string Name, decimal InitialCash);

public record ExecuteTradeRequest(
  string Symbol,
  string? Exchange,
  string Type,
  int Quantity,
  decimal Price,
  string OrderType,
  decimal? LimitPrice,
  decimal? StopPrice);

public record SimulationPortfolioDto(
  int Id,
  int UserId,
  string Name,
  decimal InitialCash,
  decimal CurrentCash,
  DateTime CreatedAt,
  DateTime? LastTradeAt);

public record SimulationPortfolioDetailsDto(
  SimulationPortfolioDto Portfolio,
  List<SimulationPositionDto> Positions);

public record SimulationPositionDto(
  int Id,
  int PortfolioId,
  string Symbol,
  string? Exchange,
  int Quantity,
  bool IsShort,
  decimal AverageCost,
  decimal? CurrentPrice,
  DateTime? LastPriceUpdate,
  decimal RealizedPL,
  decimal BorrowCost,
  DateTime CreatedAt,
  DateTime UpdatedAt);

public record FeesBreakdownDto(
  decimal Commission,
  decimal TAFFee,
  decimal SECFee,
  decimal LocateFee,
  decimal TotalFees);

public record SimulationTransactionDto(
  int Id,
  int PortfolioId,
  string Symbol,
  string? Exchange,
  string Type,
  string OrderType,
  int Quantity,
  decimal Price,
  decimal Fee,
  decimal TotalAmount,
  string Status,
  DateTime CreatedAt,
  DateTime? ExecutedAt,
  string? Notes,
  FeesBreakdownDto Fees);

public record SimulationOrderDto(
  int Id,
  int PortfolioId,
  string Symbol,
  string? Exchange,
  string Type,
  string OrderType,
  int Quantity,
  decimal? LimitPrice,
  decimal? StopPrice,
  string Status,
  DateTime CreatedAt,
  DateTime? ExpiresAt,
  DateTime? FilledAt,
  int? TransactionId);

public record PositionWithPLDto(
  int PositionId,
  string Symbol,
  string? Exchange,
  int Quantity,
  bool IsShort,
  decimal AverageCost,
  decimal? CurrentPrice,
  decimal TotalCost,
  decimal? CurrentValue,
  decimal? UnrealizedPL,
  decimal? UnrealizedPLPercentage,
  decimal RealizedPL,
  decimal BorrowCost);

public record PortfolioSummaryDto(
  decimal TotalValue,
  decimal Cash,
  decimal EquityValue,
  decimal TotalPL,
  decimal TotalPLPercentage,
  decimal TodayRealizedPL,
  List<PositionWithPLDto> Positions);
