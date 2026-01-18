namespace WealthTrackerServer.Options;

public class MarketDataOptions
{
    public string BaseUrl { get; set; } = "http://localhost:8001";
    public int TimeoutSeconds { get; set; } = 15;
}
