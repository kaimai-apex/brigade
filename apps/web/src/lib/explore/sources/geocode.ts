import type { ExploreLocation } from "../types";
import { bboxAround } from "../locations";

/**
 * Free-text → location, via OpenStreetMap's Nominatim geocoder (free, keyless).
 * Lets a user browse restaurants in *any* place they type, not just presets.
 * Nominatim policy: one request/second, send a User-Agent — we also cache
 * monthly so repeated queries don't re-hit it.
 */

const USER_AGENT =
  "BrigadeHospitality/1.0 (+https://brigade.app; hospitality network directory)";
const MONTHLY = 60 * 60 * 24 * 30;

type NominatimHit = {
  lat: string;
  lon: string;
  display_name: string;
  /** [minlat, maxlat, minlon, maxlon] as strings */
  boundingbox?: [string, string, string, string];
};

export async function geocodePlace(
  query: string,
): Promise<ExploreLocation | null> {
  const q = query.trim();
  if (!q) return null;

  const url =
    "https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&" +
    `q=${encodeURIComponent(q)}`;

  try {
    const res = await fetch(url, {
      headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
      next: { revalidate: MONTHLY, tags: ["nominatim"] },
    });
    if (!res.ok) return null;

    const hits = (await res.json()) as NominatimHit[];
    const hit = hits[0];
    if (!hit) return null;

    const lat = Number(hit.lat);
    const lng = Number(hit.lon);
    if (Number.isNaN(lat) || Number.isNaN(lng)) return null;

    let bbox;
    if (hit.boundingbox) {
      const [minLat, maxLat, minLon, maxLon] = hit.boundingbox.map(Number);
      // Clamp huge admin boundaries down to a browsable ~2.5km window so we
      // don't pull tens of thousands of restaurants for "London" etc.
      const capped =
        maxLat - minLat > 0.06 || maxLon - minLon > 0.06
          ? bboxAround(lat, lng, 2.5)
          : { south: minLat, west: minLon, north: maxLat, east: maxLon };
      bbox = capped;
    } else {
      bbox = bboxAround(lat, lng, 2.5);
    }

    return {
      slug: `q:${q.toLowerCase()}`,
      name: hit.display_name.split(",").slice(0, 2).join(", "),
      lat,
      lng,
      bbox,
      geocoded: true,
    };
  } catch {
    return null;
  }
}
