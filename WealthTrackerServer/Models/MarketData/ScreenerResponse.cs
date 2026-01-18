namespace WealthTrackerServer.Models.MarketData;

public class ScreenerResponse
{
    public DateTimeOffset AsOf { get; set; }
    public List<ScreenerCandidate> Candidates { get; set; } = [];
}
