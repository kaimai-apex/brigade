# 13 — Phase 9: ActivityPub Federation

**Goal:** Understand what federation costs, build so it *could* be added, and then
consciously not add it.

**Effort:** 8–12 weeks solo, minimum
**Depends on:** everything
**Recommendation: DEFER INDEFINITELY**

**Reference:** `app/lib/activitypub/` (30 files), `app/workers/activitypub/` (28 workers),
`FEDERATION.md`, `app/models/{relay,tombstone,account_migration,unavailable_domain}.rb`

---

## What federation actually is

ActivityPub is a W3C standard letting independent servers exchange social data. A user on
`brigade.com` could follow a user on `mastodon.social` and see their posts. Mastodon's
entire identity is built on this.

## What it costs

From the reference repo, the federation surface:

**`app/lib/activitypub/` — 30 files**
```
activity.rb + 17 activity handlers:
  create  announce  follow  like  block  delete  undo  accept  reject
  add  remove  move  flag  update  feature_request  quote_request
adapter  dereferencer  forwarder  linked_data_signature
object_integrity_proof  tag_manager  case_transform
parser/{status,poll,media_attachment,preview_card,custom_emoji,
        interaction_policy}_parser
```

**`app/workers/activitypub/` — 28 workers**
```
delivery  low_priority_delivery  distribution  raw_distribution
account_raw_distribution  collection_raw_distribution  processing
fetch_replies  fetch_all_replies  followers_synchronization
move_distribution  migrated_follow_delivery  post_upgrade
process_featured_item  verify_featured_item  quote_refresh
synchronize_featured_collection  status_update_distribution  ...
```

Plus WebFinger, HTTP Signatures, JSON-LD context handling, remote account resolution, inbox
and outbox endpoints, `Tombstone` for remote deletions, `Relay` for discovery,
`UnavailableDomain` for dead-server backoff, and `AccountMigration` for account moves.

Conservatively **a third of Mastodon's backend complexity**, and it's the third with the
worst failure modes — you're parsing untrusted JSON-LD from arbitrary servers, verifying
cryptographic signatures, and handling partial failure across a network you don't control.

## The ongoing cost, which is worse

The build is the cheap part:

- **Moderation across servers.** You inherit every abusive actor on every server you
  federate with, and your only tools are domain-level blocks. Mastodon has an entire
  category of tooling (`domain_blocks`, `email_domain_blocks`, relationship severance
  events) for this. For a platform whose core promise is credibility, importing an
  unverifiable firehose is directly counter to the product.
- **Data you cannot delete.** Once a post federates out, it exists on servers you don't
  control. Reconciling that with GDPR Art. 17 erasure obligations is genuinely unsolved.
- **Spec drift.** ActivityPub is loosely specified and implementations disagree.
  Interoperability is permanent maintenance.
- **No verification story.** A remote profile claiming to work at a company cannot be
  verified. Brigade's entire differentiator (Phase 5) doesn't survive contact with
  federation.

That last point is the decisive one. **Federation is architecturally opposed to Brigade's
value proposition.** Mastodon's promise is "no single authority controls your social
graph." Brigade's promise is "these credentials are verified." You cannot verify what you
don't control.

## When it would make sense

- Brigade positions as open infrastructure rather than a commercial platform (which
  implies the AGPL fork path — see `01-decision-gate.md`)
- A large customer requires interop with an existing fediverse deployment
- Regulation mandates social graph portability, which is not implausible on a 5–10 year
  horizon in the EU

## Building so it could be added

You don't need to build federation. You need to not *preclude* it. From Phase 1:

1. **Every actor is a `Profile`, and only local ones have a `User`.** Remote actors are
   representable with no schema change. This is the big one, and you get it for free.
2. **Profiles have a stable, resolvable URI.** `https://brigade.com/in/kaimai` — usable as
   an ActivityPub `id` later.
3. **Content has a canonical URL** and a visibility model with a `public` tier.
4. **Delivery is already a background job.** `FanOutOnWriteWorker` is where an
   `ActivityPubDeliveryWorker` would slot in beside local delivery.
5. **Serializers are a distinct layer.** An `ActivityStreams` serializer becomes a second
   output format, not a rewrite.
6. **A `Follow` model that's asymmetric** already exists alongside `Connection`
   (`03-concept-mapping.md`). That's the federatable primitive; `Connection` is not.

Follow the architecture in these docs and federation stays a ~10-week project you could
start any time, rather than a rewrite. That's the correct posture: preserve the option,
don't exercise it.

## A narrower alternative worth considering

If the goal is interoperability rather than federation, there are cheaper paths that don't
carry the moderation burden:

- **Data export in a portable format** (Phase 8) — satisfies portability obligations
- **Public read-only ActivityPub actor endpoints** — let fediverse users *follow* Brigade
  company pages and public profiles, without accepting inbound content. One-way federation
  is perhaps 15% of the work and none of the moderation risk.
- **OpenID Connect provider** — let other services authenticate against Brigade identity

The one-way option is genuinely attractive: distribution benefit, no inbound trust problem.

## Decision

```
DECISION — Federation
  Status:      DEFERRED
  Revisit:     [ date, or trigger condition ]
  Rationale:   Architecturally opposed to verified-credential positioning.
               ~1/3 of backend complexity. Option preserved via Phase 1
               Profile/User split and Phase 4 delivery seam.
```

Record it, and revisit only if the positioning changes.
