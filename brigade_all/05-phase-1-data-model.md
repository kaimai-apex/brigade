# 05 — Phase 1: Data Model

**Goal:** A schema that can represent people, companies, the professional graph, and
content — without needing a rewrite when Brigade adds its second entity type.

**Effort:** 2–3 weeks solo
**Depends on:** Phase 0
**Blocks:** everything after

**Reference:** `app/models/` (248 files), `app/models/concerns/account/` (16 concerns),
`db/schema.rb`

---

## The central decision: separate `User` from `Profile`

Mastodon splits `User` and `Account`. Most people building a social product put everything
on one `users` table. That works until the first entity that isn't a logged-in human.

```
User                        Profile
─────                       ───────
email                       username (unique, immutable-ish)
encrypted_password          display_name
2FA secret                  bio
sign_in_count               avatar / header
current_sign_in_ip          followers_count / following_count
locale                      discoverable (directory opt-in)
role_id                     suspended_at / silenced_at
confirmed_at                type  ← person | company | (future: group)
approved                    ...
profile_id ──────────────►
```

**Only some Profiles have a User.** That single property is what buys you:

| Case | User? | Profile? |
|---|---|---|
| A person who signed up | ✅ | ✅ |
| A company page | ❌ | ✅ |
| An unclaimed/scraped company | ❌ | ✅ |
| An invited person who hasn't accepted | ❌ | ✅ (placeholder) |
| A remote federated actor (Phase 9) | ❌ | ✅ |
| An admin with no public presence | ✅ | ✅ (hidden) |

If you merge these tables you will end up with `is_company BOOLEAN`, nullable password
columns, and a `users` table where half the rows can't log in. Every query then carries a
filter it shouldn't need. Mastodon avoided this and it's the highest-leverage thing in
their schema.

**Company pages are the immediate payoff.** Brigade needs them. With the split they're a
`Profile` with `type = company` and no `User`, and the entire follow/post/notification
system works on them unchanged.

---

## Core tables

### Identity

```
users              credentials, sessions, settings, role
user_roles         permission bitmask (see below)
user_settings      per-user preferences
user_ips           audit
login_activities   security log
session_activations
webauthn_credentials
identities         OAuth/SSO links — Google, LinkedIn import, enterprise SAML
```

### Profile

```
profiles           the polymorphic actor. type: person | company
profile_stats      denormalized counters — separate table, hot-written
profile_fields     the freeform key/value rows (Mastodon caps at 4; go higher)
profile_links      url + verified_at ← the rel="me" verification (see 03)
profile_edits      audit trail of profile changes (fraud signal)
```

**`profile_stats` as a separate table is deliberate.** Counters are updated constantly;
profiles are read constantly. Splitting them keeps counter writes from invalidating the
profile cache and from bloating the profiles table with dead tuples. Mastodon learned this
the hard way — copy the conclusion.

### Structured profile content — Brigade-specific

```
experiences        profile_id, company_id, title_id, start_date, end_date,
                   is_current, description, verified_at
educations         profile_id, institution_id, degree, field, dates
certifications     profile_id, issuer, credential_id, issued_at, expires_at, url
projects
publications
profile_languages
```

Note `verified_at` on `experiences`. That column is the product. See Phase 5.

### Controlled vocabulary

```
companies          canonical. name, domain, size, industry_id, claimed_by_profile_id
company_aliases
skills             canonical
skill_aliases      "JS" → "JavaScript"
industries
job_titles         canonical + aliases — "SWE" / "Software Engineer" / "Dev"
institutions       schools/universities
```

Every one of these needs an alias table. Skipping them means your search, filters, and
recruiter queries degrade permanently, and de-duplicating later requires touching every
profile. See divergence 2 in `03-concept-mapping.md`.

### The graph

```
connections        profile_id, target_profile_id, state (pending|accepted),
                   requested_at, accepted_at
                   ← MUTUAL. Store both rows on accept, or one row + a canonical
                     ordering. Pick one and document it.
follows            profile_id, target_profile_id
                   ← ASYMMETRIC. For company pages and public figures
blocks
mutes
profile_notes      private annotations (Mastodon's AccountNote)
featured_profiles  profiles pinned to your own (Mastodon's "endorsement")
```

**Connection degree.** Add the table now even if you don't populate it:

```
connection_degrees  profile_id, target_profile_id, degree (2|3), path_count,
                    computed_at
```

Recomputed by a background job, not live. At 10k profiles a live 2nd-degree query is fine;
at 500k it is a full-table self-join and it will take your database down during a demo.
Design the seam now.

### Content

```
posts              profile_id, text, visibility, in_reply_to_id, reblog_of_id,
                   language, edited_at
post_stats         reply/reshare/reaction counts — separate table, same reason
post_edits         edit history
attachments        images, video, PDF
mentions
reactions          Mastodon's Favourite, generalized to multiple types
bookmarks
tags / post_tags   freeform topics (distinct from skills)
```

### Brigade-native

```
endorsements       endorser_id, endorsee_id, skill_id
recommendations    endorser_id, endorsee_id, body, approved_at
job_postings       company_id, posted_by_profile_id, title_id, location,
                   remote_policy, salary_min/max/currency, closes_at
applications       job_posting_id, profile_id, stage, applied_at
talent_pools       owner_profile_id — recruiter saved lists
talent_pool_items
profile_views      viewer_id (nullable), viewed_id, viewed_at ← see warning below
intro_requests     requester, target, via_profile_id, message, state
```

### Trust & safety (Phase 8, but schema now)

```
reports / report_notes
appeals
profile_warnings / warning_presets
moderation_notes
domain_blocks / email_domain_blocks / canonical_email_blocks
ip_blocks
username_blocks
```

Create these tables in Phase 1 even if unused. Adding moderation tables mid-incident is
a bad afternoon.

---

## `profile_views` — the scaling trap

Every profile page load is a write. This is the highest-volume table in the product and
the first thing that will fall over.

**Do not write synchronously to Postgres.**

```
1. Page load → increment a Redis counter, keyed (viewer, viewed, hour-bucket)
2. Scheduler job every 5 min → flush aggregated rows to Postgres
3. Store hourly/daily aggregates, not raw events, beyond a 30-day window
4. Partition the table by month; drop old partitions instead of DELETE
```

This mirrors how Mastodon handles `AccountStat` counters and trend computation — buffer
hot writes, flush on a schedule. `config/sidekiq.yml` shows the pattern with
`trends_refresh_scheduler` running every 5 minutes rather than computing trends on read.

---

## Model organization: concerns

Mastodon's `Account` is 248 lines of model plus 16 concerns, not one 3,000-line file:

```
account/associations  avatar  header  counters  interactions  merging
        search  statuses_search  silences  suspensions  sensitizes
        finder_concern  mappings  attribution_domains
        interaction_policy_concern  fasp_concern
```

Mirror this for `Profile`:

```
profile/associations       all the has_many
profile/avatar             + profile/header
profile/counters           stat updates
profile/connections        connection graph methods
profile/interactions       blocks, mutes, relationship queries
profile/search             search indexing hooks
profile/suspensions        + profile/silences
profile/verification       link + employment verification
profile/completeness       completeness scoring
profile/merging            duplicate profile merge
```

`Profile` will be Brigade's largest model. Decomposing it on day one is the difference
between a file you can navigate and one you grep.

---

## Migration strategy

Assuming no production users. If wrong, insert a data migration phase.

1. Write the full schema as migrations, not one giant one — one per logical group
2. Seed data: skills, industries, job titles, a company starter set. Source from public
   taxonomies (ESCO, O*NET, NAICS) — check licensing on each
3. Factories/fixtures for every model, generating a realistic graph
4. A `db/seeds/demo.ts` that produces ~1,000 profiles with connections, experiences, and
   posts — you need this for local development, for demos, and for load testing

---

## Indexing

Non-obvious ones you will need:

```sql
-- directory browse (Phase 5)
CREATE INDEX CONCURRENTLY ON profiles (discoverable, last_active_at DESC)
  WHERE suspended_at IS NULL;

-- connection lookup, both directions
CREATE INDEX CONCURRENTLY ON connections (profile_id, state);
CREATE INDEX CONCURRENTLY ON connections (target_profile_id, state);

-- "who else works here"
CREATE INDEX CONCURRENTLY ON experiences (company_id, is_current);

-- skill filtering
CREATE INDEX CONCURRENTLY ON profile_skills (skill_id, endorsement_count DESC);

-- trigram search on names
CREATE INDEX CONCURRENTLY ON profiles USING gin (display_name gin_trgm_ops);
```

Enable `pg_trgm` and `unaccent` in Phase 1. Retrofitting extensions onto a production
database is possible but annoying.

---

## Exit criteria

- [ ] Full schema migrated, all tables above present
- [ ] `User` / `Profile` split implemented; a company Profile with no User is creatable
      and functional
- [ ] `Profile` decomposed into concerns, no concern over ~200 lines
- [ ] Controlled vocabularies seeded with real taxonomy data
- [ ] Factories exist for every model
- [ ] `db/seeds/demo.ts` generates a 1,000-profile graph
- [ ] All indexes created `CONCURRENTLY`, `pg_trgm` + `unaccent` enabled
- [ ] Every migration has a tested rollback
- [ ] `EXPLAIN ANALYZE` on directory browse and connection lookup against the seed data
      shows index usage, not sequential scans

---

## The thing to get right

If you get one thing right in this phase, make it the **User/Profile split**. Everything
else is recoverable with a migration. That one is architectural, and unwinding it means
touching every query in the codebase.
