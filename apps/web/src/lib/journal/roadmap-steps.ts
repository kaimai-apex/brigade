/** The seven-step private chef roadmap. Same copy as the downloadable SVG. */

export type RoadmapStep = {
  title: string;
  body: string;
  graduateWhen: string[];
  numbered: boolean;
};

export const ROADMAP_STEPS: readonly RoadmapStep[] = [
  {
    title: "Get 3–5 years of restaurant experience",
    body: "Master cooking techniques, organization, time management, and running your station.",
    graduateWhen: [
      "Are proficient in cooking techniques",
      "Can stay organized juggling multiple tasks",
      "Have good time management",
      "Can confidently run your station without supervision",
    ],
    numbered: true,
  },
  {
    title: "Reach out to your whole network",
    body: "Instagram, your contacts, Facebook. Find the people who are interested in private chef services.",
    graduateWhen: [
      "You've started having real conversations with potential clients.",
    ],
    numbered: false,
  },
  {
    title: "Book your first dinner with someone you know",
    body: "Charge only for groceries. This service is about buying experience.",
    graduateWhen: ["You've successfully completed your first service."],
    numbered: false,
  },
  {
    title: "Document everything with photos and video",
    body: "Build a portfolio that shows what you can do.",
    graduateWhen: [
      "A stranger could look at your portfolio and confidently hire you.",
    ],
    numbered: false,
  },
  {
    title: "Repeat at least five more times before charging",
    body: "The goal is six successful dinners total.",
    graduateWhen: ["You've completed six successful dinners."],
    numbered: false,
  },
  {
    title: "Keep booking clients and delivering",
    body: "Deliver amazing experiences until referrals drive your business.",
    graduateWhen: ["Referrals become your primary source of new business."],
    numbered: false,
  },
  {
    title: "Use private chef agencies to expand your reach",
    body: "Grow with agencies while you keep building your own client base.",
    graduateWhen: [
      "You've built enough momentum to grow with private chef agencies while continuing your own client base.",
    ],
    numbered: false,
  },
];
