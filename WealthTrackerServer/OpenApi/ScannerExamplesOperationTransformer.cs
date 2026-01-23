using Microsoft.AspNetCore.OpenApi;
using Microsoft.OpenApi.Any;
using Microsoft.OpenApi.Models;

namespace WealthTrackerServer.OpenApi;

public sealed class ScannerExamplesOperationTransformer : IOpenApiOperationTransformer
{
    public Task TransformAsync(
        OpenApiOperation operation,
        OpenApiOperationTransformerContext context,
        CancellationToken cancellationToken)
    {
        var description = context.Description;
        var path = description.RelativePath?.TrimEnd('/');
        var method = description.HttpMethod;

        if (!string.Equals(method, "POST", StringComparison.OrdinalIgnoreCase))
        {
            return Task.CompletedTask;
        }

        if (string.Equals(path, "api/scanner/day-gainers", StringComparison.OrdinalIgnoreCase))
        {
            SetExample(operation, new OpenApiObject
            {
                ["universeLimit"] = new OpenApiInteger(50),
                ["limit"] = new OpenApiInteger(25),
                ["minPrice"] = new OpenApiDouble(1.5),
                ["maxPrice"] = new OpenApiDouble(30),
                ["minAvgVol"] = new OpenApiInteger(1_000_000),
                ["minChangePct"] = new OpenApiDouble(0.0),
                ["interval"] = new OpenApiString("5m"),
                ["period"] = new OpenApiString("1d"),
                ["prepost"] = new OpenApiBoolean(false),
                ["closeSlopeN"] = new OpenApiInteger(6),
                ["minTodayVolume"] = new OpenApiInteger(0)
            });
            return Task.CompletedTask;
        }

        if (string.Equals(path, "api/scanner/hod-breakouts", StringComparison.OrdinalIgnoreCase))
        {
            SetExample(operation, new OpenApiObject
            {
                ["universeLimit"] = new OpenApiInteger(50),
                ["limit"] = new OpenApiInteger(25),
                ["minPrice"] = new OpenApiDouble(1.5),
                ["maxPrice"] = new OpenApiDouble(30),
                ["minAvgVol"] = new OpenApiInteger(1_000_000),
                ["minChangePct"] = new OpenApiDouble(3.0),
                ["interval"] = new OpenApiString("5m"),
                ["period"] = new OpenApiString("1d"),
                ["prepost"] = new OpenApiBoolean(false),
                ["closeSlopeN"] = new OpenApiInteger(6),
                ["minTodayVolume"] = new OpenApiInteger(150_000),
                ["minRelVol"] = new OpenApiDouble(1.4),
                ["maxDistToHod"] = new OpenApiDouble(1.0)
            });
            return Task.CompletedTask;
        }

        if (string.Equals(path, "api/scanner/vwap-breakouts", StringComparison.OrdinalIgnoreCase))
        {
            SetExample(operation, new OpenApiObject
            {
                ["universeLimit"] = new OpenApiInteger(50),
                ["limit"] = new OpenApiInteger(25),
                ["minPrice"] = new OpenApiDouble(1.5),
                ["maxPrice"] = new OpenApiDouble(30),
                ["minAvgVol"] = new OpenApiInteger(1_000_000),
                ["minChangePct"] = new OpenApiDouble(3.0),
                ["interval"] = new OpenApiString("5m"),
                ["period"] = new OpenApiString("1d"),
                ["prepost"] = new OpenApiBoolean(false),
                ["closeSlopeN"] = new OpenApiInteger(6),
                ["minTodayVolume"] = new OpenApiInteger(200_000),
                ["minRelVol"] = new OpenApiDouble(1.7)
            });
            return Task.CompletedTask;
        }

        if (string.Equals(path, "api/scanner/volume-spikes", StringComparison.OrdinalIgnoreCase))
        {
            SetExample(operation, new OpenApiObject
            {
                ["universeLimit"] = new OpenApiInteger(50),
                ["limit"] = new OpenApiInteger(25),
                ["minPrice"] = new OpenApiDouble(1.5),
                ["maxPrice"] = new OpenApiDouble(30),
                ["minAvgVol"] = new OpenApiInteger(1_000_000),
                ["minChangePct"] = new OpenApiDouble(3.0),
                ["interval"] = new OpenApiString("5m"),
                ["period"] = new OpenApiString("1d"),
                ["prepost"] = new OpenApiBoolean(false),
                ["closeSlopeN"] = new OpenApiInteger(6),
                ["minTodayVolume"] = new OpenApiInteger(200_000),
                ["minRelVol"] = new OpenApiDouble(2.0)
            });
            return Task.CompletedTask;
        }

        if (string.Equals(path, "api/scanner/hod-approach", StringComparison.OrdinalIgnoreCase))
        {
            SetExample(operation, new OpenApiObject
            {
                ["universeLimit"] = new OpenApiInteger(50),
                ["limit"] = new OpenApiInteger(25),
                ["minPrice"] = new OpenApiDouble(1.5),
                ["maxPrice"] = new OpenApiDouble(30),
                ["minAvgVol"] = new OpenApiInteger(1_000_000),
                ["minChangePct"] = new OpenApiDouble(3.0),
                ["interval"] = new OpenApiString("5m"),
                ["period"] = new OpenApiString("1d"),
                ["prepost"] = new OpenApiBoolean(false),
                ["closeSlopeN"] = new OpenApiInteger(6),
                ["minSetupPrice"] = new OpenApiDouble(2),
                ["maxSetupPrice"] = new OpenApiDouble(60),
                ["minTodayVolume"] = new OpenApiInteger(200_000),
                ["minRangePct"] = new OpenApiDouble(7.0),
                ["minPosInRange"] = new OpenApiDouble(0.50),
                ["maxPosInRange"] = new OpenApiDouble(0.995),
                ["maxDistToHod"] = new OpenApiDouble(2.0),
                ["minRelVol"] = new OpenApiDouble(1.2),
                ["adaptiveThresholds"] = new OpenApiBoolean(true)
            });
            return Task.CompletedTask;
        }

        if (string.Equals(path, "api/scanner/vwap-approach", StringComparison.OrdinalIgnoreCase))
        {
            SetExample(operation, new OpenApiObject
            {
                ["universeLimit"] = new OpenApiInteger(50),
                ["limit"] = new OpenApiInteger(25),
                ["minPrice"] = new OpenApiDouble(1.5),
                ["maxPrice"] = new OpenApiDouble(30),
                ["minAvgVol"] = new OpenApiInteger(1_000_000),
                ["minChangePct"] = new OpenApiDouble(3.0),
                ["interval"] = new OpenApiString("5m"),
                ["period"] = new OpenApiString("1d"),
                ["prepost"] = new OpenApiBoolean(false),
                ["closeSlopeN"] = new OpenApiInteger(6),
                ["minSetupPrice"] = new OpenApiDouble(2),
                ["maxSetupPrice"] = new OpenApiDouble(60),
                ["minTodayVolume"] = new OpenApiInteger(200_000),
                ["minRangePct"] = new OpenApiDouble(7.0),
                ["minPosInRange"] = new OpenApiDouble(0.50),
                ["maxPosInRange"] = new OpenApiDouble(0.995),
                ["maxAbsVwapDistance"] = new OpenApiDouble(1.7),
                ["minRelVol"] = new OpenApiDouble(1.2),
                ["adaptiveThresholds"] = new OpenApiBoolean(true)
            });
            return Task.CompletedTask;
        }

        return Task.CompletedTask;
    }

    private static void SetExample(OpenApiOperation operation, IOpenApiAny example)
    {
        if (operation.RequestBody?.Content is null)
        {
            return;
        }

        if (operation.RequestBody.Content.TryGetValue("application/json", out var mediaType))
        {
            mediaType.Example = example;
        }
    }
}
