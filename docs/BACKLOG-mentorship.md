# Backlog

Working list for the overnight improvement loop. One item per iteration, verified
end-to-end against the local stack on :3100, with `pnpm verify` and all specs green.

Ground rules: never fabricate data or payments; a feature is not done until it
has been exercised through the real UI or the real API.

## Handoff — ADPList-style mentor marketplace (objectives)

Goal: anyone can become a mentor; Brigade hosts the infra (Vercel + Supabase).
Mentorship already runs on direct-Postgres (no Docker microservices required).

### P0 — money path (blocks real marketplace)
1. Stripe Connect onboarding UI on `/mentorship` (“Get paid”) using `createAccountLink` in `apps/web/src/lib/server/payments.ts`; persist `payout_account_id` / `payouts_enabled`.
2. Gate publish of paid session types on `payouts_enabled`.
3. Wire booking → Stripe Checkout (`createCheckoutSession`); stop leaving paid books at `pending_payment`.
4. Stripe webhook `checkout.session.completed` → booking `confirmed` (+ meeting URL).
5. Unpaid hold reaper (expire/cancel stale `pending_payment` beyond hold window).
6. Refund / cancel money policy (e.g. free cancel >24h out) before charging real cards.

### P1 — become-a-mentor funnel
7. Public “Become a mentor” apply flow (not only logged-in upsert on `/mentorship`).
8. Optional vetting / admin approve before `status=active` (quality control).
9. Mentor onboarding checklist: photo, headline, bio, expertise tags, session types, weekly hours, meeting URL, payouts.
10. Timezone picker on mentor setup (today: browser TZ at create; API-only change).
11. Mentor-owned expertise tags (discovery today leans on `users.profiles.expertise_areas`).

### P2 — discovery & trust
12. Reviews / ratings after completed sessions; show on cards + profile.
13. Richer directory signals: next available slot, rating, sessions completed.
14. Calendar sync (Google/Outlook) or ICS download for confirmed bookings.
15. Email (and optional SMS) for book / confirm / cancel / reminder (Kit or transactional provider).

### P3 — hosted infra cleanup
16. Keep mentorship on Supabase `DATABASE_URL` (pooler) in Vercel + local `.env` — no Docker for marketplace.
17. Decide fate of ConnectPro microservices for feed/DMs/search: deploy gateway stack **or** port those routes to direct-DB like mentorship (`/api/connectpro/*` → localhost is broken on Vercel).
18. Optional Redis for live notification SSE in prod; otherwise in-app notify rows only.
19. Seed / import a small set of real hospitality mentors for launch (no fabricated reviews).
20. Smoke path: apply → publish → book → pay → confirm → join link → review.

### Already shipped (do not rebuild)
- Schema + lazy `ensure-mentorship-schema`, pricing/slots, `mentorship-db`, public `/mentors` + booking panel, `/mentorship` mentor ops, `/sessions`, cancel + manual confirm when Stripe off, ADPList-style marketing home, CTA contrast fix, Supabase-hosted DB path.

## Mentorship marketplace

Shipped: schema (`mentorship` schema, migration 012/013), pricing + slot engine
(38 assertions), direct-DB data layer, 7 API routes, mentor directory, mentor
profile with booking panel, mentor management page, ADPList-style marketing home.

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
