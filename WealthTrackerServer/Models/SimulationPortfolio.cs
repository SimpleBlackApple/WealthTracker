using System.ComponentModel.DataAnnotations.Schema;

namespace WealthTrackerServer.Models;

public class SimulationPortfolio
{
  public int Id { get; set; }
  public int UserId { get; set; }
  public required string Name { get; set; }
  public decimal InitialCash { get; set; }
  public decimal CurrentCash { get; set; }
  public DateTime CreatedAt { get; set; }
  public DateTime? LastTradeAt { get; set; }

  // Fee settings (JSON column)
  public string? FeeSettingsJson { get; set; }

  [NotMapped]
  public FeeSettings FeeSettings
  {
    get => FeeSettingsSerializer.Deserialize(FeeSettingsJson);
    set => FeeSettingsJson = FeeSettingsSerializer.Serialize(value);
  }

  // Navigation properties
  public User User { get; set; } = null!;
  public ICollection<SimulationPosition> Positions { get; set; } =
    new List<SimulationPosition>();
  public ICollection<SimulationTransaction> Transactions { get; set; } =
    new List<SimulationTransaction>();
  public ICollection<SimulationOrder> Orders { get; set; } =
    new List<SimulationOrder>();
}
