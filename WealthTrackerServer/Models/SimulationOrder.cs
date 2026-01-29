namespace WealthTrackerServer.Models;

public enum OrderStatus
{
  Open,
  Filled,
  Cancelled,
  Expired
}

public class SimulationOrder
{
  public int Id { get; set; }
  public int PortfolioId { get; set; }
  public required string Symbol { get; set; }
  public string? Exchange { get; set; }
  public TransactionType Type { get; set; }
  public OrderType OrderType { get; set; }
  public int Quantity { get; set; }
  public decimal? LimitPrice { get; set; }
  public decimal? StopPrice { get; set; }
  public OrderStatus Status { get; set; }
  public DateTime CreatedAt { get; set; }
  public DateTime? ExpiresAt { get; set; }
  public DateTime? FilledAt { get; set; }
  public int? TransactionId { get; set; }

  public SimulationPortfolio Portfolio { get; set; } = null!;
  public SimulationTransaction? Transaction { get; set; }
}

