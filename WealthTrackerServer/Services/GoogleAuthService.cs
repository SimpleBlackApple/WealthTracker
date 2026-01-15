using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.IdentityModel.JsonWebTokens;
using Microsoft.IdentityModel.Tokens;

namespace WealthTrackerServer.Services;

public class GoogleAuthService : IGoogleAuthService
{
  private readonly IConfiguration _configuration;
  private readonly HttpClient _httpClient;
  private readonly ILogger<GoogleAuthService> _logger;

  public GoogleAuthService(IConfiguration configuration, IHttpClientFactory httpClientFactory, ILogger<GoogleAuthService> logger)
  {
    _configuration = configuration;
    _httpClient = httpClientFactory.CreateClient();
    _logger = logger;
  }

  public async Task<GoogleTokenResponse> ExchangeCodeForTokensAsync(string code, string redirectUri)
  {
    var clientId = _configuration["Authentication:Google:ClientId"];
    var clientSecret = _configuration["Authentication:Google:ClientSecret"];

    if (string.IsNullOrEmpty(clientId) || string.IsNullOrEmpty(clientSecret))
    {
      throw new InvalidOperationException("Google OAuth credentials are not configured");
    }

    var tokenEndpoint = "https://oauth2.googleapis.com/token";
    var parameters = new Dictionary<string, string>
    {
      { "code", code },
      { "client_id", clientId },
      { "client_secret", clientSecret },
      { "redirect_uri", redirectUri },
      { "grant_type", "authorization_code" }
    };

    var response = await _httpClient.PostAsync(tokenEndpoint, new FormUrlEncodedContent(parameters));
    response.EnsureSuccessStatusCode();

    var content = await response.Content.ReadAsStringAsync();
    _logger.LogInformation("Google token response: {Content}", content);

    var tokenResponse = JsonSerializer.Deserialize<GoogleTokenResponseBody>(content);

    if (tokenResponse == null || string.IsNullOrEmpty(tokenResponse.IdToken))
    {
      _logger.LogError("Failed to deserialize token response. Content: {Content}", content);
      throw new InvalidOperationException("Failed to obtain ID token from Google");
    }

    return new GoogleTokenResponse(
      tokenResponse.AccessToken,
      tokenResponse.IdToken,
      tokenResponse.RefreshToken,
      tokenResponse.ExpiresIn
    );
  }

  public Task<GoogleUserInfo> ValidateAndGetUserInfoAsync(string idToken)
  {
    var handler = new JsonWebTokenHandler();

    if (!handler.CanReadToken(idToken))
    {
      throw new SecurityTokenException("Invalid ID token format");
    }

    var token = handler.ReadJsonWebToken(idToken);

    var googleId = token.GetClaim("sub")?.Value
      ?? throw new SecurityTokenException("ID token missing subject claim");
    var email = token.GetClaim("email")?.Value
      ?? throw new SecurityTokenException("ID token missing email claim");
    var name = token.GetClaim("name")?.Value ?? string.Empty;
    var picture = token.GetClaim("picture")?.Value;

    var emailVerified = token.GetClaim("email_verified")?.Value == "true";
    if (!emailVerified)
    {
      throw new SecurityTokenException("Email is not verified by Google");
    }

    return Task.FromResult(new GoogleUserInfo(googleId, email, name, picture));
  }

  private class GoogleTokenResponseBody
  {
    [JsonPropertyName("access_token")] public string AccessToken { get; set; } = string.Empty;
    [JsonPropertyName("id_token")] public string IdToken { get; set; } = string.Empty;
    [JsonPropertyName("refresh_token")] public string RefreshToken { get; set; } = string.Empty;
    [JsonPropertyName("expires_in")] public int ExpiresIn { get; set; }
    [JsonPropertyName("token_type")] public string TokenType { get; set; } = string.Empty;
    [JsonPropertyName("scope")] public string Scope { get; set; } = string.Empty;
  }
}
