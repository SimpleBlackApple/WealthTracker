FROM node:20-alpine AS build
WORKDIR /app

COPY package.json pnpm-lock.yaml ./
RUN corepack enable && pnpm install --frozen-lockfile

COPY . .
RUN pnpm build

FROM nginx:1.25-alpine AS runtime

COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx/default.conf.template /etc/nginx/templates/default.conf.template
COPY docker-entrypoint.d/20-generate-env-js.sh /docker-entrypoint.d/20-generate-env-js.sh
RUN chmod +x /docker-entrypoint.d/20-generate-env-js.sh

# No EXPOSE here on purpose: Azure Container Apps/App Service will set the port via env.

