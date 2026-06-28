import "server-only";
import { promises as fs } from "fs";
import path from "path";
import os from "os";
import type { Inquiry, InquiryStatus, WaitlistEntry } from "./types";
import {
  SEED_CHEFS,
  SEED_INQUIRIES,
  SEED_WAITLIST,
} from "./seed";

// ---------------------------------------------------------------------------
// Local persistence layer. This is the ONE module that knows where data lives.
// docs/05 prescribes Postgres (Supabase). To keep the MVP runnable with zero
// external services, mutable state (inquiries, waitlist, chef approvals) is
// kept in memory and best-effort-persisted to a JSON file. Swapping to Postgres
// = reimplement this file. Seed chef profiles are read-only reference data.
//
// Deploy note: serverless filesystems (e.g. Vercel) are read-only except the OS
// temp dir, and instances are ephemeral. So we (a) write under tmp when on a
// serverless host, (b) treat the file write as best-effort, and (c) hold an
// in-memory cache that is the real source of truth for a running instance.
// Mutations therefore work for a demo session but are NOT durable across
// deploys/instances — that's what the real database is for.
// ---------------------------------------------------------------------------

const IS_SERVERLESS = !!process.env.VERCEL || !!process.env.AWS_REGION;
const DATA_DIR = IS_SERVERLESS
  ? path.join(os.tmpdir(), "brigade-data")
  : path.join(process.cwd(), ".data");
const STORE_FILE = path.join(DATA_DIR, "store.json");

interface PersistedState {
  inquiries: Inquiry[];
  waitlist: WaitlistEntry[];
  approvals: Record<string, boolean>; // chefSlug -> approved override
}

function seedState(): PersistedState {
  return {
    inquiries: structuredClone(SEED_INQUIRIES),
    waitlist: structuredClone(SEED_WAITLIST),
    approvals: {},
  };
}

// In-memory source of truth for the running instance.
let cache: PersistedState | null = null;

async function load(): Promise<PersistedState> {
  if (cache) return cache;
  try {
    const raw = await fs.readFile(STORE_FILE, "utf8");
    const parsed = JSON.parse(raw) as PersistedState;
    cache = {
      inquiries: parsed.inquiries ?? [],
      waitlist: parsed.waitlist ?? [],
      approvals: parsed.approvals ?? {},
    };
  } catch {
    cache = seedState();
    await save(cache);
  }
  return cache;
}

async function save(state: PersistedState): Promise<void> {
  cache = state; // memory is authoritative even if the disk write fails
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
    await fs.writeFile(STORE_FILE, JSON.stringify(state, null, 2), "utf8");
  } catch {
    // read-only FS (serverless) — fine, the in-memory cache still serves reads.
  }
}

// ---- Chefs (seed + approval overrides) ----

function applyApprovals(approvals: Record<string, boolean>) {
  return SEED_CHEFS.map((c) =>
    c.slug in approvals ? { ...c, approved: approvals[c.slug] } : c,
  );
}

export async function getAllChefs() {
  const { approvals } = await load();
  return applyApprovals(approvals);
}

/** Chefs live in the public directory (approved only). */
export async function getLiveChefs() {
  return (await getAllChefs()).filter((c) => c.approved);
}

export async function getChefBySlug(slug: string) {
  return (await getAllChefs()).find((c) => c.slug === slug) ?? null;
}

export async function getPendingChefs() {
  return (await getAllChefs()).filter((c) => !c.approved);
}

export async function setChefApproval(slug: string, approved: boolean) {
  const state = await load();
  state.approvals[slug] = approved;
  await save(state);
}

// ---- Inquiries ----

export async function getInquiries() {
  return (await load()).inquiries;
}

export async function getInquiriesForChef(slug: string) {
  return (await getInquiries())
    .filter((i) => i.chefSlug === slug)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function createInquiry(
  input: Omit<Inquiry, "id" | "createdAt" | "status">,
): Promise<Inquiry> {
  const state = await load();
  const inquiry: Inquiry = {
    ...input,
    id: `i-${Date.now()}`,
    status: "new",
    createdAt: new Date().toISOString(),
  };
  state.inquiries.push(inquiry);
  await save(state);
  return inquiry;
}

export async function updateInquiryStatus(id: string, status: InquiryStatus) {
  const state = await load();
  const inquiry = state.inquiries.find((i) => i.id === id);
  if (inquiry) {
    inquiry.status = status;
    await save(state);
  }
}

// ---- Waitlist ----

export async function getWaitlist() {
  return (await load()).waitlist;
}

export async function addWaitlist(
  input: Omit<WaitlistEntry, "id" | "createdAt">,
): Promise<WaitlistEntry> {
  const state = await load();
  const entry: WaitlistEntry = {
    ...input,
    id: `w-${Date.now()}`,
    createdAt: new Date().toISOString(),
  };
  state.waitlist.push(entry);
  await save(state);
  return entry;
}
