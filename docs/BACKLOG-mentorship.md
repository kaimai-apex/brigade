# Backlog

Working list for the overnight improvement loop. One item per iteration, verified
end-to-end against the local stack on :3100, with `pnpm verify` and all specs green.

Ground rules: never `git push`; never fabricate data or payments; a feature is not
done until it has been exercised through the real UI or the real API.

## Mentorship marketplace

Shipped: schema (`mentorship` schema, migration 012/013), pricing + slot engine
(38 assertions), direct-DB data layer, 7 API routes, mentor directory, mentor
profile with booking panel, mentor management page.

- [x] **Sessions view.** `/sessions` renders both sides of the calendar with cancel,
      status, and a fee line written from each party's point of view. Verified by
      booking and cancelling through the UI.
- [ ] **Stripe Connect onboarding.** `payments.ts` has the provider seam and the
      account-link call; nothing calls it yet. Mentor needs a "get paid" flow, and
      `payouts_enabled` must gate publishing paid sessions.
- [ ] **Confirm bookings on payment.** Bookings sit at `pending_payment` forever.
      Needs the Stripe webhook (`checkout.session.completed`) to move them to
      `confirmed`, and a reaper to release holds that never pay.
- [x] **Availability exceptions UI.** "Time off" on `/mentorship`, with routes at
      `/api/mentorship/me/exceptions`. Blocking a window that already contains a
      booking is refused rather than silently double-committing the mentor. Dates
      are anchored to the *mentor's* timezone, not the browser's — entering
      "Sep 1–3" for a Tokyo mentor from a New York browser stores Tokyo midnight
      to midnight, and reads back the same.
- [x] **Meeting links + mentor acceptance.** A booking had no way out of
      `pending_payment`, so no session could ever happen. The mentor now accepts a
      booking (`POST /api/mentorship/bookings/:id/confirm`), which copies their
      standing meeting room onto it; the mentee sees "Join the call". Links are
      validated https-only on save — `javascript:` and `http:` are rejected.
      **Refused with 409 once payments are configured**, since a settled charge is
      what confirms a session then; leaving it open would be a button that gives
      paid sessions away. Verified by restarting the app with STRIPE_SECRET_KEY set.
      Copied onto the booking rather than referenced live, so changing your room
      later cannot rewrite a session that already happened.
- [ ] **Refunds / cancellation policy.** Cancelling frees the slot but has no money
      semantics. Needs a policy (e.g. free >24h out) before real payments.
- [ ] **Mentor reviews.** Nothing captures whether a session was any good, which is
      what makes a marketplace directory worth browsing.
- [ ] Timezone picker on the mentor page — currently inherits the browser zone at
      setup and can only be changed via the API.

## Known issues found during QA

- [x] **`pnpm verify` flake (exit 139)** — not turbo. Node crashes in its own
      static-destructor teardown when `process.exit()` is called (`OptionsParser`
      dtor → `_xzm_free`), on Node 24 / current macOS. Measured 14/150 with
      `process.exit(0)` vs 0/150 with `process.exitCode`. The three check scripts
      now set `exitCode` and drain; verify went 1/10 → 0/15. Written up in
      `scripts/README-exit-codes.md`. CI pins Node 22 via `.nvmrc`, so this mainly
      hit local machines and the pre-push hook.
      Residual: tsc/eslint/turbo subprocesses still call `exit()` internally and
      are outside our control — if 139s reappear, that is where to look.
- [x] **My Brigades is localStorage-only** — now real rows
      (`connections.brigade_teams` + `brigade_team_members`, migration 013/014) behind
      `/api/brigade-teams`. Members are intersected with the owner's *accepted*
      connections in SQL, so a crafted request cannot assemble a team of strangers.
      `importLegacyTeams()` moves anything left in localStorage on first load and only
      clears the key after every team is written; unparseable local data is left alone
      rather than destroyed. Also fixed the member picker, which rendered truncated
      UUIDs instead of names — it now uses the existing `usePersonNames` hook.
- [ ] **No Activity section on profiles** — a member's posts are not visible from
      their profile.
- [ ] **Prod cannot read notifications**… fixed via `/api/notifications`, but the
      same gateway-proxy problem still applies to feed, messages and search: those
      call `/api/connectpro/*`, which resolves to an unreachable localhost:3000 on
      Vercel. Either host the services or port each to direct-DB.
- [ ] `/explore/*` subpages all redirect to a "Coming soon" `/explore`.
- [ ] Unknown profile ids render the raw unstyled Next 404 rather than a branded one.
- [ ] `connections.connections` has no foreign keys. Both writers now validate in
      application code (web + connection-service); a schema-level fix would need to
      cross a schema boundary, which nothing else in this database does.

## Done in this session

- Kafka consumers reconnect instead of disabling permanently after ~8s; producer no
  longer caches a failed connection. Verified by cold-starting against a dead broker
  and watching every consumer self-heal.
- Reactions invalidate the cached feed (`post.reacted` → feed-service), including
  type changes and unreacts.
- Brigade invitations and acceptances notify the other party on the direct-DB path.
- `/admin` gated on `SYSTEM_ADMIN`/`MODERATOR` from the signed JWT.
- Directory toolbar wraps at 375px — was giving every page a horizontal scroll.
- `followerCount` cast to int; `"1" + 1` no longer renders `11` on follow.
