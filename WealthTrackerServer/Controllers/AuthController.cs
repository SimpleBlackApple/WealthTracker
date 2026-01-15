using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using WealthTrackerServer.Models;
using WealthTrackerServer.Services;

namespace WealthTrackerServer.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
  private readonly ApplicationDbContext _context;
  private readonly IJwtService _jwtService;
  private readonly IGoogleAuthService _googleAuthService;
  private readonly IConfiguration _configuration;
  private readonly ILogger<AuthController> _logger;

  public AuthController(
    ApplicationDbContext context,
    IJwtService jwtService,
    IGoogleAuthService googleAuthService,
    IConfiguration configuration,
    ILogger<AuthController> logger)
  {
    _context = context;
    _jwtService = jwtService;
    _googleAuthService = googleAuthService;
    _configuration = configuration;
    _logger = logger;
  }

  /// <summary>
  /// Exchanges Google OAuth authorization code for JWT tokens
  /// </summary>
  /// <param name="request">Google callback request with authorization code</param>
  /// <returns>JWT access token, refresh token, and user info</returns>
  [HttpPost("google/callback")]
  public async Task<ActionResult<LoginResponse>> GoogleCallback([FromBody] GoogleCallbackRequest request)
  {
    try
    {
      _logger.LogInformation("GoogleCallback: Processing OAuth callback");

      var googleTokens = await _googleAuthService.ExchangeCodeForTokensAsync(request.Code, request.RedirectUri);
      _logger.LogInformation("GoogleCallback: Got tokens from Google");

      var googleUser = await _googleAuthService.ValidateAndGetUserInfoAsync(googleTokens.IdToken);
      _logger.LogInformation("GoogleCallback: Validated user: {Email}", googleUser.Email);

      var user = await _context.Users.FirstOrDefaultAsync(u => u.Email == googleUser.Email);

      if (user == null)
      {
        _logger.LogInformation("GoogleCallback: Creating new user");
        user = new User
        {
          Name = googleUser.Name,
          Email = googleUser.Email,
          GoogleId = googleUser.Id,
          CreatedAt = DateTime.UtcNow
        };
        _context.Users.Add(user);
        await _context.SaveChangesAsync();
        _logger.LogInformation("GoogleCallback: Created user with ID: {UserId}", user.Id);
      }
      else
      {
        _logger.LogInformation("GoogleCallback: Existing user found: {UserId}", user.Id);
        user.GoogleId = googleUser.Id;
        user.LastLoginAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();
      }

      var refreshToken = _jwtService.GenerateRefreshToken();
      var refreshTokenHash = _jwtService.HashRefreshToken(refreshToken);
      var refreshExpiryDays = int.Parse(_configuration["Authentication:Jwt:RefreshTokenExpirationDays"]!);

      user.RefreshTokenHash = refreshTokenHash;
      user.RefreshTokenExpiry = DateTime.UtcNow.AddDays(refreshExpiryDays);
      await _context.SaveChangesAsync();
      _logger.LogInformation("GoogleCallback: Saved refresh token");

      var accessToken = _jwtService.GenerateAccessToken(user);
      _logger.LogInformation("GoogleCallback: Generated access token");

      return Ok(new LoginResponse(
        accessToken,
        refreshToken,
        new UserDto(user.Id, user.Name, user.Email)
      ));
    }
    catch (Exception ex)
    {
      _logger.LogError(ex, "GoogleCallback: Error processing OAuth callback");
      return BadRequest(new { error = ex.Message });
    }
  }

  /// <summary>
  /// Refreshes the access token using a valid refresh token
  /// </summary>
  /// <param name="request">Refresh token request</param>
  /// <returns>New access token</returns>
  [HttpPost("refresh")]
  public async Task<ActionResult<RefreshTokenResponse>> RefreshToken([FromBody] RefreshTokenRequest request)
  {
    var users = await _context.Users
      .Where(u => u.RefreshTokenHash != null)
      .ToListAsync();

    User? user = null;
    foreach (var u in users)
    {
      if (u.RefreshTokenHash != null && _jwtService.VerifyRefreshToken(request.RefreshToken, u.RefreshTokenHash))
      {
        user = u;
        break;
      }
    }

    if (user == null || user.RefreshTokenHash == null || user.RefreshTokenExpiry == null)
    {
      return Unauthorized(new { error = "Invalid refresh token" });
    }

    if (user.RefreshTokenExpiry < DateTime.UtcNow)
    {
      user.RefreshTokenHash = null;
      user.RefreshTokenExpiry = null;
      await _context.SaveChangesAsync();
      return Unauthorized(new { error = "Refresh token expired" });
    }

    var newRefreshToken = _jwtService.GenerateRefreshToken();
    var newRefreshTokenHash = _jwtService.HashRefreshToken(newRefreshToken);
    var refreshExpiryDays = int.Parse(_configuration["Authentication:Jwt:RefreshTokenExpirationDays"]!);

    user.RefreshTokenHash = newRefreshTokenHash;
    user.RefreshTokenExpiry = DateTime.UtcNow.AddDays(refreshExpiryDays);
    await _context.SaveChangesAsync();

    var accessToken = _jwtService.GenerateAccessToken(user);

    return Ok(new RefreshTokenResponse(accessToken));
  }

  /// <summary>
  /// Logs out the user by invalidating the refresh token
  /// </summary>
  /// <param name="request">Logout request</param>
  [HttpPost("logout")]
  [Authorize]
  public async Task<ActionResult> Logout([FromBody] LogoutRequest request)
  {
    var userIdClaim = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
    if (!int.TryParse(userIdClaim, out var userId))
    {
      return BadRequest(new { error = "Invalid token" });
    }

    var user = await _context.Users.FindAsync(userId);
    if (user == null)
    {
      return BadRequest(new { error = "User not found" });
    }

    user.RefreshTokenHash = null;
    user.RefreshTokenExpiry = null;
    await _context.SaveChangesAsync();

    return Ok(new { message = "Logged out successfully" });
  }

  /// <summary>
  /// Test endpoint to verify authentication is working
  /// </summary>
  [HttpGet("me")]
  [Authorize]
  public ActionResult<MeResponse> GetMe()
  {
    var userIdClaim = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
    var emailClaim = User.FindFirst(System.Security.Claims.ClaimTypes.Email)?.Value;
    var nameClaim = User.FindFirst(System.Security.Claims.ClaimTypes.Name)?.Value;

    return Ok(new MeResponse(int.Parse(userIdClaim!), emailClaim!, nameClaim!));
  }
}

// Request/Response DTOs
public record GoogleCallbackRequest(string Code, string RedirectUri);
public record RefreshTokenRequest(string RefreshToken);
public record LogoutRequest(string RefreshToken);

public record LoginResponse(
  string AccessToken,
  string RefreshToken,
  UserDto User
);

public record RefreshTokenResponse(string AccessToken);

public record UserDto(int Id, string Name, string Email);

public record MeResponse(int Id, string Email, string Name);
