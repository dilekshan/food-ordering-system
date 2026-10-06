# syntax=docker/dockerfile:1
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
ENV VITE_API_URL=/api
RUN npm run build

FROM caddy:2-alpine
COPY --from=build /app/dist /srv
COPY <<'EOF' /etc/caddy/Caddyfile
:{$PORT:8080} {
    root * /srv
    encode zstd gzip

    handle /api/* {
        reverse_proxy {$API_PROXY_TARGET:localhost:8000}
    }

    handle {
        try_files {path} /index.html
        file_server
    }
}
EOF
