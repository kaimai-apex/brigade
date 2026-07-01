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

## Wiring up the waitlist forms (Supabase, later)

There are two email capture forms on the page, both with class `.waitlist-form`:
- Hero section: `#waitlistForm`
- Bottom CTA section: `#waitlistFormBottom`

Right now the shared submit handler (bottom of `index.html`, inside the `<script>` tag) just intercepts submission, shows a "you're on the list" message, and resets the field — no data is actually sent anywhere yet.

When you're ready to wire in Supabase:
1. Create a table (e.g. `waitlist`) with an `email` column.
2. Add the Supabase JS client via CDN in `index.html`:
   ```html
   <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
   ```
3. In the submit handler, replace the `form.reset()` block with an insert call, e.g.:
   ```js
   const { error } = await supabaseClient
     .from('waitlist')
     .insert({ email: form.querySelector('.waitlist-input').value });
   ```
4. Use a public **anon** key with row-level security scoped to insert-only on that table — never expose a service role key in frontend code.
