using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Moq;
using WealthTrackerServer.Controllers;
using WealthTrackerServer.Models.MarketData;
using WealthTrackerServer.Services;

namespace WealthTrackerServer.Tests;

public class ScannerControllerTests
{
  [Fact]
  public async Task RunDayGainers_NormalizesDefaults()
  {
    var marketData = new Mock<IMarketDataClient>();
    DayGainersRequest? captured = null;
    marketData
      .Setup(x => x.GetDayGainersAsync(It.IsAny<DayGainersRequest>(), It.IsAny<CancellationToken>()))
      .Callback<DayGainersRequest, CancellationToken>((request, _) => captured = request)
      .ReturnsAsync(new DayGainersResponse
      {
        Scanner = "day_gainers",
        SortedBy = "change_pct",
        Results = []
      });

    var controller = new ScannerController(marketData.Object);
    var request = new DayGainersRequest
    {
      UniverseLimit = 0,
      Limit = 0,
      MinPrice = 0,
      Interval = "",
      Period = "",
      AsOf = null
    };

    var result = await controller.RunDayGainers(request, CancellationToken.None);

    var ok = Assert.IsType<OkObjectResult>(result.Result);
    Assert.NotNull(ok.Value);
    Assert.NotNull(captured);
    Assert.Equal(25, captured!.UniverseLimit);
    Assert.Equal(7, captured.Limit);
    Assert.Equal(1.5, captured.MinPrice);
    Assert.Equal("5m", captured.Interval);
    Assert.Equal("1d", captured.Period);
    Assert.NotNull(captured.AsOf);
  }

  [Fact]
  public async Task RunDayGainers_OnHttpError_ReturnsBadGateway()
  {
    var marketData = new Mock<IMarketDataClient>();
    marketData
      .Setup(x => x.GetDayGainersAsync(It.IsAny<DayGainersRequest>(), It.IsAny<CancellationToken>()))
      .ThrowsAsync(new HttpRequestException("downstream error"));

    var controller = new ScannerController(marketData.Object);

    var result = await controller.RunDayGainers(new DayGainersRequest(), CancellationToken.None);

    var response = Assert.IsType<ObjectResult>(result.Result);
    Assert.Equal(StatusCodes.Status502BadGateway, response.StatusCode);
  }
}
