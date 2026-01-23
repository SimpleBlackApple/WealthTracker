# Testing Guide

This project uses TDD (Test-Driven Development) methodology with the following testing stack:

- **Backend**: xUnit + Moq + EF Core InMemory
- **Frontend**: Vitest + React Testing Library
- **Market Data Service**: Python `unittest`
- **E2E**: Playwright (optional)

## Running Tests

### Backend Tests (xUnit)

```bash
# Run all backend tests
cd WealthTrackerServer.Tests
dotnet test
dotnet test --verbosity normal

# Run with detailed output
dotnet test --logger "console;verbosity=detailed"

# Run a specific test
dotnet test --filter "FullyQualifiedName~TestName"
```

### Frontend Tests (Vitest)

```bash
# From project root
cd WealthTrackerClient

# Run all tests once
pnpm test:run

# Run tests in watch mode
pnpm test

# Run tests with UI
pnpm test:ui
```

### Market Data Service Tests (Python)

```bash
cd MarketDataService
python -m unittest discover -s tests
```

## Test Structure

### Backend Tests

```
WealthTrackerServer.Tests/
  AuthControllerTests.cs               # Auth endpoint tests
  MarketDataClientTests.cs             # Market data client tests
  ScannerControllerTests.cs            # Scanner controller unit tests
  ScannerControllerIntegrationTests.cs # Scanner controller integration tests
  UserControllerTests.cs               # User controller tests
```

### Frontend Tests

```
WealthTrackerClient/src/
  stores/
    authStore.test.ts                  # Zustand store tests
  features/auth/
    services/
      authService.test.ts              # API service tests
    components/
      AuthCallback.test.tsx
      LoginButton.test.tsx
      LogoutButton.test.tsx
    hooks/
      useAuthGuard.test.ts
  features/scanners/
    pages/
      ScannersPage.test.tsx
    services/
      scannerService.test.ts
```

### Market Data Service Tests

```
MarketDataService/tests/
  test_app.py
```

## Windows-Specific Notes

### Before Running Backend Tests

If you get file locking errors, kill any running server process:

```powershell
# PowerShell
Stop-Process -Name WealthTrackerServer -Force

# Or cmd
taskkill /F /IM WealthTrackerServer.exe
```

### Common Issues

| Issue | Solution |
|-------|----------|
| File locked during build | Kill running server process first |
| Tests hanging | Use `run_in_background: true` for long-running commands |
| `dotnet test` timeout | Run tests directly without background mode |

## Test Coverage

Current test counts:
- Backend: 19 tests (xUnit)
- Frontend: 25 tests (Vitest)
- Market Data Service: 9 tests (unittest)
- Total: 53 tests

All tests should pass before committing changes.
