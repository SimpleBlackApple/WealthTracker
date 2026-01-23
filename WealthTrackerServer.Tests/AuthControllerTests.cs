using System.Security.Claims;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Moq;
using WealthTrackerServer.Controllers;
using WealthTrackerServer.Models;
using WealthTrackerServer.Services;

namespace WealthTrackerServer.Tests;

public class AuthControllerTests
{
  [Fact]
  public async Task GoogleCallback_NewUser_CreatesUserAndReturnsTokens()
  {
    var context = CreateDbContext();
    var jwtService = new Mock<IJwtService>();
    var googleAuthService = new Mock<IGoogleAuthService>();

    googleAuthService
      .Setup(x => x.ExchangeCodeForTokensAsync("code-123", "http://localhost/callback"))
      .ReturnsAsync(new GoogleTokenResponse("access", "id-token", "google-refresh", 3600));
    googleAuthService
      .Setup(x => x.ValidateAndGetUserInfoAsync("id-token"))
      .ReturnsAsync(new GoogleUserInfo("google-id", "test@example.com", "Test User", null));

    jwtService.Setup(x => x.GenerateRefreshToken()).Returns("refresh-token");
    jwtService.Setup(x => x.HashRefreshToken("refresh-token")).Returns("refresh-hash");
    jwtService.Setup(x => x.GenerateAccessToken(It.IsAny<User>())).Returns("access-token");

    var controller = CreateController(context, jwtService, googleAuthService);

    var result = await controller.GoogleCallback(
      new GoogleCallbackRequest("code-123", "http://localhost/callback"));

    var ok = Assert.IsType<OkObjectResult>(result.Result);
    var payload = Assert.IsType<LoginResponse>(ok.Value);
    Assert.Equal("access-token", payload.AccessToken);
    Assert.Equal("refresh-token", payload.RefreshToken);
    Assert.Equal("test@example.com", payload.User.Email);

    var user = await context.Users.SingleAsync();
    Assert.Equal("google-id", user.GoogleId);
    Assert.Equal("refresh-hash", user.RefreshTokenHash);
    Assert.NotNull(user.RefreshTokenExpiry);
    Assert.Null(user.LastLoginAt);
  }

  [Fact]
  public async Task GoogleCallback_ExistingUser_UpdatesLoginAndRefreshToken()
  {
    var context = CreateDbContext();
    var existingUser = new User
    {
      Name = "Existing User",
      Email = "existing@example.com",
      GoogleId = "old-google-id",
      CreatedAt = DateTime.UtcNow.AddDays(-5)
    };
    context.Users.Add(existingUser);
    await context.SaveChangesAsync();

    var jwtService = new Mock<IJwtService>();
    var googleAuthService = new Mock<IGoogleAuthService>();
    googleAuthService
      .Setup(x => x.ExchangeCodeForTokensAsync("code-456", "http://localhost/callback"))
      .ReturnsAsync(new GoogleTokenResponse("access", "id-token", "google-refresh", 3600));
    googleAuthService
      .Setup(x => x.ValidateAndGetUserInfoAsync("id-token"))
      .ReturnsAsync(new GoogleUserInfo("new-google-id", existingUser.Email, "Existing User", null));

    jwtService.Setup(x => x.GenerateRefreshToken()).Returns("refresh-token");
    jwtService.Setup(x => x.HashRefreshToken("refresh-token")).Returns("refresh-hash");
    jwtService.Setup(x => x.GenerateAccessToken(It.IsAny<User>())).Returns("access-token");

    var controller = CreateController(context, jwtService, googleAuthService);

    var result = await controller.GoogleCallback(
      new GoogleCallbackRequest("code-456", "http://localhost/callback"));

    var ok = Assert.IsType<OkObjectResult>(result.Result);
    var payload = Assert.IsType<LoginResponse>(ok.Value);
    Assert.Equal("access-token", payload.AccessToken);
    Assert.Equal(existingUser.Email, payload.User.Email);

    var updatedUser = await context.Users.SingleAsync();
    Assert.Equal("new-google-id", updatedUser.GoogleId);
    Assert.NotNull(updatedUser.LastLoginAt);
    Assert.Equal("refresh-hash", updatedUser.RefreshTokenHash);
  }

  [Fact]
  public async Task RefreshToken_InvalidToken_ReturnsUnauthorized()
  {
    var context = CreateDbContext();
    context.Users.Add(new User
    {
      Name = "Test User",
      Email = "test@example.com",
      RefreshTokenHash = "stored-hash",
      RefreshTokenExpiry = DateTime.UtcNow.AddDays(1),
      CreatedAt = DateTime.UtcNow.AddDays(-2)
    });
    await context.SaveChangesAsync();

    var jwtService = new Mock<IJwtService>();
    var googleAuthService = new Mock<IGoogleAuthService>();
    jwtService
      .Setup(x => x.VerifyRefreshToken("bad-token", "stored-hash"))
      .Returns(false);

    var controller = CreateController(context, jwtService, googleAuthService);

    var result = await controller.RefreshToken(new RefreshTokenRequest("bad-token"));

    var unauthorized = Assert.IsType<UnauthorizedObjectResult>(result.Result);
    Assert.Equal(StatusCodes.Status401Unauthorized, unauthorized.StatusCode);
  }

  [Fact]
  public async Task RefreshToken_ExpiredToken_ClearsStoredToken()
  {
    var context = CreateDbContext();
    var user = new User
    {
      Name = "Expired User",
      Email = "expired@example.com",
      RefreshTokenHash = "stored-hash",
      RefreshTokenExpiry = DateTime.UtcNow.AddMinutes(-5),
      CreatedAt = DateTime.UtcNow.AddDays(-1)
    };
    context.Users.Add(user);
    await context.SaveChangesAsync();

    var jwtService = new Mock<IJwtService>();
    var googleAuthService = new Mock<IGoogleAuthService>();
    jwtService
      .Setup(x => x.VerifyRefreshToken("expired-token", "stored-hash"))
      .Returns(true);

    var controller = CreateController(context, jwtService, googleAuthService);

    var result = await controller.RefreshToken(new RefreshTokenRequest("expired-token"));

    var unauthorized = Assert.IsType<UnauthorizedObjectResult>(result.Result);
    Assert.Equal(StatusCodes.Status401Unauthorized, unauthorized.StatusCode);

    var updatedUser = await context.Users.SingleAsync();
    Assert.Null(updatedUser.RefreshTokenHash);
    Assert.Null(updatedUser.RefreshTokenExpiry);
  }

  [Fact]
  public async Task RefreshToken_ValidToken_ReturnsAccessTokenAndRotatesRefresh()
  {
    var context = CreateDbContext();
    var user = new User
    {
      Name = "Valid User",
      Email = "valid@example.com",
      RefreshTokenHash = "stored-hash",
      RefreshTokenExpiry = DateTime.UtcNow.AddDays(1),
      CreatedAt = DateTime.UtcNow.AddDays(-1)
    };
    context.Users.Add(user);
    await context.SaveChangesAsync();

    var jwtService = new Mock<IJwtService>();
    var googleAuthService = new Mock<IGoogleAuthService>();
    jwtService
      .Setup(x => x.VerifyRefreshToken("refresh-token", "stored-hash"))
      .Returns(true);
    jwtService.Setup(x => x.GenerateRefreshToken()).Returns("new-refresh");
    jwtService.Setup(x => x.HashRefreshToken("new-refresh")).Returns("new-hash");
    jwtService.Setup(x => x.GenerateAccessToken(It.IsAny<User>())).Returns("access-token");

    var controller = CreateController(context, jwtService, googleAuthService);

    var result = await controller.RefreshToken(new RefreshTokenRequest("refresh-token"));

    var ok = Assert.IsType<OkObjectResult>(result.Result);
    var payload = Assert.IsType<RefreshTokenResponse>(ok.Value);
    Assert.Equal("access-token", payload.AccessToken);

    var updatedUser = await context.Users.SingleAsync();
    Assert.Equal("new-hash", updatedUser.RefreshTokenHash);
    Assert.NotNull(updatedUser.RefreshTokenExpiry);
    Assert.True(updatedUser.RefreshTokenExpiry > DateTime.UtcNow);
  }

  [Fact]
  public async Task Logout_InvalidClaim_ReturnsBadRequest()
  {
    var context = CreateDbContext();
    var controller = CreateController(context, new Mock<IJwtService>(), new Mock<IGoogleAuthService>());
    controller.ControllerContext = new ControllerContext
    {
      HttpContext = new DefaultHttpContext
      {
        User = new ClaimsPrincipal(new ClaimsIdentity())
      }
    };

    var result = await controller.Logout(new LogoutRequest("token"));

    var badRequest = Assert.IsType<BadRequestObjectResult>(result);
    Assert.Equal(StatusCodes.Status400BadRequest, badRequest.StatusCode);
  }

  [Fact]
  public async Task Logout_ClearsRefreshToken()
  {
    var context = CreateDbContext();
    var user = new User
    {
      Name = "Logout User",
      Email = "logout@example.com",
      RefreshTokenHash = "hash",
      RefreshTokenExpiry = DateTime.UtcNow.AddDays(1),
      CreatedAt = DateTime.UtcNow
    };
    context.Users.Add(user);
    await context.SaveChangesAsync();

    var controller = CreateController(context, new Mock<IJwtService>(), new Mock<IGoogleAuthService>());
    controller.ControllerContext = new ControllerContext
    {
      HttpContext = new DefaultHttpContext
      {
        User = new ClaimsPrincipal(new ClaimsIdentity(
          new[] { new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()) },
          "test"))
      }
    };

    var result = await controller.Logout(new LogoutRequest("token"));

    var ok = Assert.IsType<OkObjectResult>(result);
    Assert.Equal(StatusCodes.Status200OK, ok.StatusCode);

    var updatedUser = await context.Users.SingleAsync();
    Assert.Null(updatedUser.RefreshTokenHash);
    Assert.Null(updatedUser.RefreshTokenExpiry);
  }

  [Fact]
  public void GetMe_ReturnsClaims()
  {
    var context = CreateDbContext();
    var controller = CreateController(context, new Mock<IJwtService>(), new Mock<IGoogleAuthService>());
    controller.ControllerContext = new ControllerContext
    {
      HttpContext = new DefaultHttpContext
      {
        User = new ClaimsPrincipal(new ClaimsIdentity(
          new[]
          {
            new Claim(ClaimTypes.NameIdentifier, "12"),
            new Claim(ClaimTypes.Email, "me@example.com"),
            new Claim(ClaimTypes.Name, "Tester")
          },
          "test"))
      }
    };

    var result = controller.GetMe();

    var ok = Assert.IsType<OkObjectResult>(result.Result);
    var payload = Assert.IsType<MeResponse>(ok.Value);
    Assert.Equal(12, payload.Id);
    Assert.Equal("me@example.com", payload.Email);
    Assert.Equal("Tester", payload.Name);
  }

  private static ApplicationDbContext CreateDbContext()
  {
    var options = new DbContextOptionsBuilder<ApplicationDbContext>()
      .UseInMemoryDatabase(Guid.NewGuid().ToString())
      .Options;
    return new ApplicationDbContext(options);
  }

  private static AuthController CreateController(
    ApplicationDbContext context,
    Mock<IJwtService> jwtService,
    Mock<IGoogleAuthService> googleAuthService,
    IDictionary<string, string?>? settings = null)
  {
    var config = new ConfigurationBuilder()
      .AddInMemoryCollection(settings ?? new Dictionary<string, string?>
      {
        { "Authentication:Jwt:RefreshTokenExpirationDays", "7" }
      })
      .Build();
    var logger = new Mock<ILogger<AuthController>>();
    return new AuthController(context, jwtService.Object, googleAuthService.Object, config, logger.Object);
  }
}
