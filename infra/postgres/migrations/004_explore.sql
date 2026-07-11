-- Explore service: persistent restaurant directory sourced from OpenStreetMap
-- (ODbL, storable with attribution) and overlaid with curated accolades.
-- Hybrid ingestion: markets are pre-ingested on a monthly cron, and any
-- un-covered area is live-fetched + persisted on first browse (read-through).

CREATE SCHEMA IF NOT EXISTS explore;

CREATE TABLE IF NOT EXISTS explore.restaurants (
    id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug               TEXT UNIQUE NOT NULL,
    name               TEXT NOT NULL,
    lat                DOUBLE PRECISION NOT NULL,
    lng                DOUBLE PRECISION NOT NULL,
    neighbourhood      TEXT,
    address            TEXT,
    city               TEXT,
    cuisine_tags       TEXT[] NOT NULL DEFAULT '{}',
    price_level        TEXT,                         -- $ .. $$$$
    accolades          JSONB NOT NULL DEFAULT '[]',  -- [{source,detail,year}]
    website            TEXT,
    instagram          TEXT,
    reservation_url    TEXT,
    blurb              TEXT,
    featured           BOOLEAN NOT NULL DEFAULT false,
    source             TEXT NOT NULL DEFAULT 'osm',  -- osm | curated | claimed
    osm_type           TEXT,
    osm_id             BIGINT,
    google_place_id    TEXT,
    external_url       TEXT,
    claimed_by_user_id UUID,
    last_fetched_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at         TIMESTAMPTZ
);

-- Geo range scans (bbox), plus attribute filters used by the list endpoint.
CREATE INDEX IF NOT EXISTS idx_explore_restaurants_geo ON explore.restaurants(lat, lng);
CREATE INDEX IF NOT EXISTS idx_explore_restaurants_featured ON explore.restaurants(featured);
CREATE INDEX IF NOT EXISTS idx_explore_restaurants_price ON explore.restaurants(price_level);
CREATE INDEX IF NOT EXISTS idx_explore_restaurants_osm ON explore.restaurants(osm_type, osm_id);
CREATE INDEX IF NOT EXISTS idx_explore_restaurants_cuisine ON explore.restaurants USING GIN(cuisine_tags);
CREATE INDEX IF NOT EXISTS idx_explore_restaurants_accolades ON explore.restaurants USING GIN(accolades);

-- Coverage log for the hybrid read-through: which bboxes we've ingested & when.
CREATE TABLE IF NOT EXISTS explore.ingested_areas (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    label            TEXT,                            -- market slug or 'readthrough'
    south            DOUBLE PRECISION NOT NULL,
    west             DOUBLE PRECISION NOT NULL,
    north            DOUBLE PRECISION NOT NULL,
    east             DOUBLE PRECISION NOT NULL,
    source           TEXT NOT NULL DEFAULT 'osm',
    restaurant_count INT NOT NULL DEFAULT 0,
    ingested_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_explore_ingested_areas_bbox
    ON explore.ingested_areas(south, west, north, east);
