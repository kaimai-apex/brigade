# 06 — Roadmap: Phases 0 → 20

> The core deliverable. Each phase has a **goal**, **deliverables**, **exit criteria** (what must be true to move on), and **owner**. Phases are grouped into five stages. **Do not skip exit criteria to feel fast** — the marketplace graveyard is full of teams who built ahead of validation.

Owner key: **K** = Kai (build/tech), **J** = Jordan (vision/sales/ops/chef + buyer relationships), **W** = Wife (UX/UI), **All** = shared.

---

## STAGE A — Validate & Set Up (Phases 0–2)
*Goal: prove chefs will pay and buyers want this, before writing real product code.*

### Phase 0 — Foundation & validation
- **Goal:** confirm the pivot is a business, not just a nicer idea.
- **Deliverables:**
  - Cofounder agreement + equity + vesting locked (see `08`). Legal entity formed.
  - Pick the **beachhead metro** (one affluent, chef-dense city).
  - 30–50 chef interviews **reframed for SaaS**: would you pay $X/mo for a pro profile + booking tools? What do you use today? What would you switch from? Rank the tools features.
  - 10–20 buyer interviews (estate managers, agencies, affluent households): how do you find/vet chefs now? Would you pay for self-serve vetted access?
  - Competitor teardown finalized; pricing hypotheses set.
- **Exit criteria:** ≥40% of interviewed chefs express willingness to pay a concrete price; ≥3 buyers say they'd pay for access. If not → rework model (`09`).
- **Owner:** J leads interviews, K on competitive/technical due diligence, All on equity.

### Phase 1 — Design & architecture
- **Goal:** a designed, technically-scoped MVP.
- **Deliverables:** brand v1 (name validated for trademark/domain), design system + key screens (W), information architecture + data model + stack decision finalized (K), MVP scope frozen (`04`).
- **Exit criteria:** clickable design prototype of the MVP exists; data model + repo scaffolded.
- **Owner:** W (design), K (architecture).

### Phase 2 — Landing page, waitlist & concierge test
- **Goal:** start SEO early (it's slow) and validate demand with near-zero code.
- **Deliverables:** SEO-optimized landing page live; chef waitlist capture; first SEO content published; **concierge MVP** — hand-build 15–20 real chef profiles, route a few real inquiries manually (email/WhatsApp) to learn the workflow.
- **Exit criteria:** ≥50 chefs on waitlist in the beachhead metro; ≥3 real inquiries routed and at least 1 booking happened off the concierge.
- **Owner:** J (chef recruiting + concierge ops), K (landing + waitlist), W (page design).

---

## STAGE B — Build the Core Product (Phases 3–7)
*Goal: ship the credibility + tools + discovery loop and turn it on for one city.*

### Phase 3 — MVP build: Profiles + Directory + Inbox
- **Goal:** ship the P0 product (`04`).
- **Deliverables:** auth; chef profiles (bio, gallery, menus, rates, service area); public profile pages + custom URLs; city directory + search/filter; inquiry inbox; availability calendar; admin approve/verify.
- **Exit criteria:** a chef can self-serve sign up, publish a profile, appear in the directory, and receive + manage an inquiry — end to end, in production.
- **Owner:** K (build), W (UX polish), J (first chef onboarding).

### Phase 4 — Seed supply & ignite SEO
- **Goal:** make the beachhead directory *dense and indexed.*
- **Deliverables:** concierge-onboard 50–150 real chefs in the metro; launch programmatic SEO pages (`[city]`, `[cuisine]+[city]`); submit sitemaps; start the content engine (see `07`).
- **Exit criteria:** directory has enough density to be useful to a buyer (target: 100+ live chefs in the metro); first organic search impressions/clicks appearing.
- **Owner:** J (chef recruiting), K (programmatic SEO infra), W (content/page templates).

### Phase 5 — Tools layer v1 (the retention moat)
- **Goal:** make Brigade the chef's *operating system,* not just a listing.
- **Deliverables:** quote/proposal builder, invoicing + deposit requests, lightweight CRM, menu builder. (Optionally an AI assist for menu/quote drafting.)
- **Exit criteria:** ≥20 chefs run a real booking workflow (inquiry → quote → booking) through Brigade. *(This is the north-star metric coming alive.)*
- **Owner:** K (build), J (chef adoption coaching).

### Phase 6 — Monetization v1
- **Goal:** turn on revenue without killing supply growth.
- **Deliverables:** Stripe billing; Free vs Pro tiers; featured/promoted placement; pricing page. Grandfather early chefs as a loyalty perk.
- **Exit criteria:** first paying chefs; measurable free→Pro conversion; churn tracked. Target a real (even if tiny) MRR.
- **Owner:** K (billing), J (sales/upgrade conversations).

### Phase 7 — Trust, reviews & verification
- **Goal:** make the directory *trustworthy enough to hire from* (this unlocks the buyer side).
- **Deliverables:** post-event review request flow + review display; verification badges (ID/Persona, food-safety cert, insurance, background-check via Checkr); reporting/moderation.
- **Exit criteria:** majority of active chefs have ≥1 verification badge and reviews are accumulating; a buyer can look at a profile and trust it.
- **Owner:** K (integrations), J (verification ops + chef nudging).

---

## STAGE C — Build the Demand Engine (Phases 8–11)
*Goal: monetize the buyer side and put it in chefs' pockets.*

### Phase 8 — Employer / hiring side
- **Goal:** open the highest-value, lowest-leakage revenue stream.
- **Deliverables:** employer accounts; "post a gig / role"; directory search + shortlist + contact, gated behind paid access; recruiter-style tier. Pre-sell to the buyers from Phase 0.
- **Exit criteria:** first paying employers/agencies; first hires/gigs sourced through Brigade.
- **Owner:** J (B2B sales), K (employer product).

### Phase 9 — Network & community (the LinkedIn effect)
- **Goal:** add network effects + chef-to-chef stickiness.
- **Deliverables:** chef connections/follows, peer endorsements, referrals, a "sub out / find a chef for my overflow gig" mechanic, maybe a feed/forum. (Yhangry-style "chefs championing chefs" energy.)
- **Exit criteria:** measurable chef-to-chef activity (connections, referrals); referral becomes a real acquisition channel.
- **Owner:** K (build), J (community seeding).

### Phase 10 — Mobile apps
- **Goal:** "platform + app that works together" (Jordan's words). Chefs manage their business from their phone.
- **Deliverables:** React Native (Expo) iOS + Android — inquiries, calendar, quotes, messaging, push notifications.
- **Exit criteria:** mobile DAU/WAU meaningful; push notifications lift inquiry response time.
- **Owner:** K.

### Phase 11 — Private beta → public launch (in beachhead metro)
- **Goal:** formalize the launch of the proven loop in city #1.
- **Deliverables:** invite-only beta → iterate → public launch; PR/press; case studies from star chefs (Yhangry-style "Chef X earned $Y" stories).
- **Exit criteria:** healthy retention + MRR + organic acquisition in one city = a repeatable unit.
- **Owner:** All.

---

## STAGE D — Scale the Playbook (Phases 12–16)
*Goal: replicate the proven city unit and deepen the product.*

### Phase 12 — Geographic expansion
- Replicate the beachhead playbook in metros 2–5 (chef seeding + programmatic SEO + buyer pre-sales per city). **Owner:** J (ops), K (scale infra).
- **Exit:** ≥1 new metro hits the same density/retention bar as the beachhead.

### Phase 13 — Vertical expansion (other hospitality pros)
- Extend profiles/tools/directory to sommeliers, private servers, bartenders, butlers, event staff (Jordan's "expand to other hospitality professionals"). Same mechanics, new categories. **Owner:** J + K.
- **Exit:** a second vertical reaches meaningful supply in ≥1 metro.

### Phase 14 — Deeper SaaS + opt-in payments rail
- Contracts/e-sign, advanced CRM, integrations (Google Calendar, QuickBooks/Xero). **Opt-in** payments rail with deposit protection/escrow — value-added, never mandatory commission. **Owner:** K.
- **Exit:** a chunk of bookings flow through opt-in payments because chefs *want* the protection.

### Phase 15 — Analytics, AI & insights
- Chef-facing analytics (views, conversion, revenue, rate benchmarking); AI features (smart pricing suggestions, auto-reply drafts, menu/proposal generation). **Owner:** K.
- **Exit:** insights/AI measurably improve chef conversion or retention.

### Phase 16 — Enterprise / agency tier
- Multi-seat accounts for catering agencies, estate-management firms, hospitality groups managing rosters of chefs/staff. **Owner:** J + K.
- **Exit:** first enterprise/agency contracts.

---

## STAGE E — Platform Maturity (Phases 17–20)
*Goal: become infrastructure for the independent hospitality economy.*

- **Phase 17 — International expansion.** Localize, handle regional verification/compliance, multi-currency. Owner: All.
- **Phase 18 — Fintech attach.** Instant payout, income smoothing, insurance, benefits for independent chefs (high-margin, high-loyalty). Owner: K + J.
- **Phase 19 — Data & certification products.** Anonymized market/rate data products; Brigade-branded certification/academy (Hosco-style course appetite exists). Owner: J.
- **Phase 20 — Ecosystem / API.** Open API + integrations so booking platforms (Yhangry, Take a Chef, etc.) and tools plug into Brigade profiles/availability — making Brigade the identity layer for private hospitality. Owner: K.

---

## Sequencing logic (the why behind the order)

1. **Validate before building** (0–2) — the marketplaces died building ahead of demand.
2. **Credibility before tools before monetization** (3–6) — give value, earn retention, *then* charge.
3. **Trust before demand** (7 before 8) — buyers won't pay for access to an unvetted directory.
4. **One city fully proven before replicating** (11 before 12) — a repeatable unit beats thin national coverage.
5. **Verticals + depth only after the core loop is proven** (13+) — scope discipline is the whole strategy.

## Rough timing (directional, not a commitment)

Stage A: ~1–2 months · Stage B: ~3–6 months · Stage C: ~3–5 months · Stage D/E: ongoing. A 1–2 person build team realistically reaches a *monetizing, proven single-city loop* (through ~Phase 11) in roughly 9–15 months. Adjust to real velocity.
