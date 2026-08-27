import { NextResponse } from "next/server";
import { getConnectProSession } from "@/lib/connectpro/server";
import {
  validateAnswers,
  type ApplicationAnswers,
} from "@/lib/academy/application-form";
import { sendApplicationEmail } from "@/lib/academy/send-application-email";
import {
  dbGetMyApplication,
  dbGetUserEmail,
  dbSaveApplication,
} from "@/lib/server/academy-db";

/**
 * Save or submit the current user's application.
 *
 * One endpoint for both because the form autosaves as it is filled in — a
 * fourteen-question application that loses everything to a closed tab does not
 * get finished. `submit: true` is the only thing that makes it real.
 */

function isSafeHttpUrl(value: string): boolean {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

/** Same-origin document upload, as written by /api/media/upload. */
function isStoredResumeUrl(value: string): boolean {
  if (value.includes("..") || value.includes("//")) return false;
  return /^\/api\/media\/[0-9a-f-]{36}\.(pdf|doc|docx)$/i.test(value);
}

export async function GET() {
  const session = await getConnectProSession();
  if (!session) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }
  const application = await dbGetMyApplication(session.userId).catch(() => null);
  return NextResponse.json({ application });
}

export async function POST(request: Request) {
  const session = await getConnectProSession();
  if (!session) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const submit = body.submit === true;
  const rawAnswers =
    body.answers && typeof body.answers === "object"
      ? (body.answers as Record<string, unknown>)
      : {};

  // A draft is allowed to be incomplete — that is what makes it a draft.
  // Everything is checked properly on submit.
  const validated = validateAnswers(rawAnswers);
  if (submit && !validated.ok) {
    return NextResponse.json(
      { message: "Some answers are missing.", invalid: validated.invalid },
      { status: 400 },
    );
  }
  let answers: ApplicationAnswers;
  if (validated.ok) {
    answers = validated.answers;
  } else {
    // Draft: keep whatever is legibly a string/number, drop the rest.
    answers = {};
    for (const [key, value] of Object.entries(rawAnswers)) {
      if (typeof value === "string" || typeof value === "number") {
        answers[key] = value;
      }
    }
  }

  const resumeUrl = typeof body.resumeUrl === "string" ? body.resumeUrl.trim() : "";
  const portfolioUrl =
    typeof body.portfolioUrl === "string" ? body.portfolioUrl.trim() : "";
  const instagramUrl =
    typeof body.instagramUrl === "string" ? body.instagramUrl.trim() : "";

  if (resumeUrl && !isStoredResumeUrl(resumeUrl)) {
    return NextResponse.json({ message: "Invalid resume" }, { status: 400 });
  }
  for (const link of [portfolioUrl, instagramUrl]) {
    if (link && !isSafeHttpUrl(link)) {
      return NextResponse.json({ message: "Invalid link" }, { status: 400 });
    }
  }

  try {
    const existing = await dbGetMyApplication(session.userId);
    // Submitting twice must not re-send the confirmation or reset the clock.
    const alreadySubmitted = Boolean(existing && existing.status !== "draft");

    const application = await dbSaveApplication({
      userId: session.userId,
      answers,
      resumeUrl: resumeUrl || null,
      portfolioUrl: portfolioUrl || null,
      instagramUrl: instagramUrl || null,
      submit,
    });

    if (submit && !alreadySubmitted) {
      const email = await dbGetUserEmail(session.userId).catch(() => null);
      if (email) await sendApplicationEmail({ to: email, kind: "submitted" });
    }

    return NextResponse.json({ application });
  } catch (error) {
    console.error("[applications] could not save", error);
    return NextResponse.json(
      { message: "Could not save your application." },
      { status: 500 },
    );
  }
}
