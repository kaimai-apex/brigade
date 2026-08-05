# Single-process image: the Next.js web app. Mentorship talks to Postgres
# directly — there is no worker, scheduler, or streaming sidecar.
FROM node:22-slim AS base
ENV PNPM_HOME=/pnpm PATH=/pnpm:$PATH
RUN corepack enable && apt-get update && apt-get install -y --no-install-recommends \
      ca-certificates \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /app

FROM base AS deps
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY packages/common/package.json packages/common/
COPY apps/web/package.json apps/web/
RUN pnpm install --frozen-lockfile

FROM deps AS build
COPY . .
RUN pnpm --filter @connectpro/common build \
 && pnpm --filter @connectpro/web build

FROM build AS runtime
ENV NODE_ENV=production
USER node
CMD ["pnpm", "--filter", "@connectpro/web", "start"]
