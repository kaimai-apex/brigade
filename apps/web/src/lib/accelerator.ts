/**
 * Flagship product copy. One source so the homepage, /accelerator, and apply
 * page cannot drift into three different programs.
 *
 * Brigade is the transition off the restaurant line into private cheffing.
 * Free material answers "what do I need to know." The cohort answers
 * "how do I actually do this." 1:1 sits above that for a specific situation.
 */

export const ACCELERATOR_NAME = "Brigade Private Chef Accelerator";

export const POSITIONING =
  "Brigade helps restaurant chefs build a career in private cheffing.";

export const LADDER = [
  {
    id: "learn",
    label: "Learn",
    product: "Free",
    promise: "How private cheffing works.",
    href: "/signup?next=%2Flearn",
  },
  {
    id: "build",
    label: "Build",
    product: "Cohort",
    promise: "Build your private chef business.",
    href: "#accelerator",
  },
  {
    id: "launch",
    label: "Launch",
    product: "Clients",
    promise: "First clients. A business that runs.",
    href: "#accelerator",
  },
] as const;

export const ACCELERATOR_WEEKS = [
  {
    week: 1,
    title: "Positioning & Business Setup",
    detail:
      "Who you cook for, how you get paid, and the house you want to work in.",
  },
  {
    week: 2,
    title: "Pricing",
    detail:
      "Day rate, groceries, events. What to say when they ask what you cost.",
  },
  {
    week: 3,
    title: "Sales",
    detail:
      "Turn a polite inquiry into a booked dinner, without sounding like a salesperson.",
  },
  {
    week: 4,
    title: "Client Acquisition",
    detail:
      "Where the first ten clients actually come from. People you already know.",
  },
  {
    week: 5,
    title: "Marketing & Social Media",
    detail:
      "Content that books work. Photos, captions, and a cadence you can keep while cooking.",
  },
  {
    week: 6,
    title: "Operations",
    detail:
      "Shopping, packing, the car, the invoice. The day that is not on the plate.",
  },
  {
    week: 7,
    title: "Client Experience",
    detail: "How you walk in, how you leave, and why they text you again.",
  },
  {
    week: 8,
    title: "Launch / First Clients",
    detail:
      "You leave with dinners on the calendar.",
  },
] as const;

export const ACCELERATOR_COACHES = [
  {
    role: "Sales Coach",
    does: "Helps you turn inquiries into paying private chef clients.",
  },
  {
    role: "Marketing Coach",
    does: "Helps you build a system for consistently generating leads.",
  },
  {
    role: "Social Media Coach",
    does: "Helps you turn your content into a client acquisition channel.",
  },
  {
    role: "Private Chef Coach",
    does: "Helps you actually navigate the realities of private cheffing.",
  },
] as const;

export const ACCELERATOR_INCLUDES = [
  "Curriculum built around the restaurant-to-private-chef transition",
  "Weekly group coaching",
  "Assignments and accountability",
  "Community of chefs making the same move",
  "Templates and resources you will actually use",
  "Live Q&A",
] as const;

/** Free topics. href only when a real page already exists. */
export const LEARN_TOPICS: readonly { label: string; href?: string }[] = [
  { label: "How to become a private chef", href: "/learn?focus=roadmap" },
  { label: "Pricing", href: "/journal/expenses-reimbursement-and-pay" },
  { label: "Sales" },
  { label: "Finding clients", href: "/journal/how-to-build-a-client-list" },
  { label: "Contracts" },
  { label: "Menu development", href: "/journal/cooking-for-the-same-family" },
  { label: "Client management", href: "/journal/soft-skills" },
  { label: "Marketing", href: "/journal/how-to-network" },
  { label: "Social media" },
  { label: "Operations", href: "/journal/agency-or-solo" },
  { label: "Personal branding", href: "/journal/how-to-build-a-private-chef-resume" },
  { label: "Luxury hospitality", href: "/journal/private-chef-vs-yacht-chef-vs-personal-chef" },
];
