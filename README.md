# Brigade — Hospitality Talent Network

Professional networking platform for chefs, private chefs, and hospitality operators.

## Stack

- **Frontend:** Next.js 15, TypeScript, Tailwind CSS
- **Backend:** Supabase (Auth, Postgres, Storage, RLS)

## Local development

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

Copy `.env.local.example` to `.env.local` and add your Supabase credentials:

```bash
cp .env.local.example .env.local
```

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

Find both in Supabase → **Project Settings → API**.

### 3. Run database migration

In Supabase → **SQL Editor**, run the migration:

```
supabase/migrations/001_initial_schema.sql
```

This creates `profiles`, `education`, `experiences`, `accolades`, `portfolio_links`, RLS policies, storage buckets (`avatars`, `resumes`), and an auto-profile trigger on signup.

If you already have the waitlist table from the legacy landing page, keep it — the migration does not conflict.

### 4. Configure Supabase Auth

In Supabase → **Authentication → Providers**, enable:

- Email + Password
- Google OAuth

Set redirect URLs:

```
http://localhost:3000/auth/callback
https://yourdomain.com/auth/callback
```

### 5. Start the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Routes

| Route | Description |
|---|---|
| `/` | Landing page |
| `/signup` | Account creation (email + Google) |
| `/login` | Sign in |
| `/onboarding/*` | 6-step profile setup wizard |
| `/profile/[id]` | Public professional profile |
| `/dashboard` | Redirects to onboarding or profile |

## Onboarding flow

1. **Basic info** — photo, headline, location
2. **Experience** — years, employers, expertise
3. **Education** — schools and certifications
4. **Portfolio** — links and resume upload
5. **Accolades** — awards and recognition
6. **Availability** — opportunity preferences
7. **Review** — publish profile

## Deploy to Vercel

```bash
vercel
```

Add `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` as environment variables in the Vercel project settings.

## Legacy static landing

The original single-file waitlist landing page is preserved at `/legacy-landing.html`.

## Project docs

See the full product spec in the project description (MVP scope, user types, roadmap, success metrics).
