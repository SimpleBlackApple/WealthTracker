using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace WealthTrackerServer.Migrations
{
    /// <inheritdoc />
    public partial class AddTransactionRealizedPL : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<decimal>(
                name: "RealizedPL",
                table: "SimulationTransactions",
                type: "numeric(18,4)",
                precision: 18,
                scale: 4,
                nullable: false,
                defaultValue: 0m);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "RealizedPL",
                table: "SimulationTransactions");
        }
    }
}
