# Hospitality Pulse Engineering Implementation Plan

## Priority Levels

### P0 (Critical)

Must be completed before next release.

### P1 (Important)

Should be completed during redesign.

### P2 (Future)

Can be deferred.

---

# P0 TASKS

## Authentication

### Decision (updated)

**Keep password authentication.** Passwordless / email codes are deferred until Resend (or equivalent email infra) is in place.

### Required

* Email + password login and signup
* MFA path remains available where already implemented
* Session persists; logout works

---

# Feed Fixes

## Start a Post

Current:

Typing/submitting broken.

Required:

* Input accepts content
* Submit button works
* Post persists
* Feed refreshes

Acceptance Criteria:

* User creates post
* Page updates
* Post visible immediately

---

# Discover Routing Bug

Current:

Logged-in user clicks Discover

Result:

Redirected to Login

Expected:

Stay authenticated

Open Discover page

Investigate:

* Route guards
* Session validation
* Middleware
* Authentication context

---

# Profile Routing Bug

Current:

Me → View Profile

Returns 404

Expected:

Navigate to:

```text
/profile/me
```

or

```text
/username
```

Acceptance Criteria:

Profile loads successfully.

---

# Company Creation

Current:

Company not saved.

Required:

Create complete workflow.

### Backend

POST /companies

Creates:

```json
{
  "id": "",
  "name": "",
  "slug": "",
  "createdBy": ""
}
```

### Frontend

After success:

Redirect:

```text
/company/:slug
```

---

# P1 TASKS

## Landing Page Redesign

### Remove

* Statistics
* Directory links

### Add

Sections:

* Hero
* Manifesto
* Why We Exist
* Community CTA

---

## Navigation Refactor

### Remove

Dashboard dependency.

### New Structure

```text
Feed
Brigade
Discover
Messages
Profile
```

---

## Brigade Refactor

### Rename UI Components

Network →

Brigade

Connection Request →

Brigade Invitation

Connections →

Brigade Members

Directory →

Find a Brigade

---

# Search Refactor

Search indexes:

```text
People
Companies
```

Only.

Remove:

```text
Posts
Notifications
Messages
```

until explicitly needed.

---

# Mobile Optimization

## Global Requirements

### Layout

Minimum support:

* iPhone SE
* iPhone 15 Pro
* Android devices

### Navigation

Reduce top-nav width.

### Buttons

Minimum touch target:

44x44

### Forms

Responsive

No horizontal scrolling.

---

# P2 TASKS

## Explore Page

Replace current implementation.

Display:

```text
Explore
Coming Soon
Currently Under Development
```

If maps remain:

Fix markers.

Checklist:

* Marker data exists
* Coordinates valid
* Map renders
* Marker component renders

---

## Opportunities Page

Replace unfinished functionality.

Display:

```text
Coming Soon
```

---

# QA ACCEPTANCE TESTS

## Authentication

* Email + password login works
* Signup works
* Session persists
* Logout works

---

## Feed

* Post creation works
* Post refresh works
* Feed loads first after login

---

## Brigade

* Invitations send
* Invitations receive
* Brigade list loads
* Terminology updated

---

## Profile

* View profile works
* Edit profile works
* Edit form centered
* Mobile responsive

---

## Company

* Company created
* Stored in DB
* Company page generated
* Company page loads

---

## Navigation

* No dashboard dependency
* Discover works
* Profile works
* Login works
* Mobile works

---

# Definition of Done

The redesign is complete when:

* Login uses email + password (passwordless deferred)
* Feed is first page after login
* Dashboard no longer exists in navigation
* Brigade terminology is implemented everywhere
* Public directory is hidden from unauthenticated users
* Company creation works end-to-end
* Profile pages work
* Discover routing bug is fixed
* Mobile experience is fully responsive
* Explore and Opportunities pages show proper "Coming Soon" states
* All QA acceptance tests pass
