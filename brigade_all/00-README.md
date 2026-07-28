# Brigade — Mastodon Architecture Adoption

**Owner:** Kai Mai (CTO)
**Created:** July 27, 2026
**Reference codebase:** `mastodon/mastodon` @ `main` (v4.5.9 era, Rails 8.1, ~9,900 files)

---

## What this is

A phased plan to restructure Brigade — a professional networking platform — onto the
architecture Mastodon uses. Mastodon is one of the few open, readable, production-proven
social platforms at scale, and its layering (service objects, precomputed feeds, a
first-class REST API, background job queues) is worth stealing wholesale.

The docs are ordered. Read `01` before anything else, because it contains a decision
that invalidates about half of what follows if it goes the other way.

## Assumptions I made

You did not share the Brigade repo, so this plan assumes:

| Assumption | Impact if wrong |
|---|---|
| Brigade is currently a JS/TS app (Next.js or similar) with a hosted Postgres | Phase 3 and Phase 6 change substantially |
| Directory page, landing page, and partial onboarding exist; nothing else is finished | Sequencing may need reordering |
| Solo development (you), Jordan on CEO/business | Timelines assume one engineer |
| No production users yet, so no migration burden | Adds a Phase 0.5 data migration if wrong |
| Brigade is intended to be commercial / venture-scale | Changes the license answer in `01` |

**Correct these before executing.** If any assumption is wrong, the affected phases are
noted in each doc's header.

## The document set

| # | Document | Purpose |
|---|---|---|
| 01 | `01-decision-gate.md` | **Read first.** AGPL, fork vs. port, the irreversible choice |
| 02 | `02-mastodon-architecture-map.md` | What is actually in the repo, layer by layer |
| 03 | `03-concept-mapping.md` | Mastodon domain concepts → Brigade domain concepts |
| 04 | `04-phase-0-foundations.md` | Repo layout, environments, Docker, CI |
| 05 | `05-phase-1-data-model.md` | Account/User split, core schema |
| 06 | `06-phase-2-service-layer.md` | Service objects, policies, background workers |
| 07 | `07-phase-3-api-layer.md` | REST API, OAuth, serializers, rate limiting |
| 08 | `08-phase-4-feeds-timelines.md` | FeedManager, fan-out-on-write, Redis |
| 09 | `09-phase-5-directory-and-graph.md` | Brigade's core differentiator |
| 10 | `10-phase-6-frontend.md` | React/Redux structure while keeping Brigade's aesthetic |
| 11 | `11-phase-7-realtime.md` | Streaming API |
| 12 | `12-phase-8-trust-and-safety.md` | Moderation, reports, admin |
| 13 | `13-phase-9-federation.md` | ActivityPub — deferred, possibly forever |
| 14 | `14-phase-10-deploy-and-ops.md` | Infrastructure, scaling, observability |
| 15 | `15-risks-and-sequencing.md` | Effort estimates, what to cut, honest timeline |

## How to use these

Each phase doc has:

- **Goal** — what is true when the phase is done
- **Mastodon reference** — real file paths in the reference repo to read
- **Brigade deliverables** — what you build
- **Exit criteria** — testable conditions to move on
- **Effort** — solo-developer estimate

Do not run phases in parallel until Phase 3 is complete. The data model and service layer
are load-bearing for everything after them.

## The honest framing

Mastodon is nine years and 21,000+ commits of accumulated work. You are one engineer with
an unfinished product. The value here is not in reproducing Mastodon — it is in stealing
its *shape* so that Brigade's structure can absorb growth instead of collapsing under it.

Phases 0–5 are the ones that matter. Phases 7–9 are things you should know exist and
consciously defer. See `15-risks-and-sequencing.md` for what I would actually cut.
