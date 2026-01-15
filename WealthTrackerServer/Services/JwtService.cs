using System.Security.Claims;
using System.Security.Cryptography;
using Microsoft.IdentityModel.Tokens;
using WealthTrackerServer.Models;

namespace WealthTrackerServer.Services;

public class JwtService : IJwtService
{
  private readonly IConfiguration _configuration;
  private readonly RSA _rsa;

  public JwtService(IConfiguration configuration)
  {
    _configuration = configuration;

    var privateKeyPath = _configuration["Authentication:Jwt:RsaPrivateKeyPath"];
    if (string.IsNullOrEmpty(privateKeyPath))
    {
      throw new InvalidOperationException("JWT RSA private key path is not configured");
    }

    _rsa = RSA.Create();
    _rsa.ImportFromPem(File.ReadAllText(privateKeyPath));
  }

  public string GenerateAccessToken(User user)
  {
    var issuer = _configuration["Authentication:Jwt:Issuer"];
    var audience = _configuration["Authentication:Jwt:Audience"];
    var expiryMinutes = int.Parse(_configuration["Authentication:Jwt:AccessTokenExpirationMinutes"]!);

    var claims = new List<Claim>
    {
      new(ClaimTypes.NameIdentifier, user.Id.ToString()),
      new(ClaimTypes.Email, user.Email),
      new(ClaimTypes.Name, user.Name),
      new("jti", Guid.NewGuid().ToString())
    };

    var credentials = new SigningCredentials(
      new RsaSecurityKey(_rsa),
      SecurityAlgorithms.RsaSha256
    );

    var token = new System.IdentityModel.Tokens.Jwt.JwtSecurityToken(
      issuer: issuer,
      audience: audience,
      claims: claims,
      expires: DateTime.UtcNow.AddMinutes(expiryMinutes),
      signingCredentials: credentials
    );

    return new System.IdentityModel.Tokens.Jwt.JwtSecurityTokenHandler().WriteToken(token);
  }

  public string GenerateRefreshToken()
  {
    var randomBytes = new byte[64];
    using var rng = RandomNumberGenerator.Create();
    rng.GetBytes(randomBytes);
    return Convert.ToBase64String(randomBytes);
  }

  public string HashRefreshToken(string refreshToken)
  {
    return BCrypt.Net.BCrypt.HashPassword(refreshToken);
  }

  public bool VerifyRefreshToken(string token, string hash)
  {
    return BCrypt.Net.BCrypt.Verify(token, hash);
  }

  public ClaimsPrincipal? ValidateToken(string token)
  {
    var issuer = _configuration["Authentication:Jwt:Issuer"];
    var audience = _configuration["Authentication:Jwt:Audience"];

    var publicKeyPath = _configuration["Authentication:Jwt:RsaPublicKeyPath"];
    if (string.IsNullOrEmpty(publicKeyPath))
    {
      throw new InvalidOperationException("JWT RSA public key path is not configured");
    }

    using var rsa = RSA.Create();
    rsa.ImportFromPem(File.ReadAllText(publicKeyPath));

    var tokenHandler = new System.IdentityModel.Tokens.Jwt.JwtSecurityTokenHandler();
    var validationParameters = new TokenValidationParameters
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

    try
    {
      return tokenHandler.ValidateToken(token, validationParameters, out _);
    }
    catch
    {
      return null;
    }
  }
}
