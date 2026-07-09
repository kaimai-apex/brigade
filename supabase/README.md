# Brigade Supabase migrations

Email/password auth uses Postgres schema `connectpro_auth` (Supabase’s `auth` schema is reserved for GoTrue).

## Fresh rebuild (SQL Editor)

Run in order:

1. `migrations/000_wipe_brigade.sql` — drop Brigade schemas + legacy `public` tables  
2. `migrations/001_auth.sql`  
3. `migrations/002_users.sql`  
4. `migrations/003_connections.sql`  
5. `migrations/004_posts.sql`  
6. `migrations/005_jobs.sql`  
7. `migrations/006_notifications.sql`

## Env

```
AUTH_SCHEMA=connectpro_auth
DATABASE_URL=<transaction pooler URI, port 6543>
JWT_SECRET=<long random string>
```

## Local Docker

`infra/postgres/init.sql` seeds local Postgres with schema name `auth` (not Supabase). Use `AUTH_SCHEMA=auth` locally if you rely on that file, or `AUTH_SCHEMA=connectpro_auth` when pointing at Supabase.
