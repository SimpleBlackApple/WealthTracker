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

    [HttpPost("day-gainers")]
    [ProducesResponseType(typeof(DayGainersResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status502BadGateway)]
    public async Task<ActionResult<DayGainersResponse>> RunDayGainers(
        [FromBody] DayGainersRequest request,
        CancellationToken cancellationToken)
    {
        NormalizeScannerRequest(request);

        try
        {
            var response = await _marketDataClient.GetDayGainersAsync(request, cancellationToken);
            return Ok(response);
        }
        catch (HttpRequestException ex)
        {
            return StatusCode(StatusCodes.Status502BadGateway, new { error = ex.Message });
        }
    }

    [HttpPost("hod-breakouts")]
    [ProducesResponseType(typeof(HodVwapMomentumResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status502BadGateway)]
    public async Task<ActionResult<HodVwapMomentumResponse>> RunHodBreakouts(
        [FromBody] HodBreakoutsRequest request,
        CancellationToken cancellationToken)
    {
        NormalizeScannerRequest(request);

        try
        {
            var response = await _marketDataClient.GetHodBreakoutsAsync(request, cancellationToken);
            return Ok(response);
        }
        catch (HttpRequestException ex)
        {
            return StatusCode(StatusCodes.Status502BadGateway, new { error = ex.Message });
        }
    }

    [HttpPost("vwap-breakouts")]
    [ProducesResponseType(typeof(HodVwapMomentumResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status502BadGateway)]
    public async Task<ActionResult<HodVwapMomentumResponse>> RunVwapBreakouts(
        [FromBody] VwapBreakoutsRequest request,
        CancellationToken cancellationToken)
    {
        NormalizeScannerRequest(request);

        try
        {
            var response = await _marketDataClient.GetVwapBreakoutsAsync(request, cancellationToken);
            return Ok(response);
        }
        catch (HttpRequestException ex)
        {
            return StatusCode(StatusCodes.Status502BadGateway, new { error = ex.Message });
        }
    }

    [HttpPost("volume-spikes")]
    [ProducesResponseType(typeof(HodVwapMomentumResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status502BadGateway)]
    public async Task<ActionResult<HodVwapMomentumResponse>> RunVolumeSpikes(
        [FromBody] VolumeSpikesRequest request,
        CancellationToken cancellationToken)
    {
        NormalizeScannerRequest(request);

        try
        {
            var response = await _marketDataClient.GetVolumeSpikesAsync(request, cancellationToken);
            return Ok(response);
        }
        catch (HttpRequestException ex)
        {
            return StatusCode(StatusCodes.Status502BadGateway, new { error = ex.Message });
        }
    }

    [HttpPost("hod-approach")]
    [ProducesResponseType(typeof(HodVwapApproachResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status502BadGateway)]
    public async Task<ActionResult<HodVwapApproachResponse>> RunHodApproach(
        [FromBody] HodApproachRequest request,
        CancellationToken cancellationToken)
    {
        NormalizeScannerRequest(request);

        try
        {
            var response = await _marketDataClient.GetHodApproachAsync(request, cancellationToken);
            return Ok(response);
        }
        catch (HttpRequestException ex)
        {
            return StatusCode(StatusCodes.Status502BadGateway, new { error = ex.Message });
        }
    }

    [HttpPost("vwap-approach")]
    [ProducesResponseType(typeof(HodVwapApproachResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status502BadGateway)]
    public async Task<ActionResult<HodVwapApproachResponse>> RunVwapApproach(
        [FromBody] VwapApproachRequest request,
        CancellationToken cancellationToken)
    {
        NormalizeScannerRequest(request);

        try
        {
            var response = await _marketDataClient.GetVwapApproachAsync(request, cancellationToken);
            return Ok(response);
        }
        catch (HttpRequestException ex)
        {
            return StatusCode(StatusCodes.Status502BadGateway, new { error = ex.Message });
        }
    }

    private static void NormalizeScannerRequest(ScannerUniverseRequest request)
    {
        if (request.UniverseLimit <= 0)
        {
            request.UniverseLimit = 50;
        }

        if (request.Limit <= 0)
        {
            request.Limit = 25;
        }

        if (request.MinPrice < 1.5)
        {
            request.MinPrice = 1.5;
        }

        if (string.IsNullOrWhiteSpace(request.Interval))
        {
            request.Interval = "5m";
        }

        if (string.IsNullOrWhiteSpace(request.Period))
        {
            request.Period = "1d";
        }

        if (request.AsOf is null)
        {
            request.AsOf = DateTimeOffset.UtcNow;
        }
    }
}
