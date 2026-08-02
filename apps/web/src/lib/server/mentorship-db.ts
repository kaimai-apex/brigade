import { getAuthSchema, getPool } from "@connectpro/common";
import { ensureMentorshipSchema } from "@/lib/server/ensure-mentorship-schema";
import { splitPrice, assertSellablePrice, PLATFORM_FEE_BPS } from "@/lib/mentorship/pricing";
import { generateConfirmationCode } from "@/lib/mentorship/webhook-signature";
import { HOLD_WINDOW_MINUTES } from "@/lib/mentorship/holds";
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
  /** What they teach, authored by them — not their profile's expertise areas. */
  expertise: string[];
  /** How far through setup they got, so the flow resumes instead of restarting. */
  onboardingStep: number;
  /** Stripe connected account id, once onboarding has been started. */
  payoutAccountId: string | null;
  payoutsOnboardedAt: string | null;
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
    expertise: Array.isArray(row.expertise) ? (row.expertise as string[]) : [],
    onboardingStep: Number(row.onboarding_step ?? 0),
    payoutAccountId: (row.payout_account_id as string) ?? null,
    payoutsOnboardedAt: row.payouts_onboarded_at
      ? new Date(row.payouts_onboarded_at as string).toISOString()
      : null,
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
  patch: Partial<
    Omit<Mentor, "userId" | "payoutsEnabled" | "payoutAccountId" | "payoutsOnboardedAt">
  >,
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
  if (patch.expertise !== undefined) columns.expertise = patch.expertise;
  if (patch.onboardingStep !== undefined) columns.onboarding_step = patch.onboardingStep;

  const keys = Object.keys(columns);
  if (keys.length === 0) {
    await pool().query(
      `INSERT INTO mentorship.mentors (user_id) VALUES ($1)
       ON CONFLICT (user_id) DO NOTHING`,
      [userId],
    );
    return (await dbGetMentor(userId))!;
  }

  // onboarding_step is a high-water mark, not a cursor. Stepping back to
  // re-read the pricing page must not tell the flow there is more left to do
  // than there is, so the stored value only ever climbs.
  const assignments = keys
    .map((k, i) =>
      k === "onboarding_step"
        ? `${k} = GREATEST(mentors.${k}, $${i + 2})`
        : `${k} = $${i + 2}`,
    )
    .join(", ");
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

/**
 * Remember which Stripe account belongs to this mentor.
 *
 * Written as soon as the account is created, before the mentor has finished
 * Stripe's hosted form. If it were only stored on the way back, a mentor who
 * abandoned onboarding would get a brand new connected account on every
 * attempt, and Stripe would accumulate orphans nobody can reconcile.
 */
export async function dbSetPayoutAccount(userId: string, accountId: string): Promise<void> {
  await ensureMentorshipSchema();
  await pool().query(
    `UPDATE mentorship.mentors SET payout_account_id = $2, updated_at = now()
     WHERE user_id = $1`,
    [userId, accountId],
  );
}

/**
 * Record what Stripe says about the account.
 *
 * `enabled` must come from reading the account back, never from the mentor
 * having landed on the return URL — that only means they closed the form, not
 * that Stripe accepted them.
 */
export async function dbSetPayoutsEnabled(userId: string, enabled: boolean): Promise<Mentor> {
  await ensureMentorshipSchema();
  const res = await pool().query(
    `UPDATE mentorship.mentors
        SET payouts_enabled = $2,
            payouts_onboarded_at = CASE
              WHEN $2 AND payouts_onboarded_at IS NULL THEN now()
              ELSE payouts_onboarded_at
            END,
            updated_at = now()
      WHERE user_id = $1
      RETURNING *`,
    [userId, enabled],
  );
  if (res.rows.length === 0) throw new Error("You have not set up mentoring yet");
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

/**
 * Change what a session is, or what it costs.
 *
 * Editing the row rather than versioning it is safe because every booking
 * freezes its own price, fee rate and split at the moment it is made — a past
 * session still explains itself after the mentor puts their rate up.
 */
export async function dbUpdateSessionType(
  id: string,
  mentorUserId: string,
  patch: {
    title?: string;
    description?: string | null;
    durationMinutes?: number;
    priceCents?: number;
    active?: boolean;
  },
): Promise<SessionType> {
  await ensureMentorshipSchema();

  const columns: Record<string, unknown> = {};
  if (patch.title !== undefined) {
    if (!patch.title.trim()) throw new Error("Give the session a title");
    columns.title = patch.title.trim();
  }
  if (patch.description !== undefined) {
    columns.description = patch.description?.trim() || null;
  }
  if (patch.durationMinutes !== undefined) {
    if (patch.durationMinutes < 15 || patch.durationMinutes > 480) {
      throw new Error("A session runs between 15 minutes and 8 hours");
    }
    columns.duration_minutes = patch.durationMinutes;
  }
  if (patch.priceCents !== undefined) {
    assertSellablePrice(patch.priceCents);
    columns.price_cents = patch.priceCents;
  }
  if (patch.active !== undefined) columns.active = patch.active;

  const keys = Object.keys(columns);
  if (keys.length === 0) {
    const current = (await dbListSessionTypes(mentorUserId, { activeOnly: false })).find(
      (t) => t.id === id,
    );
    if (!current) throw new Error("That session does not exist");
    return current;
  }

  const assignments = keys.map((k, i) => `${k} = $${i + 3}`).join(", ");
  // Ownership is in the WHERE clause, so this cannot reprice someone else's
  // session even with a guessed id.
  const res = await pool().query(
    `UPDATE mentorship.session_types SET ${assignments}, updated_at = now()
      WHERE id = $1 AND mentor_user_id = $2
      RETURNING *`,
    [id, mentorUserId, ...keys.map((k) => columns[k])],
  );
  if (res.rows.length === 0) throw new Error("That session does not exist");
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
/** Cap unpaid holds per mentee so abandoned checkouts cannot lock the grid. */
const MAX_PENDING_PER_MENTEE = 8;

/**
 * Release unpaid bookings past the hold window. Safe to call often — it only
 * touches `pending_payment` rows past the TTL. Without this, abandoned holds
 * occupy the EXCLUDE gist forever.
 */
export async function dbExpireStalePendingBookings(): Promise<number> {
  await ensureMentorshipSchema();
  const res = await pool().query(
    `UPDATE mentorship.bookings
       SET status = 'cancelled',
           cancelled_at = now(),
           cancelled_by = NULL,
           updated_at = now()
     WHERE status = 'pending_payment'
       AND created_at < now() - ($1 || ' minutes')::interval`,
    [String(HOLD_WINDOW_MINUTES)],
  );
  return res.rowCount ?? 0;
}

/**
 * A booking whose payment arrived after Brigade had already released the slot.
 *
 * This should be unreachable — the hold outlives the checkout window by design
 * — but "should be unreachable" is not a plan for someone else's money. The
 * webhook looks for this case explicitly so the charge can be refunded rather
 * than silently kept for a session that will not happen.
 */
export async function dbFindPaidAfterRelease(
  checkoutSessionId: string,
): Promise<Booking | null> {
  await ensureMentorshipSchema();
  const res = await pool().query(
    `SELECT * FROM mentorship.bookings
      WHERE checkout_session_id = $1 AND status = 'cancelled' AND paid_at IS NULL`,
    [checkoutSessionId],
  );
  return res.rows[0] ? mapBooking(res.rows[0]) : null;
}

/**
 * The billing email for Stripe's receipt.
 *
 * Read from the auth schema at charge time rather than copied onto the booking:
 * a receipt should go to where the person reads mail today.
 */
export async function dbGetBillingEmail(userId: string): Promise<string | null> {
  const res = await pool().query(
    `SELECT email FROM ${getAuthSchema()}.users WHERE id = $1`,
    [userId],
  );
  return (res.rows[0]?.email as string) ?? null;
}

async function dbBusyRanges(mentorUserId: string) {
  await dbExpireStalePendingBookings();
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
  paymentIntentId: string | null;
  checkoutSessionId: string | null;
  paidAt: string | null;
  receiptUrl: string | null;
  confirmationCode: string | null;
  refundedCents: number;
  createdAt: string;
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
    paymentIntentId: (row.payment_intent_id as string) ?? null,
    checkoutSessionId: (row.checkout_session_id as string) ?? null,
    paidAt: row.paid_at ? new Date(row.paid_at as string).toISOString() : null,
    receiptUrl: (row.receipt_url as string) ?? null,
    confirmationCode: (row.confirmation_code as string) ?? null,
    refundedCents: Number(row.refunded_cents ?? 0),
    createdAt: new Date(row.created_at as string).toISOString(),
  };
}

export class TooManyPendingBookingsError extends Error {
  constructor() {
    super("You already have too many unpaid bookings — finish or cancel one first");
    this.name = "TooManyPendingBookingsError";
  }
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
  await dbExpireStalePendingBookings();

  if (menteeUserId === input.mentorUserId) {
    throw new Error("You cannot book your own session");
  }

  const mentor = await dbGetMentor(input.mentorUserId);
  if (!mentor || mentor.status !== "active") throw new Error("This mentor is not taking bookings");

  const sessionType = (await dbListSessionTypes(input.mentorUserId)).find(
    (t) => t.id === input.sessionTypeId,
  );
  if (!sessionType) throw new Error("That session is no longer offered");

  const pending = await pool().query(
    `SELECT count(*)::int AS n FROM mentorship.bookings
      WHERE mentee_user_id = $1 AND status = 'pending_payment'`,
    [menteeUserId],
  );
  if ((pending.rows[0]?.n as number) >= MAX_PENDING_PER_MENTEE) {
    throw new TooManyPendingBookingsError();
  }

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

/** One booking, whoever is asking. */
export async function dbGetBooking(id: string): Promise<Booking | null> {
  await ensureMentorshipSchema();
  const res = await pool().query("SELECT * FROM mentorship.bookings WHERE id = $1", [id]);
  return res.rows[0] ? mapBooking(res.rows[0]) : null;
}

/**
 * A booking, but only for the two people it concerns.
 *
 * Receipts carry a meeting link and a price, so the row is filtered by
 * participation in SQL rather than fetched and then checked — there is no
 * moment where the wrong person is holding the data.
 */
export async function dbGetBookingForViewer(
  id: string,
  viewerId: string,
): Promise<Booking | null> {
  await ensureMentorshipSchema();
  const res = await pool().query(
    `SELECT * FROM mentorship.bookings
      WHERE id = $1 AND (mentee_user_id = $2 OR mentor_user_id = $2)`,
    [id, viewerId],
  );
  return res.rows[0] ? mapBooking(res.rows[0]) : null;
}

export interface BookingDetail extends Booking {
  sessionTitle: string;
  sessionDescription: string | null;
  durationMinutes: number;
  mentorName: string;
  menteeName: string;
  /** The mentor's zone, so the receipt can say what time it is for them too. */
  mentorTimezone: string;
}

/**
 * One booking with everything a receipt has to state, in a single query.
 *
 * Scoped to the two participants in SQL rather than fetched and then checked:
 * this row carries a price and a meeting link, so there is no point at which
 * the wrong person is holding it.
 */
export async function dbGetBookingDetail(
  id: string,
  viewerId: string,
): Promise<BookingDetail | null> {
  await ensureMentorshipSchema();
  const res = await pool().query(
    `SELECT b.*,
            st.title       AS session_title,
            st.description AS session_description,
            st.duration_minutes,
            m.timezone     AS mentor_timezone,
            trim(concat_ws(' ', mp.first_name, mp.last_name)) AS mentor_name,
            trim(concat_ws(' ', ep.first_name, ep.last_name)) AS mentee_name
       FROM mentorship.bookings b
       JOIN mentorship.session_types st ON st.id = b.session_type_id
       JOIN mentorship.mentors m        ON m.user_id = b.mentor_user_id
       LEFT JOIN users.profiles mp      ON mp.user_id = b.mentor_user_id
       LEFT JOIN users.profiles ep      ON ep.user_id = b.mentee_user_id
      WHERE b.id = $1 AND (b.mentee_user_id = $2 OR b.mentor_user_id = $2)`,
    [id, viewerId],
  );
  const row = res.rows[0];
  if (!row) return null;

  return {
    ...mapBooking(row),
    sessionTitle: row.session_title as string,
    sessionDescription: (row.session_description as string) ?? null,
    durationMinutes: Number(row.duration_minutes),
    mentorTimezone: row.mentor_timezone as string,
    mentorName: (row.mentor_name as string) || "This mentor",
    menteeName: (row.mentee_name as string) || "This member",
  };
}

/** Correlate the Stripe Checkout Session with the booking it is paying for. */
export async function dbAttachCheckoutSession(
  bookingId: string,
  checkoutSessionId: string,
): Promise<void> {
  await ensureMentorshipSchema();
  await pool().query(
    `UPDATE mentorship.bookings SET checkout_session_id = $2, updated_at = now()
      WHERE id = $1`,
    [bookingId, checkoutSessionId],
  );
}

/**
 * The payment settled: turn the hold into a real session.
 *
 * Idempotent by construction. The WHERE clause requires `pending_payment`, so a
 * redelivered webhook updates zero rows and the caller sees `null` — meaning
 * "already handled", not "failed". That matters because Stripe will deliver
 * this event more than once and a second confirmation would notify both people
 * twice.
 *
 * The mentor's standing meeting room is COPIED here rather than joined at read
 * time: changing your Zoom link next year must not rewrite the link on a
 * session that already happened.
 */
export async function dbMarkBookingPaid(input: {
  checkoutSessionId: string;
  paymentIntentId: string | null;
  receiptUrl: string | null;
}): Promise<Booking | null> {
  await ensureMentorshipSchema();

  // Retried on the astronomically unlikely code collision; the unique index is
  // what makes that a retry rather than a duplicate.
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      const res = await pool().query(
        `UPDATE mentorship.bookings b
            SET status = 'confirmed',
                paid_at = now(),
                payment_intent_id = COALESCE($2, b.payment_intent_id),
                receipt_url = COALESCE($3, b.receipt_url),
                confirmation_code = COALESCE(b.confirmation_code, $4),
                meeting_url = COALESCE(b.meeting_url, m.default_meeting_url),
                updated_at = now()
           FROM mentorship.mentors m
          WHERE b.checkout_session_id = $1
            AND b.status = 'pending_payment'
            AND m.user_id = b.mentor_user_id
        RETURNING b.*`,
        [
          input.checkoutSessionId,
          input.paymentIntentId,
          input.receiptUrl,
          generateConfirmationCode(),
        ],
      );
      return res.rows[0] ? mapBooking(res.rows[0]) : null;
    } catch (error) {
      // 23505 = unique_violation on the confirmation code.
      if ((error as { code?: string }).code === "23505" && attempt < 4) continue;
      throw error;
    }
  }
  return null;
}

/**
 * Confirm a free session.
 *
 * A zero-price session has nothing for Stripe to do, but it still needs a
 * confirmation code and the meeting link, so it goes through the same
 * transition rather than a parallel one that could drift.
 */
export async function dbConfirmFreeBooking(bookingId: string): Promise<Booking | null> {
  await ensureMentorshipSchema();
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      const res = await pool().query(
        `UPDATE mentorship.bookings b
            SET status = 'confirmed',
                confirmation_code = COALESCE(b.confirmation_code, $2),
                meeting_url = COALESCE(b.meeting_url, m.default_meeting_url),
                updated_at = now()
           FROM mentorship.mentors m
          WHERE b.id = $1
            AND b.status = 'pending_payment'
            AND b.price_cents = 0
            AND m.user_id = b.mentor_user_id
        RETURNING b.*`,
        [bookingId, generateConfirmationCode()],
      );
      return res.rows[0] ? mapBooking(res.rows[0]) : null;
    } catch (error) {
      if ((error as { code?: string }).code === "23505" && attempt < 4) continue;
      throw error;
    }
  }
  return null;
}

/**
 * Find a booking from the PaymentIntent that paid for it.
 *
 * How refund events are matched. A Stripe Charge does NOT inherit its
 * PaymentIntent's metadata — they are separate objects — so a
 * `charge.refunded` event carries no `brigade_booking_id`. It does carry
 * `payment_intent`, which the webhook writes onto the booking when the payment
 * settles, so that is the reliable handle.
 */
export async function dbGetBookingByPaymentIntent(
  paymentIntentId: string,
): Promise<Booking | null> {
  await ensureMentorshipSchema();
  const res = await pool().query(
    "SELECT * FROM mentorship.bookings WHERE payment_intent_id = $1",
    [paymentIntentId],
  );
  return res.rows[0] ? mapBooking(res.rows[0]) : null;
}

/**
 * Write down what was given back, after Stripe has agreed to it.
 *
 * Returns false when the figure was already recorded. Brigade-initiated refunds
 * are written here AND arrive again as a `charge.refunded` webhook; without
 * this the mentee would be told about the same refund twice.
 */
export async function dbRecordRefund(
  bookingId: string,
  refundId: string,
  amountCents: number,
): Promise<boolean> {
  await ensureMentorshipSchema();
  const res = await pool().query(
    `UPDATE mentorship.bookings
        SET refunded_cents = $3, refund_id = $2, updated_at = now()
      WHERE id = $1 AND refunded_cents <> $3`,
    [bookingId, refundId, amountCents],
  );
  return (res.rowCount ?? 0) > 0;
}

/* ------------------------------------------------------------------ */
/* Webhook idempotency                                                 */
/* ------------------------------------------------------------------ */

/**
 * Claim a Stripe event for processing.
 *
 * Returns false when this event has been seen before. The INSERT is the lock:
 * two concurrent deliveries of the same event race on the primary key and
 * exactly one wins, which is stronger than checking-then-inserting.
 */
export async function dbClaimWebhookEvent(id: string, type: string): Promise<boolean> {
  await ensureMentorshipSchema();
  const res = await pool().query(
    `INSERT INTO mentorship.webhook_events (id, type) VALUES ($1, $2)
     ON CONFLICT (id) DO NOTHING`,
    [id, type],
  );
  return (res.rowCount ?? 0) > 0;
}

/** Mark the claimed event done, or record why it was not. */
export async function dbFinishWebhookEvent(id: string, error?: string): Promise<void> {
  await ensureMentorshipSchema();
  if (error) {
    // Clear processed_at and keep the reason, so a failed event is visibly
    // unfinished rather than looking handled.
    await pool().query(
      "UPDATE mentorship.webhook_events SET error = $2, processed_at = NULL WHERE id = $1",
      [id, error.slice(0, 500)],
    );
    return;
  }
  await pool().query(
    "UPDATE mentorship.webhook_events SET processed_at = now(), error = NULL WHERE id = $1",
    [id],
  );
}

/**
 * Release a claim so Stripe's retry can have another go.
 *
 * Without this, a handler that throws would leave the event marked as seen and
 * every retry would be skipped as a duplicate — the booking would stay unpaid
 * forever with no way back.
 */
export async function dbReleaseWebhookEvent(id: string): Promise<void> {
  await ensureMentorshipSchema();
  await pool().query("DELETE FROM mentorship.webhook_events WHERE id = $1", [id]);
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
  expertiseAreas: string[];
  currentEmployer: string | null;
  yearsExperience: number | null;
  /** ISO timestamp — used for a real "New" badge, not a fake ranking. */
  createdAt: string;
}

export type MentorSort = "price" | "name" | "newest";

export interface MentorFacet {
  value: string;
  count: number;
  state?: string | null;
}

export interface MentorFacets {
  roles: MentorFacet[];
  cities: MentorFacet[];
  expertise: MentorFacet[];
}

export interface MentorRail {
  expertise: string;
  mentors: MentorListing[];
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
  city?: string;
  expertise?: string;
  maxPriceCents?: number;
  sort?: MentorSort;
  limit?: number;
  offset?: number;
}): Promise<{ data: MentorListing[]; total: number }> {
  await ensureMentorshipSchema();

  const { where, values, priceJoin } = mentorListFilters(params);
  const whereSql = where.join(" AND ");
  const limit = Math.min(Math.max(params.limit ?? 24, 1), 48);
  const offset = Math.max(params.offset ?? 0, 0);
  const orderBy = mentorListOrder(params.sort);

  const rows = await pool().query(
    `SELECT m.user_id, m.headline AS mentor_headline, m.timezone, m.currency,
            m.created_at, st.min_price, st.session_count,
            p.first_name, p.last_name, p.headline AS profile_headline,
            p.role, p.city, p.state, p.country, p.avatar_url,
            ${EFFECTIVE_EXPERTISE} AS expertise_areas,
            p.current_employer, p.years_experience
     FROM mentorship.mentors m
     ${priceJoin}
     JOIN users.profiles p ON p.user_id = m.user_id
     WHERE ${whereSql}
     ORDER BY ${orderBy}
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
    data: rows.rows.map(mapListing),
  };
}

/**
 * Facets among bookable mentors only — chips that would empty the grid are
 * still shown with a count so the visitor can see what exists.
 */
export async function dbMentorFacets(): Promise<MentorFacets> {
  await ensureMentorshipSchema();
  const { where, values, priceJoin } = mentorListFilters({});
  const whereSql = where.join(" AND ");
  const from = `
    FROM mentorship.mentors m
    ${priceJoin}
    JOIN users.profiles p ON p.user_id = m.user_id
    WHERE ${whereSql}`;

  const [roles, cities, expertise] = await Promise.all([
    pool().query(
      `SELECT p.role AS value, count(*)::int AS count ${from}
       AND p.role IS NOT NULL AND p.role <> ''
       GROUP BY p.role ORDER BY count DESC, p.role LIMIT 24`,
      values,
    ),
    pool().query(
      `SELECT p.city AS value, p.state, count(*)::int AS count ${from}
       AND p.city IS NOT NULL AND p.city <> ''
       GROUP BY p.city, p.state ORDER BY count DESC, p.city LIMIT 24`,
      values,
    ),
    pool().query(
      `SELECT unnest(${EFFECTIVE_EXPERTISE}) AS value, count(*)::int AS count ${from}
       GROUP BY value ORDER BY count DESC, value LIMIT 24`,
      values,
    ),
  ]);

  return {
    roles: roles.rows.map((r) => ({
      value: r.value as string,
      count: Number(r.count),
    })),
    cities: cities.rows.map((r) => ({
      value: r.value as string,
      count: Number(r.count),
      state: (r.state as string) ?? null,
    })),
    expertise: expertise.rows.map((r) => ({
      value: r.value as string,
      count: Number(r.count),
    })),
  };
}

/**
 * "Popular in …" rails keyed by real expertise tags on active mentors.
 * Empty groups are omitted — with a thin mentor pool that may mean one rail.
 */
export async function dbPopularMentorRails(limitPerRail = 12): Promise<MentorRail[]> {
  const facets = await dbMentorFacets();
  const rails: MentorRail[] = [];

  for (const facet of facets.expertise.slice(0, 6)) {
    const { data } = await dbListMentors({
      expertise: facet.value,
      sort: "newest",
      limit: limitPerRail,
    });
    if (data.length === 0) continue;
    rails.push({ expertise: facet.value, mentors: data });
  }

  // If nobody has expertise tags yet, fall back to role-based rails so the
  // marketplace still has a discovery band when mentors exist.
  if (rails.length === 0) {
    for (const facet of facets.roles.slice(0, 4)) {
      const { data } = await dbListMentors({
        role: facet.value,
        sort: "newest",
        limit: limitPerRail,
      });
      if (data.length === 0) continue;
      rails.push({ expertise: facet.value, mentors: data });
    }
  }

  return rails;
}

/**
 * What this mentor teaches, for discovery.
 *
 * Their own tags when they have set any, otherwise the expertise areas on their
 * member profile. Mentor-owned tags describe what they will teach, which is not
 * the same question as what they do for a living — a pastry chef who mentors on
 * costing should be findable for costing.
 *
 * The fallback matters: mentors who joined before the tags existed have nothing
 * in `m.expertise`, and dropping them out of every facet would quietly empty
 * the directory's filters.
 */
const EFFECTIVE_EXPERTISE = `
  CASE WHEN COALESCE(cardinality(m.expertise), 0) > 0
       THEN m.expertise
       ELSE COALESCE(p.expertise_areas, '{}'::text[])
  END`;

function mentorListFilters(params: {
  q?: string;
  role?: string;
  city?: string;
  expertise?: string;
  maxPriceCents?: number;
}) {
  // min_price is non-null exactly when the mentor has at least one active
  // session type, which is the condition for being listable at all.
  const where: string[] = ["m.status = 'active'", "st.min_price IS NOT NULL"];
  const values: unknown[] = [];

  if (params.q?.trim()) {
    values.push(`%${params.q.trim()}%`);
    const i = values.length;
    where.push(
      `(p.first_name ILIKE $${i} OR p.last_name ILIKE $${i} OR m.headline ILIKE $${i}
        OR p.headline ILIKE $${i} OR p.role ILIKE $${i} OR p.city ILIKE $${i}
        OR p.current_employer ILIKE $${i}
        OR m.bio ILIKE $${i}
        OR EXISTS (
          SELECT 1 FROM unnest(${EFFECTIVE_EXPERTISE}) AS ea(tag)
          WHERE ea.tag ILIKE $${i}
        ))`,
    );
  }
  if (params.role?.trim()) {
    values.push(params.role.trim());
    where.push(`p.role = $${values.length}`);
  }
  if (params.city?.trim()) {
    values.push(params.city.trim());
    where.push(`p.city = $${values.length}`);
  }
  if (params.expertise?.trim()) {
    values.push([params.expertise.trim()]);
    // Either side matches, rather than only the effective one: a mentor who has
    // since written their own tags should still be reachable from a chip built
    // out of their profile's, and vice versa. Narrowing this would make
    // existing links in the wild start returning nothing.
    where.push(
      `(m.expertise @> $${values.length}::text[]
        OR COALESCE(p.expertise_areas, '{}'::text[]) @> $${values.length}::text[])`,
    );
  }
  if (typeof params.maxPriceCents === "number") {
    values.push(params.maxPriceCents);
    where.push(`st.min_price <= $${values.length}`);
  }

  const priceJoin = `
    LEFT JOIN (
      SELECT mentor_user_id, min(price_cents)::int AS min_price, count(*)::int AS session_count
      FROM mentorship.session_types WHERE active GROUP BY mentor_user_id
    ) st ON st.mentor_user_id = m.user_id`;

  return { where, values, priceJoin };
}

function mentorListOrder(sort?: MentorSort): string {
  switch (sort) {
    case "name":
      return "p.first_name NULLS LAST, p.last_name NULLS LAST";
    case "newest":
      return "m.created_at DESC";
    case "price":
    default:
      return "st.min_price NULLS LAST, p.first_name NULLS LAST";
  }
}

function mapListing(r: Record<string, unknown>): MentorListing {
  const areas = r.expertise_areas;
  return {
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
    fromPriceCents: r.min_price === null || r.min_price === undefined ? null : Number(r.min_price),
    sessionCount: Number(r.session_count ?? 0),
    expertiseAreas: Array.isArray(areas) ? (areas as string[]) : [],
    currentEmployer: (r.current_employer as string) ?? null,
    yearsExperience:
      r.years_experience === null || r.years_experience === undefined
        ? null
        : Number(r.years_experience),
    createdAt: new Date(r.created_at as string).toISOString(),
  };
}
