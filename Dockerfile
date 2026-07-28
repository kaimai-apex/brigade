# One image, several entrypoints. The web, worker, scheduler and streaming
# processes all run from this artifact — so a deploy ships one thing and the
# processes cannot drift apart in dependency versions.
FROM node:22-slim AS base
ENV PNPM_HOME=/pnpm PATH=/pnpm:$PATH
RUN corepack enable && apt-get update && apt-get install -y --no-install-recommends \
      ca-certificates \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /app

# ---------------------------------------------------------------------------
# Dependencies. Copied ahead of source so a code change does not re-resolve the
# whole tree.
# ---------------------------------------------------------------------------
FROM base AS deps
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY packages/core/package.json packages/core/
COPY packages/common/package.json packages/common/
COPY apps/web/package.json apps/web/
COPY streaming/package.json streaming/
RUN pnpm install --frozen-lockfile

# ---------------------------------------------------------------------------
# Build. Only the web app needs one — core and streaming run under Node's
# type stripping.
# ---------------------------------------------------------------------------
FROM deps AS build
COPY . .
RUN pnpm --filter @connectpro/common build \
 && pnpm --filter @connectpro/web build

FROM build AS runtime
ENV NODE_ENV=production
# Never run as root: a container escape should not start with uid 0.
USER node
# Overridden per process type — see Procfile.
CMD ["pnpm", "--filter", "@connectpro/web", "start"]
