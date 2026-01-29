using Microsoft.EntityFrameworkCore;
using WealthTrackerServer.Models;
using WealthTrackerServer.Services;

namespace WealthTrackerServer.Tests;

public class SimulationTradingServiceTests
{
  private static ApplicationDbContext CreateContext()
  {
    var options = new DbContextOptionsBuilder<ApplicationDbContext>()
      .UseInMemoryDatabase(Guid.NewGuid().ToString())
      .Options;
    return new ApplicationDbContext(options);
  }

  [Fact]
  public async Task GetUserPortfoliosAsync_CreatesDefaultPortfolio_WhenNoneExist()
  {
    using var context = CreateContext();
    context.Users.Add(new User
    {
      Id = 1,
      Name = "Test User",
      Email = "test@example.com",
      CreatedAt = DateTime.UtcNow
    });
    await context.SaveChangesAsync();

    var service = new SimulationTradingService(context);
    var portfolios = await service.GetUserPortfoliosAsync(1);

    Assert.Single(portfolios);
    Assert.Equal("My First Portfolio", portfolios[0].Name);
    Assert.Equal(100_000m, portfolios[0].InitialCash);
    Assert.Equal(100_000m, portfolios[0].CurrentCash);
  }

  [Fact]
  public async Task ExecuteTradeAsync_BuyAndSell_UpdatesCashAndRealizedPL_WhenZeroFees()
  {
    using var context = CreateContext();
    context.Users.Add(new User
    {
      Id = 1,
      Name = "Test User",
      Email = "test@example.com",
      CreatedAt = DateTime.UtcNow
    });
    await context.SaveChangesAsync();

    var portfolio = new SimulationPortfolio
    {
      UserId = 1,
      Name = "Test",
      InitialCash = 10_000m,
      CurrentCash = 10_000m,
      CreatedAt = DateTime.UtcNow,
      FeeSettingsJson = FeeSettingsSerializer.Serialize(new FeeSettings { Mode = FeeMode.ZeroFees })
    };
    context.SimulationPortfolios.Add(portfolio);
    await context.SaveChangesAsync();

    var service = new SimulationTradingService(context);

    var buy = await service.ExecuteTradeAsync(
      portfolio.Id,
      1,
      "AAPL",
      "NASDAQ",
      TransactionType.Buy,
      quantity: 10,
      price: 185.42m,
      orderType: OrderType.Market);

    Assert.Equal(TransactionStatus.Executed, buy.Status);

    var updatedPortfolio = await context.SimulationPortfolios
      .Include(p => p.Positions)
      .SingleAsync(p => p.Id == portfolio.Id);

    Assert.Equal(10_000m - (10 * 185.42m), updatedPortfolio.CurrentCash);
    Assert.Single(updatedPortfolio.Positions);
    var positionAfterBuy = updatedPortfolio.Positions.Single();
    Assert.Equal("AAPL", positionAfterBuy.Symbol);
    Assert.False(positionAfterBuy.IsShort);
    Assert.Equal(10, positionAfterBuy.Quantity);
    Assert.Equal(185.42m, positionAfterBuy.AverageCost);

    var sell = await service.ExecuteTradeAsync(
      portfolio.Id,
      1,
      "AAPL",
      "NASDAQ",
      TransactionType.Sell,
      quantity: 5,
      price: 186.00m,
      orderType: OrderType.Market);

    Assert.Equal(TransactionStatus.Executed, sell.Status);

    var afterSell = await context.SimulationPortfolios
      .Include(p => p.Positions)
      .SingleAsync(p => p.Id == portfolio.Id);

    Assert.Single(afterSell.Positions);
    var positionAfterSell = afterSell.Positions.Single();
    Assert.Equal(5, positionAfterSell.Quantity);

    var expectedCash = 10_000m - (10 * 185.42m) + (5 * 186.00m);
    Assert.Equal(expectedCash, afterSell.CurrentCash);

    var expectedRealized = 5 * (186.00m - 185.42m);
    Assert.Equal(expectedRealized, positionAfterSell.RealizedPL);
  }

  [Fact]
  public async Task ExecuteTradeAsync_LimitOrder_NotMarketable_CreatesOpenOrderAndPendingTransaction()
  {
    using var context = CreateContext();
    context.Users.Add(new User
    {
      Id = 1,
      Name = "Test User",
      Email = "test@example.com",
      CreatedAt = DateTime.UtcNow
    });
    await context.SaveChangesAsync();

    var portfolio = new SimulationPortfolio
    {
      UserId = 1,
      Name = "Test",
      InitialCash = 10_000m,
      CurrentCash = 10_000m,
      CreatedAt = DateTime.UtcNow
    };
    context.SimulationPortfolios.Add(portfolio);
    await context.SaveChangesAsync();

    var service = new SimulationTradingService(context);

    var pending = await service.ExecuteTradeAsync(
      portfolio.Id,
      1,
      "AAPL",
      "NASDAQ",
      TransactionType.Buy,
      quantity: 10,
      price: 100m,
      orderType: OrderType.Limit,
      limitPrice: 90m);

    Assert.Equal(TransactionStatus.Pending, pending.Status);

    var openOrders = await context.SimulationOrders.ToListAsync();
    Assert.Single(openOrders);
    Assert.Equal(OrderStatus.Open, openOrders[0].Status);
    Assert.Equal(90m, openOrders[0].LimitPrice);

    var transactions = await context.SimulationTransactions.ToListAsync();
    Assert.Single(transactions);
    Assert.Equal(TransactionStatus.Pending, transactions[0].Status);
  }
}
