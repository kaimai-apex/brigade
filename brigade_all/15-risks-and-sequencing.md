# 15 — Risks, Sequencing & Honest Estimates

The document where I tell you what I actually think.

---

## Total effort

| Phase | Scope | Solo estimate |
|---|---|---|
| 0 | Foundations | 1–2 weeks |
| 1 | Data model | 2–3 weeks |
| 2 | Service layer, policies, workers | 3–4 weeks |
| 3 | API layer | 2–3 weeks |
| 4 | Feeds & timelines | 3–4 weeks |
| 5 | Directory, search, verification | 4–5 weeks |
| 6 | Frontend | 3–4 weeks |
| 7 | Realtime | 1–2 weeks |
| 8 | Trust & safety | 3–4 weeks |
| 9 | Federation | 8–12 weeks — **deferred** |
| 10 | Deploy & ops | 2–3 weeks + continuous |
| | **Total, excluding Phase 9** | **24–34 weeks** |

**Six to eight months of full-time solo engineering**, and that estimate assumes:

- You know the stack well
- No time on sales, fundraising, hiring, or support
- No scope growth (there will be scope growth)
- Nothing goes wrong (something will go wrong)

Realistically, **9–12 months** for one engineer. Software estimates are wrong low
approximately always; multiply by 1.5 and you'll be closer.

That's the number to bring to Jordan before committing, because it's a runway
conversation, not an engineering one.

---

## The four real risks

### 1. This is a rewrite disguised as a refactor

You have a landing page, a directory page, and partial onboarding. This plan describes
rebuilding the backend from the schema up. Calling it "adopting an architecture" makes it
sound incremental. It is not incremental.

**The honest question:** is Brigade's problem right now that its architecture won't scale,
or that it isn't finished? Those need opposite responses. Architecture work is the correct
investment when scale is the constraint. When *shipping* is the constraint, architecture
work is the most satisfying possible way to avoid the actual problem — it feels like
progress, produces artifacts, and defers the terrifying part, which is putting the product
in front of users who might not want it.

You wrote that Brigade "remains totally unfinished." That is a signal worth sitting with.

**Mitigation:** see the recommended sequence below. Take Phases 0–2 (about 7 weeks), then
finish and ship the product on that foundation. Phases 4–8 only when real usage demands
them.

### 2. Mastodon's architecture is for a different product

Mastodon is optimized for: high write volume, chronological consumption, federated
identity, adversarial moderation at scale.

Brigade needs: rich structured profiles, graph traversal by degree, verified credentials,
faceted search, recruiter workflows.

The overlap is real but partial. The parts that transfer cleanly are the *engineering*
patterns — service layer, worker queues, precomputed feeds, API-first design. The parts
that don't are most of the domain model (`03-concept-mapping.md` documents four significant
divergences).

**Mitigation:** copy patterns, not the domain model. Where `03` says diverge, diverge
confidently.

### 3. The AGPL trap

Covered fully in `01-decision-gate.md`. The specific danger is *drift* — starting with
"I'll just look at how they did it," then copying one utility function, then a service,
and six months later Brigade contains AGPL-derived code and nobody remembers which parts.

That discovery during technical due diligence is a real fundraise problem.

**Mitigation:** the hygiene rules in `01`. Separate checkout, never copy-paste, license
scanning in CI, provenance statement in `ARCHITECTURE.md`. And get 30 minutes with an
open-source licensing lawyer — you're already engaging counsel for the incorporation
package, so add it to that conversation.

### 4. Solo engineering on a 51/49 cap table

You are the sole technical founder holding 49%, on a four-year vest with a one-year cliff,
building a 9–12 month project. Your first vesting cliff is **July 22, 2027** — roughly when
this plan finishes.

I flagged the governance asymmetry in the earlier analysis and it's relevant here: this
plan represents your entire vesting cliff period spent on infrastructure with limited
user-visible output. That's a hard thing to defend in a founder conversation twelve months
in, however technically correct it is.

**Mitigation:** agree the plan and the timeline with Jordan explicitly, in writing, before
starting. Not for legal reasons — so that "why isn't it done yet" is a conversation you
had in advance rather than one you're having in month nine.

---

## Recommended sequence

Not the numeric order. This is what I'd actually do.

### Stage 1 — Foundation (weeks 1–7)
```
Phase 0   Foundations
Phase 1   Data model
Phase 2   Service layer
```
Non-negotiable and genuinely un-retrofittable. The User/Profile split and the service
layer are the two decisions that are architectural rather than incremental. Everything
else can be added later; these cannot.

### Stage 2 — Ship something (weeks 8–16)
```
Phase 3   API layer (core endpoints only — profiles, directory, connections)
Phase 6   Frontend reorganization + finish onboarding
Phase 5   Directory + employment verification (tiers 1 and 2)
```
**Then stop and launch.** Directory + verified profiles + connections is a coherent, useful
product. It's enough to test whether anyone wants Brigade.

Note what's excluded: no feed, no posts, no realtime, no jobs. A verified professional
directory with connections is a complete thing. Feeds are what you build once people are
there.

### Stage 3 — Respond to reality (weeks 17+)
```
Phase 8   Trust & safety      ← the moment you have real users
Phase 4   Feeds               ← when users ask for a feed
Phase 10  Deploy & ops        ← continuously, from Stage 2 launch
Phase 7   Realtime            ← when polling becomes a real complaint
Phase 9   Federation          ← never
```

Phase 8 moves up. The moment Brigade has real users, it has fraud, and a professional
network's credibility does not survive a scam wave. Do not launch publicly without at
minimum: report submission, a moderator queue, suspend/silence, and email domain blocking.

---

## What to cut

If time is short, cut in this order:

| Cut | Why it's safe |
|---|---|
| Phase 9 entirely | Opposed to Brigade's positioning |
| Phase 7 realtime | Polling every 30s is fine at small scale |
| Elasticsearch (Phase 5) | Postgres handles six figures of profiles |
| Ranking (Phase 4) | Chronological is fine, and honest |
| Talent pools, job postings | Monetization, not core. After PMF |
| Company pages | Valuable, but people first |
| Reactions beyond a single like | Cosmetic |
| Post editing, scheduling, quotes | Nice-to-have |

**Do not cut:** the User/Profile split, the service layer, `discoverable` opt-in,
employment verification, moderation basics, data export, or the license hygiene.

---

## Milestones worth defining

Rather than "Phase N complete", define these:

```
M1  A company Profile with no User exists and functions          (Phase 1)
M2  Zero DB writes in any controller, CI-enforced                (Phase 2)
M3  A user completes onboarding end to end on the new stack      (Phase 3+6)
M4  A verified employment badge appears on a real profile        (Phase 5)
M5  100 real users on the platform                               ← the actual milestone
M6  A fraud report is filed, triaged, and actioned               (Phase 8)
M7  Home feed p95 < 100ms at 10k profiles                        (Phase 4)
```

M5 is the only one that tells you anything about whether Brigade should exist. The others
tell you whether it's well built, which is a different and secondary question.

---

## The thing I'd say if you asked me directly

The architecture in these docs is sound, and Mastodon is genuinely the right thing to learn
from — it's one of the few readable, production-proven social platforms in existence, and
its service layer and feed design are worth internalizing regardless of what you build.

But you described a product that "remains totally unfinished," and the proposed response is
an eight-month backend rebuild. That sequencing is worth examining honestly. Mastodon's
architecture solves problems that appear at hundreds of thousands of users. You have zero.
The version of this that works is: take the parts that are un-retrofittable (Stage 1, seven
weeks), ship the smallest useful Brigade on top of them, and let real usage tell you which
of the remaining phases you actually need.

That approach gets you to M5 in four months instead of twelve. And if it turns out nobody
wants Brigade, you'll have learned that with eight months of runway left rather than none.

The architecture will still be there. The runway won't be.
