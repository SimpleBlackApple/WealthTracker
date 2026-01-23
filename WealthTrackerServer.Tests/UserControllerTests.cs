using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using WealthTrackerServer.Controllers;
using WealthTrackerServer.Models;

namespace WealthTrackerServer.Tests;

public class UserControllerTests
{
  [Fact]
  public async Task GetUsers_ReturnsAllUsers()
  {
    var context = CreateDbContext();
    context.Users.AddRange(
      new User { Name = "User One", Email = "one@example.com", CreatedAt = DateTime.UtcNow },
      new User { Name = "User Two", Email = "two@example.com", CreatedAt = DateTime.UtcNow });
    await context.SaveChangesAsync();

    var controller = new UserController(context);

    var result = await controller.GetUsers();

    var users = Assert.IsType<List<User>>(result.Value);
    Assert.Equal(2, users.Count);
  }

  [Fact]
  public async Task GetUser_WhenMissing_ReturnsNotFound()
  {
    var context = CreateDbContext();
    var controller = new UserController(context);

    var result = await controller.GetUser(42);

    Assert.IsType<NotFoundResult>(result.Result);
  }

  [Fact]
  public async Task PostUser_CreatesUser()
  {
    var context = CreateDbContext();
    var controller = new UserController(context);
    var user = new User { Name = "New User", Email = "new@example.com", CreatedAt = DateTime.UtcNow };

    var result = await controller.PostUser(user);

    var created = Assert.IsType<CreatedAtActionResult>(result.Result);
    var payload = Assert.IsType<User>(created.Value);
    Assert.Equal("New User", payload.Name);
    Assert.Single(context.Users);
  }

  [Fact]
  public async Task PutUser_IdMismatch_ReturnsBadRequest()
  {
    var context = CreateDbContext();
    var controller = new UserController(context);
    var user = new User { Id = 1, Name = "Mismatch", Email = "mismatch@example.com", CreatedAt = DateTime.UtcNow };

    var result = await controller.PutUser(2, user);

    Assert.IsType<BadRequestResult>(result);
  }

  [Fact]
  public async Task DeleteUser_RemovesUser()
  {
    var context = CreateDbContext();
    var user = new User { Name = "Delete Me", Email = "delete@example.com", CreatedAt = DateTime.UtcNow };
    context.Users.Add(user);
    await context.SaveChangesAsync();

    var controller = new UserController(context);

    var result = await controller.DeleteUser(user.Id);

    Assert.IsType<NoContentResult>(result);
    Assert.Empty(context.Users);
  }

  private static ApplicationDbContext CreateDbContext()
  {
    var options = new DbContextOptionsBuilder<ApplicationDbContext>()
      .UseInMemoryDatabase(Guid.NewGuid().ToString())
      .Options;
    return new ApplicationDbContext(options);
  }
}
