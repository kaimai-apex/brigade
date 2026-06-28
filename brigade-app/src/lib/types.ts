// Domain model — mirrors docs/04-product-spec.md "Data model (first-cut entities)".
// Kept relational-in-spirit (entities reference each other by id/slug) so a swap to
// Postgres later is a data-layer change, not a domain change.

export type Role = "chef" | "employer" | "admin";

export type CertificationType =
  | "id"
  | "food-safety"
  | "insurance"
  | "background-check";

export type CertStatus = "verified" | "pending" | "none";

export interface Certification {
  type: CertificationType;
  status: CertStatus;
  provider?: string; // e.g. Persona, Checkr
  verifiedAt?: string; // ISO date
}

export interface MediaAsset {
  id: string;
  label: string; // dish / shot name — also alt text for SEO
  gradA: string; // gradient fallback (shows while the photo loads)
  gradB: string;
  src?: string; // /gallery/*.jpg — real photo
}

export interface MenuCourse {
  name: string;
  description: string;
}

export interface Menu {
  id: string;
  title: string;
  pricePerHead: number; // GBP/USD per guest
  courses: MenuCourse[];
}

export interface Review {
  id: string;
  author: string;
  rating: number; // 1-5
  text: string;
  eventRef: string; // e.g. "Anniversary dinner, 8 guests"
  date: string; // ISO
}

export interface ServiceArea {
  city: string;
  region: string;
  radiusMiles: number;
}

export interface ChefProfile {
  id: string;
  slug: string; // brigade.xx/c/<slug>
  name: string;
  headline: string;
  bio: string;
  city: string; // primary metro (beachhead grouping)
  cuisines: string[];
  hourlyRate: number;
  eventRate: number; // typical per-event starting price
  yearsExperience: number;
  founding: boolean; // founding-chef perk (free Pro for life)
  pro: boolean; // Pro subscriber (tools + premium profile)
  approved: boolean; // admin-approved & live in directory
  serviceAreas: ServiceArea[];
  gallery: MediaAsset[];
  menus: Menu[];
  certifications: Certification[];
  reviews: Review[];
}

export type InquiryStatus =
  | "new"
  | "quoted"
  | "booked"
  | "declined"
  | "completed";

export interface QuoteLineItem {
  label: string;
  amount: number;
}

export interface Quote {
  id: string;
  lineItems: QuoteLineItem[];
  total: number;
  deposit: number;
  sentAt: string;
  acceptedAt?: string;
}

export interface Inquiry {
  id: string;
  chefSlug: string;
  status: InquiryStatus;
  contactName: string;
  contactEmail: string;
  // event details
  eventDate: string;
  guests: number;
  location: string;
  budget?: number;
  message: string;
  source: "public-form" | "employer" | "concierge";
  createdAt: string;
  quote?: Quote;
}

export interface WaitlistEntry {
  id: string;
  name: string;
  email: string;
  city: string;
  role: "chef" | "buyer";
  createdAt: string;
}

// ---- Derived helpers ----

export type PriceBand = "$" | "$$" | "$$$";

export function priceBand(eventRate: number): PriceBand {
  if (eventRate < 600) return "$";
  if (eventRate < 1200) return "$$";
  return "$$$";
}

export function avgRating(reviews: Review[]): number | null {
  if (!reviews.length) return null;
  return reviews.reduce((s, r) => s + r.rating, 0) / reviews.length;
}

export function verifiedBadges(certs: Certification[]): Certification[] {
  return certs.filter((c) => c.status === "verified");
}
