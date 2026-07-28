# 01 — Decision Gate

**Read this before writing any code. Two decisions here are expensive to reverse.**

---

## Decision 1: The AGPL-3.0 problem

Mastodon is licensed under **GNU Affero General Public License v3.0**. Its README states
this plainly, and every file in the repo inherits it.

AGPL is GPL plus **Section 13**, the network clause. Paraphrased:

> If you modify the program and let users interact with it remotely over a network, you
> must offer those users the complete corresponding source code of your modified version.

The ordinary GPL trigger is *distribution* — you only owe source if you ship binaries.
AGPL closes that loophole for SaaS. Running modified Mastodon at `brigade.com` **is** the
trigger. Every visitor to Brigade would have the right to demand your entire server-side
source, including whatever proprietary matching, ranking, or recruiter-facing logic you
build on top of it.

### What this means for Brigade specifically

You are a two-person Canadian corporation with a founders' agreement, a 4-year vesting
schedule, and an IP Assignment Agreement that assigns all IP to the company. That IP
assignment exists to make the company ownable — by investors, by an acquirer. AGPL
contamination of the core platform materially damages that.

Concretely, if Brigade is a derivative work of Mastodon:

- **Fundraising** — technical due diligence will find it. Some investors will pass
  outright; others will price it in.
- **Acquisition** — an acquirer's counsel will treat an AGPL core as a defect requiring
  either a rewrite or an indemnity.
- **Enterprise sales** — corporate procurement at large employers (your likely customers,
  for a professional network) routinely reject AGPL in vendor stacks.
- **Competitors** — a funded competitor can lawfully demand your source and fork it.

### What is and is not derivative

This is the distinction that makes the whole plan viable:

| Action | Derivative work? | Safe? |
|---|---|---|
| Forking the repo and rebranding it | **Yes** | No — full AGPL |
| Copying `app/lib/feed_manager.rb` into Brigade | **Yes** | No |
| Copying any Ruby/JS file, even heavily edited | **Yes** | No |
| Copying the SCSS/design system | **Yes** | No |
| Reading the code, understanding the design, writing your own | **No** | Yes |
| Using the same layer names (`app/services`, `app/workers`) | **No** | Yes |
| Using the same architectural patterns and job queue topology | **No** | Yes |
| Implementing the same public REST API shape | **No** | Yes — APIs are interfaces |
| Using the same dependencies (Rails, Sidekiq, Doorkeeper) | **No** | Yes — all permissive/MIT |

Architecture, patterns, layer boundaries, and naming conventions are not copyrightable.
Source code is. **You can have Mastodon's shape without Mastodon's license** — but only if
you write the implementation yourself and can demonstrate you did.

> ⚠️ **Not legal advice.** I'm not a lawyer and license analysis is fact-specific. Before
> committing, get 30 minutes with an open-source licensing lawyer. Given you're already
> going to have a corporate lawyer review the incorporation package, add this to the list.
> It is a cheap question with an expensive wrong answer.

### Practical hygiene if you take the "port" path

Because you will have read the Mastodon source, you need a defensible record:

1. **Never copy-paste.** Not one function. Not "just this one utility."
2. Keep the Mastodon checkout in a **separate directory outside the Brigade repo**, and
   add it to global gitignore. Never let it be a submodule or vendored dependency.
3. Write a short `ARCHITECTURE.md` in the Brigade repo noting that the design is
   *inspired by* Mastodon's published architecture, with no code reuse.
4. Run a license scanner in CI (`licensee`, `fossa`, or `scancode`) so no AGPL dependency
   sneaks in via a gem or npm package.
5. If you ever hire a contractor, give them the same rule in writing.

---

## Decision 2: Fork vs. Port

### Option A — Fork Mastodon, rebrand as Brigade

Clone the repo, restyle the frontend, rename `Status` to `Post`, ship.

**Pros**
- Fastest path to a working federated social platform — weeks, not months
- Battle-tested moderation, spam, and abuse tooling on day one
- Free security patches from upstream if you keep rebasing

**Cons**
- **Full AGPL exposure** — see Decision 1
- You inherit a microblogging data model, and a professional network is not a microblog.
  Every Brigade-specific feature fights the schema.
- Rebasing on upstream becomes agony once you diverge, and you will diverge immediately
- You must learn Rails and 9,900 files of someone else's conventions before you can ship
  anything of your own
- Your existing Brigade frontend work is discarded

**Verdict:** Viable only if Brigade is intentionally open-source, community-run, and
federated — a genuinely different company than the one your incorporation docs describe.

### Option B — Port the architecture into Brigade's existing stack

Keep your stack. Adopt Mastodon's layering, naming, and design decisions. Write your own
implementations.

**Pros**
- No license exposure
- Your existing directory page, landing page, and onboarding survive
- Schema designed for professional networking, not retrofitted from microblogging
- You only build what Brigade actually needs

**Cons**
- Much slower — you are writing the code
- You lose Mastodon's accumulated moderation and anti-abuse hardening, which is worth more
  than it looks (see `12-phase-8-trust-and-safety.md`)
- Requires discipline to not cargo-cult patterns that don't apply

**Verdict:** This is what the rest of these docs assume.

### Option C — Port the architecture, but rewrite in Rails

Same as B, but you also adopt Ruby on Rails so the reference implementation maps 1:1.

**Pros**
- Every Mastodon file is a direct reference for the file you're writing
- Rails' conventions do enforce the layering you want
- Sidekiq, Doorkeeper, Pundit, Devise are genuinely excellent and hard to match in Node

**Cons**
- You throw away your existing Brigade code
- If you don't already know Ruby, you're learning a language *and* rebuilding a product
  simultaneously, as a solo engineer, pre-revenue
- Rails hiring in 2026 is harder than TypeScript hiring

**Verdict:** Only if you already know Ruby well, or Brigade's existing code is small enough
to be genuinely disposable.

---

## Recommendation

**Option B**, with a specific caveat.

Adopt Mastodon's *backend architecture* — the service layer, the worker topology, the
Account/User split, the precomputed feed model, the API-first design. These are the parts
that make Mastodon survive scale and the parts Brigade will need.

**Defer ActivityPub federation entirely** (Phase 9). It is roughly a third of Mastodon's
complexity — 28 ActivityPub workers, 17 activity handlers, HTTP signatures, WebFinger,
inbox/outbox delivery, remote account resolution — and it solves a problem Brigade does
not have. Nobody's blocker to using a professional network is "it doesn't federate with
Pleroma." Build the architecture so federation *could* be added at Phase 9 without a
rewrite, then don't add it until someone pays you to.

**Do steal Mastodon's moderation model early.** This is the counterintuitive one. Founders
consistently defer trust and safety, and a professional networking platform is a
high-value target for recruitment scams, fake profiles, and credential fraud from launch
day. Mastodon's report/appeal/domain-block/user-role model is the most under-appreciated
thing in that repo.

---

## Decision record

Fill this in and commit it. Future you will want to know why.

```
DECISION 1 — License posture
  Chosen:        [ Fork / Port ]
  Decided by:    Kai Mai, Jordan Chan
  Date:          ____________
  Lawyer review: [ Yes — name/date / No ]
  Rationale:

DECISION 2 — Stack
  Chosen:        [ Keep current / Move to Rails ]
  Decided by:
  Date:
  Rationale:

DECISION 3 — Federation
  Chosen:        [ Phase 9 / Never / Now ]
  Rationale:
```

Note that under §2.1 of your Founders' Agreement, **licensing the Company's intellectual
property outside the ordinary course** requires unanimous founder consent. Open-sourcing
the core platform under AGPL plausibly falls in that bucket. Get Jordan's sign-off in
writing either way — it costs nothing now and prevents a dispute later.
