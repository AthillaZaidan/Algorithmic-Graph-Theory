FROM node:22-slim AS builder

RUN apt-get update \
    && apt-get install -y g++ make \
    && rm -rf /var/lib/apt/lists/*
RUN corepack enable && corepack prepare bun@1.2.9 --activate

WORKDIR /app

# Build C++ engine
COPY backend/ /app/backend/
RUN cd /app/backend && make

# Install frontend deps
COPY frontend/package.json frontend/bun.lock* /app/frontend/
RUN cd /app/frontend && bun install --frozen-lockfile

# Build frontend (produces standalone output)
COPY frontend/ /app/frontend/
RUN cd /app/frontend && bun run build

# ---- Runner ----
FROM node:22-slim
RUN corepack enable && corepack prepare bun@1.2.9 --activate

WORKDIR /app/frontend

# C++ engine
COPY --from=builder /app/backend/graph_engine /app/backend/graph_engine

# Standalone Next.js server
COPY --from=builder /app/frontend/.next/standalone /app/frontend/
# Static assets (not included in standalone by default)
COPY --from=builder /app/frontend/.next/static /app/frontend/.next/static
COPY --from=builder /app/frontend/public /app/frontend/public

ENV CPP_ENGINE_PATH=/app/backend/graph_engine
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
EXPOSE 3000

CMD ["bun", "run", "server.js"]