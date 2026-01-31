using System.Security.Cryptography;
using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;
using WealthTrackerServer.OpenApi;
using WealthTrackerServer.Models;
using WealthTrackerServer.Options;
using WealthTrackerServer.Services;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container
builder.Services.AddControllers();
builder.Services.AddOpenApi(options =>
{
  options.AddOperationTransformer<ScannerExamplesOperationTransformer>();
});

// Configure HttpClient for Google OAuth
builder.Services.AddHttpClient();

// Configure market data service client
builder.Services.Configure<MarketDataOptions>(
  builder.Configuration.GetSection("MarketDataService"));
builder.Services.AddHttpClient<IMarketDataClient, MarketDataClient>((sp, client) =>
{
  var options = sp.GetRequiredService<IOptions<MarketDataOptions>>().Value;
  client.BaseAddress = new Uri(options.BaseUrl);
  client.Timeout = TimeSpan.FromSeconds(options.TimeoutSeconds);
});

// Configure PostgreSQL
builder.Services.AddDbContext<ApplicationDbContext>(options =>
  options.UseNpgsql(builder.Configuration.GetConnectionString("DefaultConnection")));

// Register JWT service
builder.Services.AddSingleton<IJwtService, JwtService>();
builder.Services.AddScoped<IGoogleAuthService, GoogleAuthService>();
builder.Services.AddScoped<ISimulationTradingService, SimulationTradingService>();

// Configure JWT Authentication
var publicKeyPath = builder.Configuration["Authentication:Jwt:RsaPublicKeyPath"];
var publicKeyPem = builder.Configuration["Authentication:Jwt:RsaPublicKeyPem"];
if (string.IsNullOrEmpty(publicKeyPath) && string.IsNullOrEmpty(publicKeyPem))
{
  throw new InvalidOperationException(
    "JWT RSA public key is not configured (set Authentication:Jwt:RsaPublicKeyPath or Authentication:Jwt:RsaPublicKeyPem)");
}

using var rsa = RSA.Create();
if (!string.IsNullOrEmpty(publicKeyPem))
{
  rsa.ImportFromPem(publicKeyPem);
}
else
{
  rsa.ImportFromPem(File.ReadAllText(publicKeyPath!));
}

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
  .AddJwtBearer(options =>
  {
    var issuer = builder.Configuration["Authentication:Jwt:Issuer"];
    var audience = builder.Configuration["Authentication:Jwt:Audience"];

    options.TokenValidationParameters = new TokenValidationParameters
    {
      ValidateIssuer = true,
      ValidateAudience = true,
      ValidateLifetime = true,
      ValidateIssuerSigningKey = true,
      ValidIssuer = issuer,
      ValidAudience = audience,
      IssuerSigningKey = new RsaSecurityKey(rsa),
      ClockSkew = TimeSpan.Zero
    };
  });

builder.Services.AddAuthorization();

// Configure CORS for frontend
var frontendUrl = builder.Configuration["FrontendUrl"] ?? "http://localhost:5173";
builder.Services.AddCors(options =>
{
  options.AddDefaultPolicy(policy =>
  {
    policy.WithOrigins(frontendUrl)
      .AllowAnyMethod()
      .AllowAnyHeader()
      .AllowCredentials();
  });
});

var app = builder.Build();

var migrateOnStartupRaw = (builder.Configuration["MIGRATE_ON_STARTUP"] ?? "0").Trim();
var migrateOnStartup = migrateOnStartupRaw is "1" or "true" or "True" or "yes" or "Yes";
if (migrateOnStartup)
{
  using var scope = app.Services.CreateScope();
  var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
  db.Database.Migrate();
}

// Configure the HTTP request pipeline
if (app.Environment.IsDevelopment())
{
  app.MapOpenApi();
  app.UseSwaggerUi(options =>
  {
    options.DocumentPath = "/openapi/v1.json";
  });
}

app.UseHttpsRedirection();

app.UseCors();

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

app.Run();

public partial class Program
{
}
