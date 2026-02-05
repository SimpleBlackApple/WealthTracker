using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using WealthTrackerServer.Models.MarketData;
using WealthTrackerServer.Services;

namespace WealthTrackerServer.Controllers;

[ApiController]
[Route("api/scanner")]
public class ScannerController : ControllerBase
{
    private readonly IMarketDataClient _marketDataClient;
    private readonly ISimulationTradingService _tradingService;

    public ScannerController(
        IMarketDataClient marketDataClient,
        ISimulationTradingService tradingService)
    {
        _marketDataClient = marketDataClient;
        _tradingService = tradingService;
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

    [HttpPost("holdings")]
    [Authorize]
    [ProducesResponseType(typeof(HoldingsWatchlistResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status502BadGateway)]
    public async Task<ActionResult<HoldingsWatchlistResponse>> RunHoldingsWatchlist(
        [FromBody] HoldingsWatchlistRequest request,
        CancellationToken cancellationToken)
    {
        var userId = GetUserId();

        try
        {
            var portfolioId = request.PortfolioId ?? 0;
            if (portfolioId <= 0)
            {
                var portfolios = await _tradingService.GetUserPortfoliosAsync(userId);
                var fallback = portfolios.FirstOrDefault();
                if (fallback is null)
                    return Ok(new HoldingsWatchlistResponse
                    {
                        AsOf = DateTimeOffset.UtcNow,
                        SortedBy = "unrealized_pl desc",
                        Results = []
                    });

                portfolioId = fallback.Id;
            }

            var summary = await _tradingService.GetPortfolioSummaryAsync(portfolioId, userId);
            var positions = summary.Positions ?? [];

            var tickers = positions
                .Select(p => (p.Symbol ?? string.Empty).Trim().ToUpperInvariant())
                .Where(s => !string.IsNullOrWhiteSpace(s))
                .Distinct()
                .ToList();

            QuotesResponse? quotes = null;
            if (tickers.Count > 0)
            {
                quotes = await _marketDataClient.GetQuotesAsync(
                    new QuotesRequest
                    {
                        Tickers = tickers,
                        Interval = request.Interval,
                        Period = request.Period,
                        Prepost = request.Prepost
                    },
                    cancellationToken);
            }

            var quotesBySymbol = (quotes?.Results ?? [])
                .Where(r => !string.IsNullOrWhiteSpace(r.Symbol))
                .GroupBy(r => r.Symbol.Trim().ToUpperInvariant())
                .ToDictionary(g => g.Key, g => g.FirstOrDefault()?.Price);

            var results = new List<HoldingRow>(positions.Count);
            foreach (var pos in positions)
            {
                var symbol = (pos.Symbol ?? string.Empty).Trim().ToUpperInvariant();
                var avgCost = (double)pos.AverageCost;
                var qty = pos.Quantity;

                double? mark = null;
                if (!string.IsNullOrWhiteSpace(symbol) && quotesBySymbol.TryGetValue(symbol, out var q))
                {
                    mark = q;
                }
                else if (pos.CurrentPrice is not null)
                {
                    mark = (double)pos.CurrentPrice.Value;
                }

                double? unrealizedPl = null;
                double? unrealizedPlPct = null;
                if (mark is not null && qty != 0)
                {
                    var diffPerShare = pos.IsShort ? avgCost - mark.Value : mark.Value - avgCost;
                    unrealizedPl = diffPerShare * qty;

                    var basis = avgCost * Math.Abs(qty);
                    if (basis > 0)
                    {
                        unrealizedPlPct = (unrealizedPl.Value / basis) * 100.0;
                    }
                }

                results.Add(new HoldingRow
                {
                    Symbol = symbol,
                    Exchange = pos.Exchange,
                    Price = mark,
                    Quantity = qty,
                    AvgCost = avgCost,
                    UnrealizedPL = unrealizedPl,
                    UnrealizedPLPct = unrealizedPlPct,
                    RealizedPL = (double)pos.RealizedPL,
                    IsShort = pos.IsShort
                });
            }

            return Ok(new HoldingsWatchlistResponse
            {
                AsOf = quotes?.AsOf ?? request.AsOf ?? DateTimeOffset.UtcNow,
                SortedBy = "unrealized_pl desc",
                Results = results,
                Cache = quotes?.Cache
            });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { error = ex.Message });
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
            request.UniverseLimit = 25;
        }

        if (request.Limit <= 0)
        {
            request.Limit = 7;
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

    private int GetUserId()
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (!int.TryParse(userIdClaim, out var userId))
            throw new InvalidOperationException("Invalid token");
        return userId;
    }
}
