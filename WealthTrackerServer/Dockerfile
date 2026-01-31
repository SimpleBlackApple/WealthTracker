FROM mcr.microsoft.com/dotnet/sdk:9.0 AS build
WORKDIR /src

COPY WealthTracker.sln ./
COPY WealthTrackerServer/WealthTrackerServer.csproj WealthTrackerServer/
COPY WealthTrackerServer.Tests/WealthTrackerServer.Tests.csproj WealthTrackerServer.Tests/
RUN dotnet restore WealthTrackerServer/WealthTrackerServer.csproj

COPY . .
RUN dotnet publish WealthTrackerServer/WealthTrackerServer.csproj -c Release -o /app/publish

FROM mcr.microsoft.com/dotnet/aspnet:9.0 AS runtime
WORKDIR /app
COPY --from=build /app/publish ./

ENV DOTNET_EnableDiagnostics=0

CMD ["sh", "-c", "ASPNETCORE_URLS=http://0.0.0.0:${PORT:-5141} dotnet WealthTrackerServer.dll"]

