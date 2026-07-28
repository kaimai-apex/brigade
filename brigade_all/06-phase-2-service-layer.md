# 06 — Phase 2: Service Layer, Policies & Workers

**Goal:** Every state change in Brigade goes through exactly one service object. Every
authorization decision goes through exactly one policy. Slow work happens in weighted
background queues.

**Effort:** 3–4 weeks solo
**Depends on:** Phase 1
**Blocks:** Phase 3

**Reference:** `app/services/` (99), `app/workers/` (118), `app/policies/` (45),
`config/sidekiq.yml`

---

## The pattern

Mastodon's controller-to-service ratio (337:99) understates it — most of those controllers
are 20 lines. The rule:

> A controller authenticates the request, authorizes it through a policy, calls **one**
> service, and renders **one** serializer. It contains no business logic and performs no
> writes.

Every state-changing operation lives in a service. Not "most." Every one. The moment you
allow one controller to write directly "because it's simple", the boundary is gone.

### Service object shape

```ts
// src/services/base_service.ts
export abstract class BaseService<Args, Result> {
  abstract call(args: Args): Promise<Result>;
}
```

Rules, adapted from the reference implementation:

1. **One public method: `call`.** Everything else private.
2. **Named for what it does:** `VerbNounService`.
3. **Owns its transaction.** A service either fully succeeds or fully rolls back.
4. **Enqueues side effects, doesn't perform them.** Fan-out, notifications, indexing,
   email, and webhooks are all `enqueue()`, never inline.
5. **Callable from anywhere:** controller, worker, CLI, test, admin panel.
6. **Returns the created/modified object**, not an HTTP response.

`PostStatusService` in the reference does exactly this — validate, create in a
transaction, then enqueue `DistributionWorker`, `LinkCrawlWorker`, and
`ProcessHashtagsService`. The user's request returns as soon as the row is committed.

---

## Brigade's service catalogue

### Identity & profile
```
SignUpService                    user + profile creation, invite consumption
ConfirmEmailService
UpdateProfileService             + enqueues reindex, completeness recompute
VerifyProfileLinkService         rel="me" fetch and check
VerifyEmploymentService          ← the differentiator, see Phase 5
ComputeProfileCompletenessService
MergeProfilesService             duplicate resolution
DeleteProfileService             cascade + tombstone + GDPR/PIPEDA obligations
SuspendProfileService / UnsuspendProfileService
ExportProfileDataService         data portability — legally required
```

### Graph
```
RequestConnectionService         creates pending
AcceptConnectionService          ← creates BOTH directions, enqueues fan-out
RejectConnectionService
RemoveConnectionService
FollowService / UnfollowService  asymmetric
BlockService / UnblockService    ← must also sever connections and purge feeds
MuteService / UnmuteService
RecomputeConnectionDegreesService
```

**`BlockService` is the one people get wrong.** A block must: remove any connection in
both directions, remove follows both ways, purge the blocker's posts from the blocked
user's feed *and* vice versa, and cancel pending notifications. Mastodon's
`AfterBlockService` + `FeedManager#clear_from_home` handle this and it's ~4 distinct
cleanup operations. Get it right the first time; a leaky block is a trust incident.

### Content
```
CreatePostService                ← the canonical one, read PostStatusService first
UpdatePostService                creates a PostEdit record
DeletePostService
ReactionService / UnreactionService
ResharePostService
BookmarkService
FanOutOnWriteService             ← see Phase 4
ProcessMentionsService
ProcessTagsService
FetchLinkPreviewService
```

### Brigade-native
```
CreateEndorsementService
RequestRecommendationService / ApproveRecommendationService
PublishJobPostingService
SubmitApplicationService
AdvanceApplicationStageService
CreateTalentPoolService / AddToTalentPoolService
RecordProfileViewService         ← writes to Redis, not Postgres
CreateIntroRequestService
```

### Trust & safety
```
ReportService
ResolveReportService
SubmitAppealService / ApproveAppealService
WarnProfileService
BlockEmailDomainService
```

### Notification
```
NotifyService                    ← single entry point for ALL notifications
```

One `NotifyService`, always. If notification creation is scattered across twelve services,
then muting, batching, digest email, and notification preferences each have to be
implemented twelve times. Mastodon funnels everything through `NotifyService` and
`LocalNotificationWorker`, and that's why `NotificationPolicy` and `NotificationRequest`
(filtered notifications from strangers) were addable later without touching call sites.

---

## Policies

One policy class per resource, one method per action, returning boolean. From
`app/policies/` (45 files).

```ts
class ProfilePolicy {
  show(actor, profile)     // suspended? blocked? private?
  update(actor, profile)   // self, or company admin
  suspend(actor, profile)  // moderator permission bit
  viewContactInfo(actor, profile)  // connection degree gate
}
```

That last one matters for Brigade: contact info visibility depends on connection degree,
which is a genuine authorization rule, not a rendering concern. If it lives in the
serializer you will leak email addresses through some endpoint that forgot to check.

### Roles

Mastodon's `UserRole` is a **permission bitmask** — roles are database rows with a
permissions integer, so admins can create custom roles without a deploy.

```
Owner       all bits
Admin       moderation + settings
Moderator   reports, suspend, silence
Recruiter   ← Brigade-specific: talent pools, job postings, extended search
Member      default
```

Adopt the bitmask model rather than a role enum. `Recruiter` as a role with distinct
permissions is likely how Brigade monetizes, and you want to add tiers without migrations.

---

## Workers & queues

### Queue topology

Copy the weighting concept from `config/sidekiq.yml`:

```yaml
concurrency: 5
queues:
  - [default, 8]     # user-visible: notifications, feed inserts
  - [push, 6]        # outbound: email, webhooks, push notifications
  - [ingress, 4]     # inbound: uploads, imports, link crawling
  - [mailers, 2]
  - [pull]           # low priority: reindexing, backfills
  - [scheduler]      # cron
```

**The weights are the point.** Without them, a 50,000-row CSV import starves every
notification in the system and users think the site is broken. Weighted queues are a
one-line config that prevents a whole class of incident.

If you're on Node: **BullMQ** or **Graphile Worker**. BullMQ is Redis-backed and closest
to Sidekiq's model. Graphile Worker is Postgres-backed — fewer moving parts, transactional
job enqueueing with your writes, which is a real advantage.

### Worker rules

1. **Workers contain no business logic.** They call a service. A worker is a retry
   envelope, nothing more.
2. **Idempotent.** Retries will happen. Every worker must tolerate running twice.
3. **Take IDs, not objects.** Serialize `profileId`, load fresh inside. The object may
   have changed or been deleted between enqueue and run.
4. **Handle the deleted case.** `if (!profile) return;` at the top of every worker.
5. **Exponential backoff** on anything touching the network.

Mastodon has `app/workers/concerns/exponential_backoff.rb` as a shared mixin and
`sidekiq-unique-jobs` to prevent duplicate enqueueing. Both are worth replicating.

### Brigade's workers

```
default:    FeedInsertWorker, LocalNotificationWorker, ConnectionFanOutWorker,
            ProfileCompletenessWorker
push:       EmailDistributionWorker, WebhookWorker, PushNotificationWorker
ingress:    MediaProcessingWorker, BulkImportRowWorker, LinkCrawlWorker,
            EmploymentVerificationWorker
pull:       ProfileIndexWorker, RecomputeDegreesWorker, BackfillWorker
scheduler:  FlushProfileViewsScheduler         every 5m
            TrendingSkillsScheduler            every 15m
            IndexingScheduler                  every 1m
            DigestEmailScheduler               daily
            ExpiredJobPostingScheduler         hourly
            ConnectionDegreeScheduler          nightly
```

Note `BulkImportRowWorker` — Mastodon's `Import::RowWorker` processes imports **one row
per job**, not one job per file. A 50k-row import becomes 50k small jobs that retry
individually. One failed row doesn't fail the import. Copy this pattern; it's the correct
design for every bulk operation Brigade will have.

---

## Refactoring existing Brigade code

Your onboarding code has logic in it. Move it:

1. Pick one flow — onboarding is the natural first target
2. Write the service (`SignUpService`, `UpdateProfileService`)
3. Write tests **against the service**, not the endpoint
4. Reduce the controller to auth → policy → service → serializer
5. Delete the old path entirely. Don't leave it behind a flag.
6. Repeat

Do one flow end-to-end before starting the second. The first one is where you discover
your service base class needs to change.

---

## Exit criteria

- [ ] `BaseService` exists; every service extends it with a single `call`
- [ ] Zero DB writes in any controller — enforced by the Phase 0 architecture check
- [ ] Every resource has a policy; every controller action calls one
- [ ] Role system uses a permission bitmask, with a `Recruiter` role defined
- [ ] Job queue configured with weights matching the table above
- [ ] Every worker: takes IDs, handles missing records, idempotent, backoff on network
- [ ] `NotifyService` is the only place notifications are created — grep proves it
- [ ] Existing onboarding flow fully migrated to services, old path deleted
- [ ] Service-level test coverage above 80%; controller tests are thin smoke tests

---

## Why this phase is worth a month

This is the phase that produces no visible progress and determines whether Brigade is
maintainable. The service layer is what lets you add a feature in a day two years from now
instead of a week, and it's what lets you hand the codebase to a second engineer without
a month of explanation.

It's also the phase that is genuinely impossible to retrofit later. Phases 3 onward all
assume it exists.
