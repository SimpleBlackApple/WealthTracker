using System.Security.Claims;
using WealthTrackerServer.Models;

namespace WealthTrackerServer.Services;

public interface IJwtService
{
  string GenerateAccessToken(User user);
  string GenerateRefreshToken();
  string HashRefreshToken(string refreshToken);
  bool VerifyRefreshToken(string token, string hash);
  ClaimsPrincipal? ValidateToken(string token);
}
