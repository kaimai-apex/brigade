#!/usr/bin/env node
/**
 * Monthly pre-ingest of Explore directory data into explore-service.
 *
 * 1. Upserts curated schools / associations / suppliers / news / job-listings /
 *    neighbourhoods via POST /api/v1/explore/seed.
 * 2. POSTs each market bbox to /api/v1/restaurants/ingest (OSM + curated
 *    accolades). Un-listed cities still work via live read-through on browse.
 *
 * Usage:
 *   node scripts/ingest-explore.mjs
 *   EXPLORE_SERVICE_URL=http://localhost:3015 node scripts/ingest-explore.mjs
 *
 * Schedule (cron, first of the month, 4am):
 *   0 4 1 * * cd /path/to/Brigade && node scripts/ingest-explore.mjs >> /var/log/brigade-ingest.log 2>&1
 */

const BASE = process.env.EXPLORE_SERVICE_URL ?? 'http://localhost:3015';

// Target markets — Toronto/GTA first (launch focus), then a few more.
// Mirrors apps/web/src/lib/explore/locations.ts.
const MARKETS = [
  { label: 'toronto-downtown', south: 43.638, west: -79.402, north: 43.668, east: -79.363 },
  { label: 'toronto-west', south: 43.638, west: -79.44, north: 43.662, east: -79.4 },
  { label: 'toronto-midtown', south: 43.668, west: -79.41, north: 43.695, east: -79.375 },
  { label: 'toronto-east', south: 43.652, west: -79.36, north: 43.682, east: -79.32 },
  { label: 'montreal', south: 45.5, west: -73.58, north: 45.525, east: -73.55 },
  { label: 'vancouver', south: 49.27, west: -123.14, north: 49.29, east: -123.1 },
  { label: 'new-york', south: 40.715, west: -74.005, north: 40.74, east: -73.975 },
  { label: 'london', south: 51.508, west: -0.145, north: 51.52, east: -0.12 },
];

async function ingest(market) {
  const headers = { 'content-type': 'application/json' };
  const key = process.env.EXPLORE_INGEST_KEY;
  if (key) headers['x-internal-key'] = key;
  const res = await fetch(`${BASE}/api/v1/restaurants/ingest`, {
    method: 'POST',
    headers,
    body: JSON.stringify(market),
  });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}: ${await res.text()}`);
  }
  return res.json();
}

async function seedDirectory() {
  const headers = { 'content-type': 'application/json' };
  const key = process.env.EXPLORE_INGEST_KEY;
  if (key) headers['x-internal-key'] = key;
  const res = await fetch(`${BASE}/api/v1/explore/seed`, {
    method: 'POST',
    headers,
    body: '{}',
  });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}: ${await res.text()}`);
  }
  return res.json();
}

async function main() {
  console.log(`[ingest-explore] target: ${BASE} · ${MARKETS.length} markets`);

  try {
    const seeded = await seedDirectory();
    console.log(
      `  ✓ curated directory   schools=${seeded.schools} associations=${seeded.associations} suppliers=${seeded.suppliers} news=${seeded.news} jobs=${seeded.jobListings} neighbourhoods=${seeded.neighbourhoods}`,
    );
  } catch (err) {
    console.error(`  ✗ curated directory   ${err.message}`);
  }

  let total = 0;
  for (const market of MARKETS) {
    try {
      const { ingested } = await ingest(market);
      total += ingested ?? 0;
      console.log(`  ✓ ${market.label.padEnd(18)} ${ingested} restaurants`);
    } catch (err) {
      console.error(`  ✗ ${market.label.padEnd(18)} ${err.message}`);
    }
    // Be polite to the Overpass API between markets.
    await new Promise((r) => setTimeout(r, 2000));
  }
  console.log(`[ingest-explore] done — ${total} restaurants upserted`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
