# 10 — Phase 6: Frontend

**Goal:** Brigade's client adopts Mastodon's frontend *organization* while keeping
Brigade's existing visual design completely intact.

**Effort:** 3–4 weeks solo
**Depends on:** Phase 3

**Reference:** `app/javascript/mastodon/` (1,006 files) — `features/` 369,
`components/` 255, `actions/` 63, `reducers/` 42, `api_types/` 21, `models/` 17

---

## Aesthetic is not architecture

You asked to keep Brigade's look. Nothing in this phase changes a single visual decision.

Mastodon's design system lives in `app/javascript/styles/` (35 files) and its own component
library. **You are not taking those** — both for licensing reasons (`01-decision-gate.md`;
SCSS is code) and because Brigade's aesthetic is yours.

What you take is the **file organization and state management shape**. Your existing
components move; they don't change.

---

## Organize `features/` by screen, not by type

The reference has 369 files across ~55 feature directories, each one a route:

```
home_timeline  public_timeline  directory  explore  search  compose
notifications  onboarding  account_timeline  followers  following
lists  filters  blocks  mutes  report  status  ui  navigation_panel
```

The common alternative — `components/`, `pages/`, `hooks/`, `utils/` at top level, grouped
by *what kind of thing* a file is — means every feature is scattered across four
directories and deleting a feature is archaeology.

### Brigade's `features/`

```
client/features/
├── ui/                    ← app shell: layout, routing, modals, columns
├── navigation_panel/
├── landing/               ← existing
├── onboarding/            ← existing, partially built
├── directory/             ← existing — your core
├── profile/
│   ├── view/  edit/  experience/  skills/  endorsements/  recommendations/
├── company/
│   ├── page/  people/  admin/
├── feed/
│   ├── home/  company/  tag/
├── compose/
├── post/
├── connections/
│   ├── list/  requests/  suggestions/
├── search/
├── jobs/
│   ├── browse/  detail/  post/  applications/
├── talent_pools/          ← recruiter
├── notifications/
├── messages/
├── settings/
│   ├── account/  privacy/  notifications/  security/
├── moderation/            ← admin
└── report/
```

Each directory owns its components, local hooks, and styles. A shared component graduates
to `components/` only when a second feature imports it — not preemptively.

---

## State management

The reference uses Redux, which is a 2016 decision they're incrementally migrating away
from (note `notifications` *and* `notifications_v2` coexisting — they migrate feature by
feature rather than big-bang, which is itself the lesson).

**Don't adopt Redux in 2026.** Adopt the *structure* Redux imposed, using modern tools:

| Reference | Brigade |
|---|---|
| `actions/` + `reducers/` for server data | **TanStack Query** — server state, caching, invalidation |
| `reducers/` for UI state | **Zustand** or `useState` — local UI state only |
| `selectors/` | Query selectors / derived state |
| `store/` | Query client config |
| `api/` | Keep — typed API client modules |
| `api_types/` | Keep — **essential**, see below |
| `models/` | Keep — normalization layer |

**The rule that matters:** server state and UI state are different things and must not
live in the same store. Redux blurred this and it's the primary source of pain in large
Redux apps. TanStack Query owns anything that came from the API; Zustand owns modal
open/closed, form drafts, and column layout.

### `api_types/` vs `models/`

The reference separates these, and it's the subtle detail worth copying:

```
client/api_types/     TypeScript types matching the API wire format exactly
client/models/        normalized client-side shapes, derived from api_types
```

`api_types` is generated from your OpenAPI spec (Phase 3) and regenerates on every API
change — so a backend change breaks the build immediately, at compile time, rather than at
runtime in production. `models` is what components consume. The normalization layer between
them absorbs API changes so a field rename doesn't touch 40 components.

Generate `api_types` in CI from the spec. Don't hand-write them.

---

## Server-rendered vs. client-rendered

Mastodon is a hybrid — 3.9% Haml. Server-rendered pages handle landing, settings, admin,
and public profiles; React handles the logged-in app.

**This split is even more correct for Brigade**, because your SEO story is stronger:

| Route | Rendering | Why |
|---|---|---|
| Landing | Server | SEO, first-paint speed |
| Public profile `/in/:username` | Server | **SEO — your primary acquisition channel** |
| Public company page | Server | SEO |
| Public job posting | Server | **SEO — job SEO is enormous** |
| Directory (anonymous) | Server | SEO + CDN cacheable |
| Directory (authenticated) | Client | Personalized, filtered |
| Feed, messages, notifications | Client | Realtime, interactive |
| Settings, admin | Server | Low traffic, form-heavy |

Public profile pages and job postings are how a professional network gets found. A
client-rendered profile page is invisible to search engines and to link previews. Get this
right — it's an acquisition decision disguised as a technical one.

Add JSON-LD structured data (`Person`, `Organization`, `JobPosting`) to server-rendered
pages. Google Jobs indexing alone justifies it.

---

## Migrating existing Brigade code

Same discipline as Phase 2 — move, then refactor, never both at once.

1. Create the `features/` structure with empty directories
2. Move landing → `features/landing/`. Ship. Verify nothing broke.
3. Move directory → `features/directory/`. Ship.
4. Move onboarding → `features/onboarding/`. Ship.
5. *Then* introduce TanStack Query, one feature at a time — directory first, since it's
   the most data-heavy
6. Extract genuinely shared components to `components/` as duplication appears

Do not rewrite while relocating. If something breaks after a move-only commit, it's the
move; if it breaks after a refactor commit, it's the refactor. Conflating them costs days.

---

## Design system

Brigade's existing styles land in `client/styles/`, unchanged. What to add:

- **Design tokens** — colors, spacing, typography, radii as CSS custom properties or a
  theme object. Not because Mastodon does it, but because you'll want dark mode and
  employer white-labeling eventually.
- **Component inventory** — document what exists so you stop rebuilding buttons.
- **Storybook** — the reference has `.storybook/` and uses Chromatic for visual regression.
  Worth it once you have more than ~30 shared components; premature before that.

---

## Accessibility

The reference has `load_keyboard_extensions.js` and a `keyboard_shortcuts` feature, and
takes a11y seriously.

For Brigade this is not optional in the way it might be for a hobby project:

- **Legal** — AODA (Ontario, where you're incorporated) has enforceable accessibility
  requirements. WCAG 2.0 AA is the effective standard for Ontario organizations, and it
  applies to public-facing web content. Get this reviewed alongside the other legal items.
- **Commercial** — enterprise and public-sector customers require VPAT/accessibility
  conformance documentation in procurement.
- **Product** — a professional network that excludes disabled professionals is failing at
  its stated purpose.

Bake in: semantic HTML, keyboard navigation, focus management in modals, ARIA live regions
for feed updates, visible focus indicators, contrast ratios in the token system. Add
`axe-core` to CI. Retrofitting a11y is 10× the cost of building with it.

---

## Performance

- **Code-split by feature.** Each `features/*` directory is a lazy boundary. The
  recruiter/talent-pool bundle shouldn't load for a job seeker.
- **Virtualize long lists** — feed, directory, connections. Mastodon has custom scroll
  handling (`scroll.ts`) for this.
- **Blurhash placeholders** for avatars and images (the reference uses the `blurhash` gem
  server-side and decodes client-side) — eliminates layout shift.
- **Optimistic updates** on connect, react, bookmark. The API round-trip should be
  invisible.
- **Prefetch on hover** for profile cards in the directory.

---

## Exit criteria

- [ ] `features/` organized by screen; every route maps to one directory
- [ ] Existing landing, directory, and onboarding relocated and functional
- [ ] Server state (TanStack Query) and UI state (Zustand) strictly separated
- [ ] `api_types/` generated from the OpenAPI spec in CI; backend changes break the build
- [ ] `models/` normalization layer between wire format and components
- [ ] Public profiles, company pages, job postings, and anonymous directory server-rendered
- [ ] JSON-LD structured data on all public pages
- [ ] Brigade's visual design unchanged — screenshot-diff before and after proves it
- [ ] Code-split per feature; initial bundle under 200KB gzipped
- [ ] `axe-core` in CI with zero critical violations; keyboard navigation works end to end
- [ ] Feed and directory lists virtualized
