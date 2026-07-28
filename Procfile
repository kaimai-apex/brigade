# Process types. Each scales on a different resource, so each gets its own
# autoscaling policy: web on request rate, worker on queue depth, streaming on
# connection count. The scheduler is a singleton — never run more than one.
web: pnpm --filter @connectpro/web start
worker: node --experimental-strip-types packages/core/src/bin/worker.ts
scheduler: node --experimental-strip-types packages/core/src/bin/scheduler.ts
streaming: pnpm --filter @brigade/streaming start
