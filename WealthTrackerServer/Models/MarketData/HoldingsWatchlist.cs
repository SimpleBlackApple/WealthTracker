using System.Text.Json.Serialization;

namespace WealthTrackerServer.Models.MarketData;

public class HoldingsWatchlistRequest : ScannerUniverseRequest
{
    [JsonPropertyName("portfolioId")]
    public int? PortfolioId { get; set; }
}

public class HoldingsWatchlistResponse
{
    [JsonPropertyName("scanner")]
    public string Scanner { get; set; } = "holdings";

    [JsonPropertyName("asOf")]
    public DateTimeOffset? AsOf { get; set; }

    [JsonPropertyName("sorted_by")]
    public string SortedBy { get; set; } = string.Empty;

    [JsonPropertyName("results")]
    public List<HoldingRow> Results { get; set; } = [];

    [JsonPropertyName("cache")]
    public CacheInfo? Cache { get; set; }
}

public class HoldingRow
{
    [JsonPropertyName("symbol")]
    public string Symbol { get; set; } = string.Empty;

    [JsonPropertyName("exchange")]
    public string? Exchange { get; set; }

    [JsonPropertyName("price")]
    public double? Price { get; set; }

    [JsonPropertyName("quantity")]
    public int Quantity { get; set; }

    [JsonPropertyName("avg_cost")]
    public double AvgCost { get; set; }

    [JsonPropertyName("unrealized_pl")]
    public double? UnrealizedPL { get; set; }

    [JsonPropertyName("unrealized_pl_pct")]
    public double? UnrealizedPLPct { get; set; }

    [JsonPropertyName("realized_pl")]
    public double RealizedPL { get; set; }

    [JsonPropertyName("is_short")]
    public bool IsShort { get; set; }
}

