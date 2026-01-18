using WealthTrackerServer.Models.MarketData;

namespace WealthTrackerServer.Services;

public interface IMarketDataClient
{
    Task<ScreenerResponse> GetScreenerAsync(ScreenerRequest request, CancellationToken cancellationToken);
}
