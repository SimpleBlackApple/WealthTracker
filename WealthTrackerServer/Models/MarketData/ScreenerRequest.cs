using System.ComponentModel.DataAnnotations;

namespace WealthTrackerServer.Models.MarketData;

public class ScreenerRequest
{
    [Required]
    public string Type { get; set; } = "gappers";

    [Range(1, 500)]
    public int Limit { get; set; } = 100;

    [Range(0, double.MaxValue)]
    public double MinPrice { get; set; } = 1;

    [Range(0, int.MaxValue)]
    public int MinAvgVol { get; set; } = 1_000_000;

    public string Session { get; set; } = "regular";

    public DateTimeOffset? AsOf { get; set; }
}
