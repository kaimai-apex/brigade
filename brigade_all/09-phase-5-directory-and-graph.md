# 09 — Phase 5: Directory, Search & Graph

**Goal:** Brigade's directory becomes the product's core — fast, filterable, trustworthy,
and hard to scrape. Employment verification ships here.

**Effort:** 4–5 weeks solo
**Depends on:** Phase 1, 2, 3
**Blocks:** nothing — but this is the phase that differentiates Brigade

**Reference:** `app/controllers/api/v1/directories_controller.rb`,
`app/services/{account_search,search,tag_search}_service.rb`,
`app/services/verify_link_service.rb`, `app/chewy/`, `app/models/account_suggestions.rb`,
`app/models/follow_recommendation.rb`

---

## Why this phase matters most

You already built a directory page. Every other phase makes Brigade *work*; this one makes
it *worth using*. A professional network where the directory is slow, stale, or full of
fake profiles has no reason to exist.

---

## The directory endpoint

The reference implementation is short and worth understanding fully:

```ruby
def show
  cache_if_unauthenticated!
  render json: @accounts, each_serializer: REST::AccountSerializer
end

def set_accounts
  with_read_replica do
    @accounts = accounts_scope.offset(params[:offset]).limit(limit_param(DEFAULT_LIMIT))
  end
end

def accounts_scope
  Account.discoverable.tap do |scope|
    scope.merge!(account_order_scope)
    scope.merge!(local_account_scope)        if local_accounts?
    scope.merge!(account_exclusion_scope)    if current_account
    scope.merge!(account_domain_block_scope) if current_account && !local_accounts?
  end.includes(:account_stat, user: :role)
end
```

Four things to steal:

**1. `discoverable` is an explicit opt-in column.** Not "public", not inferred from privacy
settings — a dedicated boolean the user controls. For Brigade this is a legal requirement
as much as a product one: PIPEDA (Canada) and GDPR (your EU users) both make "was this
person's professional data listed with their knowledge" a question you need a clean answer
to. One column, one consent moment in onboarding, one defensible answer.

**2. Composable scopes, not a query builder.** Each filter is an independent scope merged
conditionally. Adding "filter by skill" is one new scope, not another branch in a
600-line function. Brigade will have 15+ filters; this is the only structure that survives
that.

**3. `with_read_replica`.** Directory browsing is the highest-volume read in the product
and touches no data that needs to be read-after-write consistent. Route it to a replica.
Introduce the seam now even if you have one database — retrofitting replica routing means
auditing every query.

**4. `cache_if_unauthenticated!`.** Anonymous directory requests are identical for everyone,
so they're CDN-cacheable. Authenticated ones aren't, because they exclude blocked profiles
and show relationship state. Splitting these two paths is most of your directory scaling
story.

Note that this endpoint uses `offset`, not cursor pagination. That's acceptable here —
directory results are cached, bounded, and ordered by activity rather than ID. Everything
realtime uses cursors (see Phase 3).

---

## Brigade's directory filters

```
skills[]              multi-select, canonical IDs (not strings)
industries[]
companies[]           current or past
job_titles[]
locations[]           + remote_only, willing_to_relocate
seniority             enum
years_experience      range
education[]           institution, degree level
open_to               work | consulting | mentoring | board | investing
verified_only         ← boolean, and the most valuable filter in the product
languages[]
connection_degree     1st | 2nd | 3rd+ | any
active_within         30d | 90d | any
```

`verified_only` is the one to build the product around. See below.

### Ordering

The reference offers `active` (recently posted) and `new`. Brigade needs:

```
relevance       default — see below
active          recently active
new             recently joined
connections     mutual connection count desc  ← strong social proof signal
completeness    profile completeness desc
```

**Relevance ranking** for a logged-in viewer should weight: connection degree (1st > 2nd >
3rd), shared company/school, skill overlap, verification status, profile completeness, and
recent activity. Compute this as a score, cache it, recompute on a scheduler — never live
per request.

---

## Employment verification

The differentiator. Everything else in Brigade is a commodity; verified employment isn't.

`verify_link_service.rb` in the reference does `rel="me"` link verification: fetch the URL
the user claims, look for a backlink to their profile, mark verified. Free, unfakeable
without controlling the target domain, no manual review.

Brigade's `VerifyEmploymentService`, tiered:

| Tier | Method | Trust | Cost |
|---|---|---|---|
| 1 | Email round-trip to a corporate domain (`@acme.com`) | Medium | Trivial |
| 2 | `rel="me"` backlink from a company staff page | High | Trivial |
| 3 | Company admin (domain-verified) confirms the employee | Highest | Requires company adoption |
| 4 | Third-party payroll/HR verification API | Highest | Paid, enterprise-only |

Start with tiers 1 and 2. They cost almost nothing and immediately let you show a verified
badge that competitors can't match. Tier 3 is the growth loop: an employer claims their
company page to verify staff, which pulls the employer onto the platform.

Implementation notes:
- Corporate email domains need a blocklist — `gmail.com`, `outlook.com`, plus the
  disposable-email lists. Mastodon's `email_domain_blocks` model is the right shape.
- Verification **expires**. Someone verified at Acme in 2024 may have left. Re-verify
  current roles periodically; mark past roles verified-as-of-date.
- Store `verified_at` and `verification_method` on `experiences`, and surface the method
  in the UI. "Verified by employer" and "verified by email" are different claims and users
  should be able to tell.

---

## Search

The reference splits search three ways — `account_search_service`, `statuses_search_service`,
`tag_search_service` — behind one `search_service`. Brigade's:

```
ProfileSearchService
CompanySearchService
JobSearchService
PostSearchService
SkillSearchService
  └─ SearchService (unified, /api/v2/search)
```

### Postgres or Elasticsearch?

Mastodon makes Elasticsearch **optional** (`chewy` gem, 6 index definitions) and degrades
to Postgres without it. Copy that posture.

**Start with Postgres.** `pg_trgm` + `tsvector` handles fuzzy name matching, prefix search,
and faceted filtering well into six figures of profiles. Elasticsearch is a whole
additional system to run, monitor, and keep in sync.

**Move to Elasticsearch when** you need: relevance tuning across weighted fields, typo
tolerance beyond trigram, faceted aggregation counts ("142 results, 38 in Toronto"), or
sub-100ms multi-filter queries at scale.

Design the seam now: `ProfileSearchService` is an interface with a Postgres implementation.
Swapping the backend later shouldn't touch a controller.

### Indexing

Whichever backend — index asynchronously, never in the request:

```
UpdateProfileService → enqueue ProfileIndexWorker (pull queue)
IndexingScheduler    → every 1 min, flush the pending-reindex set
```

The reference runs `indexing_scheduler` every minute rather than indexing per-write, so a
burst of edits produces one reindex, not fifty.

---

## Suggestions

`account_suggestions.rb` + `follow_recommendation.rb` + `follow_recommendation_suppression.rb`.
Note that last one: users can **dismiss** a suggestion and never see it again. Suggestions
without dismissal are an annoyance; with it, they're a feature.

Brigade's suggestion sources, ranked by signal strength:

1. Same current employer — strongest by a wide margin
2. Same past employer, overlapping dates
3. Same school, overlapping years
4. Mutual connections (count-weighted)
5. Imported address book / LinkedIn export
6. Skill and industry overlap
7. Geographic proximity

Precompute nightly per user (`pull` queue), store, serve from cache. Never compute live.

Include `suggestion_dismissals` from the start. Also: dismissals are a training signal —
log them.

---

## Anti-scraping

Brigade's directory is its asset. Mastodon barely defends this because its data is
intentionally public; yours isn't.

- Non-sequential IDs (Snowflake — see Phase 4) so profiles can't be enumerated
- Aggressive rate limits on directory and profile endpoints (Phase 3)
- Full profile data requires authentication
- Detect enumeration patterns: high-volume sequential access, breadth-first graph walking
- Vary field ordering / inject canary profiles to detect and prove scraped datasets
- `robots.txt` + explicit crawler allowlist for the public directory
- Consider requiring auth for the directory entirely past a low anonymous quota

Balance this against SEO — public, crawlable profile pages are a major acquisition channel.
The usual resolution: server-render a limited public profile (name, headline, current
company, skills) for crawlers and anonymous users; gate full detail behind auth.

---

## Company pages

Enabled by the Profile polymorphism from Phase 1. A company Profile with no User:

```
Company                 canonical entity, domain-verified
CompanyPage             Profile with type=company, claimed_by
company_admins          profiles authorized to post as the company
```

`Account::AttributionDomains` in the reference is the analogous mechanism — a domain
authorized to attribute content. Brigade's version: a domain-verified company authorizes
employees to post on its behalf.

Company page unlocks: "people who work here", "alumni of this company", employer-verified
badges (tier 3 above), and job postings with a verified employer. It's also the wedge into
employer monetization.

---

## Exit criteria

- [ ] Directory uses composable scopes; adding a filter touches one file
- [ ] `discoverable` opt-in column, set explicitly during onboarding with clear consent
- [ ] Read-replica routing seam in place for directory and search
- [ ] Anonymous directory responses CDN-cached; authenticated path separate
- [ ] All filters above implemented, combinable, with correct result counts
- [ ] Relevance ranking precomputed and cached, not computed per request
- [ ] Employment verification tiers 1 and 2 live; verified badge visible; `verified_only`
      filter works
- [ ] Verification expiry and re-verification implemented
- [ ] Search behind a swappable interface, Postgres implementation, async indexing
- [ ] Suggestions precomputed nightly, with dismissal and suppression
- [ ] Rate limiting and enumeration detection live on directory and profile endpoints
- [ ] Company pages creatable, claimable, domain-verifiable
- [ ] Directory p95 under 200ms with 100k seeded profiles and three active filters
