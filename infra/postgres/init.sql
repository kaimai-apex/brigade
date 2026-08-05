-- Local Postgres bootstrap for Brigade.
--
-- Tables are created lazily by the web app's ensure-*-schema modules on first
-- use (auth, directory, mentorship, waitlist). This file only installs the
-- extensions those modules need, so a fresh `docker compose up` works without
-- shipping the deleted social-network schema.

CREATE EXTENSION IF NOT EXISTS citext;
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS btree_gist;
CREATE EXTENSION IF NOT EXISTS pg_trgm;
