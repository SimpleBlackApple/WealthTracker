namespace WealthTrackerServer.Models;

public class User
{
  public int Id { get; set; }
  public required string Name { get; set; }
  public required string Email { get; set; }
  public string? GoogleId { get; set; }
  public string? RefreshTokenHash { get; set; }
  public DateTime? RefreshTokenExpiry { get; set; }
  public DateTime CreatedAt { get; set; }
  public DateTime? LastLoginAt { get; set; }

  public ICollection<SimulationPortfolio> SimulationPortfolios { get; set; } =
    new List<SimulationPortfolio>();
}
