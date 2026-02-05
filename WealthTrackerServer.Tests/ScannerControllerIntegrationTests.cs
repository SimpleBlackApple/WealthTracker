using System.Net.Http.Json;
using System.Security.Cryptography;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using WealthTrackerServer.Models;
using WealthTrackerServer.Models.MarketData;
using WealthTrackerServer.Services;

namespace WealthTrackerServer.Tests;

public class ScannerControllerIntegrationTests : IClassFixture<TestWebApplicationFactory>
{
  private readonly TestWebApplicationFactory _factory;

  public ScannerControllerIntegrationTests(TestWebApplicationFactory factory)
  {
    _factory = factory;
  }

  [Fact]
  public async Task RunDayGainers_ReturnsOkAndUsesDefaults()
  {
    var client = _factory.CreateClient();
    var response = await client.PostAsJsonAsync("/api/scanner/day-gainers", new DayGainersRequest
    {
      UniverseLimit = 10,
      Limit = 5,
      MinPrice = 1.5,
      Interval = "",
      Period = ""
    });

    response.EnsureSuccessStatusCode();

    var payload = await response.Content.ReadFromJsonAsync<DayGainersResponse>();
    Assert.NotNull(payload);
    Assert.Equal("day_gainers", payload!.Scanner);

    var stub = _factory.Services.GetRequiredService<IMarketDataClient>() as FakeMarketDataClient;
    Assert.NotNull(stub);
    Assert.NotNull(stub!.LastDayGainersRequest);
    Assert.Equal(10, stub.LastDayGainersRequest!.UniverseLimit);
    Assert.Equal(5, stub.LastDayGainersRequest.Limit);
    Assert.Equal(1.5, stub.LastDayGainersRequest.MinPrice);
    Assert.Equal("5m", stub.LastDayGainersRequest.Interval);
    Assert.Equal("1d", stub.LastDayGainersRequest.Period);
    Assert.NotNull(stub.LastDayGainersRequest.AsOf);
  }
}

public sealed class TestWebApplicationFactory : WebApplicationFactory<Program>
{
  private readonly string _publicKeyPath;
  private readonly string _privateKeyPath;
  private readonly Dictionary<string, string?> _originalEnv = new();

  public TestWebApplicationFactory()
  {
    var rsa = RSA.Create(2048);
    _privateKeyPath = Path.Combine(Path.GetTempPath(), $"wt_jwt_private_{Guid.NewGuid()}.pem");
    _publicKeyPath = Path.Combine(Path.GetTempPath(), $"wt_jwt_public_{Guid.NewGuid()}.pem");

    var privatePem = PemEncoding.Write("PRIVATE KEY", rsa.ExportPkcs8PrivateKey());
    var publicPem = PemEncoding.Write("PUBLIC KEY", rsa.ExportSubjectPublicKeyInfo());

    File.WriteAllText(_privateKeyPath, new string(privatePem));
    File.WriteAllText(_publicKeyPath, new string(publicPem));

    SetEnv("Authentication__Jwt__RsaPublicKeyPath", _publicKeyPath);
    SetEnv("Authentication__Jwt__RsaPrivateKeyPath", _privateKeyPath);
    SetEnv("Authentication__Jwt__Issuer", "test-issuer");
    SetEnv("Authentication__Jwt__Audience", "test-audience");
    SetEnv("Authentication__Jwt__AccessTokenExpirationMinutes", "30");
    SetEnv("Authentication__Jwt__RefreshTokenExpirationDays", "7");
    SetEnv("FrontendUrl", "http://localhost:5173");
  }

  protected override void ConfigureWebHost(IWebHostBuilder builder)
  {
    builder.ConfigureAppConfiguration((_, config) =>
    {
      config.AddInMemoryCollection(new Dictionary<string, string?>
      {
        { "Authentication:Jwt:RsaPublicKeyPath", _publicKeyPath },
        { "Authentication:Jwt:RsaPrivateKeyPath", _privateKeyPath },
        { "Authentication:Jwt:Issuer", "test-issuer" },
        { "Authentication:Jwt:Audience", "test-audience" },
        { "Authentication:Jwt:AccessTokenExpirationMinutes", "30" },
        { "Authentication:Jwt:RefreshTokenExpirationDays", "7" },
        { "FrontendUrl", "http://localhost:5173" },
        { "ConnectionStrings:DefaultConnection", "Host=localhost;Database=test;" }
      });
    });

    builder.ConfigureServices(services =>
    {
      services.RemoveAll<DbContextOptions<ApplicationDbContext>>();
      services.RemoveAll<ApplicationDbContext>();
      services.AddDbContext<ApplicationDbContext>(options =>
        options.UseInMemoryDatabase("TestDb"));

      services.RemoveAll<IMarketDataClient>();
      services.AddSingleton<IMarketDataClient, FakeMarketDataClient>();
    });
  }

  protected override void Dispose(bool disposing)
  {
    base.Dispose(disposing);
    if (disposing)
    {
      TryDelete(_privateKeyPath);
      TryDelete(_publicKeyPath);
      RestoreEnv();
    }
  }

  private static void TryDelete(string path)
  {
    try
    {
      if (File.Exists(path))
      {
        File.Delete(path);
      }
    }
    catch
    {
      // ignore cleanup errors
    }
  }

  private void SetEnv(string key, string value)
  {
    _originalEnv[key] = Environment.GetEnvironmentVariable(key);
    Environment.SetEnvironmentVariable(key, value);
  }

  private void RestoreEnv()
  {
    foreach (var pair in _originalEnv)
    {
      Environment.SetEnvironmentVariable(pair.Key, pair.Value);
    }
  }
}

public sealed class FakeMarketDataClient : IMarketDataClient
{
  public DayGainersRequest? LastDayGainersRequest { get; private set; }

  public Task<DayGainersResponse> GetDayGainersAsync(
    DayGainersRequest request,
    CancellationToken cancellationToken)
  {
    LastDayGainersRequest = request;
    return Task.FromResult(new DayGainersResponse
    {
      Scanner = "day_gainers",
      SortedBy = "change_pct",
      Results = []
    });
  }

  public Task<HodVwapMomentumResponse> GetHodBreakoutsAsync(
    HodBreakoutsRequest request,
    CancellationToken cancellationToken)
  {
    throw new NotImplementedException();
  }

  public Task<HodVwapMomentumResponse> GetVwapBreakoutsAsync(
    VwapBreakoutsRequest request,
    CancellationToken cancellationToken)
  {
    throw new NotImplementedException();
  }

  public Task<HodVwapMomentumResponse> GetVolumeSpikesAsync(
    VolumeSpikesRequest request,
    CancellationToken cancellationToken)
  {
    throw new NotImplementedException();
  }

  public Task<HodVwapApproachResponse> GetHodApproachAsync(
    HodApproachRequest request,
    CancellationToken cancellationToken)
  {
    throw new NotImplementedException();
  }

  public Task<HodVwapApproachResponse> GetVwapApproachAsync(
    VwapApproachRequest request,
    CancellationToken cancellationToken)
  {
    throw new NotImplementedException();
  }

  public Task<QuotesResponse> GetQuotesAsync(
    QuotesRequest request,
    CancellationToken cancellationToken)
  {
    return Task.FromResult(new QuotesResponse
    {
      AsOf = DateTimeOffset.UtcNow,
      Results = [],
      Cache = null
    });
  }
}
