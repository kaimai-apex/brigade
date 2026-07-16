/** Hospitality-first roles — searchable & used in onboarding / Discover filters */
export const PROFESSIONAL_ROLES = [
  "Bartender",
  "Server",
  "Host / Hostess",
  "Sommelier",
  "Private Chef",
  "Executive Chef",
  "Sous Chef",
  "Pastry Chef",
  "Line Cook",
  "Caterer",
  "Banquet Captain",
  "Event Manager",
  "Hotel General Manager",
  "Front Desk / Guest Services",
  "Housekeeping",
  "Concierge",
  "Cruise Hospitality",
  "Staffing Coordinator",
  "General Manager",
  "Hospitality Professional",
] as const;

/** Skills & specialties used in onboarding / Discover filters */
export const EXPERTISE_AREAS = [
  "Fine Dining",
  "Fine Dining Service",
  "Banquet Management",
  "Mixology",
  "Michelin Experience",
  "Hotel Operations",
  "Wedding Events",
  "Private Dining",
  "Catering",
  "Luxury Hospitality",
  "Events",
  "Cruise Hospitality",
  "VIP / Private Events",
  "Meal Prep",
  "Pastry & Baking",
  "Wine & Beverage",
  "Quick Service",
  "Volume / Banquet",
] as const;

export const AVAILABILITY_LABELS = {
  open_to_opportunities: "Open to work",
  available_private_events: "Private events & weddings",
  available_contract_work: "Contract / gig ready",
  available_emergency_staffing: "Emergency / last-minute shifts",
} as const;

export const PORTFOLIO_LINK_TYPES = [
  "instagram",
  "website",
  "portfolio",
  "linkedin",
  "other",
] as const;

export const ONBOARDING_STEPS = [
  { slug: "basic-info", label: "Basic Info", step: 1 },
  { slug: "experience", label: "Experience", step: 2 },
  { slug: "education", label: "Education", step: 3 },
  { slug: "portfolio", label: "Portfolio", step: 4 },
  { slug: "availability", label: "Availability", step: 5 },
  { slug: "review", label: "Review", step: 6 },
] as const;

export type OnboardingSlug = (typeof ONBOARDING_STEPS)[number]["slug"];

export type Profile = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  headline: string | null;
  bio: string | null;
  profile_image_url: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  role: string | null;
  years_experience: number | null;
  current_employer: string | null;
  current_position: string | null;
  expertise_areas: string[] | null;
  instagram_url: string | null;
  website_url: string | null;
  linkedin_url: string | null;
  resume_url: string | null;
  open_to_opportunities: boolean;
  available_private_events: boolean;
  available_contract_work: boolean;
  available_emergency_staffing: boolean;
  cover_url: string | null;
  onboarding_completed: boolean;
  onboarding_step: number;
  created_at: string;
  updated_at: string;
};

export type Education = {
  id: string;
  user_id: string;
  school_name: string;
  program_name: string | null;
  start_date: string | null;
  end_date: string | null;
  graduation_year: number | null;
  created_at: string;
};

export type Experience = {
  id: string;
  user_id: string;
  company_name: string;
  position_title: string;
  start_date: string | null;
  end_date: string | null;
  description: string | null;
  is_current: boolean;
  created_at: string;
};

export type Accolade = {
  id: string;
  user_id: string;
  title: string;
  organization: string | null;
  year: number | null;
  description: string | null;
  created_at: string;
};

export type PortfolioLink = {
  id: string;
  user_id: string;
  type: string;
  url: string;
  created_at: string;
};

export type WorkPhoto = {
  id: string;
  user_id: string;
  image_url: string;
  caption: string | null;
  sort_order: number;
  created_at: string;
};

export type FullProfile = Profile & {
  education: Education[];
  experiences: Experience[];
  accolades: Accolade[];
  portfolio_links: PortfolioLink[];
  work_photos: WorkPhoto[];
};
