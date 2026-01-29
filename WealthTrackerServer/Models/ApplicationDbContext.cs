using Microsoft.EntityFrameworkCore;

namespace WealthTrackerServer.Models;

public class ApplicationDbContext : DbContext
{
  public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options)
    : base(options)
  {
  }

  // Define your DbSets (tables)
  public DbSet<User> Users { get; set; }
  public DbSet<SimulationPortfolio> SimulationPortfolios { get; set; }
  public DbSet<SimulationPosition> SimulationPositions { get; set; }
  public DbSet<SimulationTransaction> SimulationTransactions { get; set; }
  public DbSet<SimulationOrder> SimulationOrders { get; set; }

  protected override void OnModelCreating(ModelBuilder modelBuilder)
  {
    base.OnModelCreating(modelBuilder);

    modelBuilder.Entity<SimulationPortfolio>(entity =>
    {
      entity.Property(p => p.InitialCash).HasPrecision(18, 2);
      entity.Property(p => p.CurrentCash).HasPrecision(18, 2);
      entity.Property(p => p.FeeSettingsJson).HasColumnType("jsonb");

      entity.HasOne(p => p.User)
        .WithMany(u => u.SimulationPortfolios)
        .HasForeignKey(p => p.UserId)
        .OnDelete(DeleteBehavior.Cascade);

      entity.HasIndex(p => new { p.UserId, p.Name }).IsUnique(false);
    });

    modelBuilder.Entity<SimulationPosition>(entity =>
    {
      entity.Property(p => p.AverageCost).HasPrecision(18, 4);
      entity.Property(p => p.CurrentPrice).HasPrecision(18, 4);
      entity.Property(p => p.RealizedPL).HasPrecision(18, 4);
      entity.Property(p => p.BorrowCost).HasPrecision(18, 4);

      entity.HasOne(p => p.Portfolio)
        .WithMany(p => p.Positions)
        .HasForeignKey(p => p.PortfolioId)
        .OnDelete(DeleteBehavior.Cascade);

      entity.HasIndex(p => new { p.PortfolioId, p.Symbol }).IsUnique();
    });

    modelBuilder.Entity<SimulationTransaction>(entity =>
    {
      entity.Property(t => t.Price).HasPrecision(18, 4);
      entity.Property(t => t.Fee).HasPrecision(18, 4);
      entity.Property(t => t.Commission).HasPrecision(18, 4);
      entity.Property(t => t.TAFFee).HasPrecision(18, 6);
      entity.Property(t => t.SECFee).HasPrecision(18, 6);
      entity.Property(t => t.LocateFee).HasPrecision(18, 4);
      entity.Property(t => t.TotalFees).HasPrecision(18, 4);
      entity.Property(t => t.TotalAmount).HasPrecision(18, 4);

      entity.HasOne(t => t.Portfolio)
        .WithMany(p => p.Transactions)
        .HasForeignKey(t => t.PortfolioId)
        .OnDelete(DeleteBehavior.Cascade);

      entity.HasIndex(t => new { t.PortfolioId, t.CreatedAt });
    });

    modelBuilder.Entity<SimulationOrder>(entity =>
    {
      entity.Property(o => o.LimitPrice).HasPrecision(18, 4);
      entity.Property(o => o.StopPrice).HasPrecision(18, 4);

      entity.HasOne(o => o.Portfolio)
        .WithMany(p => p.Orders)
        .HasForeignKey(o => o.PortfolioId)
        .OnDelete(DeleteBehavior.Cascade);

      entity.HasOne(o => o.Transaction)
        .WithMany()
        .HasForeignKey(o => o.TransactionId)
        .OnDelete(DeleteBehavior.SetNull);

      entity.HasIndex(o => new { o.PortfolioId, o.Status });
    });
  }
}
