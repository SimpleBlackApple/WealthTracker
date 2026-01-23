using System.ComponentModel.DataAnnotations;

namespace WealthTrackerServer.Models.MarketData;

public class ScannerUniverseRequest
{
    [Range(1, 500)]
    public int UniverseLimit { get; set; } = 50;

    [Range(1, 200)]
    public int Limit { get; set; } = 25;

    [Range(0, double.MaxValue)]
    public double MinPrice { get; set; } = 1.5;

    [Range(0, double.MaxValue)]
    public double MaxPrice { get; set; } = 30.0;

    [Range(0, int.MaxValue)]
    public int MinAvgVol { get; set; } = 1_000_000;

    // Percent points (e.g. 3.0 == +3%).
    [Range(0, 1000)]
    public double MinChangePct { get; set; } = 3.0;

    public string Interval { get; set; } = "5m";
    public string Period { get; set; } = "1d";
    public bool Prepost { get; set; } = false;

    [Range(2, 30)]
    public int CloseSlopeN { get; set; } = 6;

    public DateTimeOffset? AsOf { get; set; }
}

public class DayGainersRequest : ScannerUniverseRequest
{
    [Range(0, long.MaxValue)]
    public long MinTodayVolume { get; set; } = 0;
}

public class HodVwapMomentumRequest : ScannerUniverseRequest
{
    [Range(0, long.MaxValue)]
    public long MinTodayVolume { get; set; } = 200_000;

    [Range(0, 100)]
    public double MinRelVol { get; set; } = 1.7;

    // Percent points (e.g. 1.0 == 1%).
    [Range(0, 100)]
    public double MaxDistToHod { get; set; } = 1.0;

    public bool RequireHodBreak { get; set; } = false;
    public bool RequireVwapBreak { get; set; } = false;
}

public class HodBreakoutsRequest : ScannerUniverseRequest
{
    [Range(0, long.MaxValue)]
    public long MinTodayVolume { get; set; } = 150_000;

    [Range(0, 100)]
    public double MinRelVol { get; set; } = 1.4;

    // Percent points (e.g. 1.0 == 1%).
    [Range(0, 100)]
    public double MaxDistToHod { get; set; } = 1.0;
}

public class VwapBreakoutsRequest : ScannerUniverseRequest
{
    [Range(0, long.MaxValue)]
    public long MinTodayVolume { get; set; } = 200_000;

    [Range(0, 100)]
    public double MinRelVol { get; set; } = 1.7;
}

public class VolumeSpikesRequest : ScannerUniverseRequest
{
    [Range(0, long.MaxValue)]
    public long MinTodayVolume { get; set; } = 200_000;

    [Range(0, 100)]
    public double MinRelVol { get; set; } = 2.0;
}

public class HodVwapApproachRequest : ScannerUniverseRequest
{
    [Range(0, double.MaxValue)]
    public double MinSetupPrice { get; set; } = 2.0;

    [Range(0, double.MaxValue)]
    public double MaxSetupPrice { get; set; } = 60.0;

    [Range(0, long.MaxValue)]
    public long MinTodayVolume { get; set; } = 200_000;

    // Percent points (e.g. 12.0 == 12%).
    [Range(0, 100)]
    public double MinRangePct { get; set; } = 7.0;

    [Range(0, 1)]
    public double MinPosInRange { get; set; } = 0.50;

    [Range(0, 1)]
    public double MaxPosInRange { get; set; } = 0.995;

    // Percent points (e.g. 1.0 == 1%).
    [Range(0, 100)]
    public double MaxAbsVwapDistance { get; set; } = 1.7;

    // Percent points (e.g. 2.0 == 2%).
    [Range(0, 100)]
    public double MaxDistToHod { get; set; } = 2.0;

    [Range(0, 100)]
    public double MinRelVol { get; set; } = 1.2;

    public bool AdaptiveThresholds { get; set; } = true;
}

public class HodApproachRequest : ScannerUniverseRequest
{
    [Range(0, double.MaxValue)]
    public double MinSetupPrice { get; set; } = 2.0;

    [Range(0, double.MaxValue)]
    public double MaxSetupPrice { get; set; } = 60.0;

    [Range(0, long.MaxValue)]
    public long MinTodayVolume { get; set; } = 200_000;

    // Percent points (e.g. 7.0 == 7%).
    [Range(0, 100)]
    public double MinRangePct { get; set; } = 7.0;

    [Range(0, 1)]
    public double MinPosInRange { get; set; } = 0.50;

    [Range(0, 1)]
    public double MaxPosInRange { get; set; } = 0.995;

    // Percent points (e.g. 2.0 == 2%).
    [Range(0, 100)]
    public double MaxDistToHod { get; set; } = 2.0;

    [Range(0, 100)]
    public double MinRelVol { get; set; } = 1.2;

    public bool AdaptiveThresholds { get; set; } = true;
}

public class VwapApproachRequest : ScannerUniverseRequest
{
    [Range(0, double.MaxValue)]
    public double MinSetupPrice { get; set; } = 2.0;

    [Range(0, double.MaxValue)]
    public double MaxSetupPrice { get; set; } = 60.0;

    [Range(0, long.MaxValue)]
    public long MinTodayVolume { get; set; } = 200_000;

    // Percent points (e.g. 7.0 == 7%).
    [Range(0, 100)]
    public double MinRangePct { get; set; } = 7.0;

    [Range(0, 1)]
    public double MinPosInRange { get; set; } = 0.50;

    [Range(0, 1)]
    public double MaxPosInRange { get; set; } = 0.995;

    // Percent points (e.g. 1.7 == 1.7%).
    [Range(0, 100)]
    public double MaxAbsVwapDistance { get; set; } = 1.7;

    [Range(0, 100)]
    public double MinRelVol { get; set; } = 1.2;

    public bool AdaptiveThresholds { get; set; } = true;
}
