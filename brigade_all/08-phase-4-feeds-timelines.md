# 08 — Phase 4: Feeds & Timelines

**Goal:** A home feed that loads in under 100ms regardless of how many connections a user
has, and stays correct through follows, blocks, mutes, and deletions.

**Effort:** 3–4 weeks solo
**Depends on:** Phase 2, Phase 3
**Blocks:** Phase 7 (streaming)

**Reference:** `app/lib/feed_manager.rb`, `app/services/fan_out_on_write_service.rb`,
`app/workers/feed_insert_worker.rb`, `app/models/{home_feed,list_feed,public_feed,tag_feed}.rb`

---

## Fan-out on write

The core decision. Two options:

**Fan-out on read** — when a user opens their feed, query posts from everyone they follow,
sorted by time. Simple. Dies at scale: a user following 500 people triggers a query across
500 authors' posts on every page load.

**Fan-out on write** — when someone posts, immediately push the post ID into every
follower's precomputed feed list in Redis. Reading a feed is then one Redis range query.

Mastodon does fan-out on write. `FeedManager` is the implementation and it's ~670 lines
handling every edge case.

### The tradeoff

Writes get expensive proportional to follower count. Someone with 100k followers generates
100k Redis writes per post. Mastodon handles this by doing the fan-out in background
workers (`FeedInsertWorker` on the `default` queue) so the poster's request returns
immediately.

**For Brigade this is the right choice**, and more so than for Mastodon: professional
networks are read-heavy and write-light. People check their feed daily and post weekly.
Optimize for the read.

---

## The Redis structure

From `feed_manager.rb`:

```ruby
MAX_ITEMS      = 800   # per feed
REBLOG_FALLOFF = 80    # reshare dedupe window
```

Each feed is a Redis sorted set: `feed:home:{profile_id}`, member = post ID, score = post
ID (IDs are time-sortable — see below). Trimmed to 800 entries.

**800 is the load-bearing number.** It bounds memory: 800 IDs × N users is predictable and
budgetable. Nobody scrolls past 800 items; if they do, fall back to a database query for
older content. Don't make this number bigger because it feels stingy.

### Time-sortable IDs

Mastodon uses **Snowflake-style IDs** — a 64-bit integer with a millisecond timestamp in
the high bits. This means:

- Sorting by ID sorts by time, so the Redis score is just the ID
- Cursor pagination (`max_id`/`min_id`) works without a separate timestamp index
- IDs are non-sequential and non-enumerable — a scraping defense you get for free

Do this in Phase 1 if you haven't. Retrofitting IDs is one of the genuinely painful
migrations.

---

## Feed types

Mastodon has four feed model classes. Brigade's:

```
HomeFeed          connections + follows          precomputed in Redis
ListFeed          per talent-pool / segment      precomputed in Redis
PublicFeed        everything discoverable        query-time, cached
TagFeed           per skill/topic                query-time, cached
CompanyFeed       posts from/about a company     query-time, cached  ← Brigade
JobFeed           matched job postings           precomputed, scheduler-driven ← Brigade
```

Only feeds that are **personal and high-traffic** get precomputed. Public and tag feeds are
the same for everyone, so cache the query result instead of materializing per user.

`JobFeed` is the interesting Brigade case: job matching is expensive and doesn't need to be
realtime. Compute it nightly per user on the `pull` queue, store as a precomputed feed.

---

## `FeedManager`'s surface

Reimplement this API. The method list is the specification:

```
push_to_home(profile, post)          insert one post
unpush_from_home(profile, post)      remove one post
push_to_list / unpush_from_list

merge_into_home(from, into)          on connect — backfill their posts into my feed
unmerge_from_home(from, into)        on disconnect — remove their posts from my feed
merge_into_list / unmerge_from_list

clear_from_home(profile, target)     on block — purge everything from that person
clear_from_lists(profile, target)

populate_home(profile)               backfill a new/empty feed
populate_list(list)

filter?(type, post, receiver)        should this enter the feed at all
trim(type, feed_id)                  enforce MAX_ITEMS
```

The merge/unmerge pair is what people forget. When you connect with someone, their recent
posts must be **backfilled** into your existing feed, not just appear going forward. When
you disconnect, their posts must be **removed** from your feed retroactively. Both are
background jobs.

---

## Filtering, and the N+1 that will bite you

`FeedManager#filter?` decides whether a post enters a feed. It checks: blocks (both
directions), mutes, domain blocks, keyword filters, muted conversations, reply visibility,
and language preferences.

Naively, evaluating this for 800 posts means hundreds of queries.

The reference solves it with a private method called **`build_crutches`** — before
filtering a batch, it loads every relevant block, mute, follow, and filter relationship for
that receiver in a handful of bulk queries, into an in-memory hash. Filtering then runs
against the hash with zero further queries.

There are dedicated helpers for the expensive pieces (`crutches_following`,
`crutches_active_mentions`, `crutches_exclusive_list_users`).

**Copy this pattern.** Any time you filter a batch against per-user relationship state,
preload the state once. It's the single most valuable performance idea in `feed_manager.rb`
and it generalizes far beyond feeds — the directory in Phase 5 needs the same thing.

---

## Fan-out flow

```
CreatePostService
  ├─ validate, create post row (transaction commits, request returns)
  └─ enqueue FanOutOnWriteWorker(postId)
       │
       ├─ resolve audience  (connections + followers, minus blocks)
       ├─ if audience < 1000  → insert inline in batches
       ├─ if audience ≥ 1000  → chunk into FeedInsertWorker jobs of ~500
       │
       └─ per receiver:
            ├─ filter?(post, receiver)   using crutches
            ├─ ZADD feed:home:{receiver}  score=postId  member=postId
            ├─ trim to MAX_ITEMS
            └─ if receiver is streaming → publish to Redis pubsub  (Phase 7)
```

The threshold matters. Small fan-outs inline avoid job overhead; large ones must chunk or
one job runs for minutes and blocks a worker. Mastodon uses `sidekiq-bulk` to enqueue in
batches for exactly this.

---

## Reshare dedupe

`REBLOG_FALLOFF = 80`. If the same post is reshared by five connections, showing it five
times ruins the feed. Within a window of the 80 most recent items, a reshare of a post
already present updates the existing entry (incrementing "and 4 others reshared") rather
than adding a row.

Brigade needs this immediately — professional feeds are reshare-heavy, and the "12 people
in your network shared this" aggregation is the feature, not the workaround.

---

## Cold start

New user, zero connections, empty feed, immediate churn. Mastodon's
`BootstrapTimelineService` seeds a new account's timeline from suggested follows.

Brigade's `BootstrapFeedService` should seed from:

1. Company — colleagues at the same current employer (highest signal by far)
2. Education — same institution and graduation window
3. Imported contacts, if they connected an address book or LinkedIn export
4. Skills — high-signal profiles sharing their top skills
5. Location + industry
6. Curated editorial content, as a floor

Run this synchronously during onboarding if it takes under ~2 seconds, otherwise
optimistically at signup. A user should never see an empty feed. This is the highest-ROI
work in the entire feed phase — feed quality on day one determines whether there is a day
two.

---

## Ranking

Mastodon's home timeline is strictly chronological, deliberately. Brigade will eventually
want ranking. Design for it now, don't build it now:

- Store the Redis score as the post ID (chronological) initially
- Keep ranking as a **separate re-scoring pass** over the retrieved 800 IDs, applied at
  read time, not baked into fan-out
- That way ranking is swappable, A/B testable, and reversible without rebuilding feeds

Do not put a ranking score in the sorted set score. You will want to change the ranking
function weekly, and you cannot rewrite every feed weekly.

---

## Failure modes to design for

| Failure | Consequence | Mitigation |
|---|---|---|
| Redis loses data | Every feed empty | `populate_home` on cache miss — feeds must be rebuildable from Postgres |
| Fan-out worker backs up | Posts appear late | Monitor queue depth; alert on `default` queue lag > 30s |
| A post is deleted mid-fan-out | Orphan IDs in feeds | Read path tolerates missing posts, filters them out |
| Feed drift after failed jobs | Stale/wrong entries | Nightly reconciliation job on a sample of feeds |

**Feeds must be treated as a cache, always rebuildable from Postgres.** The moment a feed
is the only place a piece of state lives, a Redis failover becomes data loss.

---

## Exit criteria

- [ ] Time-sortable IDs in use for posts
- [ ] `FeedManager` implemented with the full method surface above
- [ ] Fan-out via background workers; small/large audiences handled differently
- [ ] Crutches-equivalent batch preloading — zero N+1 in filtering, proven by query logs
- [ ] merge/unmerge on connect/disconnect, backfilling and removing retroactively
- [ ] Block purges the feed in both directions
- [ ] Reshare dedupe within the falloff window
- [ ] `BootstrapFeedService` — a new user with zero connections sees a populated feed
- [ ] Feeds rebuildable from scratch: flush Redis, feeds repopulate correctly
- [ ] Home feed p95 under 100ms with a seeded 10k-profile graph
- [ ] Queue depth monitoring and alerting live
