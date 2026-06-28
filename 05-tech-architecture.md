# 05 — Tech Architecture

> Written for Kai (technical cofounder). Opinionated defaults below — optimized for a 1–2 engineer team, SEO-criticality, and cheap-to-start. Swap anything you have a strong reason to.

## The single most important architectural constraint

**The discovery layer must be server-rendered and SEO-perfect.** The entire demand-side strategy (`07`) is "rank on Google for `private chef [city]` and `[cuisine] private chef [city]`." That makes rendering strategy a *business* decision, not just a technical one. Choose a framework with first-class SSR/SSG. This rules out a pure client-side SPA for public pages.

## Recommended stack

| Layer | Choice | Why |
|---|---|---|
| **Framework** | **Next.js (App Router) + TypeScript** | SSR/SSG/ISR for SEO on public profiles + directory; full-stack (API routes) so a small team ships one codebase. |
| **Styling** | Tailwind CSS + a component lib (shadcn/ui) | Fast, consistent; wife (UX/UI) designs tokens, devs implement. |
| **DB** | **PostgreSQL** (Supabase or Neon) | Relational fits the data model; Supabase bundles auth + storage + row-level security to move fast. |
| **Auth** | Supabase Auth / Clerk / Auth.js | Pick one; don't hand-roll. Need chef + employer + admin roles. |
| **File/media** | Supabase Storage or Cloudinary | Galleries; Cloudinary if you want auto image optimization (matters for SEO/page speed). |
| **Search** | Postgres full-text + filters (MVP) → Typesense/Meilisearch/Algolia (later) | Don't over-engineer search at launch; structured filters cover the MVP. |
| **Payments/billing** | **Stripe** — Billing for subscriptions; Connect *only* if/when you add the opt-in payments rail | Industry standard; Billing handles Pro tier + featured placement. |
| **Email/transactional** | Resend or Postmark | Inquiry notifications, review requests, deposit reminders. |
| **Hosting** | Vercel (app) + Supabase/Neon (DB) | Near-zero ops for a small team; scales fine to first 10k+ users. |
| **Mobile (Phase 10)** | React Native (Expo) | Reuse TS logic/types from web; one team, two platforms. |
| **Analytics/product** | PostHog | Events, funnels, feature flags, session insight in one. |
| **Background jobs** | Vercel Cron / Inngest | Review-request scheduling, reminders, SEO sitemap regen. |
| **AI features** | Anthropic API (Claude) | Menu generation, inquiry triage/auto-reply drafts, profile-writing assist — cheap differentiation for a tiny team. |

## High-level architecture

```
                 ┌────────────────────────────────────────┐
   Google ─SEO─▶ │  Next.js (Vercel)                       │
   Buyers ─────▶ │  • public directory + profiles (SSG/ISR)│
   Chefs  ─────▶ │  • authed app (chef tools, employer)    │
                 │  • API routes / server actions          │
                 └───────────────┬────────────────────────┘
                                 │
              ┌──────────────────┼──────────────────┐
              ▼                  ▼                  ▼
        PostgreSQL          Storage/CDN          Stripe
        (Supabase)        (images/video)       (billing)
              │
        Resend/Postmark (email) · PostHog (analytics) · Claude API (AI)
```

## Build-vs-buy decisions

**Buy / don't build:** auth, payments, email delivery, image hosting/optimization, background-check + ID verification (integrate a provider like Checkr/Persona, never build), e-sign (Phase 2, integrate). **Build:** the profile/directory/SEO surface, the inquiry→quote→booking workflow, the chef tools UX. That's the actual product; everything else is plumbing.

## SEO architecture (because demand depends on it)

- Public profiles + directory pages: **statically generated / ISR**, fast, semantic HTML, structured data (`schema.org/LocalBusiness` or `Person` + `Service`), clean canonical URLs.
- **Programmatic SEO:** generate indexable pages for `[city]`, `[cuisine] + [city]`, `[occasion] + [city]` from the chef dataset. This is the growth engine — architect the routing + sitemap for it from day one.
- Core Web Vitals matter for ranking → image optimization + minimal client JS on public pages is non-negotiable.

## Security / compliance notes (early, lightweight)

- PII: chefs' and clients' contact details, possibly background-check data → encrypt at rest, least-privilege access, row-level security.
- Payments: stay PCI-light by never touching card data directly (Stripe-hosted).
- Verification data (IDs, certs) is sensitive — store via the verification provider where possible, keep only pass/fail + reference.
- Get the privacy policy + terms reviewed by a lawyer before the directory goes public (you're publishing people's professional data).

## Scaling posture

Don't pre-scale. The recommended stack comfortably handles the first city and several after it. Revisit dedicated search, read replicas, caching layers, and a separate API service only when real load or team size demands it — not before.
