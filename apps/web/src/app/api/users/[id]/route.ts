import { NextResponse } from "next/server";
import { getConnectProSession } from "@/lib/connectpro/server";
import { dbGetProfile, dbUpdateProfile } from "@/lib/server/profile-db";
import { isSafeAvatarUrl } from "@/lib/avatars";

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
]);

function isSafeUploadUrl(url: string, kind: "image" | "doc"): boolean {
  if (kind === "image") return isSafeAvatarUrl(url);
  return (
    url.startsWith("/uploads/") &&
    !url.includes("..") &&
    !url.includes("//") &&
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
    if (key === "avatarUrl" || key === "coverUrl") {
      if (typeof value === "string" && value && !isSafeUploadUrl(value, "image")) {
        return NextResponse.json({ message: "Invalid image URL" }, { status: 400 });
      }
    }
    if (key === "resumeUrl") {
      if (typeof value === "string" && value && !isSafeUploadUrl(value, "doc")) {
        return NextResponse.json({ message: "Invalid resume URL" }, { status: 400 });
      }
    }
    patch[key] = value;
  }

  try {
    const updated = await dbUpdateProfile(id, patch);
    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ message: "Could not save profile" }, { status: 500 });
  }
}
