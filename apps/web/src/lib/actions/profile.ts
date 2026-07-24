"use server";

import {
  getConnectProSession,
  requireConnectProSession,
} from "@/lib/connectpro/server";
import type { FullProfile, OnboardingSlug, Profile } from "@/lib/types/database";
import {
  mapDirectoryRow,
  type DirectoryFacets,
  type DirectoryParams,
  type DirectoryResult,
} from "@/lib/directory/params";
import {
  dbGetProfile,
  dbListDirectory,
  dbListSavedMemberIds,
  dbReplaceEducation,
  dbReplaceExperience,
  dbReplacePortfolioLinks,
  dbReplaceWorkPhotos,
  dbUpdateProfile,
} from "@/lib/server/profile-db";
import { normalizeInstagramUrl, normalizeWebsiteUrl } from "@/lib/profile/links";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";

const STEP_INDEX: Record<OnboardingSlug, number> = {
  "basic-info": 0,
  experience: 1,
  education: 2,
  portfolio: 3,
  availability: 4,
  review: 5,
};

async function requireUserId() {
  try {
    const session = await requireConnectProSession();
    return session.userId;
  } catch {
    redirect("/waitlist");
  }
}

type ConnectProProfile = FullProfile & {
  userId: string;
  firstName?: string;
  lastName?: string;
  about?: string;
  avatarUrl?: string;
  profileImageUrl?: string;
  portfolioLinks?: { id: string; type: string; url: string }[];
  workPhotos?: { id: string; imageUrl: string; sortOrder: number }[];
};

function mapProfile(raw: Record<string, unknown>): FullProfile {
  const portfolioLinks = (raw.portfolioLinks as ConnectProProfile["portfolioLinks"]) ?? [];
  const workPhotos = (raw.workPhotos as ConnectProProfile["workPhotos"]) ?? [];
  const experience = (raw.experience as FullProfile["experiences"]) ?? [];
  const education = (raw.education as FullProfile["education"]) ?? [];

  return {
    id: String(raw.userId ?? raw.id),
    first_name: String(raw.firstName ?? ""),
    last_name: String(raw.lastName ?? ""),
    headline: (raw.headline as string) ?? null,
    bio: (raw.about as string) ?? null,
    current_position: (raw.currentPosition as string) ?? null,
    current_employer: (raw.currentEmployer as string) ?? null,
    city: (raw.city as string) ?? null,
    state: (raw.state as string) ?? null,
    country: (raw.country as string) ?? null,
    profile_image_url: (raw.avatarUrl as string) ?? (raw.profileImageUrl as string) ?? null,
    instagram_url: (raw.instagramUrl as string) ?? null,
    website_url: (raw.website as string) ?? (raw.websiteUrl as string) ?? null,
    linkedin_url: (raw.linkedinUrl as string) ?? null,
    resume_url: (raw.resumeUrl as string) ?? null,
    expertise_areas: (raw.expertiseAreas as string[]) ?? [],
    years_experience: (raw.yearsExperience as number) ?? null,
    onboarding_step: (raw.onboardingStep as number) ?? 0,
    onboarding_completed: Boolean(raw.onboardingCompleted),
    open_to_opportunities: Boolean(raw.openToOpportunities),
    available_private_events: Boolean(raw.availablePrivateEvents),
    available_contract_work: Boolean(raw.availableContractWork),
    available_emergency_staffing: Boolean(raw.availableEmergencyStaffing),
    cover_url: (raw.coverUrl as string) ?? null,
    role: (raw.role as string) ?? "Chef",
    created_at: String(raw.createdAt ?? new Date().toISOString()),
    updated_at: String(raw.updatedAt ?? new Date().toISOString()),
    education: education.map((e) => ({
      ...e,
      school_name: (e as { school?: string }).school ?? (e as { school_name?: string }).school_name,
      program_name: (e as { field?: string }).field ?? (e as { program_name?: string }).program_name,
      start_date: (e as { startDate?: string }).startDate ?? e.start_date,
      end_date: (e as { endDate?: string }).endDate ?? e.end_date,
    })) as FullProfile["education"],
    experiences: experience.map((e) => ({
      id: (e as { id?: string }).id ?? "",
      user_id: String(raw.userId ?? raw.id),
      company_name: (e as { company?: string }).company ?? "",
      position_title: (e as { position?: string }).position ?? "",
      is_current: !(e as { endDate?: string }).endDate,
      start_date: (e as { startDate?: string }).startDate ?? null,
      end_date: (e as { endDate?: string }).endDate ?? null,
      description: (e as { description?: string }).description ?? null,
      created_at: new Date().toISOString(),
    })),
    accolades: [],
    portfolio_links: portfolioLinks.map((l) => ({
      id: l.id,
      user_id: String(raw.userId ?? raw.id),
      type: l.type,
      url: l.url,
      created_at: new Date().toISOString(),
    })),
    work_photos: workPhotos.map((p) => ({
      id: p.id,
      user_id: String(raw.userId ?? raw.id),
      image_url: p.imageUrl,
      sort_order: p.sortOrder,
      caption: null,
      created_at: new Date().toISOString(),
    })),
  };
}

export async function saveBasicInfo(formData: FormData) {
  const userId = await requireUserId();
  const city = formData.get("city")?.toString() || "";
  const state = formData.get("state")?.toString() || "";
  const country = formData.get("country")?.toString() || "";

  await dbUpdateProfile(userId, {
    firstName: formData.get("first_name")?.toString() || "",
    lastName: formData.get("last_name")?.toString() || "",
    headline: formData.get("headline")?.toString() || "",
    about: formData.get("bio")?.toString() || "",
    currentPosition: formData.get("current_position")?.toString() || "",
    role: formData.get("role")?.toString() || "Hospitality Professional",
    city,
    state,
    country,
    location: [city, state, country].filter(Boolean).join(", "),
    avatarUrl: formData.get("profile_image_url")?.toString() || undefined,
    coverUrl: formData.get("cover_url")?.toString() || undefined,
    onboardingStep: STEP_INDEX.experience,
  });

  redirect("/onboarding/experience");
}

export async function saveExperience(formData: FormData) {
  const userId = await requireUserId();
  const expertiseRaw = formData.getAll("expertise_areas").map(String);
  const yearsRaw = formData.get("years_experience")?.toString();
  const years = yearsRaw ? parseInt(yearsRaw, 10) : undefined;

  const previousEmployers = formData.getAll("previous_employer").map(String).filter(Boolean);
  const previousPositions = formData.getAll("previous_position").map(String);
  const items = previousEmployers.map((company, index) => ({
    company,
    position: previousPositions[index] || "Team Member",
    startDate: "2020-01-01",
  }));

  const currentEmployer = formData.get("current_employer")?.toString();
  const currentPosition = formData.get("current_position")?.toString();
  if (currentEmployer && currentPosition) {
    items.unshift({
      company: currentEmployer,
      position: currentPosition,
      startDate: new Date().toISOString().slice(0, 10),
    });
  }

  await dbUpdateProfile(userId, {
    yearsExperience: years,
    currentEmployer: currentEmployer || undefined,
    currentPosition: currentPosition || undefined,
    expertiseAreas: expertiseRaw,
    onboardingStep: STEP_INDEX.education,
  });

  await dbReplaceExperience(userId, items);

  redirect("/onboarding/education");
}

export async function saveEducation(formData: FormData) {
  const userId = await requireUserId();
  const schools = formData.getAll("school_name").map(String).filter(Boolean);
  const programs = formData.getAll("program_name").map(String);
  const startDates = formData.getAll("start_date").map(String);
  const endDates = formData.getAll("end_date").map(String);

  const items = schools.map((school, index) => ({
    school,
    field: programs[index] || undefined,
    startDate: startDates[index] || undefined,
    endDate: endDates[index] || undefined,
  }));

  await dbReplaceEducation(userId, items);
  await dbUpdateProfile(userId, { onboardingStep: STEP_INDEX.portfolio });

  redirect("/onboarding/portfolio");
}

export async function savePortfolio(formData: FormData) {
  const userId = await requireUserId();

  await dbUpdateProfile(userId, {
    instagramUrl: normalizeInstagramUrl(formData.get("instagram_url")?.toString() || "") || undefined,
    website: normalizeWebsiteUrl(formData.get("website_url")?.toString() || "") || undefined,
    linkedinUrl: normalizeWebsiteUrl(formData.get("linkedin_url")?.toString() || "") || undefined,
    resumeUrl: formData.get("resume_url")?.toString() || undefined,
    onboardingStep: STEP_INDEX.availability,
  });

  const types = formData.getAll("link_type").map(String);
  const urls = formData.getAll("link_url").map(String);
  const links = types
    .map((type, index) => ({
      type,
      url: normalizeWebsiteUrl(urls[index]?.trim() || ""),
    }))
    .filter((row) => row.url);

  await dbReplacePortfolioLinks(userId, links);

  const photoUrls = formData.getAll("work_photo_url").map(String).filter(Boolean).slice(0, 5);
  await dbReplaceWorkPhotos(userId, photoUrls);

  redirect("/onboarding/availability");
}

export async function saveAvailability(formData: FormData) {
  const userId = await requireUserId();

  await dbUpdateProfile(userId, {
    openToOpportunities: formData.get("open_to_opportunities") === "on",
    availablePrivateEvents: formData.get("available_private_events") === "on",
    availableContractWork: formData.get("available_contract_work") === "on",
    availableEmergencyStaffing: formData.get("available_emergency_staffing") === "on",
    onboardingStep: STEP_INDEX.review,
  });

  redirect("/onboarding/review");
}

export async function completeOnboarding() {
  const userId = await requireUserId();

  await dbUpdateProfile(userId, {
    onboardingCompleted: true,
    onboardingStep: STEP_INDEX.review,
  });

  revalidatePath(`/profile/${userId}`);
  revalidatePath("/directory");
  redirect(`/profile/${userId}`);
}

export async function signOut() {
  const cookieStore = await cookies();
  const refreshToken = cookieStore.get("connectpro_refresh_token")?.value;
  if (refreshToken) {
    await fetch(`${process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3100"}/api/auth/logout`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    }).catch(() => null);
  }
  redirect("/");
}

export async function getDiscoverProfiles(): Promise<Profile[]> {
  return getDirectoryProfiles();
}

const EMPTY_FACETS: DirectoryFacets = { roles: [], cities: [], expertise: [] };

/** Authenticated, filtered, paginated directory with facet counts. */
export async function getDirectory(
  params: DirectoryParams = {},
): Promise<DirectoryResult> {
  const empty: DirectoryResult = {
    profiles: [],
    total: 0,
    limit: params.limit ?? 24,
    offset: params.offset ?? 0,
    facets: EMPTY_FACETS,
  };
  try {
    const session = await getConnectProSession();
    if (!session) return empty;

    const json = await dbListDirectory(params);

    return {
      profiles: (json.data ?? []).map((row) =>
        mapDirectoryRow(row as Record<string, unknown>),
      ),
      total: json.total ?? json.data.length,
      limit: json.limit ?? params.limit ?? 24,
      offset: json.offset ?? params.offset ?? 0,
      facets: (json.facets as DirectoryFacets) ?? EMPTY_FACETS,
    };
  } catch {
    return empty;
  }
}

/** Authenticated directory only — no public unauthenticated listing. */
export async function getDirectoryProfiles(
  params: DirectoryParams = {},
): Promise<Profile[]> {
  const { profiles } = await getDirectory(params);
  return profiles;
}

/** Member ids the current user has saved to their shortlist. */
export async function getSavedMemberIds(): Promise<string[]> {
  try {
    const session = await getConnectProSession();
    if (!session) return [];
    return await dbListSavedMemberIds(session.userId);
  } catch {
    return [];
  }
}

export async function getFullProfile(userId: string): Promise<FullProfile | null> {
  try {
    const raw = await dbGetProfile(userId);
    if (!raw) return null;
    return mapProfile(raw as Record<string, unknown>);
  } catch {
    return null;
  }
}

export async function getCurrentUserProfile(): Promise<FullProfile | null> {
  const session = await getConnectProSession();
  if (!session) return null;
  try {
    const raw = await dbGetProfile(session.userId);
    if (!raw) return null;
    return mapProfile(raw as Record<string, unknown>);
  } catch {
    return null;
  }
}
