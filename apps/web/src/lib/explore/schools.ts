import type { School } from "./types";

/** Culinary schools (MD §4.5). Students are the highest-growth early segment. */
export const SCHOOLS: School[] = [
  {
    id: "s-george-brown",
    slug: "george-brown-college",
    name: "George Brown College — Chef School",
    city: "Toronto",
    lat: 43.6503,
    lng: -79.3606,
    programs: [
      "Culinary Management",
      "Baking & Pastry Arts Management",
      "Culinary Skills",
      "Chef — Italian",
    ],
    credential: "Diploma / Certificate",
    website: "https://www.georgebrown.ca/programs/culinary-arts",
    blurb:
      "Canada's largest culinary school, on the downtown waterfront campus with a teaching restaurant.",
  },
  {
    id: "s-humber",
    slug: "humber-college",
    name: "Humber College",
    city: "Toronto",
    lat: 43.7291,
    lng: -79.6069,
    programs: [
      "Culinary Management",
      "Baking & Pastry Arts Management",
      "Hospitality & Tourism Management",
    ],
    credential: "Diploma / Advanced Diploma",
    website: "https://appliedtechnology.humber.ca/programs/culinary-management.html",
    blurb: "Etobicoke campus with a strong co-op and industry-placement network.",
  },
  {
    id: "s-niagara",
    slug: "niagara-college",
    name: "Niagara College — Canadian Food & Wine Institute",
    city: "Niagara-on-the-Lake",
    lat: 43.2185,
    lng: -79.1789,
    programs: [
      "Culinary Management",
      "Culinary Innovation & Food Technology",
      "Winery & Viticulture Technician",
    ],
    credential: "Diploma / Graduate Certificate",
    website: "https://www.niagaracollege.ca/cfwi/",
    blurb:
      "Home to a teaching winery, brewery and restaurant in the heart of wine country.",
  },
  {
    id: "s-centennial",
    slug: "centennial-college",
    name: "Centennial College",
    city: "Toronto",
    lat: 43.7854,
    lng: -79.227,
    programs: [
      "Culinary Skills",
      "Culinary Management",
      "Hospitality — Hotel & Resort Operations Management",
    ],
    credential: "Certificate / Diploma",
    website: "https://www.centennialcollege.ca/programs-courses/full-time/culinary-skills",
    blurb: "Scarborough-based programs with pathways into hotel and event operations.",
  },
];

export function getSchools(): School[] {
  return SCHOOLS;
}
