using WealthTrackerServer.Models;

namespace WealthTrackerServer.Services;

public class FeesBreakdown
{
  public decimal Commission { get; set; }
  public decimal TAFFee { get; set; }
  public decimal SECFee { get; set; }
  public decimal LocateFee { get; set; }
  public decimal TotalFees { get; set; }
}

public class SimulationFeeCalculator
{
  public FeesBreakdown CalculateFees(
    TransactionType type,
    int quantity,
    decimal executionPrice,
    OrderType orderType,
    decimal? limitPrice,
    decimal? stopPrice,
    string? exchange,
    FeeSettings settings)
  {
    if (settings.Mode == FeeMode.ZeroFees)
    {
      return new FeesBreakdown();
    }

    var useCommission = settings.EnableCommissions &&
      settings.Mode != FeeMode.CommissionFree;
    var useRegulatory = settings.EnableRegulatoryFees &&
      settings.Mode != FeeMode.ZeroFees;
    var useShortFees = settings.EnableShortFees &&
      settings.Mode != FeeMode.ZeroFees;

    var fees = new FeesBreakdown();

    if (useCommission)
    {
      fees.Commission = CalculateCommission(
        type,
        quantity,
        executionPrice,
        orderType,
        limitPrice,
        exchange,
        settings);
    }

    if (useRegulatory && (type == TransactionType.Sell || type == TransactionType.Short))
    {
      fees.TAFFee = quantity * settings.TAFFeePerShare;
      fees.SECFee = (quantity * executionPrice) * settings.SECFeeRate;
    }

    if (useShortFees && type == TransactionType.Short)
    {
      fees.LocateFee = quantity * settings.DefaultLocateFee;
    }

    fees.TotalFees = fees.Commission + fees.TAFFee + fees.SECFee + fees.LocateFee;
    return fees;
  }

  private static bool IsMajorExchange(string? exchange)
  {
    if (string.IsNullOrWhiteSpace(exchange)) return true;
    var normalized = exchange.Trim().ToUpperInvariant();
    return normalized.Contains("NASDAQ") ||
      normalized.Contains("NYSE") ||
      normalized.Contains("AMEX");
  }

  private static bool IsMarketableLimitOrder(
    TransactionType type,
    decimal executionPrice,
    decimal? limitPrice)
  {
    if (limitPrice == null) return false;

    // executionPrice is the current scanner price at order placement
    return type switch
    {
      TransactionType.Buy or TransactionType.Cover => limitPrice.Value >= executionPrice,
      TransactionType.Sell or TransactionType.Short => limitPrice.Value <= executionPrice,
      _ => false
    };
  }

  private static decimal CalculateCommission(
    TransactionType type,
    int quantity,
    decimal executionPrice,
    OrderType orderType,
    decimal? limitPrice,
    string? exchange,
    FeeSettings settings)
  {
    if (settings.Mode == FeeMode.Realistic)
    {
      var isMajor = IsMajorExchange(exchange);
      var isUnderOneDollar = executionPrice < 1m;
      var isMarketableLimit = orderType == OrderType.Limit &&
        IsMarketableLimitOrder(type, executionPrice, limitPrice);

      // In this simulation, we treat Market orders and marketable limits as "paid orders"
      // and non-marketable limits as "free" when criteria are met.
      var isPaidOrder = orderType == OrderType.Market ||
        orderType == OrderType.StopLoss ||
        isMarketableLimit;

      if (isUnderOneDollar || !isMajor)
      {
        var commission = quantity * settings.CommissionPerShare;
        commission = Math.Max(commission, settings.MinimumCommission);
        commission = Math.Min(commission, settings.MaximumCommission);
        return commission;
      }

      if (quantity < settings.FreeOrderMinShares)
      {
        return settings.MinimumCommission;
      }

      if (isPaidOrder)
      {
        var commission = quantity * settings.CommissionPerShare;
        commission = Math.Max(commission, settings.MinimumCommission);
        commission = Math.Min(commission, settings.MaximumCommission);
        return commission;
      }

      return 0m;
    }

    // Custom: per-share with min/max
    var customCommission = quantity * settings.CommissionPerShare;
    customCommission = Math.Max(customCommission, settings.MinimumCommission);
    customCommission = Math.Min(customCommission, settings.MaximumCommission);
    return customCommission;
  }
}
