using System.Text.Json.Serialization;

namespace WealthTrackerServer.Models.MarketData;

public class QuotesRequest
{
    [JsonPropertyName("tickers")]
    public List<string> Tickers { get; set; } = [];

    [JsonPropertyName("interval")]
    public string Interval { get; set; } = "1m";

    [JsonPropertyName("period")]
    public string Period { get; set; } = "1d";

    [JsonPropertyName("prepost")]
    public bool Prepost { get; set; } = false;
}

public class QuotesResponse
{
    [JsonPropertyName("asOf")]
    public DateTimeOffset? AsOf { get; set; }

    [JsonPropertyName("results")]
    public List<QuoteRow> Results { get; set; } = [];

    [JsonPropertyName("cache")]
    public CacheInfo? Cache { get; set; }
}

public class QuoteRow
{
    [JsonPropertyName("symbol")]
    public string Symbol { get; set; } = string.Empty;

    [JsonPropertyName("price")]
    public double? Price { get; set; }
}

