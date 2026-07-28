# 02 — Mastodon Architecture Map

Everything here was read from `mastodon/mastodon` @ `main`. File counts are actual.

---

## Tech stack (from the README)

| Layer | Technology | Version floor |
|---|---|---|
| Web / API | Ruby on Rails | Ruby 3.3+, Rails 8.1 |
| Database | PostgreSQL | 14+ |
| Cache & queue broker | Redis | 7.0+ |
| Background jobs | Sidekiq | < 9 |
| Streaming API | Node.js (separate process) | 20+ |
| Frontend | React + Redux | bundled with Vite |
| Search (optional) | Elasticsearch via `chewy` gem | — |
| Media processing | FFmpeg | 5.1+ |

Language split: Ruby 61.8%, TypeScript 19.8%, JavaScript 9.6%, SCSS 4.4%, Haml 3.9%.

The Haml is worth noting — Mastodon is **not** a pure SPA. Server-rendered Haml handles
the landing page, settings, admin, and public profile pages (good for SEO); React handles
the logged-in app shell. For Brigade that hybrid is exactly right: your directory and
profile pages need to be crawlable, your logged-in feed does not.

---

## Backend layers — `app/` (file counts)

```
app/javascript    1528   React/Redux frontend
app/views          359   Haml server-rendered templates
app/controllers    337   HTTP layer — thin
app/models         248   ActiveRecord + concerns
app/lib            166   Domain logic that isn't a model or service
app/serializers    144   JSON output shaping
app/workers        118   Sidekiq background jobs
app/services        99   Write operations / use cases
app/policies        45   Pundit authorization
app/helpers         39   View helpers
app/validators      22
app/presenters      16
app/mailers          6
app/chewy            6   Elasticsearch index definitions
```

**The load-bearing insight:** controllers (337) barely outnumber services (99) + workers
(118) + policies (45). Mastodon pushes almost all logic *out* of controllers. A controller
authenticates, authorizes via a policy, calls one service, and renders one serializer.
That's the whole pattern, and it's the single most valuable thing to copy.

### `app/services/` — the use-case layer

99 service objects. Each is a single public `#call`, inheriting from `BaseService`. Real
examples:

```
post_status_service.rb              create a post
fan_out_on_write_service.rb         push it to followers' feeds
follow_service.rb                   follow someone
unfollow_service.rb
block_service.rb / mute_service.rb
notify_service.rb                   generate a notification
report_service.rb                   file a moderation report
suspend_account_service.rb
delete_account_service.rb
account_search_service.rb
search_service.rb / statuses_search_service.rb
bootstrap_timeline_service.rb       seed a new user's empty feed
precompute_feed_service.rb
verify_link_service.rb              rel="me" link verification
resolve_account_service.rb
bulk_import_service.rb
```

Note the naming discipline: `VerbNounService`. Every state-changing operation in the
system has exactly one of these, and it is the *only* way that state changes. Controllers
don't write to the DB. Workers don't write to the DB. They call services.

### `app/workers/` — background jobs

118 workers across 7 Sidekiq queues, from `config/sidekiq.yml`:

```yaml
:queues:
  - [default, 8]      # user-visible work
  - [push, 6]         # outbound delivery
  - [ingress, 4]      # inbound processing
  - [mailers, 2]
  - [pull]            # fetching remote data
  - [scheduler]       # cron
  - [fasp]
```

The bracketed numbers are **weights**, not counts — `default` is picked 8× as often as
`pull`. This is how Mastodon keeps a flood of inbound federation traffic from starving
user-facing work. Brigade needs the same discipline the moment you have more than one kind
of background job.

Scheduled jobs run via `sidekiq-scheduler` in-process — no separate cron:

```yaml
scheduled_statuses_scheduler:  every 5m
trends_refresh_scheduler:      every 5m
indexing_scheduler:            every 1m
trends_review_notifications:   every 6h
```

### `app/lib/` — domain logic

166 files. The important one for Brigade:

**`app/lib/feed_manager.rb`** — the entire timeline system. Key constants:

```ruby
MAX_ITEMS      = 800   # max entries kept per feed in Redis
REBLOG_FALLOFF = 80    # dedupe window for reshares
```

Public surface:

```ruby
push_to_home / unpush_from_home
push_to_list / unpush_from_list
merge_into_home / unmerge_from_home      # on follow / unfollow
clear_from_home / clear_from_lists       # on block
populate_home / populate_list            # backfill
filter?                                  # should this even enter the feed
trim                                     # enforce MAX_ITEMS
```

Plus a private method named `build_crutches` — it batch-loads all the block/mute/filter
relationships needed to evaluate a set of posts in one query, instead of N queries per
post. That's the N+1 defense for fan-out, and it's the kind of thing you only learn by
reading production code.

**`app/lib/activitypub/`** — federation, 30 files:
```
activity.rb + activity/{create,announce,follow,like,block,delete,undo,
                        accept,reject,add,remove,move,flag,update,...}.rb
adapter.rb  dereferencer.rb  forwarder.rb  linked_data_signature.rb
object_integrity_proof.rb  tag_manager.rb
parser/{status,poll,media_attachment,preview_card,custom_emoji,...}_parser.rb
```
Combined with 28 `app/workers/activitypub/*` workers, this is the third of the codebase
Brigade is deferring in Phase 9.

### `app/models/` — 248 files

The critical structural decision, covered fully in `05-phase-1-data-model.md`:

**`user.rb` and `account.rb` are separate models.**

- `User` — email, password, 2FA, sessions, roles, settings. Local humans only.
- `Account` — username, display name, bio, avatar, follower counts, the social graph.

Every actor in the system is an `Account`. Only *local* accounts have a `User`. This is
what makes remote actors representable without hacks, and for Brigade it's what will make
**company pages** representable without hacks.

`Account` is decomposed into 16 concerns rather than being one 3,000-line file:

```
associations  avatar  header  counters  interactions  merging  search
statuses_search  silences  suspensions  sensitizes  finder_concern
mappings  attribution_domains  interaction_policy_concern  fasp_concern
```

### `app/controllers/api/` — versioned API

```
api/base_controller.rb
api/v1/     36 controllers
api/v2/     (newer/replacement endpoints)
api/v1_alpha/
api/web/    internal endpoints for the SPA
api/fasp/
api/oembed_controller.rb
```

Selected `v1` controllers, most of which have a Brigade analogue:

```
accounts  statuses  timelines  notifications  conversations  media
directories  suggestions  follow_requests  endorsements  featured_tags
lists  filters  reports  blocks  mutes  domain_blocks  tags  markers
apps  polls  bookmarks  favourites  instances  invites  streaming
```

**`directories_controller.rb`** is directly relevant to what you've already built — it's
Mastodon's people-discovery endpoint. Its scope-composition pattern:

```ruby
def accounts_scope
  Account.discoverable.tap do |scope|
    scope.merge!(account_order_scope)
    scope.merge!(local_account_scope)      if local_accounts?
    scope.merge!(account_exclusion_scope)  if current_account
    scope.merge!(account_domain_block_scope) if current_account && !local_accounts?
  end.includes(:account_stat, user: :role)
end
```

Three things to steal: composable scopes instead of a branching query builder,
`with_read_replica` to keep browse traffic off the primary, and `cache_if_unauthenticated!`
so anonymous directory browsing is CDN-cacheable. Details in
`09-phase-5-directory-and-graph.md`.

---

## Frontend — `app/javascript/` (1,528 files)

```
mastodon        1006
material-icons   311
images            94
styles            35
fonts             30
icons             23
entrypoints       12
```

Inside `mastodon/`:

```
features   369    route-level screens, one directory per screen
components 255    shared presentational components
locales    110
actions     63    Redux actions
reducers    42
utils       37
hooks       27
api_types   21    TypeScript types for API responses
models      17    normalization layer
api         17    API client modules
selectors   10
containers  10
store        6
```

**`features/` is organized by screen, not by type.** Each directory is a route:

```
home_timeline  public_timeline  community_timeline  hashtag_timeline
directory  explore  search  compose  notifications  notifications_v2
onboarding  account_timeline  account_gallery  account_featured
followers  following  follow_requests  lists  list_timeline
filters  blocks  mutes  domain_blocks  report  status  quotes
collections  bookmarked_statuses  favourited_statuses  ui  navigation_panel
```

`ui/` is the app shell — layout, columns, modals, routing. Everything else mounts inside
it. There are two notifications directories (`notifications` and `notifications_v2`)
because they migrated incrementally rather than big-bang rewriting. Worth remembering.

Also: `api_types/` holds hand-written TypeScript types for API responses, separate from
`models/` which normalizes them into client-side shapes. That separation — wire format vs.
client format — prevents API changes from rippling through every component.

---

## Key dependencies (from `Gemfile`)

| Gem | Role | Node/TS equivalent if you stay on JS |
|---|---|---|
| `devise` + `devise-two-factor` | Auth, 2FA | Lucia, Auth.js |
| `doorkeeper` | OAuth2 provider | `node-oauth2-server`, Ory Hydra |
| `pundit` | Authorization policies | CASL, or hand-rolled |
| `sidekiq` + `-scheduler`, `-unique-jobs`, `-bulk` | Jobs | BullMQ, Graphile Worker |
| `kaminari` | Pagination | — |
| `chewy` | Elasticsearch integration | `@elastic/elasticsearch` |
| `scenic` | Versioned DB views in migrations | — |
| `strong_migrations` | Blocks unsafe migrations in CI | `@subzerocloud`, or review discipline |
| `rack-attack` | Rate limiting / throttling | `express-rate-limit` + Redis |
| `blurhash` | Image placeholders | `blurhash` npm |
| `webauthn` | Passkeys | `@simplewebauthn/server` |
| `pghero` | Postgres performance dashboard | same, it's standalone |
| `omniauth-{saml,cas,oidc}` | Enterprise SSO | — |
| `opentelemetry-api` | Tracing | `@opentelemetry/sdk-node` |

Two to flag for Brigade specifically:

- **`strong_migrations`** — refuses to run a migration that would lock a large table.
  Adopt an equivalent early; it's the difference between a 200ms deploy and a 40-minute
  outage once the accounts table is large.
- **`omniauth-saml` / `omniauth_openid_connect`** — enterprise SSO. Mastodon has it
  because instances get run by organizations. Brigade will need it the first time an
  employer wants to bulk-onboard staff. Cheap to design for now, expensive to retrofit.

---

## Deployment surface

```
Dockerfile  docker-compose.yml  Procfile  Procfile.dev
chart/                          Helm chart
.devcontainer/                  reproducible dev environment
app.json  scalingo.json         PaaS one-click deploy
.env.production.sample
```

Process types in the `Procfile`: web (Rails/Puma), sidekiq (workers), streaming (Node).
Three deployables sharing one Postgres and one Redis. Brigade should land on the same
three-process shape.

---

## What to actually read, in order

If you only read six files from the reference repo, read these:

1. `app/services/post_status_service.rb` — the canonical service object
2. `app/services/fan_out_on_write_service.rb` — how a write reaches followers
3. `app/lib/feed_manager.rb` — the timeline system entire
4. `app/controllers/api/v1/directories_controller.rb` — your directory, done properly
5. `config/sidekiq.yml` — queue weighting
6. `app/models/concerns/account/interactions.rb` — social graph modeling

Read them for *shape*. Do not copy them. See `01-decision-gate.md`.
