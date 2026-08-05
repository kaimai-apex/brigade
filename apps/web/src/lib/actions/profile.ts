"use server";

import { getConnectProSession } from "@/lib/connectpro/server";
import type { FullProfile } from "@/lib/types/database";
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
} from "@/lib/server/profile-db";

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

/**
 * The six-step profile wizard's server actions are gone with its pages.
 *
 * They each wrote a slice of the profile and redirected to the next step —
 * basic info, experience, education, portfolio, availability, review. Those
 * routes no longer exist: onboarding is the one flow at /onboarding, which
 * saves each answer as it is given through /api/onboarding, and the deeper
 * profile fields are edited at /settings/profile.
 */

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
