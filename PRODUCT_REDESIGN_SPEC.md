# Hospitality Pulse Product Redesign & UX Specification

**Source:** July 10 Product Review Call
**Status:** Approved Changes
**Priority:** High

---

# Executive Summary

The platform must transition away from recruiting/job-board language and become a networking-first hospitality community.

Primary goals:

1. Simplify navigation.
2. Improve mobile experience.
3. Remove unnecessary dashboard concepts.
4. Introduce brigade-centric networking language.
5. Make the feed the primary experience.
6. Keep password authentication (passwordless deferred until email infra is ready).
7. Fix major usability and routing issues.
8. Hide public directory functionality behind authenticated experiences.

---

# Product Philosophy

## Current Problem

The product currently feels too much like:

* A recruiting platform
* A talent marketplace
* A job board

This creates friction and does not align with the intended mission.

## New Direction

Hospitality Pulse should feel like:

* A hospitality community
* A networking platform
* A relationship-building ecosystem
* A place to build your brigade

The emphasis should be on:

* Connections
* Relationships
* Teams
* Community
* Collaboration

NOT:

* Recruiting
* Hiring funnels
* Applicant tracking
* Talent acquisition

---

# Terminology Changes

## Replace Recruiting Language

### Old → New

| Old Term            | New Term                 |
| ------------------- | ------------------------ |
| Network             | Brigade                  |
| Connections         | Brigade Members          |
| Talent Directory    | Find a Brigade           |
| Recruit             | Invite to Brigade        |
| Connection Request  | Brigade Invitation       |
| Accept Connection   | Join Brigade             |
| Candidate           | Member                   |
| Talent              | Hospitality Professional |
| Network Request     | Brigade Invitation       |
| Community Directory | Find a Brigade           |

---

# Brigade Language Rules

## User-Owned Network

Anywhere a user views people they personally know:

Use:

> Your Brigade

Examples:

* Your Brigade
* Members of Your Brigade
* Invite to Your Brigade
* Brigade Requests

Do NOT use:

* Network
* Connections
* Talent Pool

---

## Invitation Language

When sending requests:

Use:

> Invite to Brigade

When receiving:

Use:

> Jordan invited you to the Brigade

Examples:

* Sarah invited you to the Brigade
* Mike accepted your Brigade invitation
* You joined Alex's Brigade

---

## Public Directory

The public people database should be referred to as:

> Find a Brigade

Examples:

* Find a Brigade
* Discover Hospitality Professionals
* Browse the Community

Do NOT use:

* Directory
* Talent Directory
* Candidate Database

---

# Landing Page Requirements

## Objective

The landing page should explain:

1. What Hospitality Pulse is
2. Why it exists
3. Why someone should join

NOT overwhelm users with metrics.

---

## Remove

### Statistics Section

Remove all:

* User counts
* Company counts
* Growth numbers
* Community metrics

Reason:

Numbers do not communicate value.

---

## Add

### Manifesto Section

Create a dedicated section:

# Our Manifesto

Example structure:

* Hospitality is built on people.
* Great teams are built through relationships.
* Careers grow through community.
* Hospitality Pulse exists to help professionals build meaningful connections.

---

### Purpose Section

Create a dedicated section:

# Why We Exist

Explain:

* Mission
* Community goals
* Networking focus
* Industry impact

---

### Login Button

Add:

* Login button
* Top-right corner
* Visible on all screen sizes

Desktop:

Top navigation right aligned

Mobile:

Visible in hamburger menu and top header

---

### Remove Directory Navigation

Remove:

* Directory link
* Talent Directory link

From public navigation.

---

# Authentication

## Decision

**Keep email + password authentication.**

Passwordless (email codes via Resend) is deferred until email infrastructure is ready.

---

## Login Flow

1. User enters email + password
2. Optional MFA when enabled
3. Redirect to `/feed` (or `next` if safe)

---

## Requirements

* Store password hashes (bcrypt)
* Session cookies + refresh
* Forgot-password flow remains available

---

# Post-Login Experience

## Feed First

Immediately after login:

Redirect to:

/feed

NOT:

* Dashboard
* Home summary page

The feed becomes the primary experience.

---

## Feed Priority

The first thing users should see is:

Community Feed

This becomes the center of the platform.

---

# Navigation Redesign

## Remove Dashboard Concept

Current:

Dashboard acts as central hub.

New:

Every section is its own page.

No dashboard required.

---

## Navigation Structure

Top Navigation

* Feed
* Brigade
* Discover
* Messages
* Profile

Optional:

* Companies

---

## Consolidation

Combine:

* Messaging
* Notifications
* Network

Into one experience.

Possible label:

Community

or

Brigade

---

## Mobile First

All navigation must be optimized for mobile.

Preferred:

Bottom navigation or condensed top navigation.

---

# Brigade Structure

## Separate Personal Network From Public Community

Current state mixes both concepts.

New structure:

### Your Brigade

People you:

* Follow
* Connect with
* Trust
* Work with

Private to user context.

---

### Find a Brigade

Public community.

Used for:

* Discovery
* Networking
* Exploration

Must be clearly separated from Your Brigade.

---

# Search Requirements

## Search Scope

Search should only return:

* People
* Companies

Do NOT search:

* Posts
* Messages
* Notifications

unless intentionally added later.

---

## Directory Visibility

Directory should NOT be publicly visible.

Requirements:

* Authentication required
* Logged-in users only

---

# Explore Page

## Status

Under Development

---

## Requirements

Display:

Coming Soon

Under Development

instead of broken functionality.

---

## Map Pins

Current Issue:

Pins do not render.

Fix:

* Verify coordinates
* Verify map layer
* Verify marker rendering
* Verify API configuration

---

# Opportunities Page

## Status

Under Development

Display:

Coming Soon

instead of unfinished features.

---

# Company Pages

## Create Company

Current Issue:

Company creation incomplete.

---

## Required Behavior

When user clicks:

Create Company

System should:

1. Create company record
2. Save to database
3. Generate company slug
4. Create company page
5. Redirect user

Example:

/company/hospitality-pulse

---

# Profile Requirements

## Profile Navigation

Current Issue

Clicking profile sometimes routes incorrectly.

---

## New Behavior

Clicking:

Profile

Always routes to:

Current authenticated user's profile.

---

## Me → View Profile

Current:

404 error

Required:

Load authenticated user profile.

---

## Edit Profile

Current:

Layout broken
Not centered

Required:

Responsive centered layout

Desktop:

Max width container

Mobile:

Full-width optimized layout

---
