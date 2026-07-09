-- Brigade wipe — run once in Supabase SQL Editor before a fresh rebuild.
-- Safe for Supabase: does NOT drop auth / storage / realtime / extensions.
-- After this, run 001 → 006 in order.

BEGIN;

DROP SCHEMA IF EXISTS connectpro_auth CASCADE;
DROP SCHEMA IF EXISTS users CASCADE;
DROP SCHEMA IF EXISTS connections CASCADE;
DROP SCHEMA IF EXISTS posts CASCADE;
DROP SCHEMA IF EXISTS jobs CASCADE;
DROP SCHEMA IF EXISTS notifications CASCADE;

-- Legacy public tables from the old Supabase Auth MVP (if still present)
DROP TABLE IF EXISTS public.profile_work_photos CASCADE;
DROP TABLE IF EXISTS public.portfolio_links CASCADE;
DROP TABLE IF EXISTS public.accolades CASCADE;
DROP TABLE IF EXISTS public.experiences CASCADE;
DROP TABLE IF EXISTS public.education CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;

COMMIT;
