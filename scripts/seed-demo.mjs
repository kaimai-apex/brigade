#!/usr/bin/env node
/**
 * Seed Brigade with 20 hospitality demo accounts + feed/network/messages/jobs.
 *
 * Usage:
 *   pnpm seed:demo
 *
 * Login any demo account with password: DemoPass123!
 * Your debug admin (administrator) is wired into the network + feed automatically.
 */

import { createRequire } from 'module';
import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

// Resolve deps from workspace packages that already have them
const requireFrom = (pkgJson) => createRequire(resolve(root, pkgJson));
const reqMsg = requireFrom('services/messaging-service/package.json');
const reqAuth = requireFrom('services/auth-service/package.json');

const { Client } = reqMsg('pg');
const { MongoClient, ObjectId } = reqMsg('mongodb');
const bcrypt = reqAuth('bcryptjs');

function loadEnv() {
  for (const name of ['.env.local', '.env']) {
    const p = resolve(root, name);
    if (!existsSync(p)) continue;
    for (const line of readFileSync(p, 'utf8').split('\n')) {
      const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
      if (!m || process.env[m[1]]) continue;
      process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
    }
  }
}
loadEnv();

const DATABASE_URL =
  process.env.DATABASE_URL ?? 'postgresql://connectpro:connectpro@localhost:5432/connectpro';
const MONGO_URL = process.env.MONGO_URL ?? 'mongodb://localhost:27017/connectpro';
const AUTH_SCHEMA = process.env.AUTH_SCHEMA ?? 'connectpro_auth';
const DEMO_PASSWORD = 'DemoPass123!';
const ADMIN_EMAIL = 'administrator';

const BANNERS = [
  'kitchen-line',
  'fine-dining',
  'taco-truck',
  'cocktail-bar',
  'wedding-event',
  'pastry',
  'hotel-lobby',
  'wine-cellar',
];

/** Deterministic demo user ids so re-runs are idempotent */
function demoId(n) {
  return `a0000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
}

const DEMO_ACCOUNTS = [
  {
    n: 1,
    email: 'maya.chen@brigade.demo',
    first: 'Maya',
    last: 'Chen',
    role: 'Executive Chef',
    headline: 'Executive Chef · Michelin tasting menus · NYC',
    city: 'New York',
    state: 'NY',
    expertise: ['Fine Dining', 'Michelin Experience'],
    open: true,
    events: true,
    years: 14,
    employer: 'Atelier North',
    about: 'Led brigades across tasting-menu rooms. Always hunting for sharp cooks who care about the plate.',
  },
  {
    n: 2,
    email: 'jordan.reyes@brigade.demo',
    first: 'Jordan',
    last: 'Reyes',
    role: 'Bartender',
    headline: 'Craft cocktail bartender · speakeasy programs',
    city: 'Austin',
    state: 'TX',
    expertise: ['Mixology', 'Wine & Beverage'],
    open: true,
    contract: true,
    years: 8,
    employer: 'Velvet Room',
    about: 'Menu development, batching for volume, and training new bars through opening week.',
  },
  {
    n: 3,
    email: 'sofia.martinez@brigade.demo',
    first: 'Sofia',
    last: 'Martinez',
    role: 'Sommelier',
    headline: 'Sommelier · wine pairings & cellar programs',
    city: 'San Francisco',
    state: 'CA',
    expertise: ['Wine & Beverage', 'Fine Dining'],
    open: false,
    years: 11,
    employer: 'Maison Vert',
    about: 'CMS Advanced. Building wine lists that guests actually remember.',
  },
  {
    n: 4,
    email: 'marcus.okafor@brigade.demo',
    first: 'Marcus',
    last: 'Okafor',
    role: 'Sous Chef',
    headline: 'Sous Chef · high-volume banquet & hotel',
    city: 'Chicago',
    state: 'IL',
    expertise: ['Volume / Banquet', 'Hotel Operations'],
    open: true,
    emergency: true,
    years: 9,
    employer: 'The Drake',
    about: 'Calm on the pass when covers spike. Looking for full-time sous or CDC roles.',
  },
  {
    n: 5,
    email: 'elena.park@brigade.demo',
    first: 'Elena',
    last: 'Park',
    role: 'Pastry Chef',
    headline: 'Pastry Chef · plated desserts & viennoiserie',
    city: 'Los Angeles',
    state: 'CA',
    expertise: ['Pastry & Baking', 'Fine Dining'],
    open: true,
    contract: true,
    years: 7,
    employer: 'Sugar & Smoke',
    about: 'From laminated dough to plated desserts that photograph as well as they taste.',
  },
  {
    n: 6,
    email: 'diego.santos@brigade.demo',
    first: 'Diego',
    last: 'Santos',
    role: 'Event Manager',
    headline: 'Event Manager · weddings & corporate galas',
    city: 'Miami',
    state: 'FL',
    expertise: ['Wedding Events', 'Events', 'VIP / Private Events'],
    open: true,
    events: true,
    years: 10,
    employer: 'Palm & Pearl Events',
    about: 'Timeline obsessives welcome. 200+ weddings and counting.',
  },
  {
    n: 7,
    email: 'amira.hassan@brigade.demo',
    first: 'Amira',
    last: 'Hassan',
    role: 'Server',
    headline: 'Fine dining server · wine service certified',
    city: 'Boston',
    state: 'MA',
    expertise: ['Fine Dining Service', 'Wine & Beverage'],
    open: true,
    emergency: true,
    years: 6,
    employer: 'Harbor Table',
    about: 'Tableside polish without the stuffiness. Available for private dinners.',
  },
  {
    n: 8,
    email: 'noah.kim@brigade.demo',
    first: 'Noah',
    last: 'Kim',
    role: 'Line Cook',
    headline: 'Line Cook · grill & sauté · open to travel',
    city: 'Seattle',
    state: 'WA',
    expertise: ['Fine Dining', 'Quick Service'],
    open: true,
    emergency: true,
    contract: true,
    years: 4,
    employer: 'Pike Fire',
    about: 'Fast hands, clean station. Ready for last-minute shifts and pop-ups.',
  },
  {
    n: 9,
    email: 'priya.nair@brigade.demo',
    first: 'Priya',
    last: 'Nair',
    role: 'Hotel General Manager',
    headline: 'Hotel GM · luxury boutique properties',
    city: 'Washington',
    state: 'DC',
    expertise: ['Hotel Operations', 'Luxury Hospitality'],
    open: false,
    years: 16,
    employer: 'The Ember House',
    about: 'Guest recovery, team culture, and F&B that actually drives ADR.',
  },
  {
    n: 10,
    email: 'caleb.wright@brigade.demo',
    first: 'Caleb',
    last: 'Wright',
    role: 'Banquet Captain',
    headline: 'Banquet Captain · 500+ cover events',
    city: 'Las Vegas',
    state: 'NV',
    expertise: ['Banquet Management', 'Volume / Banquet'],
    open: true,
    events: true,
    years: 12,
    employer: 'Strip Convention Center',
    about: 'Cue sheets, radio etiquette, and service that hits on the minute.',
  },
  {
    n: 11,
    email: 'luna.torres@brigade.demo',
    first: 'Luna',
    last: 'Torres',
    role: 'Private Chef',
    headline: 'Private Chef · yacht & estate dining',
    city: 'San Diego',
    state: 'CA',
    expertise: ['Private Dining', 'VIP / Private Events', 'Meal Prep'],
    open: true,
    events: true,
    contract: true,
    years: 9,
    employer: 'Independent',
    about: 'Dietary-flexible menus for families, founders, and charter weeks.',
  },
  {
    n: 12,
    email: 'henry.blake@brigade.demo',
    first: 'Henry',
    last: 'Blake',
    role: 'Concierge',
    headline: 'Chief Concierge · Les Clefs d\'Or',
    city: 'New Orleans',
    state: 'LA',
    expertise: ['Luxury Hospitality', 'Hotel Operations'],
    open: false,
    years: 13,
    employer: 'Maison Rouge',
    about: 'Impossible reservations, quiet problem-solving, local knowledge that guests rave about.',
  },
  {
    n: 13,
    email: 'aisha.johnson@brigade.demo',
    first: 'Aisha',
    last: 'Johnson',
    role: 'Caterer',
    headline: 'Catering Director · festivals & food trucks',
    city: 'Portland',
    state: 'OR',
    expertise: ['Catering', 'Events', 'Quick Service'],
    open: true,
    contract: true,
    years: 8,
    employer: 'Fire & Fork Catering',
    about: 'Logistics-first catering. We feed crews and crowds without drama.',
  },
  {
    n: 14,
    email: 'theo.nguyen@brigade.demo',
    first: 'Theo',
    last: 'Nguyen',
    role: 'Hospitality Recruiter',
    headline: 'Hospitality recruiter · chefs & FOH talent',
    city: 'Denver',
    state: 'CO',
    expertise: ['Hotel Operations', 'Fine Dining'],
    open: false,
    years: 7,
    employer: 'Brigade Talent Partners',
    about: 'Placing kitchen and floor talent that actually sticks past 90 days.',
  },
  {
    n: 15,
    email: 'isla.brown@brigade.demo',
    first: 'Isla',
    last: 'Brown',
    role: 'Host / Hostess',
    headline: 'Lead host · reservation flow & guest greeting',
    city: 'Nashville',
    state: 'TN',
    expertise: ['Fine Dining Service', 'Hotel Operations'],
    open: true,
    emergency: true,
    years: 5,
    employer: 'Copper Line',
    about: 'Turn times, waitlists, and making every walk-in feel intentional.',
  },
  {
    n: 16,
    email: 'omar.farouk@brigade.demo',
    first: 'Omar',
    last: 'Farouk',
    role: 'Cruise Hospitality',
    headline: 'Cruise F&B supervisor · global itineraries',
    city: 'Fort Lauderdale',
    state: 'FL',
    expertise: ['Cruise Hospitality', 'Volume / Banquet'],
    open: true,
    contract: true,
    years: 10,
    employer: 'Atlantic Lines',
    about: 'Between contracts and looking for land-based GM or F&B director roles.',
  },
  {
    n: 17,
    email: 'ruby.ellis@brigade.demo',
    first: 'Ruby',
    last: 'Ellis',
    role: 'Front Desk / Guest Services',
    headline: 'Front desk lead · boutique hotels',
    city: 'Phoenix',
    state: 'AZ',
    expertise: ['Hotel Operations', 'Luxury Hospitality'],
    open: true,
    years: 6,
    employer: 'Desert Loom Hotel',
    about: 'Night audit + day shift coverage. Strong with PMS and VIP arrivals.',
  },
  {
    n: 18,
    email: 'kai.morales@brigade.demo',
    first: 'Kai',
    last: 'Morales',
    role: 'Staffing Coordinator',
    headline: 'Staffing coordinator · last-minute FOH/BOH',
    city: 'Atlanta',
    state: 'GA',
    expertise: ['Events', 'Volume / Banquet'],
    open: false,
    emergency: true,
    years: 8,
    employer: 'ShiftBridge Staffing',
    about: 'Filling call-outs before service. Always recruiting reliable floaters.',
  },
  {
    n: 19,
    email: 'nina.volkov@brigade.demo',
    first: 'Nina',
    last: 'Volkov',
    role: 'General Manager',
    headline: 'Restaurant GM · neighborhood fine casual',
    city: 'Philadelphia',
    state: 'PA',
    expertise: ['Fine Dining', 'Hotel Operations'],
    open: true,
    years: 12,
    employer: 'Walnut & Vine',
    about: 'P&L, scheduling, and culture. Hiring for summer patio season.',
  },
  {
    n: 20,
    email: 'sam.okada@brigade.demo',
    first: 'Sam',
    last: 'Okada',
    role: 'Housekeeping',
    headline: 'Housekeeping supervisor · luxury hotels',
    city: 'Honolulu',
    state: 'HI',
    expertise: ['Hotel Operations', 'Luxury Hospitality'],
    open: true,
    emergency: true,
    years: 9,
    employer: 'Pacific Lanai',
    about: 'Room turns at pace without cutting corners. Training new supervisors.',
  },
].map((a) => ({
  ...a,
  id: demoId(a.n),
  cover: BANNERS[(a.n - 1) % BANNERS.length],
}));

const POSTS = [
  { author: 1, hoursAgo: 2, content: 'Looking for a strong sauté cook for tasting-menu service this fall. DM if you thrive under pressure. #FineDining #Hiring #KitchenBrigade' },
  { author: 2, hoursAgo: 5, content: 'New clarified milk punch on the list tonight — citrus, tea, and a little smoke. Guests are losing their minds. #Mixology #Cocktails #BartenderLife' },
  { author: 3, hoursAgo: 8, content: 'Just finished a Loire Valley deep dive for the new list. Anyone else pairing Chenin with oysters this season? #Wine #Sommelier #FineDining' },
  { author: 4, hoursAgo: 12, content: 'Banquet for 420 tonight and the brigade crushed it. Proud of this team. #BanquetLife #HotelKitchen #Hospitality' },
  { author: 5, hoursAgo: 18, content: 'Laminated dough day. When the layers sing, everything else falls into place. #Pastry #Baking #Brigade' },
  { author: 6, hoursAgo: 22, content: 'Wedding weekend tip: print a rain plan *and* a lighting plan. Your future self will thank you. #Weddings #Events #EventProfs' },
  { author: 7, hoursAgo: 28, content: 'Open to private dinner shifts in Greater Boston — wine service included. #OpenToWork #FineDiningService #ServerLife' },
  { author: 8, hoursAgo: 36, content: 'Available for emergency grill coverage this week in Seattle. Can jump in with 4 hours notice. #LineCook #OpenToWork #LastMinute' },
  { author: 9, hoursAgo: 40, content: 'Guest recovery story of the week: turned a suite complaint into a lifetime regular. Details matter. #HotelLife #LuxuryHospitality' },
  { author: 10, hoursAgo: 48, content: 'Cue sheet discipline separates good banquet teams from great ones. Radios on, eyes up. #BanquetCaptain #Events' },
  { author: 11, hoursAgo: 55, content: 'Yacht charter menu locked for next month — gluten-free tasting without feeling like a compromise. #PrivateChef #VIP #Catering' },
  { author: 12, hoursAgo: 60, content: 'Concierge secret: the best tables are booked before the guest even asks. Relationships > apps. #Concierge #Hospitality' },
  { author: 13, hoursAgo: 70, content: 'Food truck festival this Saturday — hiring two runners who can smile through a rush. #Catering #FoodTruck #Hiring' },
  { author: 14, hoursAgo: 80, content: 'Recruiting: Executive Sous for a new Denver tasting room. Strong plating + calm leadership required. #Hiring #Chefs #HospitalityJobs' },
  { author: 15, hoursAgo: 90, content: 'Host tip: narrate the wait with honesty and a plan. Guests remember how you made them feel. #FOH #HostLife' },
  { author: 16, hoursAgo: 100, content: 'Between contracts and exploring land-based F&B director roles. Cruise hustle translates. #CruiseHospitality #OpenToWork' },
  { author: 17, hoursAgo: 110, content: 'Front desk energy sets the whole property tone. Training new agents on calm under pressure. #FrontDesk #HotelOps' },
  { author: 18, hoursAgo: 120, content: 'Need 6 banquet servers for a Saturday gala in Atlanta — call-outs welcome if you\'re reliable. #Staffing #Events #Hiring' },
  { author: 19, hoursAgo: 130, content: 'Patio season hiring: servers + a bartender who can run a 12-seat rail. Philly folks apply. #Hiring #RestaurantJobs #FOH' },
  { author: 20, hoursAgo: 140, content: 'Housekeeping supervisors: your standards are the brand. Proud of this week\'s inspection scores. #HotelLife #Housekeeping' },
  { author: 1, hoursAgo: 150, content: 'Stage night leftovers became staff meal of the year. Never waste a good reduction. #KitchenCulture #Chefs' },
  { author: 2, hoursAgo: 160, content: 'Teaching batch prep so Friday night doesn\'t break the bar. Systems > heroics. #Bartending #Ops' },
  { author: 6, hoursAgo: 170, content: 'Anyone have a reliable AV vendor in Miami for outdoor ceremonies? Need recommendations. #Weddings #Networking' },
  { author: 5, hoursAgo: 180, content: 'Looking to trade notes with other pastry leads on gluten-free laminated dough. Drop tips below. #Pastry #ChefsOfBrigade' },
  { author: 14, hoursAgo: 190, content: 'Hot take: the best candidates reply to texts during service breaks, not at 2am. Recruit with respect. #RecruiterLife #Hospitality' },
  { author: 11, hoursAgo: 200, content: 'Private dinner for 18 this weekend — farm market haul already planned. Love this work. #PrivateDining #ChefLife' },
  { author: 4, hoursAgo: 210, content: 'Hotel brunch covers hit a new high. Shoutout to the dish pit — absolute heroes. #HotelKitchen #Teamwork' },
  { author: 7, hoursAgo: 220, content: 'Wine-by-the-glass training tonight for the floor. Curiosity sells more than scripts. #WineService #FOH' },
  { author: 19, hoursAgo: 230, content: 'Labor percent looking healthier after we fixed the midweek schedule. Small tweaks, big calm. #RestaurantGM #Ops' },
  { author: 3, hoursAgo: 240, content: 'Cellar inventory day. Nothing beats a tidy bin map. #WineCellar #SommelierLife' },
];

const COMMENTS = [
  'This is exactly the energy we need in hospitality right now.',
  'Count me in — DMing you.',
  'Been there. Systems save weekends.',
  'Incredible tip. Saving this.',
  'We hired through Brigade last month and it worked.',
  'Same challenge in our market — happy to compare notes.',
  'Respect. Clean stations change everything.',
  'Would love to stage with your team sometime.',
  'Tagging a few folks who should see this.',
  'Open to helping if you still need coverage.',
];

const REACTIONS = ['like', 'celebrate', 'support', 'love', 'insightful', 'funny'];

const MESSAGE_THREADS = [
  {
    a: 1,
    b: 14,
    messages: [
      { from: 'b', body: 'Maya — still looking for that sauté cook? I have two strong résumés.' },
      { from: 'a', body: 'Yes! Send them over. Prefer tasting-menu experience.' },
      { from: 'b', body: 'Sent. Both can do a stage next week.' },
    ],
  },
  {
    a: 2,
    b: 19,
    messages: [
      { from: 'b', body: 'Jordan, any interest in a patio bar program in Philly this summer?' },
      { from: 'a', body: 'Possibly — what\'s the volume like on weekends?' },
      { from: 'b', body: 'Busy but manageable. 12-seat rail, good tips.' },
    ],
  },
  {
    a: 6,
    b: 10,
    messages: [
      { from: 'a', body: 'Caleb — can your banquet crew cover a 280-guest wedding in June?' },
      { from: 'b', body: 'If the cue sheet is tight, yes. Send the timeline.' },
    ],
  },
  {
    a: 7,
    b: 3,
    messages: [
      { from: 'a', body: 'Sofia, any private dinner clients in Boston needing wine service?' },
      { from: 'b', body: 'I\'ll introduce you to two. You\'ll like them.' },
    ],
  },
  {
    a: 8,
    b: 18,
    messages: [
      { from: 'a', body: 'Kai — put me on your Seattle emergency list for grill.' },
      { from: 'b', body: 'Done. Expect a text if a Saturday blows up.' },
    ],
  },
  {
    a: 11,
    b: 13,
    messages: [
      { from: 'b', body: 'Luna, we need a private chef for a festival VIP tent. Interested?' },
      { from: 'a', body: 'Send guest count + dietary notes and I\'ll quote.' },
    ],
  },
  {
    a: 5,
    b: 1,
    messages: [
      { from: 'a', body: 'Maya — pastry collab for the fall tasting? I have a new plated dessert.' },
      { from: 'b', body: 'Bring it in Thursday. Let\'s plate it with the savory course.' },
    ],
  },
  {
    a: 16,
    b: 9,
    messages: [
      { from: 'a', body: 'Priya, exploring hotel F&B director roles after my contract. Any advice?' },
      { from: 'b', body: 'Lead with guest recovery stories and labor discipline. Happy to intro you.' },
    ],
  },
];

const COMPANIES = [
  {
    id: '11111111-1111-1111-1111-111111111111',
    name: 'The Grand Kitchen',
    industry: 'Hospitality',
    website: 'https://example.com/grand',
    size: '50-200',
  },
  {
    id: '22222222-2222-2222-2222-222222222222',
    name: 'Coastal Events Co.',
    industry: 'Events',
    website: 'https://example.com/coastal',
    size: '10-50',
  },
  {
    id: '33333333-3333-3333-3333-333333333333',
    name: 'Ember House Hotels',
    industry: 'Hotels',
    website: 'https://example.com/ember',
    size: '200-500',
  },
  {
    id: '44444444-4444-4444-4444-444444444444',
    name: 'Velvet Room Collective',
    industry: 'Bars & Nightlife',
    website: 'https://example.com/velvet',
    size: '10-50',
  },
  {
    id: '55555555-5555-5555-5555-555555555555',
    name: 'ShiftBridge Staffing',
    industry: 'Staffing',
    website: 'https://example.com/shiftbridge',
    size: '50-200',
  },
];

const JOBS = [
  {
    company: 0,
    recruiter: 14,
    title: 'Executive Sous Chef',
    description:
      'Lead the evening brigade for a tasting-menu restaurant. Strong plating, calm communication, and stage leadership required.',
    location: 'New York, NY',
    salaryMin: 85000,
    salaryMax: 105000,
    employmentType: 'full-time',
  },
  {
    company: 0,
    recruiter: 1,
    title: 'Sauté Cook',
    description: 'Fine-dining sauté station. Michelin-level standards, 4–5 nights/week including weekends.',
    location: 'New York, NY',
    salaryMin: 28,
    salaryMax: 35,
    employmentType: 'full-time',
  },
  {
    company: 1,
    recruiter: 6,
    title: 'Wedding Banquet Captain',
    description: 'Own service flow for 100–300 guest weddings across South Florida venues.',
    location: 'Miami, FL',
    salaryMin: 65000,
    salaryMax: 78000,
    employmentType: 'full-time',
  },
  {
    company: 1,
    recruiter: 18,
    title: 'Event Servers (Weekend Pool)',
    description: 'Reliable banquet servers for corporate and wedding events. Flexible weekend schedule.',
    location: 'Atlanta, GA',
    salaryMin: 22,
    salaryMax: 30,
    employmentType: 'contract',
  },
  {
    company: 2,
    recruiter: 9,
    title: 'Front Desk Supervisor',
    description: 'Boutique luxury hotel seeking a supervisor who can train agents and own VIP arrivals.',
    location: 'Washington, DC',
    salaryMin: 58000,
    salaryMax: 68000,
    employmentType: 'full-time',
  },
  {
    company: 2,
    recruiter: 9,
    title: 'F&B Director',
    description: 'Oversee restaurant, banquets, and in-room dining for a 180-key luxury property.',
    location: 'Washington, DC',
    salaryMin: 110000,
    salaryMax: 135000,
    employmentType: 'full-time',
  },
  {
    company: 3,
    recruiter: 2,
    title: 'Lead Bartender',
    description: 'Build and run a craft cocktail program for a new speakeasy concept. Menu development a plus.',
    location: 'Austin, TX',
    salaryMin: 25,
    salaryMax: 40,
    employmentType: 'full-time',
  },
  {
    company: 3,
    recruiter: 19,
    title: 'Patio Server',
    description: 'Seasonal patio service for a busy neighborhood restaurant. Strong wine knowledge preferred.',
    location: 'Philadelphia, PA',
    salaryMin: 18,
    salaryMax: 28,
    employmentType: 'part-time',
  },
  {
    company: 4,
    recruiter: 18,
    title: 'On-Call Line Cooks',
    description: 'Emergency grill and sauté coverage for partner restaurants. Same-day shifts available.',
    location: 'Seattle, WA',
    salaryMin: 24,
    salaryMax: 32,
    employmentType: 'contract',
  },
  {
    company: 4,
    recruiter: 14,
    title: 'Pastry Chef — Pop-up Series',
    description: '3-month pastry residency across partner hotels. Laminated dough + plated desserts.',
    location: 'Los Angeles, CA',
    salaryMin: 70000,
    salaryMax: 85000,
    employmentType: 'contract',
  },
];

function hoursAgoDate(hours) {
  return new Date(Date.now() - hours * 3600 * 1000);
}

async function main() {
  console.log('Seeding Brigade demo data…');
  console.log(`  DB: ${DATABASE_URL.replace(/:[^:@/]+@/, ':***@')}`);
  console.log(`  Auth schema: ${AUTH_SCHEMA}`);
  console.log(`  Mongo: ${MONGO_URL}`);

  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 12);
  const pg = new Client({ connectionString: DATABASE_URL });
  await pg.connect();

  const adminRes = await pg.query(
    `SELECT id FROM ${AUTH_SCHEMA}.users WHERE email = $1 AND deleted_at IS NULL LIMIT 1`,
    [ADMIN_EMAIL],
  );
  const adminId = adminRes.rows[0]?.id ?? null;
  if (adminId) {
    console.log(`  Found admin: ${adminId}`);
  } else {
    console.log('  No administrator account found — feed will still work for demo logins.');
  }

  // Wipe previous demo seed (idempotent by deterministic ids)
  const demoIds = DEMO_ACCOUNTS.map((a) => a.id);
  await pg.query(`DELETE FROM posts.home_timeline WHERE author_id = ANY($1::uuid[]) OR user_id = ANY($1::uuid[])`, [
    demoIds,
  ]);
  if (adminId) {
    await pg.query(`DELETE FROM posts.home_timeline WHERE author_id = ANY($1::uuid[])`, [demoIds]);
  }
  await pg.query(
    `DELETE FROM posts.likes WHERE post_id IN (SELECT id FROM posts.posts WHERE author_id = ANY($1::uuid[]))`,
    [demoIds],
  );
  await pg.query(
    `DELETE FROM posts.comments WHERE post_id IN (SELECT id FROM posts.posts WHERE author_id = ANY($1::uuid[]))`,
    [demoIds],
  );
  await pg.query(`DELETE FROM posts.posts WHERE author_id = ANY($1::uuid[])`, [demoIds]);
  await pg.query(
    `DELETE FROM connections.connections WHERE sender_id = ANY($1::uuid[]) OR receiver_id = ANY($1::uuid[])`,
    [demoIds],
  );
  await pg.query(
    `DELETE FROM connections.follows WHERE follower_id = ANY($1::uuid[]) OR followee_id = ANY($1::uuid[])`,
    [demoIds],
  );
  await pg.query(`DELETE FROM jobs.jobs WHERE recruiter_id = ANY($1::uuid[])`, [demoIds]);
  await pg.query(`DELETE FROM users.profiles WHERE user_id = ANY($1::uuid[])`, [demoIds]);
  await pg.query(`DELETE FROM ${AUTH_SCHEMA}.users WHERE id = ANY($1::uuid[])`, [demoIds]);

  // Auth users + roles + profiles
  for (const a of DEMO_ACCOUNTS) {
    await pg.query(
      `INSERT INTO ${AUTH_SCHEMA}.users (id, email, password_hash, email_verified, status)
       VALUES ($1, $2, $3, true, 'active')
       ON CONFLICT (id) DO UPDATE SET password_hash = EXCLUDED.password_hash, deleted_at = NULL`,
      [a.id, a.email, passwordHash],
    );
    await pg.query(
      `INSERT INTO ${AUTH_SCHEMA}.user_roles (user_id, role) VALUES ($1, 'USER')
       ON CONFLICT DO NOTHING`,
      [a.id],
    );
    await pg.query(
      `INSERT INTO users.profiles (
         user_id, first_name, last_name, headline, about, industry, location,
         city, state, country, current_position, current_employer,
         expertise_areas, years_experience, onboarding_step, onboarding_completed,
         open_to_opportunities, available_private_events, available_contract_work,
         available_emergency_staffing, role, completeness, cover_url
       ) VALUES (
         $1,$2,$3,$4,$5,'Hospitality',$6,
         $7,$8,'US',$9,$10,
         $11,$12,6,true,
         $13,$14,$15,$16,$17,90,$18
       )
       ON CONFLICT (user_id) DO UPDATE SET
         first_name = EXCLUDED.first_name,
         last_name = EXCLUDED.last_name,
         headline = EXCLUDED.headline,
         about = EXCLUDED.about,
         location = EXCLUDED.location,
         city = EXCLUDED.city,
         state = EXCLUDED.state,
         current_position = EXCLUDED.current_position,
         current_employer = EXCLUDED.current_employer,
         expertise_areas = EXCLUDED.expertise_areas,
         years_experience = EXCLUDED.years_experience,
         onboarding_completed = true,
         open_to_opportunities = EXCLUDED.open_to_opportunities,
         available_private_events = EXCLUDED.available_private_events,
         available_contract_work = EXCLUDED.available_contract_work,
         available_emergency_staffing = EXCLUDED.available_emergency_staffing,
         role = EXCLUDED.role,
         completeness = 90,
         cover_url = EXCLUDED.cover_url,
         deleted_at = NULL,
         updated_at = now()`,
      [
        a.id,
        a.first,
        a.last,
        a.headline,
        a.about,
        `${a.city}, ${a.state}`,
        a.city,
        a.state,
        a.role,
        a.employer,
        a.expertise,
        a.years,
        Boolean(a.open),
        Boolean(a.events),
        Boolean(a.contract),
        Boolean(a.emergency),
        a.role,
        a.cover,
      ],
    );
  }
  console.log(`  ✓ ${DEMO_ACCOUNTS.length} demo accounts`);

  // Connections: ring + cross links + all connected to admin
  const connectionPairs = new Set();
  function addPair(a, b) {
    if (a === b) return;
    const [x, y] = a < b ? [a, b] : [b, a];
    connectionPairs.add(`${x}|${y}`);
  }
  for (let i = 0; i < DEMO_ACCOUNTS.length; i++) {
    addPair(DEMO_ACCOUNTS[i].id, DEMO_ACCOUNTS[(i + 1) % DEMO_ACCOUNTS.length].id);
    addPair(DEMO_ACCOUNTS[i].id, DEMO_ACCOUNTS[(i + 2) % DEMO_ACCOUNTS.length].id);
    addPair(DEMO_ACCOUNTS[i].id, DEMO_ACCOUNTS[(i + 5) % DEMO_ACCOUNTS.length].id);
    if (adminId) addPair(DEMO_ACCOUNTS[i].id, adminId);
  }
  // Extra dense clique among first 8 (kitchen / FOH core)
  for (let i = 0; i < 8; i++) {
    for (let j = i + 1; j < 8; j++) {
      addPair(DEMO_ACCOUNTS[i].id, DEMO_ACCOUNTS[j].id);
    }
  }

  let connCount = 0;
  for (const key of connectionPairs) {
    const [sender, receiver] = key.split('|');
    await pg.query(
      `INSERT INTO connections.connections (sender_id, receiver_id, status)
       VALUES ($1, $2, 'accepted')
       ON CONFLICT (sender_id, receiver_id) DO UPDATE SET status = 'accepted', updated_at = now()`,
      [sender, receiver],
    );
    connCount++;
  }
  // A few pending requests for realism
  await pg.query(
    `INSERT INTO connections.connections (sender_id, receiver_id, status)
     VALUES ($1, $2, 'pending')
     ON CONFLICT (sender_id, receiver_id) DO NOTHING`,
    [DEMO_ACCOUNTS[15].id, DEMO_ACCOUNTS[0].id],
  );
  await pg.query(
    `INSERT INTO connections.connections (sender_id, receiver_id, status)
     VALUES ($1, $2, 'pending')
     ON CONFLICT (sender_id, receiver_id) DO NOTHING`,
    [DEMO_ACCOUNTS[19].id, DEMO_ACCOUNTS[8].id],
  );
  console.log(`  ✓ ${connCount} accepted connections (+ pending)`);

  // Follows (subset)
  for (let i = 0; i < 12; i++) {
    const follower = DEMO_ACCOUNTS[i].id;
    const followee = DEMO_ACCOUNTS[(i + 7) % DEMO_ACCOUNTS.length].id;
    await pg.query(
      `INSERT INTO connections.follows (follower_id, followee_id)
       VALUES ($1, $2) ON CONFLICT DO NOTHING`,
      [follower, followee],
    );
  }

  // Posts
  const postIds = [];
  for (const p of POSTS) {
    const author = DEMO_ACCOUNTS[p.author - 1];
    const created = hoursAgoDate(p.hoursAgo);
    const res = await pg.query(
      `INSERT INTO posts.posts (author_id, content, post_type, visibility, like_count, created_at)
       VALUES ($1, $2, 'text', 'public', 0, $3)
       RETURNING id`,
      [author.id, p.content, created],
    );
    postIds.push({ id: res.rows[0].id, authorId: author.id, created });
  }
  console.log(`  ✓ ${postIds.length} posts`);

  // Likes / reactions
  let likeCount = 0;
  for (let i = 0; i < postIds.length; i++) {
    const post = postIds[i];
    const reactors = DEMO_ACCOUNTS.filter((_, idx) => idx !== POSTS[i].author - 1)
      .sort(() => Math.random() - 0.5)
      .slice(0, 4 + (i % 6));
    for (const r of reactors) {
      const reaction = REACTIONS[(i + r.n) % REACTIONS.length];
      await pg.query(
        `INSERT INTO posts.likes (post_id, user_id, reaction, created_at)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT DO NOTHING`,
        [post.id, r.id, reaction, new Date(post.created.getTime() + 600000)],
      );
      likeCount++;
    }
    if (adminId && i % 2 === 0) {
      await pg.query(
        `INSERT INTO posts.likes (post_id, user_id, reaction, created_at)
         VALUES ($1, $2, 'celebrate', $3)
         ON CONFLICT DO NOTHING`,
        [post.id, adminId, new Date(post.created.getTime() + 900000)],
      );
      likeCount++;
    }
    await pg.query(
      `UPDATE posts.posts SET like_count = (SELECT COUNT(*) FROM posts.likes WHERE post_id = $1) WHERE id = $1`,
      [post.id],
    );
  }
  console.log(`  ✓ ${likeCount} reactions`);

  // Comments (+ a few replies)
  let commentCount = 0;
  for (let i = 0; i < postIds.length; i++) {
    const post = postIds[i];
    const nComments = 1 + (i % 3);
    let parentId = null;
    for (let c = 0; c < nComments; c++) {
      const commenter = DEMO_ACCOUNTS[(i + c + 3) % DEMO_ACCOUNTS.length];
      const res = await pg.query(
        `INSERT INTO posts.comments (post_id, author_id, content, parent_id, created_at)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id`,
        [
          post.id,
          commenter.id,
          COMMENTS[(i + c) % COMMENTS.length],
          c === 2 ? parentId : null,
          new Date(post.created.getTime() + (c + 1) * 1200000),
        ],
      );
      if (c === 0) parentId = res.rows[0].id;
      commentCount++;
    }
  }
  console.log(`  ✓ ${commentCount} comments`);

  // Fan-out home timeline: every demo user + admin sees every demo post
  const viewers = [...demoIds];
  if (adminId) viewers.push(adminId);
  let timelineRows = 0;
  for (const post of postIds) {
    for (const viewer of viewers) {
      await pg.query(
        `INSERT INTO posts.home_timeline (user_id, post_id, author_id, score, created_at)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT DO NOTHING`,
        [
          viewer,
          post.id,
          post.authorId,
          post.created.getTime() / 1000,
          post.created,
        ],
      );
      timelineRows++;
    }
  }
  console.log(`  ✓ ${timelineRows} timeline entries`);

  // Companies + jobs
  for (const co of COMPANIES) {
    await pg.query(
      `INSERT INTO jobs.companies (id, name, industry, website, size)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, industry = EXCLUDED.industry`,
      [co.id, co.name, co.industry, co.website, co.size],
    );
  }
  // Clear previous demo jobs by title+recruiter pattern
  await pg.query(`DELETE FROM jobs.applications WHERE job_id IN (
    SELECT id FROM jobs.jobs WHERE recruiter_id = ANY($1::uuid[])
  )`, [demoIds]);
  await pg.query(`DELETE FROM jobs.saved_jobs WHERE job_id IN (
    SELECT id FROM jobs.jobs WHERE recruiter_id = ANY($1::uuid[])
  )`, [demoIds]);
  await pg.query(`DELETE FROM jobs.jobs WHERE recruiter_id = ANY($1::uuid[])`, [demoIds]);

  for (const job of JOBS) {
    const company = COMPANIES[job.company];
    const recruiter = DEMO_ACCOUNTS[job.recruiter - 1];
    await pg.query(
      `INSERT INTO jobs.jobs (
         company_id, recruiter_id, title, description, location,
         salary_min, salary_max, employment_type, status
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'open')`,
      [
        company.id,
        recruiter.id,
        job.title,
        job.description,
        job.location,
        job.salaryMin,
        job.salaryMax,
        job.employmentType,
      ],
    );
  }
  console.log(`  ✓ ${COMPANIES.length} companies, ${JOBS.length} opportunities`);

  // A few saved jobs + applications for realism
  const openJobs = await pg.query(
    `SELECT id FROM jobs.jobs WHERE recruiter_id = ANY($1::uuid[]) AND status = 'open' LIMIT 10`,
    [demoIds],
  );
  for (let i = 0; i < Math.min(5, openJobs.rows.length); i++) {
    await pg.query(
      `INSERT INTO jobs.saved_jobs (user_id, job_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
      [DEMO_ACCOUNTS[i + 3].id, openJobs.rows[i].id],
    );
    await pg.query(
      `INSERT INTO jobs.applications (job_id, user_id, status)
       VALUES ($1, $2, 'submitted') ON CONFLICT DO NOTHING`,
      [openJobs.rows[i].id, DEMO_ACCOUNTS[i + 6].id],
    );
  }

  // Notifications for admin
  if (adminId) {
    await pg.query(`DELETE FROM notifications.notifications WHERE user_id = $1 AND type LIKE 'demo.%'`, [
      adminId,
    ]);
    await pg.query(
      `INSERT INTO notifications.notifications (user_id, type, payload)
       VALUES
         ($1, 'demo.connection', '{"message":"Maya Chen accepted your connection"}'::jsonb),
         ($1, 'demo.reaction', '{"message":"Jordan Reyes celebrated your post"}'::jsonb),
         ($1, 'demo.comment', '{"message":"Elena Park commented on a post in your network"}'::jsonb)`,
      [adminId],
    );
  }

  await pg.end();

  // Mongo messages
  const mongo = new MongoClient(MONGO_URL);
  await mongo.connect();
  const db = mongo.db('connectpro');

  // Remove prior demo conversations involving demo users
  const existing = await db
    .collection('conversations')
    .find({ participants: { $in: demoIds } })
    .project({ _id: 1 })
    .toArray();
  const existingIds = existing.map((c) => c._id);
  if (existingIds.length) {
    await db.collection('messages').deleteMany({ conversationId: { $in: existingIds } });
    await db.collection('conversations').deleteMany({ _id: { $in: existingIds } });
  }

  let msgCount = 0;
  let convCount = 0;

  async function createThread(userA, userB, messages) {
    const createdAt = hoursAgoDate(48);
    const lastAt = hoursAgoDate(1);
    const convRes = await db.collection('conversations').insertOne({
      type: 'direct',
      participants: [userA, userB],
      title: null,
      lastMessageAt: lastAt,
      createdAt,
      demoSeed: true,
    });
    convCount++;
    let t = createdAt.getTime();
    for (const m of messages) {
      t += 15 * 60 * 1000;
      const senderId = m.from === 'a' ? userA : userB;
      await db.collection('messages').insertOne({
        conversationId: convRes.insertedId,
        senderId,
        body: m.body,
        attachments: [],
        reactions: [],
        readBy: [{ userId: senderId, at: new Date(t) }],
        createdAt: new Date(t),
        demoSeed: true,
      });
      msgCount++;
    }
    await db.collection('conversations').updateOne(
      { _id: convRes.insertedId },
      { $set: { lastMessageAt: new Date(t) } },
    );
  }

  for (const thread of MESSAGE_THREADS) {
    const a = DEMO_ACCOUNTS[thread.a - 1].id;
    const b = DEMO_ACCOUNTS[thread.b - 1].id;
    await createThread(a, b, thread.messages);
  }

  // Admin chats with a few demo people
  if (adminId) {
    await createThread(adminId, DEMO_ACCOUNTS[0].id, [
      { from: 'b', body: 'Hey! Saw you on Brigade — would love to connect about kitchen hiring.' },
      { from: 'a', body: 'Absolutely. Always looking for sharp talent.' },
      { from: 'b', body: 'I\'ll introduce you to Theo (recruiter) as well.' },
    ]);
    await createThread(adminId, DEMO_ACCOUNTS[13].id, [
      { from: 'b', body: 'Hi — I recruit chefs and FOH. Happy to share open roles.' },
      { from: 'a', body: 'Send over anything for sous / CDC in the Northeast.' },
    ]);
    await createThread(adminId, DEMO_ACCOUNTS[5].id, [
      { from: 'b', body: 'Wedding season is booked solid — need banquet captains?' },
      { from: 'a', body: 'Possibly. What markets are you covering?' },
    ]);
  }

  await mongo.close();
  console.log(`  ✓ ${convCount} conversations, ${msgCount} messages`);

  console.log('\nDone. Demo world is live.');
  console.log('\nHow to explore:');
  console.log('  • Log in as administrator (debug) — feed, network, and DMs are populated');
  console.log(`  • Or any demo email above with password: ${DEMO_PASSWORD}`);
  console.log('  • Discover → see all 20 completed profiles');
  console.log('  • Network → accepted connections');
  console.log('  • Feed → posts with #hashtags, reactions, comments');
  console.log('  • Messages → hospitality DMs');
  console.log('  • Opportunities → 10 open roles');
  console.log('\nSample logins:');
  for (const a of DEMO_ACCOUNTS.slice(0, 5)) {
    console.log(`  ${a.email}  (${a.first} ${a.last} · ${a.role})`);
  }
  console.log('  …and 15 more @brigade.demo');
}

main().catch((err) => {
  console.error('\nSeed failed:', err);
  process.exit(1);
});
