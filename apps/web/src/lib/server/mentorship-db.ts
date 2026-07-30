import { getPool } from "@connectpro/common";
import { ensureMentorshipSchema } from "@/lib/server/ensure-mentorship-schema";
import { splitPrice, assertSellablePrice, PLATFORM_FEE_BPS } from "@/lib/mentorship/pricing";
import {
  generateSlots,
  isSlotAvailable,
  type AvailabilityRule,
  type Slot,
} from "@/lib/mentorship/availability";

/**
 * Direct-Postgres data layer for the mentorship marketplace.
 *
 * Same reasoning as profile-db.ts: only apps/web is deployed to the hosted
 * site, so anything that has to work in production talks to Postgres here
 * rather than to a microservice that is not running.
 */

function pool() {
  return getPool();
}

export interface Mentor {
  userId: string;
  headline: string | null;
  bio: string | null;
  timezone: string;
  currency: string;
  status: "draft" | "active" | "paused";
  minNoticeHours: number;
  bookingHorizonDays: number;
  payoutsEnabled: boolean;
  /** The mentor's standing meeting room, copied onto bookings on acceptance. */
  defaultMeetingUrl: string | null;
}

export interface SessionType {
  id: string;
  mentorUserId: string;
  title: string;
  description: string | null;
  durationMinutes: number;
  priceCents: number;
  active: boolean;
}

function mapMentor(row: Record<string, unknown>): Mentor {
  return {
    userId: row.user_id as string,
    headline: (row.headline as string) ?? null,
    bio: (row.bio as string) ?? null,
    timezone: row.timezone as string,
    currency: row.currency as string,
    status: row.status as Mentor["status"],
    minNoticeHours: Number(row.min_notice_hours),
    bookingHorizonDays: Number(row.booking_horizon_days),
    payoutsEnabled: Boolean(row.payouts_enabled),
    defaultMeetingUrl: (row.default_meeting_url as string) ?? null,
  };
}

function mapSessionType(row: Record<string, unknown>): SessionType {
  return {
    id: row.id as string,
    mentorUserId: row.mentor_user_id as string,
    title: row.title as string,
    description: (row.description as string) ?? null,
    durationMinutes: Number(row.duration_minutes),
    priceCents: Number(row.price_cents),
    active: Boolean(row.active),
  };
}

/* ------------------------------------------------------------------ */
/* Mentor records                                                      */
/* ------------------------------------------------------------------ */

export async function dbGetMentor(userId: string): Promise<Mentor | null> {
  await ensureMentorshipSchema();
  const res = await pool().query(
    "SELECT * FROM mentorship.mentors WHERE user_id = $1",
    [userId],
  );
  return res.rows[0] ? mapMentor(res.rows[0]) : null;
}

/** Create-or-update; becoming a mentor is idempotent. */
export async function dbUpsertMentor(
  userId: string,
  patch: Partial<Omit<Mentor, "userId" | "payoutsEnabled">>,
): Promise<Mentor> {
  await ensureMentorshipSchema();

  const columns: Record<string, unknown> = {};
  if (patch.headline !== undefined) columns.headline = patch.headline;
  if (patch.bio !== undefined) columns.bio = patch.bio;
  if (patch.timezone !== undefined) columns.timezone = patch.timezone;
  if (patch.currency !== undefined) columns.currency = patch.currency;
  if (patch.status !== undefined) columns.status = patch.status;
  if (patch.minNoticeHours !== undefined) columns.min_notice_hours = patch.minNoticeHours;
  if (patch.bookingHorizonDays !== undefined) {
    columns.booking_horizon_days = patch.bookingHorizonDays;
  }
  if (patch.defaultMeetingUrl !== undefined) {
    columns.default_meeting_url = patch.defaultMeetingUrl;
  }

  const keys = Object.keys(columns);
  if (keys.length === 0) {
    await pool().query(
      `INSERT INTO mentorship.mentors (user_id) VALUES ($1)
       ON CONFLICT (user_id) DO NOTHING`,
      [userId],
    );
    return (await dbGetMentor(userId))!;
  }

  const assignments = keys.map((k, i) => `${k} = $${i + 2}`).join(", ");
  const insertCols = keys.join(", ");
  const insertVals = keys.map((_, i) => `$${i + 2}`).join(", ");
  const res = await pool().query(
    `INSERT INTO mentorship.mentors (user_id, ${insertCols})
     VALUES ($1, ${insertVals})
     ON CONFLICT (user_id) DO UPDATE SET ${assignments}, updated_at = now()
     RETURNING *`,
    [userId, ...keys.map((k) => columns[k])],
  );
  return mapMentor(res.rows[0]);
}

/* ------------------------------------------------------------------ */
/* What a mentor sells                                                 */
/* ------------------------------------------------------------------ */

export async function dbListSessionTypes(
  mentorUserId: string,
  { activeOnly = true } = {},
): Promise<SessionType[]> {
  await ensureMentorshipSchema();
  const res = await pool().query(
    `SELECT * FROM mentorship.session_types
     WHERE mentor_user_id = $1 ${activeOnly ? "AND active" : ""}
     ORDER BY price_cents, duration_minutes`,
    [mentorUserId],
  );
  return res.rows.map(mapSessionType);
}

export async function dbCreateSessionType(
  mentorUserId: string,
  input: { title: string; description?: string; durationMinutes: number; priceCents: number },
): Promise<SessionType> {
  await ensureMentorshipSchema();
  assertSellablePrice(input.priceCents);
  if (!input.title?.trim()) throw new Error("Give the session a title");

  const res = await pool().query(
    `INSERT INTO mentorship.session_types
       (mentor_user_id, title, description, duration_minutes, price_cents)
     VALUES ($1, $2, $3, $4, $5) RETURNING *`,
    [
      mentorUserId,
      input.title.trim(),
      input.description?.trim() || null,
      input.durationMinutes,
      input.priceCents,
    ],
  );
  return mapSessionType(res.rows[0]);
}

/** Deactivates rather than deletes: past bookings still reference the row. */
export async function dbDeactivateSessionType(id: string, mentorUserId: string): Promise<void> {
  await ensureMentorshipSchema();
  await pool().query(
    `UPDATE mentorship.session_types SET active = false, updated_at = now()
     WHERE id = $1 AND mentor_user_id = $2`,
    [id, mentorUserId],
  );
}

/* ------------------------------------------------------------------ */
/* Availability                                                        */
/* ------------------------------------------------------------------ */

export async function dbListAvailabilityRules(mentorUserId: string): Promise<AvailabilityRule[]> {
  await ensureMentorshipSchema();
  const res = await pool().query(
    `SELECT weekday, start_minute, end_minute FROM mentorship.availability_rules
     WHERE mentor_user_id = $1 ORDER BY weekday, start_minute`,
    [mentorUserId],
  );
  return res.rows.map((r) => ({
    weekday: Number(r.weekday),
    startMinute: Number(r.start_minute),
    endMinute: Number(r.end_minute),
  }));
}

/**
 * Replace the whole weekly schedule in one transaction.
 *
 * The editor submits the full grid, so a diff would be more code and more ways
 * to be wrong. Doing it in a transaction means a failure part-way cannot leave
 * a mentor bookable at hours they just deleted.
 */
export async function dbReplaceAvailabilityRules(
  mentorUserId: string,
  rules: AvailabilityRule[],
): Promise<void> {
  await ensureMentorshipSchema();
  for (const rule of rules) {
    if (rule.weekday < 0 || rule.weekday > 6) throw new Error("Invalid weekday");
    if (rule.endMinute <= rule.startMinute) throw new Error("A window must end after it starts");
    if (rule.startMinute < 0 || rule.endMinute > 1440) throw new Error("Window outside the day");
  }

  const client = await pool().connect();
  try {
    await client.query("BEGIN");
    await client.query("DELETE FROM mentorship.availability_rules WHERE mentor_user_id = $1", [
      mentorUserId,
    ]);
    for (const rule of rules) {
      await client.query(
        `INSERT INTO mentorship.availability_rules
           (mentor_user_id, weekday, start_minute, end_minute)
         VALUES ($1, $2, $3, $4)`,
        [mentorUserId, rule.weekday, rule.startMinute, rule.endMinute],
      );
    }
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export interface AvailabilityException {
  id: string;
  startsAt: string;
  endsAt: string;
  reason: string | null;
}

/** Holidays and one-off blocks, soonest first. Past ones are not shown. */
export async function dbListExceptions(mentorUserId: string): Promise<AvailabilityException[]> {
  await ensureMentorshipSchema();
  const res = await pool().query(
    `SELECT id, starts_at, ends_at, reason FROM mentorship.availability_exceptions
     WHERE mentor_user_id = $1 AND ends_at > now()
     ORDER BY starts_at`,
    [mentorUserId],
  );
  return res.rows.map((r) => ({
    id: r.id as string,
    startsAt: new Date(r.starts_at as string).toISOString(),
    endsAt: new Date(r.ends_at as string).toISOString(),
    reason: (r.reason as string) ?? null,
  }));
}

export async function dbCreateException(
  mentorUserId: string,
  input: { startsAt: Date; endsAt: Date; reason?: string },
): Promise<AvailabilityException> {
  await ensureMentorshipSchema();
  if (input.endsAt <= input.startsAt) {
    throw new Error("Time off must end after it starts");
  }

  // Blocking time you have already sold would strand a booked mentee, so say so
  // rather than silently double-committing the mentor.
  const clash = await pool().query(
    `SELECT count(*)::int AS n FROM mentorship.bookings
     WHERE mentor_user_id = $1 AND status <> 'cancelled'
       AND tstzrange(starts_at, ends_at) && tstzrange($2, $3)`,
    [mentorUserId, input.startsAt.toISOString(), input.endsAt.toISOString()],
  );
  if (Number(clash.rows[0]?.n ?? 0) > 0) {
    throw new Error(
      "You have a booked session in that window — cancel it first, or choose different dates",
    );
  }

  const res = await pool().query(
    `INSERT INTO mentorship.availability_exceptions (mentor_user_id, starts_at, ends_at, reason)
     VALUES ($1, $2, $3, $4)
     RETURNING id, starts_at, ends_at, reason`,
    [
      mentorUserId,
      input.startsAt.toISOString(),
      input.endsAt.toISOString(),
      input.reason?.trim() || null,
    ],
  );
  const row = res.rows[0];
  return {
    id: row.id as string,
    startsAt: new Date(row.starts_at as string).toISOString(),
    endsAt: new Date(row.ends_at as string).toISOString(),
    reason: (row.reason as string) ?? null,
  };
}

export async function dbDeleteException(id: string, mentorUserId: string): Promise<void> {
  await ensureMentorshipSchema();
  // Scoped to the owner in the WHERE clause, so this cannot clear someone
  // else's time off.
  await pool().query(
    "DELETE FROM mentorship.availability_exceptions WHERE id = $1 AND mentor_user_id = $2",
    [id, mentorUserId],
  );
}

/**
 * Everything that makes a mentor unavailable: manual blocks plus live bookings.
 *
 * Read as one list because the slot generator does not care why an hour is
 * gone — only that it is.
 */
async function dbBusyRanges(mentorUserId: string) {
  const res = await pool().query(
    `SELECT starts_at, ends_at FROM mentorship.availability_exceptions
       WHERE mentor_user_id = $1 AND ends_at > now()
     UNION ALL
     SELECT starts_at, ends_at FROM mentorship.bookings
       WHERE mentor_user_id = $1 AND status <> 'cancelled' AND ends_at > now()`,
    [mentorUserId],
  );
  return res.rows.map((r) => ({
    startsAt: new Date(r.starts_at as string),
    endsAt: new Date(r.ends_at as string),
  }));
}

/** Bookable slots for one session type. */
export async function dbGetSlots(
  mentorUserId: string,
  sessionTypeId: string,
  now = new Date(),
): Promise<Slot[]> {
  const mentor = await dbGetMentor(mentorUserId);
  if (!mentor || mentor.status !== "active") return [];

  const types = await dbListSessionTypes(mentorUserId);
  const sessionType = types.find((t) => t.id === sessionTypeId);
  if (!sessionType) return [];

  const [rules, busy] = await Promise.all([
    dbListAvailabilityRules(mentorUserId),
    dbBusyRanges(mentorUserId),
  ]);

  return generateSlots({
    timezone: mentor.timezone,
    rules,
    busy,
    durationMinutes: sessionType.durationMinutes,
    minNoticeHours: mentor.minNoticeHours,
    horizonDays: mentor.bookingHorizonDays,
    now,
  });
}

/* ------------------------------------------------------------------ */
/* Bookings                                                            */
/* ------------------------------------------------------------------ */

export interface Booking {
  id: string;
  mentorUserId: string;
  menteeUserId: string;
  sessionTypeId: string;
  startsAt: string;
  endsAt: string;
  status: "pending_payment" | "confirmed" | "cancelled" | "completed";
  currency: string;
  priceCents: number;
  platformFeeCents: number;
  mentorPayoutCents: number;
  meetingUrl: string | null;
}

function mapBooking(row: Record<string, unknown>): Booking {
  return {
    id: row.id as string,
    mentorUserId: row.mentor_user_id as string,
    menteeUserId: row.mentee_user_id as string,
    sessionTypeId: row.session_type_id as string,
    startsAt: new Date(row.starts_at as string).toISOString(),
    endsAt: new Date(row.ends_at as string).toISOString(),
    status: row.status as Booking["status"],
    currency: row.currency as string,
    priceCents: Number(row.price_cents),
    platformFeeCents: Number(row.platform_fee_cents),
    mentorPayoutCents: Number(row.mentor_payout_cents),
    meetingUrl: (row.meeting_url as string) ?? null,
  };
}

export class SlotUnavailableError extends Error {
  constructor() {
    super("That time is no longer available");
    this.name = "SlotUnavailableError";
  }
}

/**
 * Hold a slot.
 *
 * The requested time is re-derived from the mentor's own rules rather than
 * trusted from the client, so a hand-crafted request cannot book outside their
 * hours or inside their notice period. Two callers can still pass that check
 * simultaneously — the exclusion constraint on the table is what actually
 * decides, and its violation is translated here into a normal "taken" error.
 */
export async function dbCreateBooking(
  menteeUserId: string,
  input: { mentorUserId: string; sessionTypeId: string; startsAt: Date },
): Promise<Booking> {
  await ensureMentorshipSchema();

  if (menteeUserId === input.mentorUserId) {
    throw new Error("You cannot book your own session");
  }

  const mentor = await dbGetMentor(input.mentorUserId);
  if (!mentor || mentor.status !== "active") throw new Error("This mentor is not taking bookings");

  const sessionType = (await dbListSessionTypes(input.mentorUserId)).find(
    (t) => t.id === input.sessionTypeId,
  );
  if (!sessionType) throw new Error("That session is no longer offered");

  const [rules, busy] = await Promise.all([
    dbListAvailabilityRules(input.mentorUserId),
    dbBusyRanges(input.mentorUserId),
  ]);

  const offered = isSlotAvailable(input.startsAt, {
    timezone: mentor.timezone,
    rules,
    busy,
    durationMinutes: sessionType.durationMinutes,
    minNoticeHours: mentor.minNoticeHours,
    horizonDays: mentor.bookingHorizonDays,
  });
  if (!offered) throw new SlotUnavailableError();

  const split = splitPrice(sessionType.priceCents, PLATFORM_FEE_BPS);
  const endsAt = new Date(input.startsAt.getTime() + sessionType.durationMinutes * 60_000);

  try {
    const res = await pool().query(
      `INSERT INTO mentorship.bookings
         (mentor_user_id, mentee_user_id, session_type_id, starts_at, ends_at,
          status, currency, price_cents, platform_fee_bps, platform_fee_cents,
          mentor_payout_cents)
       VALUES ($1, $2, $3, $4, $5, 'pending_payment', $6, $7, $8, $9, $10)
       RETURNING *`,
      [
        input.mentorUserId,
        menteeUserId,
        sessionType.id,
        input.startsAt.toISOString(),
        endsAt.toISOString(),
        mentor.currency,
        split.priceCents,
        split.platformFeeBps,
        split.platformFeeCents,
        split.mentorPayoutCents,
      ],
    );
    return mapBooking(res.rows[0]);
  } catch (error) {
    // 23P01 = exclusion_violation: somebody else took it in between.
    if ((error as { code?: string }).code === "23P01") throw new SlotUnavailableError();
    throw error;
  }
}

export async function dbListBookingsForMentee(menteeUserId: string): Promise<Booking[]> {
  await ensureMentorshipSchema();
  const res = await pool().query(
    `SELECT * FROM mentorship.bookings WHERE mentee_user_id = $1
     ORDER BY starts_at DESC LIMIT 100`,
    [menteeUserId],
  );
  return res.rows.map(mapBooking);
}

export async function dbListBookingsForMentor(mentorUserId: string): Promise<Booking[]> {
  await ensureMentorshipSchema();
  const res = await pool().query(
    `SELECT * FROM mentorship.bookings WHERE mentor_user_id = $1
     ORDER BY starts_at DESC LIMIT 100`,
    [mentorUserId],
  );
  return res.rows.map(mapBooking);
}

/** Reject anything that is not an https URL a browser can actually open. */
export function normaliseMeetingUrl(raw: string): string {
  const trimmed = raw.trim();
  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    throw new Error("That does not look like a link — include https://");
  }
  // https only: a meeting link is pasted straight into a browser, and http:
  // would downgrade the call. javascript:/data: would be worse.
  if (url.protocol !== "https:") throw new Error("Meeting links must start with https://");
  return url.toString();
}

/**
 * The mentor accepts a pending booking, turning it into a real session.
 *
 * This exists because a booking otherwise has no way out of `pending_payment`:
 * confirmation normally comes from a settled charge. Until Stripe is wired up
 * that would leave every session stranded, so the mentor confirms by hand and
 * settles payment off-platform.
 *
 * The caller must refuse this once payments are configured — see the route.
 * Left available then, it would be a button that gives sessions away for free.
 */
export async function dbConfirmBooking(
  bookingId: string,
  mentorUserId: string,
  meetingUrl?: string,
): Promise<Booking> {
  await ensureMentorshipSchema();

  const mentor = await dbGetMentor(mentorUserId);
  const link = meetingUrl?.trim() || mentor?.defaultMeetingUrl || null;
  const normalised = link ? normaliseMeetingUrl(link) : null;

  const res = await pool().query(
    `UPDATE mentorship.bookings
       SET status = 'confirmed',
           meeting_url = COALESCE($3, meeting_url),
           updated_at = now()
     WHERE id = $1 AND mentor_user_id = $2 AND status = 'pending_payment'
     RETURNING *`,
    [bookingId, mentorUserId, normalised],
  );
  if (res.rows.length === 0) {
    throw new Error("That booking is not waiting for your confirmation");
  }
  return mapBooking(res.rows[0]);
}

/** Either party may cancel; the slot returns to the calendar. */
export async function dbCancelBooking(bookingId: string, userId: string): Promise<Booking> {
  await ensureMentorshipSchema();
  const res = await pool().query(
    `UPDATE mentorship.bookings
       SET status = 'cancelled', cancelled_at = now(), cancelled_by = $2, updated_at = now()
     WHERE id = $1
       AND (mentee_user_id = $2 OR mentor_user_id = $2)
       AND status IN ('pending_payment', 'confirmed')
     RETURNING *`,
    [bookingId, userId],
  );
  if (res.rows.length === 0) throw new Error("Booking not found");
  return mapBooking(res.rows[0]);
}

/* ------------------------------------------------------------------ */
/* Mentor directory                                                    */
/* ------------------------------------------------------------------ */

export interface MentorListing {
  userId: string;
  firstName: string | null;
  lastName: string | null;
  headline: string | null;
  role: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  avatarUrl: string | null;
  timezone: string;
  currency: string;
  /** Cheapest active session, for the "from $X" line. Null if nothing is sold. */
  fromPriceCents: number | null;
  sessionCount: number;
}

/**
 * Mentors who are actually bookable, joined to their Brigade profile.
 *
 * Requires at least one active session type: a mentor with nothing for sale is
 * not a listing, it is an empty page.
 */
export async function dbListMentors(params: {
  q?: string;
  role?: string;
  maxPriceCents?: number;
  limit?: number;
  offset?: number;
}): Promise<{ data: MentorListing[]; total: number }> {
  await ensureMentorshipSchema();

  // min_price is non-null exactly when the mentor has at least one active
  // session type, which is the condition for being listable at all.
  const where: string[] = ["m.status = 'active'", "st.min_price IS NOT NULL"];
  const values: unknown[] = [];

  if (params.q?.trim()) {
    values.push(`%${params.q.trim()}%`);
    const i = values.length;
    where.push(
      `(p.first_name ILIKE $${i} OR p.last_name ILIKE $${i} OR m.headline ILIKE $${i}
        OR p.headline ILIKE $${i} OR p.role ILIKE $${i} OR p.city ILIKE $${i})`,
    );
  }
  if (params.role?.trim()) {
    values.push(params.role.trim());
    where.push(`p.role = $${values.length}`);
  }
  if (typeof params.maxPriceCents === "number") {
    values.push(params.maxPriceCents);
    where.push(`st.min_price <= $${values.length}`);
  }

  const whereSql = where.join(" AND ");
  const limit = Math.min(Math.max(params.limit ?? 24, 1), 48);
  const offset = Math.max(params.offset ?? 0, 0);

  // One pre-aggregated join rather than a per-row subquery, so the price filter
  // and the "from" price come from the same place.
  const priceJoin = `
    LEFT JOIN (
      SELECT mentor_user_id, min(price_cents)::int AS min_price, count(*)::int AS session_count
      FROM mentorship.session_types WHERE active GROUP BY mentor_user_id
    ) st ON st.mentor_user_id = m.user_id`;

  const rows = await pool().query(
    `SELECT m.user_id, m.headline AS mentor_headline, m.timezone, m.currency,
            st.min_price, st.session_count,
            p.first_name, p.last_name, p.headline AS profile_headline,
            p.role, p.city, p.state, p.country, p.avatar_url
     FROM mentorship.mentors m
     ${priceJoin}
     JOIN users.profiles p ON p.user_id = m.user_id
     WHERE ${whereSql}
     ORDER BY st.min_price NULLS LAST, p.first_name
     LIMIT $${values.length + 1} OFFSET $${values.length + 2}`,
    [...values, limit, offset],
  );

  const totals = await pool().query(
    `SELECT count(*)::int AS total
     FROM mentorship.mentors m
     ${priceJoin}
     JOIN users.profiles p ON p.user_id = m.user_id
     WHERE ${whereSql}`,
    values,
  );

  return {
    total: Number(totals.rows[0]?.total ?? 0),
    data: rows.rows.map((r) => ({
      userId: r.user_id as string,
      firstName: (r.first_name as string) ?? null,
      lastName: (r.last_name as string) ?? null,
      headline: ((r.mentor_headline ?? r.profile_headline) as string) ?? null,
      role: (r.role as string) ?? null,
      city: (r.city as string) ?? null,
      state: (r.state as string) ?? null,
      country: (r.country as string) ?? null,
      avatarUrl: (r.avatar_url as string) ?? null,
      timezone: r.timezone as string,
      currency: r.currency as string,
      fromPriceCents: r.min_price === null ? null : Number(r.min_price),
      sessionCount: Number(r.session_count ?? 0),
    })),
  };
}
