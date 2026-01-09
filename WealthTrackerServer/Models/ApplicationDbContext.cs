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
}