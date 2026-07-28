# 12 — Phase 8: Trust & Safety

**Goal:** Brigade can detect, review, and act on abuse before it damages the platform's
credibility.

**Effort:** 3–4 weeks solo
**Depends on:** Phase 2

> **Do not defer this past launch.** It is the most under-prioritized phase in this
> document and the one most likely to be skipped. See the risk note below.

**Reference:** `app/models/{report,appeal,account_warning,domain_block,email_domain_block,
canonical_email_block,ip_block,username_block,user_role}.rb`,
`app/services/{report,suspend_account,approve_appeal}_service.rb`,
`app/controllers/admin/`, `app/policies/` (45)

---

## Why this is urgent for Brigade specifically

Mastodon has an unusually deep moderation model because federated social networks are
abuse magnets. Brigade's threat model is different but *worse* in one dimension: the fraud
is financially motivated.

A professional networking platform attracts:

- **Recruitment scams** — fake job postings harvesting personal data, or advance-fee fraud
  against job seekers. High-volume, professionalized, and the victims are people looking
  for work.
- **Fake profiles and credential fraud** — impersonating employees of real companies, for
  social engineering into those companies.
- **Data scraping** — your directory is the asset (see Phase 5).
- **Romance and investment scams** — professional networks are prime targeting grounds.
- **Corporate impersonation** — fake company pages.

The credibility of a professional network *is* the product. One well-publicized scam wave
does more damage to Brigade than six months of missing features. And a legitimate employer
evaluating Brigade for hiring will ask what your fraud controls are.

---

## The moderation model

### Reports

```
reports         reporter_id, target_profile_id, target_post_ids[], category,
                comment, forwarded, action_taken_at, assigned_moderator_id
report_notes    internal moderator discussion
```

Categories to define up front — they drive routing, prioritization, and your metrics:

```
spam  harassment  impersonation  fake_job_posting  scam_or_fraud
misleading_credentials  inappropriate_content  underage  other
```

`fake_job_posting`, `scam_or_fraud`, and `misleading_credentials` are Brigade-specific and
should route to a faster queue than the rest.

### Graduated enforcement

Mastodon's `AccountWarning` model has escalating actions. Adopt the ladder:

```
none         logged, no action              → track pattern
warning      user notified                  → most first offenses
silence      hidden from directory/search,  → shadow limitation, existing
             visible to existing connections   connections unaffected
suspend      account disabled, data retained → serious
delete       account and data removed        → terminal
```

**`silence` is the one to get right.** It removes a profile from discovery without notifying
them, which is the correct response to suspected spam or fraud — an outright ban tells the
attacker to create a new account immediately, while silencing wastes their time. Mastodon
implements this as `Account::Silences`.

### Appeals

`Appeal` + `ApproveAppealService`. Every enforcement action must be appealable. This is
not optional:

- **Legally** — under the EU Digital Services Act, platforms owe users a statement of
  reasons and an internal complaint-handling system for content moderation decisions. If
  Brigade has EU users, this applies.
- **Practically** — you will make mistakes, and an unappealable wrongful suspension of a
  job seeker is both a real harm and a public-relations event.

Build appeals at the same time as enforcement, not after.

### Blocklists

```
email_domain_blocks       disposable email providers
canonical_email_blocks    normalized email hash — defeats gmail dot/plus tricks
ip_blocks                 with expiry
username_blocks           reserved and impersonation-prone names
domain_blocks             for company domains, or Phase 9 federation
```

`canonical_email_blocks` is the clever one — it hashes a normalized form of the email so
`k.mai+1@gmail.com`, `k.mai@gmail.com`, and `kmai@gmail.com` all collapse to one block.
Ban evasion via email variants is the single most common technique and this defeats it.

`username_blocks` matters more for Brigade than for Mastodon: reserve company names,
`admin`, `support`, `recruiting`, `hr`, and common executive titles to prevent
impersonation at signup.

---

## Brigade-specific detection

Beyond user reports, automated signals:

| Signal | Indicates |
|---|---|
| Profile claims employment at a company with no other verified employees | Fake employer |
| Job posting with off-platform contact info or requests for payment | Recruitment scam |
| New account, high-volume connection requests, low acceptance rate | Spam/scraping |
| Sequential or breadth-first profile access patterns | Scraping |
| Profile edited to a senior title immediately before applications | Credential fraud |
| Reverse-image match on avatar against known stock/scam sets | Fake profile |
| Many accounts sharing an IP, device fingerprint, or canonical email | Sybil attack |
| Job posting text matching known scam templates | Recruitment scam |

Feed these into a **risk score** on the profile, and surface high-risk accounts in a
moderator queue. Don't auto-ban on score — false positives against real job seekers are
costly. Score to prioritize human review.

**Verified employment (Phase 5) is your strongest anti-fraud primitive.** A verified
employee of a domain-verified company is very hard to fake. Lean on it: weight verified
profiles up in the directory, and require verification to post jobs.

---

## Admin surface

The reference has a substantial `app/controllers/admin/` and `Admin::` model namespace.
Brigade's minimum:

```
/admin/reports              queue, filters, assignment, bulk action
/admin/profiles             search, inspect, act
/admin/companies            claim disputes, domain verification review
/admin/job_postings         review queue for flagged postings
/admin/moderation_log       ← every action, who, when, why. Immutable.
/admin/appeals
/admin/blocklists
/admin/roles                permission bitmask management
/admin/dashboard            signups, reports, action rate, queue depth
```

**The moderation log is non-negotiable.** Every moderator action, immutably recorded with
actor, target, reason, and timestamp. You need it for appeals, for regulatory response,
for detecting moderator abuse, and for the day someone asks why an account was removed.

---

## Legal obligations to design for

Not legal advice — flag these for the same lawyer reviewing your incorporation docs:

- **PIPEDA** (Canada) — you're a CBCA corporation; consent, access, and correction rights
  for personal information
- **GDPR** (EU users) — data export (Art. 20), erasure (Art. 17), statement of reasons
- **DSA** (EU) — notice-and-action, appeals, transparency reporting
- **AODA / WCAG 2.0 AA** (Ontario) — accessibility, see Phase 6
- **Employment discrimination law** — this is the sleeper. If Brigade builds job matching
  or recruiter search, filters and ranking must not proxy for protected characteristics.
  Age (via graduation year), gender (via name inference), and national origin (via
  location or language) are the common accidental proxies. Get this reviewed before
  shipping recruiter search, not after.

That last one deserves emphasis. Mastodon gives you nothing here because it isn't a hiring
platform. An algorithmic hiring tool with disparate impact is a legal exposure category
that scales with your success, and jurisdictions including New York City already require
bias audits for automated employment decision tools. Design your matching so it can be
audited: log ranking inputs, keep the ranking function inspectable, and don't ship a
black-box model into the hiring path.

---

## Exit criteria

- [ ] Report submission from every profile, post, job posting, and company page
- [ ] Moderator queue with assignment, categories, priority routing for fraud categories
- [ ] Graduated enforcement: warn / silence / suspend / delete
- [ ] Silence implemented as removal from discovery without notification
- [ ] Appeals flow, with statement of reasons on every action
- [ ] All five blocklist types, including canonical email normalization
- [ ] Automated risk scoring with the signals above, feeding a prioritized queue
- [ ] Immutable moderation log
- [ ] Admin dashboard with report volume, action rate, and queue depth
- [ ] Data export and account deletion implemented and tested end to end
- [ ] Legal review completed on PIPEDA, GDPR, DSA, AODA, and hiring-discrimination exposure
