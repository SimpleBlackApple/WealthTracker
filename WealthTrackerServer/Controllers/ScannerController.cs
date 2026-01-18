using Microsoft.AspNetCore.Mvc;
using WealthTrackerServer.Models.MarketData;
using WealthTrackerServer.Services;

namespace WealthTrackerServer.Controllers;

[ApiController]
[Route("api/scanner")]
public class ScannerController : ControllerBase
{
    private readonly IMarketDataClient _marketDataClient;

    public ScannerController(IMarketDataClient marketDataClient)
    {
        _marketDataClient = marketDataClient;
    }

    [HttpPost("screener")]
    [ProducesResponseType(typeof(ScreenerResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status502BadGateway)]
    public async Task<ActionResult<ScreenerResponse>> RunScreener(
        [FromBody] ScreenerRequest request,
        CancellationToken cancellationToken)
    {
        NormalizeRequest(request);

        try
        {
            var response = await _marketDataClient.GetScreenerAsync(request, cancellationToken);
            return Ok(response);
        }
        catch (HttpRequestException ex)
        {
            return StatusCode(StatusCodes.Status502BadGateway, new { error = ex.Message });
        }
    }

    private static void NormalizeRequest(ScreenerRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Type))
        {
            request.Type = "gappers";
        }

        if (request.Limit <= 0)
        {
            request.Limit = 100;
        }

        if (string.IsNullOrWhiteSpace(request.Session))
        {
            request.Session = "regular";
        }

        if (request.AsOf is null)
        {
            request.AsOf = DateTimeOffset.UtcNow;
        }
    }
}
