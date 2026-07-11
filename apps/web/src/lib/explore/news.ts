import type { NewsItem } from "./types";

/**
 * Seed news items (MD §4.3). These stand in for the RSS-poll pipeline output:
 * headline + short snippet + source + link-out ONLY. We never republish full
 * article text (MD §6 copyright). Links point back to the source's section
 * page rather than a specific article, since seed content is illustrative.
 */
export const NEWS_ITEMS: NewsItem[] = [
  {
    id: "n-eater-openings",
    title: "The most anticipated Toronto restaurant openings this season",
    snippet:
      "A rundown of the buzziest new rooms opening across the city — from downtown tasting counters to neighbourhood trattorias.",
    source: "Eater Toronto",
    sourceUrl: "https://toronto.eater.com",
    url: "https://toronto.eater.com",
    publishedAt: "2026-07-10T13:00:00Z",
    tags: ["Toronto", "Openings"],
  },
  {
    id: "n-blogto-newopenings",
    title: "New restaurants that opened in Toronto this month",
    snippet:
      "BlogTO's running list of fresh openings across the city's neighbourhoods, updated weekly.",
    source: "BlogTO",
    sourceUrl: "https://www.blogto.com/eat_drink/",
    url: "https://www.blogto.com/eat_drink/",
    publishedAt: "2026-07-09T15:30:00Z",
    tags: ["Toronto", "Openings"],
  },
  {
    id: "n-rc-labour",
    title: "Restaurants Canada: labour shortage eases but costs stay high",
    snippet:
      "The national association's latest outlook points to stabilising staffing alongside persistent food-cost pressure.",
    source: "Restaurants Canada",
    sourceUrl: "https://www.restaurantscanada.org/industry-news/",
    url: "https://www.restaurantscanada.org/industry-news/",
    publishedAt: "2026-07-08T12:00:00Z",
    tags: ["Canada", "Labour", "Industry"],
  },
  {
    id: "n-torontolife-bestnew",
    title: "Toronto Life's best new restaurants of the year",
    snippet:
      "The annual critics' list of the rooms that defined the city's dining year — reservations recommended.",
    source: "Toronto Life",
    sourceUrl: "https://torontolife.com/food/",
    url: "https://torontolife.com/food/",
    publishedAt: "2026-07-07T09:00:00Z",
    tags: ["Toronto", "Industry"],
  },
  {
    id: "n-nrn-tech",
    title: "How AI-driven scheduling is reshaping restaurant back offices",
    snippet:
      "Operators are adopting demand-forecasting and scheduling tools to trim labour cost and reduce burnout.",
    source: "Nation's Restaurant News",
    sourceUrl: "https://www.nrn.com",
    url: "https://www.nrn.com",
    publishedAt: "2026-07-06T14:20:00Z",
    tags: ["Industry", "Tech"],
  },
  {
    id: "n-rb-business",
    title: "Independent restaurants lean into private events to boost margins",
    snippet:
      "Buyouts, chef's tables and pop-ups are becoming a core revenue line as dining rooms diversify.",
    source: "Restaurant Business",
    sourceUrl: "https://www.restaurantbusinessonline.com",
    url: "https://www.restaurantbusinessonline.com",
    publishedAt: "2026-07-05T11:10:00Z",
    tags: ["Industry"],
  },
  {
    id: "n-eater-closings",
    title: "Notable Toronto closings to know this week",
    snippet:
      "A brief on the rooms saying goodbye — and what's rumoured to be taking their place.",
    source: "Eater Toronto",
    sourceUrl: "https://toronto.eater.com",
    url: "https://toronto.eater.com",
    publishedAt: "2026-07-04T16:45:00Z",
    tags: ["Toronto", "Openings"],
  },
  {
    id: "n-orhma-policy",
    title: "ORHMA welcomes changes to Ontario tipping and wage rules",
    snippet:
      "The provincial association weighs in on regulatory updates affecting front-of-house pay.",
    source: "ORHMA",
    sourceUrl: "https://www.orhma.com/News",
    url: "https://www.orhma.com/News",
    publishedAt: "2026-07-03T10:00:00Z",
    tags: ["Ontario", "Labour", "Industry"],
  },
];

export function getNews(): NewsItem[] {
  return [...NEWS_ITEMS].sort(
    (a, b) => +new Date(b.publishedAt) - +new Date(a.publishedAt),
  );
}
