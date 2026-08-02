# Backlog

Working list for the overnight improvement loop. One item per iteration, verified
end-to-end against the local stack on :3100, with `pnpm verify` and all specs green.

Ground rules: never fabricate data or payments; a feature is not done until it
has been exercised through the real UI or the real API.

## Handoff — ADPList-style mentor marketplace (objectives)

Goal: anyone can become a mentor; Brigade hosts the infra (Vercel + Supabase).
Mentorship already runs on direct-Postgres (no Docker microservices required).

### P0 — money path — **DONE** (migration 016, see `docs/STRIPE-SETUP.md`)
1. ~~Stripe Connect onboarding UI~~ — `/mentorship/setup?step=payouts` + `GET/POST /api/mentorship/me/payouts`. `payout_account_id` is stored as soon as the account is created (not on return), so an abandoned attempt does not strand a new Stripe account each time. `payouts_enabled` is always **read back from Stripe**, never inferred from the mentor landing on the return URL.
2. ~~Gate publish on `payouts_enabled`~~ — `evaluateReadiness()` in `lib/mentorship/readiness.ts` drives both the checklist and the `PUT /api/mentorship/me` gate, so the button and the server cannot disagree. Only required when a paid session exists **and** Stripe is configured, so free-only mentors and Stripe-less deployments are not blocked.
3. ~~Booking → Checkout~~ — `POST /api/mentorship/bookings` returns `checkoutUrl`; the panel redirects. Free sessions confirm immediately; with no Stripe configured the old manual-confirm path still runs.
4. ~~Webhook~~ — `POST /api/stripe/webhook`. Signature verified with node crypto (replay window, constant-time compare, rotation-safe); idempotent via `mentorship.webhook_events`; a failed handler releases its claim so Stripe's retry is not skipped as a duplicate.
5. ~~Unpaid hold reaper~~ — already existed; the window is now **45 minutes against Stripe's 30**, so a payment landing late cannot race the reaper. If it happens anyway the webhook detects the stranded charge and refunds it.
6. ~~Refund policy~~ — `refundForCancellation()`: full outside 24h, none inside, mentor-cancel always full. Refunds reverse both the transfer and the application fee.

### P1 — become-a-mentor funnel — **DONE except vetting**
7. ~~Apply flow~~ — `/mentorship/setup`, a six-step resumable wizard. `/mentorship` is now a dashboard that links into it rather than a second editor for the same rows.
8. **Vetting / admin approve — deliberately NOT built.** Auto-publish was chosen; `status` already has the states to add review later without a migration.
9. ~~Onboarding checklist~~ — the readiness model above, shown as a progress bar and a checklist, with each blocking item linking to the step that fixes it.
10. ~~Timezone picker~~ — `Intl.supportedValuesOf("timeZone")`, with a warning when the mentor's stored zone disagrees with their browser.
11. ~~Mentor-owned expertise tags~~ — `mentorship.mentors.expertise`, suggested-but-free-text, de-duplicated case-insensitively and capped at 12 so the directory facets stay usable. **Discovery genuinely resolves them**: `EFFECTIVE_EXPERTISE` in `mentorship-db.ts` prefers the mentor's own tags and falls back to `users.profiles.expertise_areas`, so mentors who predate the field keep their facets. The `?expertise=` filter matches *either* side, so links already in the wild cannot start returning nothing. Free-text search now also covers mentor tags and the mentor bio.

### Still open from this area
- Mentor **reviews** after completed sessions (P2 #12) — still the biggest gap in making the directory worth browsing.
- **Email**. Stripe sends the payment receipt (`receipt_email`); Brigade sends in-app notifications only. A booking confirmation from Brigade itself needs a transactional provider.
- Nothing marks a past session `completed`; bookings stay `confirmed` after they happen. A scheduled sweep would let "sessions completed" and reviews mean something.

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
- [x] **Stripe Connect onboarding.** Built — see the P0 list above and
      `docs/STRIPE-SETUP.md`. A latent bug in the original seam was fixed on the
      way: `createCheckoutSession` returned `session.payment_intent`, which is
      **null at creation time** — a Checkout Session has no PaymentIntent until
      the customer starts paying. Bookings are now correlated by
      `checkout_session_id` instead, and the PaymentIntent is recorded from the
      webhook once it exists.
- [x] **Confirm bookings on payment.** Built. Bookings reach `confirmed` only
      from a settled charge, get a `BRG-XXXXXX` confirmation code, and have the
      mentor's meeting link copied on at that moment.
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
- [x] **Refunds / cancellation policy.** Built: free outside 24h, none inside,
      mentor-cancel always full. The number quoted in the confirmation dialog
      comes from the same pure function that issues the refund, so the two
      cannot drift. If Stripe rejects the refund the session still cancels and
      the failure is surfaced rather than swallowed — a cancelled session that
      claims to be booked is worse than a refund that needs chasing.
- [ ] **Mentor reviews.** Nothing captures whether a session was any good, which is
      what makes a marketplace directory worth browsing.
- [x] Timezone picker — `/mentorship/setup?step=hours`, from
      `Intl.supportedValuesOf("timeZone")` rather than a bundled list that goes
      stale whenever a country changes its rules.

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
