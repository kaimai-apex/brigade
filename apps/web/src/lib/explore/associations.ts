import type { Association } from "./types";

/** Industry associations (MD §4.4) — news sources and partnership targets. */
export const ASSOCIATIONS: Association[] = [
  {
    id: "a-restaurants-canada",
    slug: "restaurants-canada",
    name: "Restaurants Canada",
    scope: "National",
    website: "https://www.restaurantscanada.org",
    role: "National industry association",
    blurb:
      "The national voice of foodservice — advocacy, research, and the annual RC Show.",
  },
  {
    id: "a-orhma",
    slug: "orhma",
    name: "Ontario Restaurant Hotel & Motel Association",
    acronym: "ORHMA",
    scope: "Ontario",
    website: "https://www.orhma.com",
    role: "Ontario advocacy association",
    blurb:
      "Ontario's largest hospitality association — provincial advocacy, Smart Serve, and training.",
  },
  {
    id: "a-ccfcc",
    slug: "ccfcc",
    name: "Canadian Culinary Federation",
    acronym: "CCFCC",
    scope: "National",
    website: "https://www.ccfcc.ca",
    role: "Chef certification & community",
    blurb:
      "Professional chef body running Red Seal pathways and regional chapters across Canada.",
  },
  {
    id: "a-wset",
    slug: "wset",
    name: "Wine & Spirit Education Trust",
    acronym: "WSET",
    scope: "Global",
    website: "https://www.wsetglobal.com",
    role: "Wine & spirits certification",
    blurb:
      "Globally recognised wine, spirits and sake qualifications — a credential to verify on profiles.",
  },
];

export function getAssociations(): Association[] {
  return ASSOCIATIONS;
}
