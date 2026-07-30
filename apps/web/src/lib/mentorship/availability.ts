/**
 * Slot generation.
 *
 * Pure: takes rules, exceptions and existing bookings, returns bookable start
 * times. No database access, so the interesting cases — daylight saving, notice
 * periods, a booking that half-overlaps a slot — are directly testable.
 *
 * The one genuinely hard part is timezones. A mentor's rule says "Tuesdays
 * 09:00", which is a *wall clock* time in their zone. The UTC instant that
 * corresponds to differs by an hour across a DST boundary, so the conversion
 * has to be done per date rather than with one cached offset.
 */

export interface AvailabilityRule {
  weekday: number; // 0 = Sunday, matching Date#getUTCDay and Postgres DOW
  startMinute: number; // minutes from local midnight
  endMinute: number;
}

export interface TimeRange {
  startsAt: Date;
  endsAt: Date;
}

export interface SlotOptions {
  timezone: string;
  rules: AvailabilityRule[];
  /** Vacations, and any already-booked sessions. Both simply subtract time. */
  busy: TimeRange[];
  durationMinutes: number;
  minNoticeHours: number;
  horizonDays: number;
  /** Injected so tests are not a function of the wall clock. */
  now?: Date;
}

const MS_PER_MINUTE = 60_000;
const MS_PER_DAY = 86_400_000;

/**
 * How far `timeZone` is from UTC at a given instant, in milliseconds.
 *
 * Intl is the only thing in the platform that knows the tz database, so we
 * format the instant into the zone, read the fields back as if they were UTC,
 * and take the difference.
 */
function zoneOffsetMs(instant: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(instant);

  const field: Record<string, number> = {};
  for (const part of parts) {
    if (part.type !== "literal") field[part.type] = Number(part.value);
  }
  // "24" appears at midnight in some locales' hour12:false output.
  const hour = field.hour % 24;
  const asIfUtc = Date.UTC(field.year, field.month - 1, field.day, hour, field.minute, field.second);
  return asIfUtc - instant.getTime();
}

/**
 * The UTC instant for a wall-clock time on a calendar date in `timeZone`.
 *
 * Applied twice: the first pass uses the offset at the wrong instant, which is
 * off by an hour exactly when the guess lands on the other side of a DST
 * change. Re-reading the offset at the corrected instant settles it.
 */
export function zonedWallTimeToUtc(
  year: number,
  month: number, // 1-12
  day: number,
  minuteOfDay: number,
  timeZone: string,
): Date {
  const naive = Date.UTC(year, month - 1, day) + minuteOfDay * MS_PER_MINUTE;
  let instant = naive - zoneOffsetMs(new Date(naive), timeZone);
  instant = naive - zoneOffsetMs(new Date(instant), timeZone);
  return new Date(instant);
}

/** The calendar date showing on a wall clock in `timeZone` at `instant`. */
export function localCalendarDate(
  instant: Date,
  timeZone: string,
): { year: number; month: number; day: number } {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(instant);
  const field: Record<string, number> = {};
  for (const part of parts) {
    if (part.type !== "literal") field[part.type] = Number(part.value);
  }
  return { year: field.year, month: field.month, day: field.day };
}

function overlaps(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date): boolean {
  // Half-open intervals: a session ending exactly when the next begins is fine.
  return aStart < bEnd && bStart < aEnd;
}

export interface Slot {
  startsAt: Date;
  endsAt: Date;
}

/**
 * Every slot a mentee could book, soonest first.
 *
 * A slot must fit entirely inside one availability rule, start after the notice
 * period, fall within the booking horizon, and not overlap anything busy.
 */
export function generateSlots(options: SlotOptions): Slot[] {
  const {
    timezone,
    rules,
    busy,
    durationMinutes,
    minNoticeHours,
    horizonDays,
    now = new Date(),
  } = options;

  if (durationMinutes <= 0) return [];
  if (rules.length === 0) return [];

  const earliest = new Date(now.getTime() + minNoticeHours * 60 * MS_PER_MINUTE);
  const latest = new Date(now.getTime() + horizonDays * MS_PER_DAY);

  const byWeekday = new Map<number, AvailabilityRule[]>();
  for (const rule of rules) {
    const list = byWeekday.get(rule.weekday) ?? [];
    list.push(rule);
    byWeekday.set(rule.weekday, list);
  }

  const slots: Slot[] = [];
  const start = localCalendarDate(now, timezone);
  // Walk calendar dates in the mentor's zone. Stepping a UTC-midnight cursor by
  // whole days is safe here because it only ever names a date — no wall-clock
  // arithmetic is done on it, so DST cannot skew the sequence.
  let cursor = Date.UTC(start.year, start.month - 1, start.day);

  // +1 so the final partial day is still offered.
  for (let dayIndex = 0; dayIndex <= horizonDays + 1; dayIndex += 1) {
    const date = new Date(cursor);
    const dayRules = byWeekday.get(date.getUTCDay());
    cursor += MS_PER_DAY;
    if (!dayRules) continue;

    const year = date.getUTCFullYear();
    const month = date.getUTCMonth() + 1;
    const day = date.getUTCDate();

    for (const rule of dayRules) {
      for (
        let minute = rule.startMinute;
        minute + durationMinutes <= rule.endMinute;
        minute += durationMinutes
      ) {
        const startsAt = zonedWallTimeToUtc(year, month, day, minute, timezone);
        const endsAt = new Date(startsAt.getTime() + durationMinutes * MS_PER_MINUTE);

        if (startsAt < earliest) continue;
        if (startsAt > latest) continue;
        if (busy.some((b) => overlaps(startsAt, endsAt, b.startsAt, b.endsAt))) continue;

        slots.push({ startsAt, endsAt });
      }
    }
  }

  slots.sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());
  // A rule set with overlapping windows can emit the same start twice.
  const seen = new Set<number>();
  return slots.filter((slot) => {
    const key = slot.startsAt.getTime();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/**
 * Confirm a proposed start is genuinely on offer.
 *
 * Booking re-runs generation rather than trusting the client's timestamp —
 * otherwise a caller could post any instant and take a session outside the
 * mentor's hours, inside their notice period, or on top of an existing booking.
 */
export function isSlotAvailable(startsAt: Date, options: SlotOptions): boolean {
  const target = startsAt.getTime();
  return generateSlots(options).some((slot) => slot.startsAt.getTime() === target);
}
