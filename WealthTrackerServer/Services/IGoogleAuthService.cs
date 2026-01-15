namespace WealthTrackerServer.Services;

public interface IGoogleAuthService
{
  Task<GoogleTokenResponse> ExchangeCodeForTokensAsync(string code, string redirectUri);
  Task<GoogleUserInfo> ValidateAndGetUserInfoAsync(string idToken);
}

public record GoogleTokenResponse(
  string AccessToken,
  string IdToken,
  string RefreshToken,
  int ExpiresIn
);

public record GoogleUserInfo(
  string Id,
  string Email,
  string Name,
  string? Picture
);
