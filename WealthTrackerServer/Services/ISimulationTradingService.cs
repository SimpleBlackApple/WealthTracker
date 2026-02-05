using WealthTrackerServer.Models;

namespace WealthTrackerServer.Services;

public interface ISimulationTradingService
{
  Task<SimulationPortfolio> CreatePortfolioAsync(
    int userId,
    string name,
    decimal initialCash);

  Task<SimulationPortfolio?> GetPortfolioAsync(int portfolioId, int userId);

  Task<List<SimulationPortfolio>> GetUserPortfoliosAsync(int userId);

  Task<SimulationTransaction> ExecuteTradeAsync(
    int portfolioId,
    int userId,
    string symbol,
    string? exchange,
    TransactionType type,
    int quantity,
    decimal price,
    OrderType orderType,
    decimal? limitPrice = null,
    decimal? stopPrice = null);

  Task<List<SimulationTransaction>> GetTransactionHistoryAsync(
    int portfolioId,
    int userId,
    int page = 1,
    int pageSize = 50);

  Task<List<SimulationOrder>> GetOpenOrdersAsync(int portfolioId, int userId);

  Task<bool> CancelOrderAsync(int orderId, int userId);

  Task<PortfolioSummary> GetPortfolioSummaryAsync(
    int portfolioId,
    int userId,
    bool refreshMarketPrices = true);
}

public class PortfolioSummary
{
  public decimal TotalValue { get; set; }
  public decimal Cash { get; set; }
  public decimal EquityValue { get; set; }
  public decimal TotalPL { get; set; }
  public decimal TotalPLPercentage { get; set; }
  public decimal TodayRealizedPL { get; set; }
  public List<PositionWithPL> Positions { get; set; } = new();
}

public class PositionWithPL
{
  public int PositionId { get; set; }
  public string Symbol { get; set; } = string.Empty;
  public string? Exchange { get; set; }
  public int Quantity { get; set; }
  public bool IsShort { get; set; }
  public decimal AverageCost { get; set; }
  public decimal? CurrentPrice { get; set; }
  public decimal TotalCost { get; set; }
  public decimal? CurrentValue { get; set; }
  public decimal? UnrealizedPL { get; set; }
  public decimal? UnrealizedPLPercentage { get; set; }
  public decimal RealizedPL { get; set; }
  public decimal BorrowCost { get; set; }
}
