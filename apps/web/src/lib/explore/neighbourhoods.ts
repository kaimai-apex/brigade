import type { Neighbourhood } from "./types";

/** Toronto neighbourhood quick-jumps for the Hospitality Map (MD §4.8). */
export const NEIGHBOURHOODS: Neighbourhood[] = [
  { slug: "downtown-core", name: "Downtown Core", lat: 43.6512, lng: -79.3799 },
  { slug: "yorkville", name: "Yorkville", lat: 43.6708, lng: -79.3915 },
  { slug: "queen-west", name: "Queen West", lat: 43.6479, lng: -79.4015 },
  { slug: "ossington", name: "Ossington", lat: 43.6479, lng: -79.4197 },
  { slug: "little-italy", name: "Little Italy", lat: 43.6555, lng: -79.4155 },
  { slug: "kensington-market", name: "Kensington Market", lat: 43.6547, lng: -79.4008 },
  { slug: "leslieville", name: "Leslieville", lat: 43.6659, lng: -79.3389 },
  { slug: "danforth", name: "The Danforth", lat: 43.6779, lng: -79.3494 },
  { slug: "junction", name: "The Junction", lat: 43.6656, lng: -79.4649 },
  { slug: "financial-district", name: "Financial District", lat: 43.6479, lng: -79.3813 },
];

export function getNeighbourhoods(): Neighbourhood[] {
  return NEIGHBOURHOODS;
}
