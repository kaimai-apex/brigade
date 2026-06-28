# Brigade — MVP web app

A runnable implementation of the **Phase 3 MVP** defined in the Brigade plan
(`../04-product-spec.md`):

> *A chef can sign up, build a verified-looking professional profile with a
> gallery and menus, get a shareable URL, appear in a city directory, and
> receive + manage inbound inquiries in one inbox.*

Built on the stack prescribed in `../05-tech-architecture.md`: **Next.js (App
Router) + TypeScript + Tailwind**, server-rendered for SEO.

## Run it

```bash
npm install      # already done if you see node_modules/
npm run dev      # http://localhost:3009  (launch.json) or :3000 default
npm run build    # production build (34 routes, type-checked)
```

## Design language — "upscale French-American brasserie"

The look is modelled on a Parc-at-Rittenhouse / refined-steakhouse-omakase feel,
defined once in `src/app/globals.css`:

- **Palette:** bottle green (`--color-forest`, the awning/banquette), warm ivory
  ground (`--color-cream`), aged menu-card paper (`--color-paper`), antique brass
  accents (`--color-brass` / `--color-brass-bright`), a restrained oxblood.
- **Type:** Playfair Display (Parisian high-contrast signage serif) for headings,
  EB Garamond (classic menu serif) for body, letter-spaced uppercase sans for menu
  labels / buttons.
- **Components:** squared (2px-radius) `.btn-primary` (forest) / `.btn-accent`
  (gilt) / `.btn-outline`, `.eyebrow` small-caps section labels, `.rule-gold`
  hairline. The header is a forest-green "awning" with a brass plaque wordmark.

To re-theme, edit the `@theme` tokens and the component classes in `globals.css`;
the rest of the app consumes them.

## What's built (mapped to the three layers in `04`)

| Layer | Route | Notes |
|---|---|---|
| **Discovery** | `/chefs` | SSR directory with search + city/cuisine/price filters |
| Discovery (SEO) | `/private-chef/[city]` | Programmatic "Private chefs in [City]" page (SSG) |
| Discovery (SEO) | `/private-chef/[city]/[cuisine]` | "[Cuisine] private chefs in [City]" (SSG) |
| **Credibility** | `/c/[slug]` | Public profile: gallery, menus, reviews, verification badges, shareable URL, `schema.org` Person/Review JSON-LD |
| **Tools** | `/dashboard` | Chef inbox (status: new→quoted→booked→completed/declined) + availability calendar |
| Marketing | `/` | Positioning, featured chefs, dual waitlist (chef + buyer) |
| Onboarding | `/signup` | Founding-chef waitlist capture |
| Admin | `/admin` | Approve/verify chefs, waitlist view |
| SEO infra | `/sitemap.xml`, `/robots.txt` | Auto-generated; back-office disallowed |

### Decisions that follow the docs
- **No commission anywhere.** Revenue surfaces (Pro badge, founding perk) are
  presence/tools-based, per `03-business-model.md`.
- **Beachhead = London** (`src/lib/seed.ts` `BEACHHEAD`). London is intentionally
  the densest city so the directory never looks empty (cold-start fix, `09`).
- **Thin-page guard** (`07`): programmatic SEO pages only render for a
  city/cuisine that has real live supply (`src/lib/seo.ts`).
- **SEO-perfect public pages** (`05`): SSG + JSON-LD + canonical URLs + sitemap.

## Deviations from the plan (pinned)

Intentional shortcuts to make the MVP runnable **offline with zero external
services**. Each maps to a "buy, don't build" item in `05` and should be swapped
for the real provider before production:

1. **Datastore is a local JSON file** (`src/lib/store.ts` → `.data/store.json`),
   not Postgres/Supabase. All persistence is isolated behind that one module, so
   swapping to Postgres is a re-implementation of `store.ts` only. Seed chef
   profiles are read-only reference data in `src/lib/seed.ts`.
2. **Auth is mocked.** The dashboard "logged-in" chef is chosen by a switcher
   (`?chef=` param) and `/admin` is unguarded. Real build uses Supabase
   Auth/Clerk with chef/employer/admin roles (`05`).
3. **No real payments/billing.** The Pro tier is shown but Stripe is not wired
   (Phase 6).
4. **No real verification provider.** Badges render from seeded cert status;
   Persona/Checkr integration is Phase 7.
5. **Gallery images are real curated stock photos** committed under
   `public/gallery/` (24 images, ~3.6MB), served and optimized through
   `next/image`. A CSS gradient sits behind each as a load-time fallback. In the
   real product these become chef-uploaded media on Supabase Storage / Cloudinary.
6. **Email is not sent** on inquiry/waitlist (Resend/Postmark is `05`).

## Images

The gallery photos are from **Unsplash** (free license — commercial use, no
attribution required) and are committed to the repo so there is no runtime
dependency on any external image host. They are mapped to dishes by label in
`src/lib/seed.ts` (`GALLERY_SRC`); to swap one, drop a new file in
`public/gallery/` and point the label at it. Above-the-fold images use
`next/image` `priority` for Core Web Vitals (the SEO thesis in `05`/`07`).

## Deploying to Vercel

Standard Next.js deploy:
1. Push this `brigade-app/` folder to a git repo and import it in Vercel
   (**set the project root to `brigade-app`** if the repo also contains the plan
   docs).
2. No environment variables are required — it runs entirely on seed data.
3. `next/image` optimizes the committed `public/gallery/` photos automatically;
   no `remotePatterns` config needed.

**Heads-up on the data store:** the JSON store is in-memory + best-effort file
writes (`src/lib/store.ts`). On Vercel's serverless runtime the filesystem is
read-only outside the temp dir and instances are ephemeral, so the app detects a
serverless host and writes to the OS temp dir. Reads always work; a submitted
inquiry / waitlist signup / chef approval persists within a warm instance but is
**not durable across deploys or instances**. That's expected for the demo —
durability is the job of the real Postgres database (`05`). The seeded directory,
profiles, and inbox always render correctly.

## Verified flows (in-browser)
- Public inquiry on `/c/jordan-lee` → persists → appears in `/dashboard` inbox
  ("New" count increments). *(The north-star loop in `01`.)*
- `/admin` approve a pending chef (Tomáš Novák) → he appears in `/chefs`.
- Directory filters, programmatic SEO pages, sitemap (31 URLs), robots.

## Layout

```
src/
  app/                     routes (see table above)
  components/              SiteHeader, ui (ChefCard/badges), InquiryForm,
                           WaitlistForm, InboxItem, AvailabilityCalendar, AdminChefRow
  lib/
    types.ts               domain model (mirrors docs/04 data model)
    seed.ts                seeded chefs/inquiries/waitlist + cities/cuisines
    store.ts               persistence seam (the only Postgres-swap point)
    actions.ts             server actions (inquiry, waitlist, status, approval)
    seo.ts                 slug helpers + thin-page guards
```
