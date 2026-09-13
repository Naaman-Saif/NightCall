FROM node:22-bookworm-slim AS build
WORKDIR /app
COPY web/package.json web/package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY web/index.html web/vite.config.ts web/tsconfig.json ./
COPY web/public ./public
COPY web/src ./src
RUN npm run build

FROM caddy:2-alpine
COPY status/Caddyfile /etc/caddy/Caddyfile
COPY --from=build /app/dist /srv/www
