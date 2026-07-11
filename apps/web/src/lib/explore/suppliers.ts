import type { Supplier } from "./types";

/** Supplier directory (MD §4.6). A future B2B revenue line — pages are claimable. */
export const SUPPLIERS: Supplier[] = [
  {
    id: "sup-sysco",
    slug: "sysco-canada",
    name: "Sysco Canada",
    categories: ["Food"],
    regionsServed: ["Ontario", "Canada"],
    website: "https://www.sysco.ca",
    lat: 43.6785,
    lng: -79.6316,
    description:
      "Broadline foodservice distribution — produce, protein, dry goods and dairy at scale.",
    claimed: false,
  },
  {
    id: "sup-gfs",
    slug: "gordon-food-service",
    name: "Gordon Food Service (GFS)",
    categories: ["Food", "Smallwares"],
    regionsServed: ["Ontario", "Canada"],
    website: "https://www.gfs.ca",
    lat: 43.6089,
    lng: -79.6501,
    description:
      "Broadline distributor with in-person Gordon Food Service Stores for walk-in buying.",
    claimed: false,
  },
  {
    id: "sup-flanagan",
    slug: "flanagan-foodservice",
    name: "Flanagan Foodservice",
    categories: ["Food", "Smallwares"],
    regionsServed: ["Ontario"],
    website: "https://www.flanagan.ca",
    lat: 43.4643,
    lng: -80.5204,
    description:
      "Ontario's largest independent, family-owned broadline foodservice distributor.",
    claimed: false,
  },
  {
    id: "sup-nella",
    slug: "nella-cutlery",
    name: "Nella Cutlery",
    categories: ["Equipment", "Smallwares", "Services"],
    regionsServed: ["Toronto", "Ontario"],
    website: "https://nella.ca",
    lat: 43.7183,
    lng: -79.4735,
    phone: "(416) 635-1010",
    description:
      "Knives, smallwares, and kitchen equipment — plus professional knife sharpening.",
    claimed: false,
  },
  {
    id: "sup-russell-hendrix",
    slug: "russell-hendrix",
    name: "Russell Hendrix Foodservice Equipment",
    categories: ["Equipment", "Smallwares"],
    regionsServed: ["Ontario", "Canada"],
    website: "https://www.russellhendrix.com",
    lat: 43.7003,
    lng: -79.4426,
    description:
      "Full-line restaurant equipment and supplies — front-of-house to back-of-house.",
    claimed: false,
  },
];

export function getSuppliers(): Supplier[] {
  return SUPPLIERS;
}
