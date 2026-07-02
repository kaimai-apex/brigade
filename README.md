# Brigade — Landing Page

Static landing page for Brigade, a professional network for hospitality workers.

## Structure

- `index.html` — the entire site (single-file, self-contained; illustrations are embedded as base64 so there are no external image assets to manage)
- `vercel.json` — minimal Vercel config (clean URLs, no trailing slash)
- `package.json` — project metadata; there's no real build step since this is static HTML

## Local preview

```bash
npm run dev
```
This just runs `npx serve .` and opens the site at a local port. You can also just double-click `index.html` to open it directly in a browser.

## Deploying to Vercel

1. Install the Vercel CLI if you don't have it: `npm i -g vercel`
2. From inside this folder, run:
   ```bash
   vercel
   ```
   Follow the prompts (link or create a project). Vercel will auto-detect this as a static site — no framework, no build command needed.
3. For production: `vercel --prod`

Or skip the CLI entirely: push this folder to a GitHub repo and import it at vercel.com/new — Vercel will detect it as static automatically.

## Collecting emails with Supabase

The Supabase client is already wired into `index.html` (CDN script + submit
handler at the bottom of the file). It's **inert until you add your keys** —
until then the forms just show the confirmation note without sending anything,
so the site is safe to ship as-is.

Both email-capture forms share class `.waitlist-form` (`#waitlistForm` in the
hero, `#waitlistFormBottom` in the closer) and write to a `waitlist` table.

### 1. Create the table + security policy
In the Supabase dashboard → **SQL Editor**, run:

```sql
create table if not exists public.waitlist (
  id         uuid primary key default gen_random_uuid(),
  email      text not null unique,
  created_at timestamptz not null default now()
);

alter table public.waitlist enable row level security;

-- Let the public (anon key) INSERT only. No one can read/update/delete
-- the list with the frontend key.
create policy "Public can join waitlist"
  on public.waitlist for insert to anon
  with check (true);
```

### 2. Add your project keys
In the dashboard → **Project Settings → API**, copy the **Project URL** and the
**anon / public** key. Paste them into the two constants near the bottom of
`index.html`:

```js
const SUPABASE_URL = 'https://xxxxxxxx.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGci...'; // the public anon key
```

The anon key is **safe** to expose in frontend code — that's its purpose. RLS
(step 1) is what protects the data. **Never** put the `service_role` key here.

### 3. Redeploy
Commit + push (or `vercel --prod`). Submissions now insert into `waitlist`;
duplicate emails are silently treated as success. Read the collected emails in
the dashboard → **Table Editor → waitlist**, or export as CSV.
