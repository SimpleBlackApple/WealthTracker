namespace WealthTrackerServer.Models.MarketData;

public class ScreenerCandidate
{
    public string Ticker { get; set; } = string.Empty;
    public double? Last { get; set; }
    public double? Open { get; set; }
    public double? PrevClose { get; set; }
    public double? GapPct { get; set; }
    public long? Volume { get; set; }
}
