# Brigade — Project Master Plan

> **Working name:** "Brigade" (after the kitchen brigade system — a team/network connotation that extends naturally to all hospitality roles). Placeholder only — validate trademark + `.com` availability before committing. Alternatives to test: *Mise, Toque, Covers, Pass, ChefStack*.

> **What this is:** The full game plan for a pivot away from a private-chef *booking marketplace* toward a *professional platform for private chefs* — think **LinkedIn × Google Workspace, built for the private/independent hospitality world.** This repo holds both the **written plan** (the numbered docs below) and a **working prototype** of the product.

---

## 👋 Start here (Jordan)

1. **Read the pitch** — [`01-vision-positioning.md`](01-vision-positioning.md) (what we're building) and [`03-business-model.md`](03-business-model.md) (how it makes money).
2. **See the build order** — [`06-roadmap-phases-0-20.md`](06-roadmap-phases-0-20.md), the core deliverable.
3. **Click around the actual product** — there's a runnable prototype of the Phase-3 MVP in [`brigade-app/`](brigade-app/): the chef directory, public profiles, the inquiry inbox + tools, and the upscale-brasserie look & feel. See [`brigade-app/README.md`](brigade-app/README.md) to run it locally or deploy it.
4. **Read the honest risks** — [`09-risks-open-questions.md`](09-risks-open-questions.md). The part most founders skip and shouldn't.

> The prototype runs on built-in sample data — no setup or accounts needed. It exists to make the plan tangible, not to be the finished product.

---

## The one-paragraph version

Booking marketplaces for private chefs have a structural flaw: once a client and chef connect, they cut out the platform to avoid commission (disintermediation). Multiple well-funded companies died on exactly this (Kitchit, Kitchensurfing, Dinner Lab). Brigade sidesteps it entirely by **not taking commission on the meal.** Instead it sells chefs a professional home — a verified, SEO-discoverable profile (the *credibility* layer) plus the software to run their business (the *tools* layer) — and sells access to that vetted talent pool to the people who hire it (estates, agencies, family offices, high-net-worth households). Revenue comes from subscriptions and hiring access, neither of which the user has an incentive to route around. It starts as private chefs only (simpler legally, single-sided to bootstrap) and expands to the broader private-hospitality world (sommeliers, private servers, butlers, event staff).

## Why this model beats the marketplace

| | Booking marketplace (old) | Brigade (new) |
|---|---|---|
| **Revenue** | 10% client + 10% chef per booking | Chef subscription + employer/hiring access + featured placement |
| **Leakage risk** | Severe — both sides cut you out after first match | Low — you charge for presence + tools, not the transaction |
| **Cold start** | Two-sided (need chefs *and* clients simultaneously) | Single-sided to start (win chefs first) |
| **Legal exposure** | High — merchant of record, food liability, payment disputes | Lower — you're a directory + software vendor, not the caterer |
| **Defensibility** | Weak — easy to replicate, nothing retains users | Profile history + reviews + tools + network = switching cost |
| **Expandable** | Hard | Easy — same playbook for any hospitality role |

## Document index

| # | File | What it covers |
|---|------|----------------|
| — | `README.md` | This file — exec summary, pivot rationale, index |
| 01 | `01-vision-positioning.md` | Mission, positioning, ICP, the wedge, naming |
| 02 | `02-market-competition.md` | Market size, competitor teardown, the graveyard, white space |
| 03 | `03-business-model.md` | Revenue streams, pricing, unit economics, why it doesn't leak |
| 04 | `04-product-spec.md` | Feature breakdown by layer, MVP scope, data model |
| 05 | `05-tech-architecture.md` | Stack, architecture, build-vs-buy, SEO-critical decisions |
| 06 | `06-roadmap-phases-0-20.md` | **The core deliverable** — phases 0→20 with exit criteria |
| 07 | `07-go-to-market-seo.md` | Supply-first GTM, SEO engine, chef acquisition, demand |
| 08 | `08-team-equity.md` | Roles, equity frameworks, vesting (not legal advice) |
| 09 | `09-risks-open-questions.md` | Honest risks of *this* model, kill-criteria, open questions |
| 🖥️ | `brigade-app/` | **Runnable prototype** of the Phase-3 MVP (Next.js) — directory, profiles, inbox, tools |

## How to read this (for Jordan)

Kai is the technical cofounder; this plan is written so you can hand it back and forth. The fastest path: read **01** (what we're building), **03** (how it makes money), and **06** (the build order). **09** is the part most founders skip and shouldn't — it's the list of things that could still kill this. Everything in here is a v1 draft meant to be argued with, not a finished bible.

---

*Last updated: initial draft. Owner: Kai (technical) + Jordan (vision/GTM).*
