# 03 — Concept Mapping: Mastodon → Brigade

Mastodon is a microblog. Brigade is a professional network. Most concepts translate; a few
do not, and those are where the real design work is.

---

## Direct translations

| Mastodon | Brigade | Notes |
|---|---|---|
| `Account` | `Profile` | Person **or** company. Keep the polymorphism (see below) |
| `User` | `User` | Credentials only. Keep separate from Profile |
| `Status` | `Post` | Professional updates, articles, job posts |
| `MediaAttachment` | `Attachment` | Add PDF support — portfolios, resumes, case studies |
| `Notification` | `Notification` | 1:1 |
| `Conversation` | `Conversation` | Mastodon's DMs are posts with restricted visibility. Brigade probably wants real threaded messaging — see divergences |
| `Report` / `Appeal` | `Report` / `Appeal` | Adopt verbatim. See Phase 8 |
| `Block` / `Mute` | `Block` / `Mute` | 1:1 |
| `CustomFilter` | `FeedFilter` | Keyword muting |
| `Marker` | `ReadMarker` | Per-timeline read position sync across devices |
| `List` / `ListAccount` | `Talent Pool` / `Segment` | Recruiter-facing. Same shape, far more commercially valuable |
| `Tag` / `FeaturedTag` | `Skill` / `Industry` / `Topic` | See divergences — needs a controlled vocabulary |
| `Trends` (tag/link/status) | `Trending Skills` / `Trending Topics` | Same three-way split |
| `AccountNote` | `PrivateNote` | Private annotations on a profile. **Recruiters will pay for this** |
| `Bookmark` | `SavedItem` | Saved jobs, saved profiles |
| `Favourite` | `Reaction` | Consider LinkedIn-style multi-reaction instead of a single like |
| `AccountStat` | `ProfileStat` | Denormalized counters |
| `Invite` / `UserInviteRequest` | `Invite` | Critical for a professional network's cold-start |
| `UserRole` | `UserRole` | Permission bitmask system. Adopt as-is |
| `Setting` / `UserSettings` | same | Instance-level vs. per-user settings split |
| `WebhookService` | `Webhook` | Enterprise/ATS integrations later |
| `BulkImport` / `BulkImportRow` | `BulkImport` | CSV import of connections, employee rosters |
| `Backup` / `Export` | `DataExport` | **Required** — GDPR Art. 20 and PIPEDA. Not optional |
| `AccountMigration` / `Move` | `ProfileMerge` | Users will create duplicate profiles. Guaranteed |

---

## The four real divergences

These are the places where copying Mastodon's model would be actively wrong.

### 1. Follows are asymmetric. Connections are mutual.

Mastodon: `Follow` is one-directional. `FollowRequest` exists only for locked accounts.
A professional network typically wants **mutual connections** plus a separate
**asymmetric follow** for public figures.

Brigade needs both:

```
Connection      mutual, requires acceptance, symmetric
                → "1st degree", the thing degree-of-separation is computed from
Follow          asymmetric, no acceptance, for thought leaders / company pages
```

Mastodon's `FollowRequest` → `Follow` state machine is the right *mechanism* for
Connection; you just enforce that acceptance creates both directions. Keep `Follow`
alongside it for one-way subscription.

**Design consequence:** degree-of-separation ("2nd", "3rd") is a graph query over
`Connection` only. It is the single most expensive query in a professional network and the
one thing Mastodon gives you no guidance on. Do not compute it live at scale — plan for a
materialized 2nd-degree table or a graph store from the start. Note it in the schema even
if Phase 1 computes it naively.

### 2. Tags are freeform. Skills are a controlled vocabulary.

Mastodon `Tag` is user-created freeform text — `#ruby`, `#Ruby`, `#RubyLang` are three
different tags and nobody minds.

For Brigade this breaks everything downstream. If "JavaScript", "Javascript", "JS", and
"ECMAScript" are four skills, then search, filtering, recruiter queries, and matching all
degrade. You need:

```
Skill              canonical entity, curated
SkillAlias         many aliases → one canonical skill
ProfileSkill       join, with endorsement_count + years_experience
```

Same for `Industry`, `JobTitle`, and `Company`. **Company is the important one** — it must
be an entity, not a string on a profile, or you can never answer "who else works at X" or
link a profile to a company page.

Keep Mastodon's freeform `Tag` model too, for post topics. Two systems, different jobs.

### 3. `Endorsement` means two different things

Mastodon's `endorsements_controller` is "featured profiles" — accounts you pin to your own
profile. That's `FeaturedProfile` in Brigade.

`Endorsement` in a professional network means "Kai endorses Jordan for Product Strategy" —
a three-way relation between endorser, endorsee, and skill. Plus `Recommendation`, the
long-form written version.

Don't reuse the name. You will confuse yourself in three months.

```
FeaturedProfile   profiles I pin to my own profile   (Mastodon's "endorsement")
Endorsement       endorser × endorsee × skill        (new)
Recommendation    endorser × endorsee × text, approved by endorsee (new)
```

### 4. The profile is the product

In Mastodon, `Account` is thin — name, bio, avatar, four fields. The timeline is the
product.

In Brigade, the **profile is the product**. It's a structured document:

```
Profile
  ├── Experience[]      company, title, dates, description, current?
  ├── Education[]       institution, degree, field, dates
  ├── ProfileSkill[]    skill, endorsement_count, years
  ├── Certification[]   issuer, credential_id, issued_at, expires_at
  ├── Project[]
  ├── Publication[]
  ├── Language[]
  └── ProfileLink[]     verified via rel="me" — see below
```

This means:
- **Profile completeness scoring** is a first-class feature, not a nice-to-have. It drives
  onboarding, and it's the metric your directory ranking should weight.
- **Profile edit history** matters (fraud signal — someone who edits their title to "VP"
  the day before applying is worth flagging). Mastodon has `StatusEdit`; you need
  `ProfileEdit`.
- Profiles are **large and read-heavy**. Different caching profile than a timeline —
  cache aggressively, invalidate on edit.

---

## The one thing to steal that nobody expects: link verification

`app/services/verify_link_service.rb` + `Account::AttributionDomains`.

Mastodon lets you add links to your profile. It fetches each link and checks for a
`rel="me"` backlink pointing at your profile. If found, the link renders with a verified
checkmark. No cost, no manual review, cryptographically unnecessary, and genuinely hard to
fake.

For Brigade this is **employment verification**:

- User claims they work at `acme.com`
- Brigade verifies via a `rel="me"` link on their acme.com staff page, **or** an email
  round-trip to `@acme.com`, **or** a domain-verified company admin confirming them
- Verified employment badge on the profile

This is the highest-trust, lowest-cost feature in the entire plan, and it's a direct
differentiator against platforms where anyone can claim any employer. Prioritize it.

`Account::AttributionDomains` is the related mechanism — domains authorized to attribute
content to an account. For Brigade, that's how a company page authorizes employees to post
on its behalf.

---

## What to drop entirely

| Mastodon feature | Verdict |
|---|---|
| `Poll` / `PollVote` | Low value, defer |
| `CustomEmoji` / `CustomEmojiCategory` | Off-brand for professional. Drop |
| `Quote` / `QuoteRequest` | Nice for commentary posts. Phase 4+ |
| `Relay` | Federation only. Drop |
| `Fasp` (~10 models/workers) | Federation-adjacent discovery protocol. Drop |
| `Announcement` / `AnnouncementReaction` | Admin broadcast. Cheap, keep |
| `AnnualReport` / `GeneratedAnnualReport` | "Your year in review". Growth loop, but Phase 8+ |
| `AccountStatusesCleanupPolicy` | Auto-delete old posts. Wrong for a professional archive. Drop |
| `ScheduledStatus` | Scheduled posting. Keep — creators and recruiters want it |
| `Tombstone` / `AccountDeletionRequest` | Deletion handling. **Keep** — legally required |
| `SessionActivation` / `LoginActivity` / `UserIp` | Security surface. Keep |
| `WebauthnCredential` | Passkeys. Keep, low effort, high trust signal |

---

## Brigade-native concepts with no Mastodon analogue

These are yours. Nothing in the reference repo helps, which is exactly why they're the
product:

```
Company              entity, claimable, verified by domain
CompanyPage          Profile subtype — reuse the polymorphism
JobPosting           + Application, ApplicationStage
Endorsement          endorser × endorsee × skill
Recommendation       long-form, approved by recipient
ConnectionDegree     materialized 2nd/3rd degree graph
TalentPool           recruiter-owned saved search + saved profiles
ProfileView          "who viewed your profile" — a top monetization hook
IntroRequest         warm intro through a mutual connection
Availability         open-to-work / open-to-hire signal, with privacy scoping
```

**`ProfileView` warning:** it is a firehose. Every profile page load is a write. Do not
write these synchronously to Postgres. Buffer in Redis, flush aggregated rows on a
scheduler — exactly the pattern Mastodon uses for `AccountStat` counters and trend
computation. This is the first place Brigade will fall over if built naively.

---

## Naming convention

Adopt Mastodon's discipline explicitly, in `CONTRIBUTING.md`:

```
Services   VerbNounService        CreatePostService, VerifyEmploymentService
Workers    NounVerbWorker         ProfileIndexWorker, ConnectionFanOutWorker
Policies   NounPolicy             ProfilePolicy, JobPostingPolicy
Serializers NounSerializer        ProfileSerializer, PostSerializer
Concerns   Namespaced             Profile::Interactions, Profile::Counters
```

The value is not aesthetic. It means that six months from now, "where does the logic for X
live" has exactly one answer, and a new hire finds it without asking.
