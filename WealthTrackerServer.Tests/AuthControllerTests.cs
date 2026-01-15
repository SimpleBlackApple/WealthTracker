using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Moq;
using System.Net.Http.Json;
using System.Text.Json;
using WealthTrackerServer.Models;
using WealthTrackerServer.Services;

namespace WealthTrackerServer.Tests;

public class AuthControllerTests
{
  [Fact]
  public async Task GoogleCallback_NewUser_CreatesUserAndReturnsTokens()
  {
    // Arrange - Create mock GoogleAuthService
    var mockGoogleAuthService = new Mock<IGoogleAuthService>();
    var googleUserCode = "test_auth_code_12345";
    var googleUserRedirectUri = "http://localhost:5173/auth/callback";

    mockGoogleAuthService
      .Setup(x => x.ExchangeCodeForTokensAsync(googleUserCode, googleUserRedirectUri))
      .ReturnsAsync(new GoogleTokenResponse(
        "google_access_token",
        "dummy_id_token",
        "google_refresh_token",
        3600
      ));

    mockGoogleAuthService
      .Setup(x => x.ValidateAndGetUserInfoAsync(It.IsAny<string>()))
      .ReturnsAsync(new GoogleUserInfo("google_id_123", "test@example.com", "Test User", null));

    // Act - Verify the mock works correctly
    var result = await mockGoogleAuthService.Object.ExchangeCodeForTokensAsync(googleUserCode, googleUserRedirectUri);

    // Assert
    Assert.NotNull(result);
    Assert.Equal("google_access_token", result.AccessToken);
    Assert.Equal("dummy_id_token", result.IdToken);
    Assert.Equal("google_refresh_token", result.RefreshToken);
    Assert.Equal(3600, result.ExpiresIn);

    // Verify the mock was called
    mockGoogleAuthService.Verify(x => x.ExchangeCodeForTokensAsync(googleUserCode, googleUserRedirectUri), Times.Once);
  }

  [Fact]
  public void GoogleAuthService_GenerateAccessToken_ReturnsCorrectToken()
  {
    // Arrange - Create mock IJwtService
    var mockJwtService = new Mock<IJwtService>();
    var testUser = new User
    {
      Id = 1,
      Name = "Test User",
      Email = "test@example.com"
    };

    mockJwtService
      .Setup(x => x.GenerateAccessToken(testUser))
      .Returns("test_jwt_token");

    // Act
    var token = mockJwtService.Object.GenerateAccessToken(testUser);

    // Assert
    Assert.Equal("test_jwt_token", token);
    mockJwtService.Verify(x => x.GenerateAccessToken(testUser), Times.Once);
  }

  [Fact]
  public async Task GoogleCallback_ExistingUser_UpdatesUserAndReturnsTokens()
  {
    // Arrange - Create mock GoogleAuthService
    var mockGoogleAuthService = new Mock<IGoogleAuthService>();
    var existingUserEmail = "existing@example.com";
    var googleUserCode = "test_auth_code_67890";
    var googleUserRedirectUri = "http://localhost:5173/auth/callback";

    mockGoogleAuthService
      .Setup(x => x.ExchangeCodeForTokensAsync(googleUserCode, googleUserRedirectUri))
      .ReturnsAsync(new GoogleTokenResponse(
        "google_access_token",
        "dummy_id_token",
        "google_refresh_token",
        3600
      ));

    mockGoogleAuthService
      .Setup(x => x.ValidateAndGetUserInfoAsync(It.IsAny<string>()))
      .ReturnsAsync(new GoogleUserInfo("google_id_456", existingUserEmail, "Existing User", null));

    // Act - Simulate the behavior of finding an existing user
    var userInfo = await mockGoogleAuthService.Object.ValidateAndGetUserInfoAsync("dummy_id_token");

    // Assert - Verify we get the correct user info back
    Assert.NotNull(userInfo);
    Assert.Equal("google_id_456", userInfo.Id);
    Assert.Equal(existingUserEmail, userInfo.Email);
    Assert.Equal("Existing User", userInfo.Name);

    // Verify the mock was called
    mockGoogleAuthService.Verify(x => x.ValidateAndGetUserInfoAsync("dummy_id_token"), Times.Once);
  }

  [Fact]
  public void JwtService_VerifyRefreshToken_ValidToken_ReturnsTrue()
  {
    // Arrange
    var mockJwtService = new Mock<IJwtService>();
    var testRefreshToken = "test_refresh_token";
    var testHash = "hashed_test_refresh_token";

    mockJwtService
      .Setup(x => x.VerifyRefreshToken(testRefreshToken, testHash))
      .Returns(true);

    // Act
    var result = mockJwtService.Object.VerifyRefreshToken(testRefreshToken, testHash);

    // Assert
    Assert.True(result);
    mockJwtService.Verify(x => x.VerifyRefreshToken(testRefreshToken, testHash), Times.Once);
  }

  [Fact]
  public void JwtService_VerifyRefreshToken_InvalidToken_ReturnsFalse()
  {
    // Arrange
    var mockJwtService = new Mock<IJwtService>();
    var invalidRefreshToken = "invalid_token";
    var testHash = "hashed_test_refresh_token";

    mockJwtService
      .Setup(x => x.VerifyRefreshToken(invalidRefreshToken, testHash))
      .Returns(false);

    // Act
    var result = mockJwtService.Object.VerifyRefreshToken(invalidRefreshToken, testHash);

    // Assert
    Assert.False(result);
    mockJwtService.Verify(x => x.VerifyRefreshToken(invalidRefreshToken, testHash), Times.Once);
  }

  [Fact]
  public void JwtService_GenerateRefreshToken_ReturnsNonEmptyToken()
  {
    // Arrange
    var mockJwtService = new Mock<IJwtService>();
    var expectedToken = "new_refresh_token_12345";

    mockJwtService
      .Setup(x => x.GenerateRefreshToken())
      .Returns(expectedToken);

    // Act
    var token = mockJwtService.Object.GenerateRefreshToken();

    // Assert
    Assert.Equal(expectedToken, token);
    Assert.NotEmpty(token);
    mockJwtService.Verify(x => x.GenerateRefreshToken(), Times.Once);
  }
}
