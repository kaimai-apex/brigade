import { NextResponse } from "next/server";
import { getConnectProSession } from "@/lib/connectpro/server";
import {
  dbGetProfile,
  dbReplaceExperience,
  dbReplaceWorkPhotos,
  dbUpdateProfile,
  type ExperienceInput,
} from "@/lib/server/profile-db";
import { isSafeAvatarUrl } from "@/lib/avatars";
import { isSafeCoverUrl } from "@/lib/banners";
import { PROFESSIONAL_ROLES } from "@/lib/types/database";

const ROLE_SET = new Set<string>(PROFESSIONAL_ROLES);

function isSafeHttpUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

/** Fields a member may edit from settings — not onboarding completion gates. */
const PROFILE_PUT_ALLOWLIST = new Set([
  "firstName",
  "lastName",
  "headline",
  "about",
  "industry",
  "location",
  "website",
  "avatarUrl",
  "coverUrl",
  "resumeUrl",
  "city",
  "state",
  "country",
  "currentPosition",
  "currentEmployer",
  "instagramUrl",
  "linkedinUrl",
  "yearsExperience",
  "openToOpportunities",
  "availablePrivateEvents",
  "availableContractWork",
  "availableEmergencyStaffing",
  "visibleInDirectory",
  "preferredName",
  "pronouns",
  "timezone",
  "languages",
  "expertiseAreas",
  "role",
  "resumeText",
]);

/** Long enough for a fifteen-year career, short of a denial-of-service. */
const RESUME_TEXT_MAX = 20_000;
const EXPERIENCE_MAX_ROWS = 40;
const GALLERY_MAX_PHOTOS = 24;

const EMPLOYMENT_TYPES = new Set([
  "Restaurant",
  "Private household",
  "Yacht",
  "Events & catering",
  "Hotel & resort",
  "Freelance",
  "Other",
]);

function str(value: unknown, max: number): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, max) : undefined;
}

/** ISO date (YYYY-MM-DD) or a bare month (YYYY-MM), which the form emits. */
function dateish(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  if (/^\d{4}-\d{2}$/.test(trimmed)) return `${trimmed}-01`;
  return /^\d{4}-\d{2}-\d{2}$/.test(trimmed) ? trimmed : undefined;
}

/**
 * Normalise the resume rows the form posts.
 *
 * Rows are replaced wholesale rather than patched, so anything that fails to
 * parse here is silently dropped — hence the explicit per-field coercion: a
 * bad `startDate` must not take the whole job with it.
 */
function parseExperience(value: unknown): ExperienceInput[] | null {
  if (!Array.isArray(value)) return null;
  const rows: ExperienceInput[] = [];
  for (const raw of value.slice(0, EXPERIENCE_MAX_ROWS)) {
    if (!raw || typeof raw !== "object") continue;
    const item = raw as Record<string, unknown>;
    const company = str(item.company, 160);
    if (!company) continue; // the one field a row cannot do without
    const employmentType = str(item.employmentType, 40);
    rows.push({
      company,
      position: str(item.position, 160) ?? "Team Member",
      location: str(item.location, 160),
      startDate: dateish(item.startDate),
      endDate: dateish(item.endDate),
      description: str(item.description, 2_000),
      highlights: str(item.highlights, 2_000),
      employmentType:
        employmentType && EMPLOYMENT_TYPES.has(employmentType)
          ? employmentType
          : undefined,
    });
  }
  return rows;
}

function isSafeUploadUrl(url: string, kind: "image" | "doc"): boolean {
  if (kind === "image") return isSafeAvatarUrl(url);
  if (url.includes("..") || url.includes("//")) return false;
  return (
    /^\/api\/media\/[0-9a-f-]{36}\.(pdf|doc|docx)$/i.test(url) ||
    /^\/uploads\/[0-9a-f-]{36}\/[0-9a-f-]{36}\.(pdf|doc|docx)$/i.test(url)
  );
}

/** Read a profile. Self always; strangers only if visible in the directory. */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getConnectProSession();
  if (!session) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  try {
    const profile = await dbGetProfile(id);
    if (!profile) {
      return NextResponse.json({ message: "Profile not found" }, { status: 404 });
    }
    const self = id === session.userId;
    const visible =
      Boolean((profile as { visibleInDirectory?: boolean }).visibleInDirectory) &&
      Boolean((profile as { onboardingCompleted?: boolean }).onboardingCompleted);
    if (!self && !visible) {
      return NextResponse.json({ message: "Profile not found" }, { status: 404 });
    }
    return NextResponse.json(profile);
  } catch {
    return NextResponse.json({ message: "Could not load profile" }, { status: 500 });
  }
}

/** Update your own profile. Members may only edit themselves. */
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getConnectProSession();
  if (!session) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  if (id !== session.userId) {
    return NextResponse.json(
      { message: "You can only edit your own profile" },
      { status: 403 },
    );
  }

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const patch: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(body)) {
    if (!PROFILE_PUT_ALLOWLIST.has(key) || value === undefined) continue;
    if (key === "avatarUrl") {
      if (typeof value === "string" && value && !isSafeUploadUrl(value, "image")) {
        return NextResponse.json({ message: "Invalid image URL" }, { status: 400 });
      }
    }
    if (key === "coverUrl") {
      if (typeof value === "string" && value && !isSafeCoverUrl(value)) {
        return NextResponse.json({ message: "Invalid cover URL" }, { status: 400 });
      }
    }
    if (key === "resumeUrl") {
      if (typeof value === "string" && value && !isSafeUploadUrl(value, "doc")) {
        return NextResponse.json({ message: "Invalid resume URL" }, { status: 400 });
      }
    }
    if (key === "website" || key === "instagramUrl" || key === "linkedinUrl") {
      if (typeof value === "string" && value && !isSafeHttpUrl(value)) {
        return NextResponse.json({ message: "Invalid URL" }, { status: 400 });
      }
    }
    if (key === "role") {
      if (typeof value === "string" && value && !ROLE_SET.has(value)) {
        return NextResponse.json({ message: "Invalid role" }, { status: 400 });
      }
    }
    if (key === "resumeText") {
      if (typeof value !== "string") continue;
      if (value.length > RESUME_TEXT_MAX) {
        return NextResponse.json(
          { message: "Resume is too long (max 20,000 characters)" },
          { status: 400 },
        );
      }
      patch[key] = value.trim();
      continue;
    }
    patch[key] = value;
  }

  // Sub-resources are replace-wholesale collections rather than scalar columns,
  // so they travel beside the patch instead of inside it.
  const experience = parseExperience(body.experience);

  let workPhotos: string[] | null = null;
  if (Array.isArray(body.workPhotos)) {
    const urls = body.workPhotos
      .slice(0, GALLERY_MAX_PHOTOS)
      .filter((url): url is string => typeof url === "string" && url.length > 0);
    // Same rule as the avatar: a gallery URL must be an image this app
    // re-encoded itself, never an arbitrary http(s) string from the client.
    if (!urls.every((url) => isSafeUploadUrl(url, "image"))) {
      return NextResponse.json({ message: "Invalid gallery image" }, { status: 400 });
    }
    workPhotos = urls;
  }

  try {
    const updated = await dbUpdateProfile(id, patch);
    if (experience) await dbReplaceExperience(id, experience);
    if (workPhotos) await dbReplaceWorkPhotos(id, workPhotos);
    // Re-read only when a sub-resource changed — dbUpdateProfile already
    // returned a fresh profile otherwise.
    if (experience || workPhotos) {
      return NextResponse.json(await dbGetProfile(id));
    }
    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ message: "Could not save profile" }, { status: 500 });
  }
}
