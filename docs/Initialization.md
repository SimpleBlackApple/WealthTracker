## Initialization Guide

### Initialize Frontend
##### Install npm using nvm:
```
nvm version
nvm install lts
nvm use lts
npm -v
```
##### Install pnpm:
```
corepack enable
corepack prepare pnpm@latest --activate
pnpm -v
```
##### Create vite project
```
pnpm create vite@latest
```

##### Add tailwind CSS
```
pnpm add tailwindcss @tailwindcss/vite
pnpm approve-builds
```
Add `@import "tailwindcss";` to `src/index.css` file
Add below config to `tsconfig.json`
``` "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  }
```
Add below config to `compilerOptions` in `tsconfig.app.json` file 
```
"baseUrl": ".",
    "paths": {
      "@/*": [
        "./src/*"
      ]
    }
```


##### Resolve paths
```
pnpm add -D @types/node
```
Edit `vite.config.ts` to add `tailwind` and resolve paths:
```
import path from "path"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
})
```
##### Initialize shadcn and add button component
```
pnpm dlx shadcn@latest init
pnpm dlx shadcn@latest add button
```
##### Install tanstack query
```
pnpm add @tanstack/react-query
pnpm add -D @tanstack/react-query-devtools
```
Edit `src/main.tsx`:
```
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

const queryClient = new QueryClient()

createRoot(document.getElementById('root')!).render(
  <QueryClientProvider client={queryClient}>
    <StrictMode>
      <App />
    </StrictMode>
  </QueryClientProvider>
)
```

# Install Prettier

The ESLint has been already installed when creating vite project.  
Then we need to install prettier and eslint-config-prettier:
```
pnpm add -D prettier eslint-config-prettier eslint-plugin-prettier
```
Modify `eslint.config.js` file:
```
import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import prettier from 'eslint-plugin-prettier' // import prettier plugin
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      prettier, // add prettier plugin
    },
    rules: {
      'prettier/prettier': 'error',
      'react-refresh/only-export-components': 'off',
    },
  },
])
```
Create `.prettierrc` file:
```
{
    "semi": false,
  "trailingComma": "es5",
  "singleQuote": true,
  "printWidth": 80,
  "tabWidth": 2,
  "useTabs": false,
  "arrowParens": "avoid",
  "endOfLine": "lf"
}
```
Create `.prettierignore` file:
```
# Ignore artifacts:
node_modules
dist
build
coverage
*.min.js
*.min.css
pnpm-lock.yaml
package-lock.json
```
Add config to `package.json`:
```
{
    "scripts": {
        "lint": "pnpm exec eslint src --ext .ts,.tsx",
        "format": "pnpm exec prettier --check .",
        "check": "pnpm exec prettier --write . && pnpm exec eslint --fix src",
        "preview": "vite preview"
    }
}
```
Run code static checking and formating:
```
pnpm check
```
##### Run the initialized frontend
```
pnpm dev
``` 

### Initialize Backend

##### Create .Net project
```
dotnet new webapi --use-controllers -o WealthTrackerServer
cd WealthTrackerServer
dotnet dev-certs https --trust
```

##### Launch https server:
```
dotnet run --launch-profile https
```

##### Add Swagger
Add Swagger package
```
dotnet add package NSwag.AspNetCore
```
Configure Swagger middleware in `Program.cs`
```
var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
    app.UseSwaggerUi(options =>
    {
        options.DocumentPath = "/openapi/v1.json";
    });
}
```

##### Configure PostgresSQL
Add PostgresSQL Nuget packages
```
dotnet add package Npgsql.EntityFrameworkCore.PostgreSQL --version 9.0.2
dotnet add package Microsoft.EntityFrameworkCore.Design --version 9.0.0
dotnet add package Microsoft.EntityFrameworkCore.Tools --version 9.0.0
```
Add Config at the top of `appsetting.json`
```
"ConnectionStrings": {
    "DefaultConnection": "Host=localhost;Port=5432;Database=WealthTracker;Username=postgres;Password=xxx"
}
```

Add an Entity Model in `Models/User.cs`
```
namespace WealthTrackerServer.Models;

public class User
{
    public int Id { get; set; }
    public required string Name { get; set; }
    public required string Email { get; set; }
    public DateTime CreatedAt { get; set; }
}
```
Add DbContext in `Models/ApplicationDbContext.cs`
```
using Microsoft.EntityFrameworkCore;
namespace WealthTrackerServer.Models;

public class ApplicationDbContext : DbContext
{
    public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options)
        : base(options)
    {
    }

    // Define your DbSets (tables)
    public DbSet<User> Users { get; set; }
}
```
Register Dbcontext in `Program.cs` using DI
```
using Microsoft.EntityFrameworkCore;
using WealthTrackerServer.Models;

builder.Services.AddControllers();
builder.Services.AddOpenApi();

// Configure PostgreSQL
builder.Services.AddDbContext<ApplicationDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("DefaultConnection")));
```
##### Initialized database
Install migration tool
```
dotnet tool install --global dotnet-ef --version 9.0.1
```
Create migration file
```
dotnet ef migrations add InitialCreate
```
Apply the migration
```
dotnet ef database update
```

##### Add basic controller
Install code generator Nuget packages
```
dotnet add package Microsoft.EntityFrameworkCore.SqlServer --version 9.0.0
dotnet add package Microsoft.VisualStudio.Web.CodeGeneration.Design --version 9.0.0
dotnet tool install -g dotnet-aspnet-codegenerator --version 9.0.0
```
Generate the scaffold of controller
```
dotnet aspnet-codegenerator controller -name UserController -async -api -m User -dc ApplicationDbContext -outDir Controllers
```
Modify the "GetUser" String to compiler friendly version in post method of `Controllers/UserController.cs`
```
[HttpPost]
public async Task<ActionResult<User>> PostUser(User user)
{
    _context.Users.Add(user);
    await _context.SaveChangesAsync();

    return CreatedAtAction(nameof(GetUser), new { id = user.Id }, user);
}
```
##### Run and check the initialized backend
Run the application
```
dotnet run --launch-profile https
```
Navigate to `https://localhost:<port>/swagger`
Check the functionality using Swagger

##### Add .gitignore
```
dotnet new gitignore
```