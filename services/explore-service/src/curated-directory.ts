/**
 * Curated Explore directory seed — schools, associations, suppliers, news,
 * job listings, neighbourhoods. Kept in sync with the frontend TypeScript
 * constants; upserted into Postgres via POST /api/v1/explore/seed (and
 * auto-seeded on first empty list read).
 */

export type CuratedSchool = {
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

export type CuratedAssociation = {
  id: string;
  slug: string;
  name: string;
  acronym?: string;
  scope: 'National' | 'Ontario' | 'Global';
  website: string;
  role: string;
  blurb: string;
};

export type CuratedSupplier = {
  id: string;
  slug: string;
  name: string;
  categories: string[];
  regionsServed: string[];
  website: string;
  phone?: string;
  lat?: number;
  lng?: number;
  description: string;
  claimed?: boolean;
};

export type CuratedNews = {
  id: string;
  slug: string;
  title: string;
  snippet: string;
  source: string;
  sourceUrl: string;
  url: string;
  publishedAt: string;
  tags: string[];
};

export type CuratedJob = {
  id: string;
  slug: string;
  title: string;
  employer: string;
  neighbourhood: string;
  type: string;
  employment: string;
  compensation?: string;
  source: string;
  url: string;
  postedAt: string;
};

export type CuratedNeighbourhood = {
  slug: string;
  name: string;
  lat: number;
  lng: number;
};

export const SCHOOLS: CuratedSchool[] = [
  {
    id: 's-george-brown',
    slug: 'george-brown-college',
    name: 'George Brown College — Chef School',
    city: 'Toronto',
    lat: 43.6503,
    lng: -79.3606,
    programs: [
      'Culinary Management',
      'Baking & Pastry Arts Management',
      'Culinary Skills',
      'Chef — Italian',
    ],
    credential: 'Diploma / Certificate',
    website: 'https://www.georgebrown.ca/programs/culinary-arts',
    blurb:
      "Canada's largest culinary school, on the downtown waterfront campus with a teaching restaurant.",
  },
  {
    id: 's-humber',
    slug: 'humber-college',
    name: 'Humber College',
    city: 'Toronto',
    lat: 43.7291,
    lng: -79.6069,
    programs: [
      'Culinary Management',
      'Baking & Pastry Arts Management',
      'Hospitality & Tourism Management',
    ],
    credential: 'Diploma / Advanced Diploma',
    website: 'https://appliedtechnology.humber.ca/programs/culinary-management.html',
    blurb: 'Etobicoke campus with a strong co-op and industry-placement network.',
  },
  {
    id: 's-niagara',
    slug: 'niagara-college',
    name: 'Niagara College — Canadian Food & Wine Institute',
    city: 'Niagara-on-the-Lake',
    lat: 43.2185,
    lng: -79.1789,
    programs: [
      'Culinary Management',
      'Culinary Innovation & Food Technology',
      'Winery & Viticulture Technician',
    ],
    credential: 'Diploma / Graduate Certificate',
    website: 'https://www.niagaracollege.ca/cfwi/',
    blurb:
      'Home to a teaching winery, brewery and restaurant in the heart of wine country.',
  },
  {
    id: 's-centennial',
    slug: 'centennial-college',
    name: 'Centennial College',
    city: 'Toronto',
    lat: 43.7854,
    lng: -79.227,
    programs: [
      'Culinary Skills',
      'Culinary Management',
      'Hospitality — Hotel & Resort Operations Management',
    ],
    credential: 'Certificate / Diploma',
    website: 'https://www.centennialcollege.ca/programs-courses/full-time/culinary-skills',
    blurb: 'Scarborough-based programs with pathways into hotel and event operations.',
  },
];

export const ASSOCIATIONS: CuratedAssociation[] = [
  {
    id: 'a-restaurants-canada',
    slug: 'restaurants-canada',
    name: 'Restaurants Canada',
    scope: 'National',
    website: 'https://www.restaurantscanada.org',
    role: 'National industry association',
    blurb:
      'The national voice of foodservice — advocacy, research, and the annual RC Show.',
  },
  {
    id: 'a-orhma',
    slug: 'orhma',
    name: 'Ontario Restaurant Hotel & Motel Association',
    acronym: 'ORHMA',
    scope: 'Ontario',
    website: 'https://www.orhma.com',
    role: 'Ontario advocacy association',
    blurb:
      "Ontario's largest hospitality association — provincial advocacy, Smart Serve, and training.",
  },
  {
    id: 'a-ccfcc',
    slug: 'ccfcc',
    name: 'Canadian Culinary Federation',
    acronym: 'CCFCC',
    scope: 'National',
    website: 'https://www.ccfcc.ca',
    role: 'Chef certification & community',
    blurb:
      'Professional chef body running Red Seal pathways and regional chapters across Canada.',
  },
  {
    id: 'a-wset',
    slug: 'wset',
    name: 'Wine & Spirit Education Trust',
    acronym: 'WSET',
    scope: 'Global',
    website: 'https://www.wsetglobal.com',
    role: 'Wine & spirits certification',
    blurb:
      'Globally recognised wine, spirits and sake qualifications — a credential to verify on profiles.',
  },
];

export const SUPPLIERS: CuratedSupplier[] = [
  {
    id: 'sup-sysco',
    slug: 'sysco-canada',
    name: 'Sysco Canada',
    categories: ['Food'],
    regionsServed: ['Ontario', 'Canada'],
    website: 'https://www.sysco.ca',
    lat: 43.6785,
    lng: -79.6316,
    description:
      'Broadline foodservice distribution — produce, protein, dry goods and dairy at scale.',
    claimed: false,
  },
  {
    id: 'sup-gfs',
    slug: 'gordon-food-service',
    name: 'Gordon Food Service (GFS)',
    categories: ['Food', 'Smallwares'],
    regionsServed: ['Ontario', 'Canada'],
    website: 'https://www.gfs.ca',
    lat: 43.6089,
    lng: -79.6501,
    description:
      'Broadline distributor with in-person Gordon Food Service Stores for walk-in buying.',
    claimed: false,
  },
  {
    id: 'sup-flanagan',
    slug: 'flanagan-foodservice',
    name: 'Flanagan Foodservice',
    categories: ['Food', 'Smallwares'],
    regionsServed: ['Ontario'],
    website: 'https://www.flanagan.ca',
    lat: 43.4643,
    lng: -80.5204,
    description:
      "Ontario's largest independent, family-owned broadline foodservice distributor.",
    claimed: false,
  },
  {
    id: 'sup-nella',
    slug: 'nella-cutlery',
    name: 'Nella Cutlery',
    categories: ['Equipment', 'Smallwares', 'Services'],
    regionsServed: ['Toronto', 'Ontario'],
    website: 'https://nella.ca',
    lat: 43.7183,
    lng: -79.4735,
    phone: '(416) 635-1010',
    description:
      'Knives, smallwares, and kitchen equipment — plus professional knife sharpening.',
    claimed: false,
  },
  {
    id: 'sup-russell-hendrix',
    slug: 'russell-hendrix',
    name: 'Russell Hendrix Foodservice Equipment',
    categories: ['Equipment', 'Smallwares'],
    regionsServed: ['Ontario', 'Canada'],
    website: 'https://www.russellhendrix.com',
    lat: 43.7003,
    lng: -79.4426,
    description:
      'Full-line restaurant equipment and supplies — front-of-house to back-of-house.',
    claimed: false,
  },
];

export const NEWS: CuratedNews[] = [
  {
    id: 'n-eater-openings',
    slug: 'eater-openings',
    title: 'The most anticipated Toronto restaurant openings this season',
    snippet:
      'A rundown of the buzziest new rooms opening across the city — from downtown tasting counters to neighbourhood trattorias.',
    source: 'Eater Toronto',
    sourceUrl: 'https://toronto.eater.com',
    url: 'https://toronto.eater.com',
    publishedAt: '2026-07-10T13:00:00Z',
    tags: ['Toronto', 'Openings'],
  },
  {
    id: 'n-blogto-newopenings',
    slug: 'blogto-newopenings',
    title: 'New restaurants that opened in Toronto this month',
    snippet:
      "BlogTO's running list of fresh openings across the city's neighbourhoods, updated weekly.",
    source: 'BlogTO',
    sourceUrl: 'https://www.blogto.com/eat_drink/',
    url: 'https://www.blogto.com/eat_drink/',
    publishedAt: '2026-07-09T15:30:00Z',
    tags: ['Toronto', 'Openings'],
  },
  {
    id: 'n-rc-labour',
    slug: 'rc-labour',
    title: 'Restaurants Canada: labour shortage eases but costs stay high',
    snippet:
      "The national association's latest outlook points to stabilising staffing alongside persistent food-cost pressure.",
    source: 'Restaurants Canada',
    sourceUrl: 'https://www.restaurantscanada.org/industry-news/',
    url: 'https://www.restaurantscanada.org/industry-news/',
    publishedAt: '2026-07-08T12:00:00Z',
    tags: ['Canada', 'Labour', 'Industry'],
  },
  {
    id: 'n-torontolife-bestnew',
    slug: 'torontolife-bestnew',
    title: "Toronto Life's best new restaurants of the year",
    snippet:
      "The annual critics' list of the rooms that defined the city's dining year — reservations recommended.",
    source: 'Toronto Life',
    sourceUrl: 'https://torontolife.com/food/',
    url: 'https://torontolife.com/food/',
    publishedAt: '2026-07-07T09:00:00Z',
    tags: ['Toronto', 'Industry'],
  },
  {
    id: 'n-nrn-tech',
    slug: 'nrn-tech',
    title: 'How AI-driven scheduling is reshaping restaurant back offices',
    snippet:
      'Operators are adopting demand-forecasting and scheduling tools to trim labour cost and reduce burnout.',
    source: "Nation's Restaurant News",
    sourceUrl: 'https://www.nrn.com',
    url: 'https://www.nrn.com',
    publishedAt: '2026-07-06T14:20:00Z',
    tags: ['Industry', 'Tech'],
  },
  {
    id: 'n-rb-business',
    slug: 'rb-business',
    title: 'Independent restaurants lean into private events to boost margins',
    snippet:
      "Buyouts, chef's tables and pop-ups are becoming a core revenue line as dining rooms diversify.",
    source: 'Restaurant Business',
    sourceUrl: 'https://www.restaurantbusinessonline.com',
    url: 'https://www.restaurantbusinessonline.com',
    publishedAt: '2026-07-05T11:10:00Z',
    tags: ['Industry'],
  },
  {
    id: 'n-eater-closings',
    slug: 'eater-closings',
    title: 'Notable Toronto closings to know this week',
    snippet:
      "A brief on the rooms saying goodbye — and what's rumoured to be taking their place.",
    source: 'Eater Toronto',
    sourceUrl: 'https://toronto.eater.com',
    url: 'https://toronto.eater.com',
    publishedAt: '2026-07-04T16:45:00Z',
    tags: ['Toronto', 'Openings'],
  },
  {
    id: 'n-orhma-policy',
    slug: 'orhma-policy',
    title: 'ORHMA welcomes changes to Ontario tipping and wage rules',
    snippet:
      'The provincial association weighs in on regulatory updates affecting front-of-house pay.',
    source: 'ORHMA',
    sourceUrl: 'https://www.orhma.com/News',
    url: 'https://www.orhma.com/News',
    publishedAt: '2026-07-03T10:00:00Z',
    tags: ['Ontario', 'Labour', 'Industry'],
  },
];

export const JOBS: CuratedJob[] = [
  {
    id: 'j-sous-chef-yorkville',
    slug: 'sous-chef-yorkville',
    title: 'Sous Chef',
    employer: 'Yorkville fine-dining group',
    neighbourhood: 'Yorkville',
    type: 'BOH',
    employment: 'Full-time',
    compensation: '$62k–$72k',
    source: 'Culinary Agents',
    url: 'https://culinaryagents.com/jobs?location=Toronto',
    postedAt: '2026-07-10T09:00:00Z',
  },
  {
    id: 'j-line-cook-ossington',
    slug: 'line-cook-ossington',
    title: 'Line Cook (Grill)',
    employer: 'Ossington neighbourhood restaurant',
    neighbourhood: 'Ossington',
    type: 'BOH',
    employment: 'Full-time',
    compensation: '$20–$24/hr',
    source: 'Hcareers',
    url: 'https://www.hcareers.ca/jobs/toronto-on',
    postedAt: '2026-07-09T14:00:00Z',
  },
  {
    id: 'j-server-king-west',
    slug: 'server-king-west',
    title: 'Server',
    employer: 'King West cocktail bar',
    neighbourhood: 'King West',
    type: 'FOH',
    employment: 'Part-time',
    compensation: 'Wage + tips',
    source: 'Indeed',
    url: 'https://ca.indeed.com/jobs?q=server&l=Toronto%2C+ON',
    postedAt: '2026-07-09T11:30:00Z',
  },
  {
    id: 'j-bartender-entertainment',
    slug: 'bartender-entertainment',
    title: 'Bartender',
    employer: 'Entertainment District lounge',
    neighbourhood: 'Entertainment District',
    type: 'FOH',
    employment: 'Full-time',
    compensation: 'Wage + tips',
    source: 'Culinary Agents',
    url: 'https://culinaryagents.com/jobs?location=Toronto',
    postedAt: '2026-07-08T18:00:00Z',
  },
  {
    id: 'j-gm-financial',
    slug: 'gm-financial',
    title: 'General Manager',
    employer: 'Financial District restaurant',
    neighbourhood: 'Financial District',
    type: 'Management',
    employment: 'Full-time',
    compensation: '$85k–$100k',
    source: 'Hcareers',
    url: 'https://www.hcareers.ca/jobs/toronto-on',
    postedAt: '2026-07-08T09:00:00Z',
  },
  {
    id: 'j-pastry-little-italy',
    slug: 'pastry-little-italy',
    title: 'Pastry Cook',
    employer: 'Little Italy bakery-café',
    neighbourhood: 'Little Italy',
    type: 'BOH',
    employment: 'Full-time',
    compensation: '$21–$25/hr',
    source: 'Culinary Agents',
    url: 'https://culinaryagents.com/jobs?location=Toronto',
    postedAt: '2026-07-07T07:30:00Z',
  },
  {
    id: 'j-events-manager',
    slug: 'events-manager',
    title: 'Private Events Manager',
    employer: 'Waterfront event venue',
    neighbourhood: 'Harbourfront',
    type: 'Events',
    employment: 'Full-time',
    compensation: '$60k–$70k',
    source: 'Hcareers',
    url: 'https://www.hcareers.ca/jobs/toronto-on',
    postedAt: '2026-07-06T15:00:00Z',
  },
  {
    id: 'j-hotel-fb',
    slug: 'hotel-fb',
    title: 'Food & Beverage Supervisor',
    employer: 'Downtown hotel',
    neighbourhood: 'Downtown Core',
    type: 'Hotel',
    employment: 'Full-time',
    compensation: '$52k–$58k',
    source: 'Indeed',
    url: 'https://ca.indeed.com/jobs?q=food+beverage+supervisor&l=Toronto%2C+ON',
    postedAt: '2026-07-06T10:00:00Z',
  },
  {
    id: 'j-dishwasher-kensington',
    slug: 'dishwasher-kensington',
    title: 'Kitchen Porter / Dishwasher',
    employer: 'Kensington Market wine bar',
    neighbourhood: 'Kensington Market',
    type: 'BOH',
    employment: 'Part-time',
    compensation: '$17.50–$19/hr',
    source: 'Indeed',
    url: 'https://ca.indeed.com/jobs?q=dishwasher&l=Toronto%2C+ON',
    postedAt: '2026-07-05T13:00:00Z',
  },
  {
    id: 'j-somm-midtown',
    slug: 'somm-midtown',
    title: 'Sommelier',
    employer: 'Midtown tasting-menu restaurant',
    neighbourhood: 'Midtown',
    type: 'FOH',
    employment: 'Full-time',
    compensation: 'Wage + tips',
    source: 'Culinary Agents',
    url: 'https://culinaryagents.com/jobs?location=Toronto',
    postedAt: '2026-07-05T09:00:00Z',
  },
];

export const NEIGHBOURHOODS: CuratedNeighbourhood[] = [
  { slug: 'downtown-core', name: 'Downtown Core', lat: 43.6512, lng: -79.3799 },
  { slug: 'yorkville', name: 'Yorkville', lat: 43.6708, lng: -79.3915 },
  { slug: 'queen-west', name: 'Queen West', lat: 43.6479, lng: -79.4015 },
  { slug: 'ossington', name: 'Ossington', lat: 43.6479, lng: -79.4197 },
  { slug: 'little-italy', name: 'Little Italy', lat: 43.6555, lng: -79.4155 },
  { slug: 'kensington-market', name: 'Kensington Market', lat: 43.6547, lng: -79.4008 },
  { slug: 'leslieville', name: 'Leslieville', lat: 43.6659, lng: -79.3389 },
  { slug: 'danforth', name: 'The Danforth', lat: 43.6779, lng: -79.3494 },
  { slug: 'junction', name: 'The Junction', lat: 43.6656, lng: -79.4649 },
  { slug: 'financial-district', name: 'Financial District', lat: 43.6479, lng: -79.3813 },
  // Extra centroids used by job pins that aren't in the map quick-jump list.
  { slug: 'harbourfront', name: 'Harbourfront', lat: 43.6387, lng: -79.3817 },
  { slug: 'king-west', name: 'King West', lat: 43.6445, lng: -79.4005 },
  { slug: 'entertainment-district', name: 'Entertainment District', lat: 43.6465, lng: -79.389 },
  { slug: 'midtown', name: 'Midtown', lat: 43.704, lng: -79.398 },
];
