# Turning on payments

## Book a call first (simple — no Connect)

Product page: `/book` · API: `POST /api/book-call` · CA$20 / 30 min · currency `cad`.

Money goes to **Brigade's Stripe account** (platform Checkout). No Express
accounts, no marketplace fee split. Marketplace Connect is optional later.

Minimum to take a real payment (live mode):

1. Stripe Dashboard — stay in **Live** (not Test)
2. **Developers → API keys** → copy **Secret key** (`sk_live_…`)
3. Set `STRIPE_SECRET_KEY=sk_live_…` in Vercel (Production) and local `.env` if you use it
4. Set `NEXT_PUBLIC_SITE_URL=https://www.joinbrigade.co`
5. **Developers → Webhooks → Add endpoint** (live endpoint, not test):
   - URL: `https://www.joinbrigade.co/api/stripe/webhook`
   - Event: `checkout.session.completed`
   - Copy signing secret → `STRIPE_WEBHOOK_SECRET`
6. Redeploy, open `/book`, pay with a real card (CA$20)

You do **not** need Product catalog prices in Stripe for this — the app sends
`price_data` (2000 CAD cents) at Checkout time.

---

## Mentorship marketplace (Connect — later)

The mentorship marketplace is built and works today **without** Stripe: mentors
publish, people book, and the mentor accepts each booking by hand and settles
off-platform. This document is what turns that into a real money path.

Nothing here is optional-but-nice. Until both variables below are set, the app
deliberately treats payments as off — see "What 'off' means" at the bottom.

## 1. The Stripe account

Brigade takes a cut of a payment between two other parties, which is what Stripe
Connect's **destination charges** are for: the mentee is charged, an
`application_fee_amount` stays with Brigade, and the remainder settles to the
mentor's own connected account. Stripe holds the money, the card details and the
identity checks, so Brigade never becomes a money transmitter.

In the Stripe dashboard:

1. **Enable Connect.** Settings → Connect. Choose **Express** accounts — the code
   creates them with `type: express` and sends mentors to Stripe's hosted
   onboarding form (`apps/web/src/lib/server/payments.ts`, `createAccountLink`).
2. **Set your platform branding** (Connect → Branding). Mentors see this on the
   onboarding screens, so it should say Brigade.
3. Stay in **test mode** until you have run the smoke test in section 5.

## 2. Environment variables

Set these wherever the app runs (Vercel project settings for production, `.env`
locally):

| Variable | Example | Why |
| --- | --- | --- |
| `STRIPE_SECRET_KEY` | `sk_test_…` / `sk_live_…` | Lets Brigade call Stripe. |
| `STRIPE_WEBHOOK_SECRET` | `whsec_…` | Lets Brigade verify Stripe is the caller. |
| `NEXT_PUBLIC_SITE_URL` | `https://www.joinbrigade.co` | Builds the return, success and cancel URLs. Wrong here means mentors come back from Stripe onto the wrong host. |
| `STRIPE_PLATFORM_FEE_BPS` | `2000` | Optional. Platform fee in basis points (2000 = 20%). Defaults to **20%** if unset. Clamped to 0–5000. |

## API paths (canonical vs aliases)

Money lives under mentorship routes. Thin aliases match common marketplace docs:

| Role | Canonical | Alias (same handler) |
| --- | --- | --- |
| Start / resume Connect Express onboarding | `POST /api/mentorship/me/payouts` | `POST /api/connect/create-account`, `POST /api/connect/refresh` |
| Read payout status from Stripe | `GET /api/mentorship/me/payouts` | — |
| Hold slot + create Checkout Session | `POST /api/mentorship/bookings` | `POST /api/checkout` (`sessionTypeId` + `startsAt`; resolves mentor from the session type) |
| Stripe webhooks | `POST /api/stripe/webhook` | `POST /api/webhooks/stripe` |

Prefer the **canonical** URLs in the Stripe Dashboard and in production clients. Aliases exist for prompt/docs parity and must not grow a second money path.

Checkout uses dynamic `price_data` from `mentorship.session_types.price_cents` (database is source of truth — no Stripe Products/Prices per mentor). Destination charges send `application_fee_amount` to Brigade and `transfer_data.destination` to the mentor's Express account.

The two Stripe values are separate on purpose. The secret key proves Brigade is
talking to Stripe; the webhook secret proves Stripe is talking to Brigade. The
webhook endpoint is public, and its signature check is the entire authentication
story — so with no `STRIPE_WEBHOOK_SECRET` set, the route refuses every request
with `503` rather than trusting the body.

## 3. The webhook endpoint

Stripe dashboard → Developers → Webhooks → Add endpoint.

- **URL:** `https://www.joinbrigade.co/api/stripe/webhook`
  (alias `…/api/webhooks/stripe` also works; pick one and stick to it)
- **Events to send:**
  - `checkout.session.completed` — the one that turns a held slot into a
    confirmed session. Without it, every paid booking stays `pending_payment`
    forever and the mentee is charged for nothing. The handler also checks
    `payment_status === paid` and that `amount_total` matches the booking row.
  - `charge.refunded` — records refunds issued from the Stripe dashboard, so
    Brigade's view of a booking cannot disagree with Stripe's.
  - `account.updated` — syncs `payouts_enabled` when Stripe finishes reviewing
    (or restricts) a Connect Express account, so mentors do not need to reopen
    the payouts step for charges to unlock.

Copy the signing secret it gives you into `STRIPE_WEBHOOK_SECRET`.

The endpoint is allowlisted in `apps/web/src/middleware.ts` (Stripe has no
Brigade session). It is idempotent: Stripe retries until it sees a `2xx` and
sometimes after, so each event id is claimed once in
`mentorship.webhook_events`. A redelivery is acknowledged and does nothing.

## 4. Local testing

```bash
stripe listen --forward-to localhost:3100/api/stripe/webhook
```

`stripe listen` prints its own `whsec_…` — use **that** one locally, not the
dashboard endpoint's. Then run the app with both variables set and book a paid
session with card `4242 4242 4242 4242`.

## 5. Smoke test before going live

1. As a mentor: `/mentorship/setup` → step 5 → **Connect Stripe** → finish
   Stripe's form → return. The step should read "Stripe is connected."
2. Publish a paid session.
3. As a different account, book it. You should land on Stripe Checkout, not on a
   confirmation.
4. Pay. You should return to `/sessions/<id>?paid=1`, see "Payment received —
   confirming your session…", and within a second or two the receipt with a
   `BRG-XXXXXX` code and the mentor's meeting link.
5. Check the Stripe dashboard: the payment shows an application fee to the
   platform and a transfer to the mentor's account.
6. Cancel the booking more than 24 hours out and confirm the refund appears in
   Stripe with the application fee reversed.

## Two flags, and which one to use

There are two different questions, and mixing them up strands bookings:

| Function | Asks | Governs |
| --- | --- | --- |
| `paymentsConfigured()` | is there a secret key? | whether a mentor can connect Stripe at all, whether payouts are required to publish, whether a refund can be issued |
| `paymentsFullyConfigured()` | key **and** webhook secret? | which path a booking takes, whether the mentor may accept by hand, whether the button says "Continue to payment" |

Anything that decides **how a booking is confirmed** must use
`paymentsFullyConfigured()`. The booking route and the manual-confirm route
have to agree: they once didn't, and with a key but no webhook secret a paid
booking took the manual path and was then refused acceptance, leaving it at
`pending_payment` with no way out for either party. The API exposes both as
`paymentsConfigured` and `takingPayments` so the UI cannot pick the wrong one
by accident.

## What "off" means

`paymentsFullyConfigured()` requires **both** variables. With either missing:

- Booking a paid session creates a `pending_payment` hold and notifies the
  mentor, who confirms it by hand (`POST /api/mentorship/bookings/:id/confirm`).
- That manual confirm route returns `409` once payments **are** configured — a
  settled charge is what confirms a session then, and leaving the button open
  would hand out paid sessions for free.
- Publishing is not gated on payouts, so mentors are not blocked from listing on
  a deployment that cannot take money at all.

Free (zero-price) sessions never involve Stripe and confirm immediately, whether
payments are on or off.

## Money rules, and where they live

- **Platform fee: 20% by default** (`getPlatformFeeBps()` in
  `apps/web/src/lib/mentorship/pricing.ts`, override with `STRIPE_PLATFORM_FEE_BPS`).
  Every booking freezes its own price, fee rate and split at booking time, so
  changing the env never rewrites an old receipt.
- **Cancellation:** full refund more than 24 hours out, none inside; a mentor
  cancelling always refunds in full (`refundForCancellation`, same file). The
  figure quoted in the confirmation dialog comes from the same function that
  issues the refund.
- **Refunds reverse both sides** (`reverse_transfer` + `refund_application_fee`).
  Omit either and Brigade funds the refund out of its own balance.
- **Holds:** Stripe Checkout expires after 30 minutes; Brigade releases the slot
  after 45 (`apps/web/src/lib/mentorship/holds.ts`). The gap is deliberate — if
  they were equal, a payment landing in the last second could be charged after
  the slot was already released. If it ever happens anyway, the webhook detects
  it and refunds automatically.

## A warning about `DATABASE_URL`

As of this writing the repo's `.env` points `DATABASE_URL` at the **hosted
Supabase pooler**, so `pnpm dev:web` reads and writes **production**. Use the
`brigade-local-db` launch configuration (or set `DATABASE_URL` and `AUTH_SCHEMA`
inline) for anything that creates rows. Getting this wrong once means test
mentors published on the live directory.
