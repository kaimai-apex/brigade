/**
 * Explore section data model.
 *
 * These types back the Explore discovery hub (Featured Restaurants, Schools,
 * Associations, Suppliers, News, Jobs, Map). Everything here is *business /
 * venue* data or a link-out to an external source — never an auto-created
 * profile of a real individual (see project MD §6 legal guardrails). Human
 * professionals join by consent and live in the Profile/Discover system.
 */

/** A curated accolade attached to a venue — always credited to its source. */
export type Accolade = {
  /** e.g. "Michelin", "Canada's 100 Best", "Toronto Life", "BlogTO" */
  source: string;
  /** e.g. "1 Star", "Bib Gourmand", "#1 in Canada", "Best New Restaurant" */
  detail: string;
  year: number;
};

/** Toronto price tier, LinkedIn-for-hospitality style. */
export type PriceLevel = "$" | "$$" | "$$$" | "$$$$";

export type Restaurant = {
  id: string;
  slug: string;
  name: string;
  /** Approx WGS84 coords — placeholder until Google Places enrichment (MD §5 Phase 1). */
  lat: number;
  lng: number;
  neighbourhood: string;
  address: string;
  cuisineTags: string[];
  priceLevel: PriceLevel;
  accolades: Accolade[];
  /** Outbound links only — we point, we don't republish (MD §6). */
  website?: string;
  instagram?: string;
  reservationUrl?: string;
  blurb: string;
  featured?: boolean;
  /** null until an owner claims the venue page. */
  claimedByUserId?: string | null;
};

export type School = {
  id: string;
  slug: string;
  name: string;
  city: string;
  lat: number;
  lng: number;
  programs: string[];
  credential: string;
  website: string;
  blurb: string;
};

export type Association = {
  id: string;
  slug: string;
  name: string;
  acronym?: string;
  scope: "National" | "Ontario" | "Global";
  website: string;
  role: string;
  blurb: string;
};

export type SupplierCategory =
  | "Food"
  | "Equipment"
  | "Smallwares"
  | "Services";

export type Supplier = {
  id: string;
  slug: string;
  name: string;
  categories: SupplierCategory[];
  regionsServed: string[];
  website: string;
  phone?: string;
  lat?: number;
  lng?: number;
  description: string;
  claimed?: boolean;
};

export type NewsTag =
  | "Toronto"
  | "Ontario"
  | "Canada"
  | "Industry"
  | "Openings"
  | "Labour"
  | "Tech";

/**
 * Aggregator item — headline + snippet + source + link only. Never full text
 * (MD §6 copyright). Mirrors what an RSS-poll pipeline would emit.
 */
export type NewsItem = {
  id: string;
  title: string;
  snippet: string;
  source: string;
  sourceUrl: string;
  url: string;
  publishedAt: string; // ISO
  tags: NewsTag[];
};

export type JobType = "BOH" | "FOH" | "Management" | "Hotel" | "Events";

/** Curated link-out listing (Phase 1). Native postings come later (Phase 5). */
export type JobListing = {
  id: string;
  title: string;
  employer: string;
  neighbourhood: string;
  type: JobType;
  /** e.g. "Full-time", "Part-time", "Contract", "Seasonal" */
  employment: string;
  /** Human-readable pay range, optional. */
  compensation?: string;
  source: string;
  url: string;
  postedAt: string; // ISO
};

export type Neighbourhood = {
  slug: string;
  name: string;
  lat: number;
  lng: number;
};

/** A unified pin for the Hospitality Map, projected from any layer. */
export type MapLayer = "restaurants" | "schools" | "suppliers" | "jobs";

export type MapPin = {
  id: string;
  layer: MapLayer;
  name: string;
  lat: number;
  lng: number;
  href?: string;
  meta?: string;
};
