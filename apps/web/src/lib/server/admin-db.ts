import { getPool } from "@connectpro/common";

/**
 * Read-only numbers for the admin console.
 *
 * Every figure here is counted from the tables that own it rather than kept in
 * a rollup, because at Brigade's size the counts are milliseconds and a stale
 * dashboard is worse than a slow one. Each block is independently
 * fault-tolerant: a schema that has not been migrated yet (mentorship, waitlist)
 * returns zeros instead of taking the whole page down, so the console still
 * loads on a fresh database.
 */

export type AdminOverview = {
  members: {
    total: number;
    onboarded: number;
    visible: number;
    withPhoto: number;
    newLast7: number;
    newLast30: number;
  };
  mentors: { total: number; active: number; paused: number; draft: number; payoutsEnabled: number };
  bookings: {
    total: number;
    confirmed: number;
    completed: number;
    cancelled: number;
    pendingPayment: number;
    upcoming: number;
  };
  revenue: { grossCents: number; platformFeeCents: number; payoutCents: number; refundedCents: number };
  waitlist: { total: number; newLast7: number };
  journal: { total: number; newLast7: number };
  applications: {
    total: number;
    open: number;
    accepted: number;
    newLast7: number;
  };
  cohorts: { total: number; active: number; enrolled: number };
};

export type AdminMemberRow = {
  userId: string;
  firstName: string;
  lastName: string;
  role: string | null;
  city: string | null;
  onboardingCompleted: boolean;
  visibleInDirectory: boolean;
  mentorStatus: string | null;
  createdAt: string;
};

const ZERO_MENTORS = { total: 0, active: 0, paused: 0, draft: 0, payoutsEnabled: 0 };
const ZERO_BOOKINGS = {
  total: 0,
  confirmed: 0,
  completed: 0,
  cancelled: 0,
  pendingPayment: 0,
  upcoming: 0,
};
const ZERO_REVENUE = {
  grossCents: 0,
  platformFeeCents: 0,
  payoutCents: 0,
  refundedCents: 0,
};
const ZERO_APPLICATIONS = { total: 0, open: 0, accepted: 0, newLast7: 0 };
const ZERO_COHORTS = { total: 0, active: 0, enrolled: 0 };

function num(value: unknown): number {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

export async function dbAdminOverview(): Promise<AdminOverview> {
  const pool = getPool();

  const [members, mentors, bookings, revenue, waitlist, journal, applications, cohorts] =
    await Promise.all([
    pool.query(
      `SELECT
         count(*)::int AS total,
         count(*) FILTER (WHERE onboarding_completed)::int AS onboarded,
         count(*) FILTER (WHERE visible_in_directory)::int AS visible,
         count(*) FILTER (WHERE avatar_url IS NOT NULL AND avatar_url <> '')::int AS with_photo,
         count(*) FILTER (WHERE created_at >= now() - interval '7 days')::int  AS new_last_7,
         count(*) FILTER (WHERE created_at >= now() - interval '30 days')::int AS new_last_30
       FROM users.profiles
       WHERE deleted_at IS NULL`,
    ),
    pool
      .query(
        `SELECT
           count(*)::int AS total,
           count(*) FILTER (WHERE status = 'active')::int AS active,
           count(*) FILTER (WHERE status = 'paused')::int AS paused,
           count(*) FILTER (WHERE status = 'draft')::int  AS draft,
           count(*) FILTER (WHERE payouts_enabled)::int   AS payouts_enabled
         FROM mentorship.mentors`,
      )
      .catch(() => null),
    pool
      .query(
        `SELECT
           count(*)::int AS total,
           count(*) FILTER (WHERE status = 'confirmed')::int       AS confirmed,
           count(*) FILTER (WHERE status = 'completed')::int       AS completed,
           count(*) FILTER (WHERE status = 'cancelled')::int       AS cancelled,
           count(*) FILTER (WHERE status = 'pending_payment')::int AS pending_payment,
           count(*) FILTER (WHERE status = 'confirmed' AND starts_at > now())::int AS upcoming
         FROM mentorship.bookings`,
      )
      .catch(() => null),
    pool
      .query(
        // Money that actually settled. `paid_at IS NOT NULL` rather than a
        // status filter: a cancelled booking that was paid and only partly
        // refunded still moved real money and must appear here.
        `SELECT
           COALESCE(sum(price_cents), 0)::bigint         AS gross_cents,
           COALESCE(sum(platform_fee_cents), 0)::bigint  AS platform_fee_cents,
           COALESCE(sum(mentor_payout_cents), 0)::bigint AS payout_cents,
           COALESCE(sum(refunded_cents), 0)::bigint      AS refunded_cents
         FROM mentorship.bookings
         WHERE paid_at IS NOT NULL`,
      )
      .catch(() => null),
    pool
      .query(
        `SELECT
           count(*)::int AS total,
           count(*) FILTER (WHERE created_at >= now() - interval '7 days')::int AS new_last_7
         FROM public.waitlist_signups`,
      )
      .catch(() => null),
    pool
      .query(
        `SELECT
           count(*)::int AS total,
           count(*) FILTER (WHERE created_at >= now() - interval '7 days')::int AS new_last_7
         FROM public.journal_subscribers`,
      )
      .catch(() => null),
    pool
      .query(
        `SELECT
           count(*)::int AS total,
           count(*) FILTER (
             WHERE status IN ('draft','submitted','under_review','interview')
           )::int AS open,
           count(*) FILTER (WHERE status = 'accepted')::int AS accepted,
           count(*) FILTER (WHERE created_at >= now() - interval '7 days')::int AS new_last_7
         FROM academy.applications`,
      )
      .catch(() => null),
    pool
      .query(
        `SELECT
           (SELECT count(*) FROM academy.cohorts)::int AS total,
           (SELECT count(*) FROM academy.cohorts WHERE status = 'active')::int AS active,
           (SELECT count(*) FROM academy.cohort_members
             WHERE status <> 'withdrawn')::int AS enrolled`,
      )
      .catch(() => null),
  ]);

  const m = members.rows[0] ?? {};
  const mt = mentors?.rows[0];
  const bk = bookings?.rows[0];
  const rv = revenue?.rows[0];
  const wl = waitlist?.rows[0];
  const jn = journal?.rows[0];
  const ap = applications?.rows[0];
  const co = cohorts?.rows[0];

  return {
    members: {
      total: num(m.total),
      onboarded: num(m.onboarded),
      visible: num(m.visible),
      withPhoto: num(m.with_photo),
      newLast7: num(m.new_last_7),
      newLast30: num(m.new_last_30),
    },
    mentors: mt
      ? {
          total: num(mt.total),
          active: num(mt.active),
          paused: num(mt.paused),
          draft: num(mt.draft),
          payoutsEnabled: num(mt.payouts_enabled),
        }
      : ZERO_MENTORS,
    bookings: bk
      ? {
          total: num(bk.total),
          confirmed: num(bk.confirmed),
          completed: num(bk.completed),
          cancelled: num(bk.cancelled),
          pendingPayment: num(bk.pending_payment),
          upcoming: num(bk.upcoming),
        }
      : ZERO_BOOKINGS,
    revenue: rv
      ? {
          grossCents: num(rv.gross_cents),
          platformFeeCents: num(rv.platform_fee_cents),
          payoutCents: num(rv.payout_cents),
          refundedCents: num(rv.refunded_cents),
        }
      : ZERO_REVENUE,
    waitlist: wl
      ? { total: num(wl.total), newLast7: num(wl.new_last_7) }
      : { total: 0, newLast7: 0 },
    journal: jn
      ? { total: num(jn.total), newLast7: num(jn.new_last_7) }
      : { total: 0, newLast7: 0 },
    applications: ap
      ? {
          total: num(ap.total),
          open: num(ap.open),
          accepted: num(ap.accepted),
          newLast7: num(ap.new_last_7),
        }
      : ZERO_APPLICATIONS,
    cohorts: co
      ? { total: num(co.total), active: num(co.active), enrolled: num(co.enrolled) }
      : ZERO_COHORTS,
  };
}

/** Most recently joined members, with whether they mentor here. */
export async function dbAdminRecentMembers(limit = 25): Promise<AdminMemberRow[]> {
  const capped = Math.min(Math.max(limit, 1), 100);
  const result = await getPool().query(
    `SELECT p.user_id, p.first_name, p.last_name, p.role, p.city,
            p.onboarding_completed, p.visible_in_directory, p.created_at,
            m.status AS mentor_status
       FROM users.profiles p
       LEFT JOIN mentorship.mentors m ON m.user_id = p.user_id
      WHERE p.deleted_at IS NULL
      ORDER BY p.created_at DESC
      LIMIT $1`,
    [capped],
  );

  return result.rows.map((row) => ({
    userId: row.user_id as string,
    firstName: (row.first_name as string) ?? "",
    lastName: (row.last_name as string) ?? "",
    role: (row.role as string) ?? null,
    city: (row.city as string) ?? null,
    onboardingCompleted: Boolean(row.onboarding_completed),
    visibleInDirectory: Boolean(row.visible_in_directory),
    mentorStatus: (row.mentor_status as string) ?? null,
    createdAt: (row.created_at as Date).toISOString(),
  }));
}

export type AdminJournalSubscriber = {
  email: string;
  articleSlug: string | null;
  createdAt: string;
};

export type AdminWaitlistRow = {
  email: string;
  name: string;
  source: string | null;
  createdAt: string;
};

export async function dbListJournalSubscribers(
  limit = 2000,
): Promise<AdminJournalSubscriber[]> {
  const capped = Math.min(Math.max(limit, 1), 5000);
  try {
    const result = await getPool().query(
      `SELECT email, article_slug, created_at
         FROM public.journal_subscribers
        ORDER BY created_at DESC
        LIMIT $1`,
      [capped],
    );
    return result.rows.map((row) => ({
      email: String(row.email),
      articleSlug: (row.article_slug as string) ?? null,
      createdAt: (row.created_at as Date).toISOString(),
    }));
  } catch {
    return [];
  }
}

export async function dbListWaitlistSignups(
  limit = 2000,
): Promise<AdminWaitlistRow[]> {
  const capped = Math.min(Math.max(limit, 1), 5000);
  try {
    const result = await getPool().query(
      `SELECT email, name, source, created_at
         FROM public.waitlist_signups
        ORDER BY created_at DESC
        LIMIT $1`,
      [capped],
    );
    return result.rows.map((row) => ({
      email: String(row.email),
      name: (row.name as string) ?? "",
      source: (row.source as string) ?? null,
      createdAt: (row.created_at as Date).toISOString(),
    }));
  } catch {
    return [];
  }
}
