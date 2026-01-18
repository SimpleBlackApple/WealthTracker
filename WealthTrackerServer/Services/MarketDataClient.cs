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

    public async Task<ScreenerResponse> GetScreenerAsync(
        ScreenerRequest request,
        CancellationToken cancellationToken)
    {
        using var response = await _httpClient.PostAsJsonAsync("screener", request, cancellationToken);
        if (!response.IsSuccessStatusCode)
        {
            var content = await response.Content.ReadAsStringAsync(cancellationToken);
            throw new HttpRequestException(
                $"Market data service returned {(int)response.StatusCode}: {content}");
        }

        var payload = await response.Content.ReadFromJsonAsync<ScreenerResponse>(
            cancellationToken: cancellationToken);
        if (payload is null)
        {
            throw new InvalidOperationException("Market data service returned an empty response.");
        }

        return payload;
    }
}
