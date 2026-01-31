namespace WealthTrackerServer.Models;

public enum TransactionType
{
  Buy,
  Sell,
  Short,
  Cover
}

public enum OrderType
{
  Market,
  Limit,
  StopLoss
}

public enum TransactionStatus
{
  Pending,
  Executed,
  Cancelled,
  Failed
}

public class SimulationTransaction
{
  public int Id { get; set; }
  public int PortfolioId { get; set; }
  public required string Symbol { get; set; }
  public string? Exchange { get; set; }
  public TransactionType Type { get; set; }
  public OrderType OrderType { get; set; }
  public int Quantity { get; set; }
  public decimal Price { get; set; }

  // Fee breakdown
  public decimal Commission { get; set; }
  public decimal TAFFee { get; set; }
  public decimal SECFee { get; set; }
  public decimal LocateFee { get; set; }
  public decimal TotalFees { get; set; }

  // Total fee (kept for compatibility with earlier plan drafts)
  public decimal Fee { get; set; }

  // Net cash impact magnitude: buy/cover = cost (+fees), sell/short = proceeds (-fees)
  public decimal TotalAmount { get; set; }

  public TransactionStatus Status { get; set; }
  public DateTime CreatedAt { get; set; }
  public DateTime? ExecutedAt { get; set; }
  public string? Notes { get; set; }

  [System.Text.Json.Serialization.JsonIgnore]
  public SimulationPortfolio Portfolio { get; set; } = null!;
}
