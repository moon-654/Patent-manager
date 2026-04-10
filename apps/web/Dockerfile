FROM node:20-bookworm-slim AS builder

WORKDIR /app

ARG API_PROXY_TARGET=""
ENV API_PROXY_TARGET=$API_PROXY_TARGET

COPY package.json package-lock.json ./
COPY apps/web/package.json apps/web/package.json
COPY apps/api/package.json apps/api/package.json

RUN npm ci
RUN npm install --workspace web --no-save lightningcss-linux-x64-gnu@1.32.0 @tailwindcss/oxide-linux-x64-gnu@4.2.2

COPY apps/web ./apps/web

RUN npm run build --workspace web

FROM node:20-bookworm-slim AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=8080

COPY --from=builder /app/package.json /app/package-lock.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/web ./apps/web

CMD ["sh", "-c", "node apps/web/node_modules/next/dist/bin/next start apps/web --port ${PORT:-8080}"]
