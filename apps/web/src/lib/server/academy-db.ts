import { getPool } from "@connectpro/common";
import { ensureAcademySchema } from "@/lib/server/ensure-academy-schema";
import type { ApplicationAnswers } from "@/lib/academy/application-form";

/**
 * Applications, cohorts and enrolment.
 *
 * SQL lives here rather than in the route handlers — `pnpm check:architecture`
 * enforces that, and it is what lets the admin review flow and the applicant's
 * own status page read the same rows through one definition.
 */

export const OPEN_APPLICATION_STATUSES = [
  "draft",
  "submitted",
  "under_review",
  "interview",
] as const;

export const APPLICATION_STATUSES = [
  ...OPEN_APPLICATION_STATUSES,
  "accepted",
  "rejected",
  "waitlisted",
] as const;

export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number];

/** Statuses an admin may set from the review screen. */
export const REVIEWABLE_STATUSES = [
  "under_review",
  "interview",
  "accepted",
  "rejected",
  "waitlisted",
] as const;

export type Application = {
  id: string;
  userId: string;
  cohortId: string | null;
  status: ApplicationStatus;
  answers: ApplicationAnswers;
  yearsExperience: number | null;
  currentPosition: string | null;
  location: string | null;
  referralSource: string | null;
  resumeUrl: string | null;
  portfolioUrl: string | null;
  instagramUrl: string | null;
  adminNotes: string | null;
  reviewedBy: string | null;
  reviewedAt: string | null;
  submittedAt: string | null;
  createdAt: string;
};

export type ApplicationWithApplicant = Application & {
  firstName: string;
  lastName: string;
  email: string | null;
  avatarUrl: string | null;
  cohortName: string | null;
};

export type Cohort = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  startsOn: string;
  endsOn: string;
  capacity: number;
  priceCents: number;
  currency: string;
  status: string;
  enrolledCount: number;
};

function pool() {
  return getPool();
}

function iso(value: unknown): string | null {
  return value instanceof Date ? value.toISOString() : null;
}

function toApplication(row: Record<string, unknown>): Application {
  return {
    id: row.id as string,
    userId: row.user_id as string,
    cohortId: (row.cohort_id as string) ?? null,
    status: row.status as ApplicationStatus,
    answers: (row.answers as ApplicationAnswers) ?? {},
    yearsExperience: (row.years_experience as number) ?? null,
    currentPosition: (row.current_position as string) ?? null,
    location: (row.location as string) ?? null,
    referralSource: (row.referral_source as string) ?? null,
    resumeUrl: (row.resume_url as string) ?? null,
    portfolioUrl: (row.portfolio_url as string) ?? null,
    instagramUrl: (row.instagram_url as string) ?? null,
    adminNotes: (row.admin_notes as string) ?? null,
    reviewedBy: (row.reviewed_by as string) ?? null,
    reviewedAt: iso(row.reviewed_at),
    submittedAt: iso(row.submitted_at),
    createdAt: iso(row.created_at) ?? new Date().toISOString(),
  };
}

/* ------------------------------------------------------------------ */
/* Applicant side                                                      */
/* ------------------------------------------------------------------ */

/** The application this person is currently in, if any. Newest first. */
export async function dbGetMyApplication(userId: string): Promise<Application | null> {
  await ensureAcademySchema();
  const result = await pool().query(
    `SELECT * FROM academy.applications
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT 1`,
    [userId],
  );
  return result.rows.length > 0 ? toApplication(result.rows[0]) : null;
}

/**
 * Create or update this person's open application.
 *
 * `submit` moves it out of draft and stamps submitted_at. Saving without
 * submitting is what makes a fourteen-question form survive a closed tab.
 *
 * A partial unique index allows only one open application per user, so the
 * upsert targets it rather than racing a SELECT-then-INSERT.
 */
export async function dbSaveApplication(params: {
  userId: string;
  answers: ApplicationAnswers;
  resumeUrl?: string | null;
  portfolioUrl?: string | null;
  instagramUrl?: string | null;
  submit: boolean;
}): Promise<Application> {
  await ensureAcademySchema();

  const { answers } = params;
  const years =
    typeof answers.yearsExperience === "number" ? answers.yearsExperience : null;

  const result = await pool().query(
    `INSERT INTO academy.applications
       (user_id, status, answers, years_experience, current_position, location,
        referral_source, resume_url, portfolio_url, instagram_url, submitted_at)
     VALUES ($1, $2, $3::jsonb, $4, $5, $6, $7, $8, $9, $10,
             CASE WHEN $2 = 'draft' THEN NULL ELSE now() END)
     ON CONFLICT (user_id) WHERE status IN ('draft','submitted','under_review','interview')
     DO UPDATE SET
       -- A submitted application is read-only from the applicant's side; only a
       -- draft may be edited, so an late-arriving autosave cannot rewrite
       -- answers an admin is part-way through reading.
       answers          = CASE WHEN applications.status = 'draft'
                               THEN EXCLUDED.answers ELSE applications.answers END,
       years_experience = CASE WHEN applications.status = 'draft'
                               THEN EXCLUDED.years_experience ELSE applications.years_experience END,
       current_position = CASE WHEN applications.status = 'draft'
                               THEN EXCLUDED.current_position ELSE applications.current_position END,
       location         = CASE WHEN applications.status = 'draft'
                               THEN EXCLUDED.location ELSE applications.location END,
       referral_source  = CASE WHEN applications.status = 'draft'
                               THEN EXCLUDED.referral_source ELSE applications.referral_source END,
       resume_url       = CASE WHEN applications.status = 'draft'
                               THEN EXCLUDED.resume_url ELSE applications.resume_url END,
       portfolio_url    = CASE WHEN applications.status = 'draft'
                               THEN EXCLUDED.portfolio_url ELSE applications.portfolio_url END,
       instagram_url    = CASE WHEN applications.status = 'draft'
                               THEN EXCLUDED.instagram_url ELSE applications.instagram_url END,
       status           = CASE WHEN applications.status = 'draft'
                               THEN EXCLUDED.status ELSE applications.status END,
       submitted_at     = COALESCE(applications.submitted_at, EXCLUDED.submitted_at),
       updated_at       = now()
     RETURNING *`,
    [
      params.userId,
      params.submit ? "submitted" : "draft",
      JSON.stringify(answers),
      years,
      (answers.currentPosition as string) ?? null,
      (answers.location as string) ?? null,
      (answers.referralSource as string) ?? null,
      params.resumeUrl ?? null,
      params.portfolioUrl ?? null,
      params.instagramUrl ?? null,
    ],
  );
  return toApplication(result.rows[0]);
}

/**
 * The address to email about an application.
 *
 * Lives in the auth schema, not users.profiles — profiles never held an email,
 * because the account is what owns it.
 */
export async function dbGetUserEmail(userId: string): Promise<string | null> {
  const auth = process.env.AUTH_SCHEMA?.trim() || "connectpro_auth";
  const result = await pool().query(
    `SELECT email FROM ${auth}.users WHERE id = $1 AND deleted_at IS NULL`,
    [userId],
  );
  return (result.rows[0]?.email as string) ?? null;
}

/* ------------------------------------------------------------------ */
/* Admin side                                                          */
/* ------------------------------------------------------------------ */

/** The review queue. Oldest submitted first so nobody waits behind a newer one. */
export async function dbListApplications(params: {
  status?: ApplicationStatus | "open";
  limit?: number;
} = {}): Promise<ApplicationWithApplicant[]> {
  await ensureAcademySchema();
  const limit = Math.min(Math.max(params.limit ?? 100, 1), 500);

  const where: string[] = [];
  const values: unknown[] = [];
  if (params.status === "open") {
    values.push(OPEN_APPLICATION_STATUSES);
    where.push(`a.status = ANY($${values.length}::text[])`);
  } else if (params.status) {
    values.push(params.status);
    where.push(`a.status = $${values.length}`);
  }
  values.push(limit);

  const auth = process.env.AUTH_SCHEMA?.trim() || "connectpro_auth";
  const result = await pool().query(
    `SELECT a.*,
            p.first_name, p.last_name, p.avatar_url,
            u.email,
            c.name AS cohort_name
       FROM academy.applications a
       LEFT JOIN users.profiles p ON p.user_id = a.user_id
       LEFT JOIN ${auth}.users  u ON u.id      = a.user_id
       LEFT JOIN academy.cohorts c ON c.id     = a.cohort_id
      ${where.length > 0 ? `WHERE ${where.join(" AND ")}` : ""}
      ORDER BY a.submitted_at ASC NULLS LAST, a.created_at DESC
      LIMIT $${values.length}`,
    values,
  );

  return result.rows.map((row) => ({
    ...toApplication(row),
    firstName: (row.first_name as string) ?? "",
    lastName: (row.last_name as string) ?? "",
    email: (row.email as string) ?? null,
    avatarUrl: (row.avatar_url as string) ?? null,
    cohortName: (row.cohort_name as string) ?? null,
  }));
}

export async function dbGetApplication(
  id: string,
): Promise<ApplicationWithApplicant | null> {
  await ensureAcademySchema();
  const auth = process.env.AUTH_SCHEMA?.trim() || "connectpro_auth";
  const result = await pool().query(
    `SELECT a.*, p.first_name, p.last_name, p.avatar_url, u.email,
            c.name AS cohort_name
       FROM academy.applications a
       LEFT JOIN users.profiles p ON p.user_id = a.user_id
       LEFT JOIN ${auth}.users  u ON u.id      = a.user_id
       LEFT JOIN academy.cohorts c ON c.id     = a.cohort_id
      WHERE a.id = $1`,
    [id],
  );
  if (result.rows.length === 0) return null;
  const row = result.rows[0];
  return {
    ...toApplication(row),
    firstName: (row.first_name as string) ?? "",
    lastName: (row.last_name as string) ?? "",
    email: (row.email as string) ?? null,
    avatarUrl: (row.avatar_url as string) ?? null,
    cohortName: (row.cohort_name as string) ?? null,
  };
}

/** Counts per status, for the admin queue tabs. */
export async function dbApplicationCounts(): Promise<Record<string, number>> {
  await ensureAcademySchema();
  const result = await pool().query(
    `SELECT status, count(*)::int AS count FROM academy.applications GROUP BY status`,
  );
  const counts: Record<string, number> = {};
  for (const row of result.rows) counts[row.status as string] = row.count as number;
  return counts;
}

/**
 * Record an admin decision, and enrol on acceptance.
 *
 * Acceptance and enrolment happen in one transaction: an application marked
 * accepted with no seat behind it is exactly the state that produces a chef who
 * was told they are in and cannot get into the cohort.
 */
export async function dbReviewApplication(params: {
  applicationId: string;
  status: (typeof REVIEWABLE_STATUSES)[number];
  reviewerId: string | null;
  adminNotes?: string | null;
  cohortId?: string | null;
}): Promise<Application | null> {
  await ensureAcademySchema();
  const client = await pool().connect();
  try {
    await client.query("BEGIN");

    const updated = await client.query(
      `UPDATE academy.applications
          SET status      = $2,
              admin_notes = COALESCE($3, admin_notes),
              cohort_id   = COALESCE($4, cohort_id),
              reviewed_by = $5,
              reviewed_at = now(),
              updated_at  = now()
        WHERE id = $1
        RETURNING *`,
      [
        params.applicationId,
        params.status,
        params.adminNotes ?? null,
        params.cohortId ?? null,
        params.reviewerId,
      ],
    );
    if (updated.rows.length === 0) {
      await client.query("ROLLBACK");
      return null;
    }
    const application = toApplication(updated.rows[0]);

    if (params.status === "accepted" && application.cohortId) {
      const cohort = await client.query(
        `SELECT price_cents, currency FROM academy.cohorts WHERE id = $1`,
        [application.cohortId],
      );
      const price = cohort.rows[0];
      await client.query(
        `INSERT INTO academy.cohort_members
           (cohort_id, user_id, application_id, role, status, price_cents, currency)
         VALUES ($1, $2, $3, 'chef', 'invited', $4, $5)
         ON CONFLICT (cohort_id, user_id) DO NOTHING`,
        [
          application.cohortId,
          application.userId,
          application.id,
          price?.price_cents ?? null,
          price?.currency ?? "usd",
        ],
      );
    }

    await client.query("COMMIT");
    return application;
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    throw error;
  } finally {
    client.release();
  }
}

/* ------------------------------------------------------------------ */
/* Cohorts                                                             */
/* ------------------------------------------------------------------ */

export async function dbListCohorts(): Promise<Cohort[]> {
  await ensureAcademySchema();
  const result = await pool().query(
    `SELECT c.*,
            COALESCE(m.enrolled, 0)::int AS enrolled_count
       FROM academy.cohorts c
       LEFT JOIN (
         SELECT cohort_id, count(*) AS enrolled
           FROM academy.cohort_members
          WHERE status <> 'withdrawn'
          GROUP BY cohort_id
       ) m ON m.cohort_id = c.id
      ORDER BY c.starts_on DESC`,
  );
  return result.rows.map((row) => ({
    id: row.id as string,
    name: row.name as string,
    slug: row.slug as string,
    description: (row.description as string) ?? null,
    startsOn: (row.starts_on as Date).toISOString().slice(0, 10),
    endsOn: (row.ends_on as Date).toISOString().slice(0, 10),
    capacity: row.capacity as number,
    priceCents: row.price_cents as number,
    currency: row.currency as string,
    status: row.status as string,
    enrolledCount: row.enrolled_count as number,
  }));
}

/** Cohorts an admin can place an accepted applicant into. */
export async function dbListPlaceableCohorts(): Promise<Cohort[]> {
  const cohorts = await dbListCohorts();
  return cohorts.filter((cohort) =>
    ["draft", "upcoming", "active"].includes(cohort.status),
  );
}
