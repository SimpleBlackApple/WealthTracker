using WealthTrackerServer.Models.MarketData;

namespace WealthTrackerServer.Services;

public interface IMarketDataClient
{
    Task<DayGainersResponse> GetDayGainersAsync(DayGainersRequest request, CancellationToken cancellationToken);
    Task<HodVwapMomentumResponse> GetHodBreakoutsAsync(HodBreakoutsRequest request, CancellationToken cancellationToken);
    Task<HodVwapMomentumResponse> GetVwapBreakoutsAsync(VwapBreakoutsRequest request, CancellationToken cancellationToken);
    Task<HodVwapMomentumResponse> GetVolumeSpikesAsync(VolumeSpikesRequest request, CancellationToken cancellationToken);
    Task<HodVwapApproachResponse> GetHodApproachAsync(HodApproachRequest request, CancellationToken cancellationToken);
    Task<HodVwapApproachResponse> GetVwapApproachAsync(VwapApproachRequest request, CancellationToken cancellationToken);
}
