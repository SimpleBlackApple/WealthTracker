using System.Text.Json;
using System.Text.Json.Serialization;

namespace WealthTrackerServer.Models;

public enum FeeMode
{
  Realistic,
  CommissionFree,
  ZeroFees,
  Custom
}

public class FeeSettings
{
  public FeeMode Mode { get; set; } = FeeMode.Realistic;

  // Commission settings
  public bool EnableCommissions { get; set; } = true;
  public decimal CommissionPerShare { get; set; } = 0.005m;
  public decimal MinimumCommission { get; set; } = 0.99m;
  public decimal MaximumCommission { get; set; } = 7.95m;
  public int FreeOrderMinShares { get; set; } = 200;

  // Regulatory fees
  public bool EnableRegulatoryFees { get; set; } = true;
  public decimal TAFFeePerShare { get; set; } = 0.000166m;
  public decimal SECFeeRate { get; set; } = 0.0000278m;

  // Short selling fees
  public bool EnableShortFees { get; set; } = true;
  public decimal DefaultLocateFee { get; set; } = 0.01m;
  public decimal OvernightBorrowRate { get; set; } = 0.10m;

  // Other fees (not used in MVP)
  public decimal AssistedTradeFee { get; set; } = 30m;
  public decimal RiskSelloutFee { get; set; } = 50m;
}

public static class FeeSettingsSerializer
{
  private static readonly JsonSerializerOptions Options = new()
  {
    PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
    Converters = { new JsonStringEnumConverter(JsonNamingPolicy.CamelCase) }
  };

  public static string Serialize(FeeSettings settings) =>
    JsonSerializer.Serialize(settings, Options);

  public static FeeSettings Deserialize(string? json)
  {
    if (string.IsNullOrWhiteSpace(json)) return new FeeSettings();
    return JsonSerializer.Deserialize<FeeSettings>(json, Options) ??
      new FeeSettings();
  }
}
