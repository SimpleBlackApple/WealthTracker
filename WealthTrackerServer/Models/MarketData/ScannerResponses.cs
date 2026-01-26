using System.Text.Json.Serialization;

namespace WealthTrackerServer.Models.MarketData;

public class DayGainersResponse
{
    [JsonPropertyName("scanner")]
    public string Scanner { get; set; } = "day_gainers";

    [JsonPropertyName("sorted_by")]
    public string SortedBy { get; set; } = string.Empty;

    [JsonPropertyName("results")]
    public List<DayGainerRow> Results { get; set; } = [];
}

public class HodVwapMomentumResponse
{
    [JsonPropertyName("scanner")]
    public string Scanner { get; set; } = "hod_vwap_momentum";

    [JsonPropertyName("sorted_by")]
    public string SortedBy { get; set; } = string.Empty;

    [JsonPropertyName("results")]
    public List<IntradayMomentumRow> Results { get; set; } = [];
}

public class HodVwapApproachResponse
{
    [JsonPropertyName("scanner")]
    public string Scanner { get; set; } = "hod_vwap_approach";

    [JsonPropertyName("sorted_by")]
    public string SortedBy { get; set; } = string.Empty;

    [JsonPropertyName("results")]
    public List<HodVwapApproachRow> Results { get; set; } = [];
}

public class DayGainerRow
{
    [JsonPropertyName("symbol")]
    public string Symbol { get; set; } = string.Empty;

    [JsonPropertyName("exchange")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public string? Exchange { get; set; }

    [JsonPropertyName("price")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public double? Price { get; set; }

    [JsonPropertyName("prev_close")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public double? PrevClose { get; set; }

    [JsonPropertyName("change_pct")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public double? ChangePct { get; set; }

    [JsonPropertyName("volume")]
    public long Volume { get; set; }

    [JsonPropertyName("relative_volume")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public double? RelativeVolume { get; set; }

    [JsonPropertyName("float_shares")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public double? FloatShares { get; set; }

    [JsonPropertyName("market_cap")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public double? MarketCap { get; set; }
}

public class IntradayMomentumRow
{
    [JsonPropertyName("symbol")]
    public string Symbol { get; set; } = string.Empty;

    [JsonPropertyName("exchange")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public string? Exchange { get; set; }

    [JsonPropertyName("price")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public double? Price { get; set; }

    [JsonPropertyName("day_high")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public double? DayHigh { get; set; }

    [JsonPropertyName("day_low")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public double? DayLow { get; set; }

    [JsonPropertyName("last_bar_high")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public double? LastBarHigh { get; set; }

    [JsonPropertyName("range_pct")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public double? RangePct { get; set; }

    [JsonPropertyName("relative_volume")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public double? RelativeVolume { get; set; }

    [JsonPropertyName("price_change_pct")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public double? PriceChangePct { get; set; }

    [JsonPropertyName("avg_volume_20d")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public double? AvgVolume20d { get; set; }

    [JsonPropertyName("vwap")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public double? Vwap { get; set; }

    [JsonPropertyName("vwap_distance")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public double? VwapDistance { get; set; }

    [JsonPropertyName("distance_to_hod")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public double? DistanceToHod { get; set; }

    [JsonPropertyName("break_type")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public string? BreakType { get; set; }
}

public class HodVwapApproachRow
{
    [JsonPropertyName("symbol")]
    public string Symbol { get; set; } = string.Empty;

    [JsonPropertyName("exchange")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public string? Exchange { get; set; }

    [JsonPropertyName("price")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public double? Price { get; set; }

    [JsonPropertyName("hod")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public double? Hod { get; set; }

    [JsonPropertyName("distance_to_hod")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public double? DistanceToHod { get; set; }

    [JsonPropertyName("vwap")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public double? Vwap { get; set; }

    [JsonPropertyName("vwap_distance")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public double? VwapDistance { get; set; }

    [JsonPropertyName("range_pct")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public double? RangePct { get; set; }

    [JsonPropertyName("relative_volume")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public double? RelativeVolume { get; set; }
}
