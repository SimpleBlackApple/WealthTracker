namespace WealthTrackerServer.Models;

public class SimulationPosition
{
  public int Id { get; set; }
  public int PortfolioId { get; set; }
  public required string Symbol { get; set; }
  public string? Exchange { get; set; }
  public int Quantity { get; set; }
  public decimal AverageCost { get; set; }
  public decimal? CurrentPrice { get; set; }
  public DateTime? LastPriceUpdate { get; set; }
  public decimal RealizedPL { get; set; }
  public bool IsShort { get; set; }
  public decimal? BorrowCost { get; set; }
  public DateTime CreatedAt { get; set; }
  public DateTime UpdatedAt { get; set; }

  public SimulationPortfolio Portfolio { get; set; } = null!;
}

