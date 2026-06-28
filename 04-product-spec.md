# 04 — Product Spec

## Product structure: three layers

```
┌─────────────────────────────────────────────────────────┐
│  DISCOVERY LAYER  →  public, SEO-indexed, buyer-facing    │
│  directory · search/filter · public chef profiles · leads │
├─────────────────────────────────────────────────────────┤
│  CREDIBILITY LAYER → the chef's professional identity      │
│  rich profile · portfolio/gallery · menus · reviews ·      │
│  verification badges · shareable custom URL                │
├─────────────────────────────────────────────────────────┤
│  TOOLS LAYER → the chef's back-office (retention engine)   │
│  inquiry inbox · availability calendar · quote/proposal ·  │
│  invoicing & deposits · client CRM · menu builder ·        │
│  contracts · messaging · analytics                         │
└─────────────────────────────────────────────────────────┘
```

Build order is bottom-up for *value* (credibility first = useful alone) but the discovery layer must ship early enough to seed SEO. See `06`.

## Feature catalogue (by layer + priority)

Priority key: **P0** = MVP, **P1** = fast-follow, **P2** = later.

### Credibility layer
- P0 — Chef account + auth
- P0 — Rich profile: bio, experience, cuisines, service area, hourly/event rates, photo gallery
- P0 — Public profile page (clean, fast, shareable custom URL `brigade.xx/c/jordan-lee`)
- P1 — Sample menus / packages on profile
- P1 — Reviews & testimonials (collected via post-event request flow)
- P1 — Verification badges: ID, food-safety cert, insurance, background check
- P2 — Video intro, press/awards, certifications timeline

### Tools layer (the SaaS moat)
- P0 — Inquiry inbox (inbound leads land here)
- P0 — Availability calendar
- P1 — Quote / proposal builder (branded, sendable)
- P1 — Invoicing + deposit requests
- P1 — Lightweight client CRM (contacts, history, notes)
- P1 — Menu builder (reusable, attach to quotes)
- P2 — Contract / agreement templates + e-sign
- P2 — Two-way messaging (in-app)
- P2 — Analytics (profile views, inquiry → booking conversion, revenue)
- P2 — Integrations: Google Calendar, QuickBooks/Xero, Stripe payouts

### Discovery layer
- P0 — Public directory (browse chefs by city)
- P0 — Search + filter (cuisine, location, price band, availability)
- P1 — Programmatic SEO pages (chef-by-city, cuisine-by-city — see `07`)
- P1 — "Request a chef" inbound form → routes to matching chefs
- P2 — Employer accounts: post a gig, search/filter, contact (gated/paid)
- P2 — Saved searches, shortlists, comparison

### Platform / admin
- P0 — Admin dashboard: approve/verify chefs, moderate, basic metrics
- P1 — Billing (Stripe) for Pro + featured placement
- P2 — Trust & safety tooling, dispute handling, reporting

### Mobile apps (Phase 10)
- Native iOS/Android for chefs: manage inquiries, calendar, quotes on the go (chefs live on their phones between gigs). "Platform + app that works together," per Jordan.

## MVP definition (what ships in Phase 3)

> A chef can sign up, build a verified-looking professional profile with a gallery and menus, get a shareable URL, appear in a city directory, and receive + manage inbound inquiries in one inbox.

Explicitly **out of MVP:** payments rail, contracts/e-sign, employer accounts, mobile apps, reviews, integrations, community/networking. Those are sequenced later so we ship in weeks, not quarters — the opposite of the "build all nine features first" trap that drained the marketplaces.

## Pre-MVP option (Phase 2, concierge)

Before building the inbox/calendar, you can validate with a **manual concierge**: a landing page + a Typeform + you hand-building 20 chef profiles and routing inquiries by email/WhatsApp. Learn what chefs actually want from the tools before writing the code for them.

## Data model (first-cut entities)

```
User (chef | employer | admin)
 └─ ChefProfile (1:1 with chef users)
     ├─ MediaAsset[]        (gallery images, video)
     ├─ Menu[]              (reusable menus/packages)
     ├─ Certification[]     (type, status, verified_at, provider)
     ├─ ServiceArea[]       (geo: city/region/radius)
     └─ Review[]            (rating, text, author, event_ref)
 └─ EmployerProfile (1:1 with employer users)

Inquiry (from public form or employer)
 ├─ status: new|quoted|booked|declined|completed
 ├─ chef_id, contact, event_details (date, guests, location, budget)
 └─ Quote[]  (line items, total, deposit, sent_at, accepted_at)

Booking (created when a quote is accepted)
 ├─ event_date, location, headcount
 ├─ Invoice[]   (amount, deposit, status)  [Phase 1+]
 └─ Contract    [Phase 2+]

Subscription (chef) → plan, status, stripe_customer_id   [Phase 6]
DirectoryListing → derived/searchable view of ChefProfile (for SEO + search)
```

Keep it relational (Postgres) — profiles, bookings, reviews, and the chef↔client↔gig relationships are all naturally relational, and the directory search benefits from structured filters before you ever need a dedicated search engine.
