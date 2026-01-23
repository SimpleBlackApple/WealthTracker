using System.Net;
using System.Text;
using System.Text.Json;
using WealthTrackerServer.Models.MarketData;
using WealthTrackerServer.Services;

namespace WealthTrackerServer.Tests;

public class MarketDataClientTests
{
  [Fact]
  public async Task GetDayGainersAsync_ReturnsPayload()
  {
    var payload = new DayGainersResponse
    {
      Scanner = "day_gainers",
      SortedBy = "change_pct",
      Results =
      [
        new DayGainerRow { Symbol = "AAPL", Price = 189.12, Volume = 1200 }
      ]
    };
    var handler = new StubHandler(_ =>
      new HttpResponseMessage(HttpStatusCode.OK)
      {
        Content = new StringContent(
          JsonSerializer.Serialize(payload),
          Encoding.UTF8,
          "application/json")
      });
    var httpClient = new HttpClient(handler) { BaseAddress = new Uri("http://localhost/") };
    var client = new MarketDataClient(httpClient);

    var result = await client.GetDayGainersAsync(new DayGainersRequest(), CancellationToken.None);

    Assert.Equal("day_gainers", result.Scanner);
    Assert.Single(result.Results);
    Assert.Equal("AAPL", result.Results[0].Symbol);
    Assert.NotNull(handler.LastRequest);
    Assert.Equal(HttpMethod.Post, handler.LastRequest!.Method);
    Assert.Equal("/scan/day-gainers", handler.LastRequest.RequestUri!.PathAndQuery);
  }

  [Fact]
  public async Task GetDayGainersAsync_OnNonSuccess_Throws()
  {
    var handler = new StubHandler(_ =>
      new HttpResponseMessage(HttpStatusCode.BadGateway)
      {
        Content = new StringContent("Downstream failed")
      });
    var httpClient = new HttpClient(handler) { BaseAddress = new Uri("http://localhost/") };
    var client = new MarketDataClient(httpClient);

    var error = await Assert.ThrowsAsync<HttpRequestException>(() =>
      client.GetDayGainersAsync(new DayGainersRequest(), CancellationToken.None));

    Assert.Contains("502", error.Message);
    Assert.Contains("Downstream failed", error.Message);
  }

  [Fact]
  public async Task GetDayGainersAsync_OnEmptyBody_Throws()
  {
    var handler = new StubHandler(_ =>
      new HttpResponseMessage(HttpStatusCode.OK)
      {
        Content = new StringContent(string.Empty, Encoding.UTF8, "application/json")
      });
    var httpClient = new HttpClient(handler) { BaseAddress = new Uri("http://localhost/") };
    var client = new MarketDataClient(httpClient);

    await Assert.ThrowsAsync<JsonException>(() =>
      client.GetDayGainersAsync(new DayGainersRequest(), CancellationToken.None));
  }

  private sealed class StubHandler : HttpMessageHandler
  {
    private readonly Func<HttpRequestMessage, HttpResponseMessage> _handler;

    public StubHandler(Func<HttpRequestMessage, HttpResponseMessage> handler)
    {
      _handler = handler;
    }

    public HttpRequestMessage? LastRequest { get; private set; }

    protected override Task<HttpResponseMessage> SendAsync(
      HttpRequestMessage request,
      CancellationToken cancellationToken)
    {
      LastRequest = request;
      return Task.FromResult(_handler(request));
    }
  }
}
