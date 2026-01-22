using System.Net.Http.Json;
using WealthTrackerServer.Models.MarketData;

namespace WealthTrackerServer.Services;

public class MarketDataClient : IMarketDataClient
{
    private readonly HttpClient _httpClient;

    public MarketDataClient(HttpClient httpClient)
    {
        _httpClient = httpClient;
    }

    public Task<DayGainersResponse> GetDayGainersAsync(
        DayGainersRequest request,
        CancellationToken cancellationToken) =>
        PostAsync<DayGainersRequest, DayGainersResponse>("scan/day-gainers", request, cancellationToken);

    public Task<HodVwapMomentumResponse> GetHodBreakoutsAsync(
        HodBreakoutsRequest request,
        CancellationToken cancellationToken) =>
        PostAsync<HodBreakoutsRequest, HodVwapMomentumResponse>("scan/hod-breakouts", request, cancellationToken);

    public Task<HodVwapMomentumResponse> GetVwapBreakoutsAsync(
        VwapBreakoutsRequest request,
        CancellationToken cancellationToken) =>
        PostAsync<VwapBreakoutsRequest, HodVwapMomentumResponse>("scan/vwap-breakouts", request, cancellationToken);

    public Task<HodVwapApproachResponse> GetHodApproachAsync(
        HodApproachRequest request,
        CancellationToken cancellationToken) =>
        PostAsync<HodApproachRequest, HodVwapApproachResponse>("scan/hod-approach", request, cancellationToken);

    public Task<HodVwapApproachResponse> GetVwapApproachAsync(
        VwapApproachRequest request,
        CancellationToken cancellationToken) =>
        PostAsync<VwapApproachRequest, HodVwapApproachResponse>("scan/vwap-approach", request, cancellationToken);

    private async Task<TResponse> PostAsync<TRequest, TResponse>(
        string path,
        TRequest request,
        CancellationToken cancellationToken)
    {
        using var response = await _httpClient.PostAsJsonAsync(path, request, cancellationToken);
        if (!response.IsSuccessStatusCode)
        {
            var content = await response.Content.ReadAsStringAsync(cancellationToken);
            throw new HttpRequestException(
                $"Market data service returned {(int)response.StatusCode}: {content}");
        }

        var payload = await response.Content.ReadFromJsonAsync<TResponse>(cancellationToken: cancellationToken);
        if (payload is null)
        {
            throw new InvalidOperationException("Market data service returned an empty response.");
        }

        return payload;
    }
}
