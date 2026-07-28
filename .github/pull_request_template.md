## What changed

<!-- One or two sentences. Why, not just what. -->

## Checklist

- [ ] Every list this touches has a designed empty state — real records or an
      invitation to act, never placeholder data
- [ ] State changes go through a service; no writes in a route handler
- [ ] Any new migration is additive, has a tested rollback, and creates indexes
      `CONCURRENTLY` against a populated table (see `docs/MIGRATIONS.md`)
- [ ] No hex colours outside `apps/web/src/app/tokens.css`
- [ ] `pnpm verify` passes locally
