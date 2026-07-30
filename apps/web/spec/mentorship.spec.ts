/**
 * Mentorship pricing and slot generation.
 *
 * Run: node --experimental-strip-types apps/web/spec/mentorship.spec.ts
 *
 * These two modules are pure, so unlike the core specs this needs no database.
 * They are also the two places where a quiet bug costs real money or double-books
 * a real person, which is why they are tested directly rather than through the UI.
 */
import {
  splitPrice,
  formatMoney,
  assertSellablePrice,
  PLATFORM_FEE_BPS,
} from "../src/lib/mentorship/pricing.ts";
import {
  generateSlots,
  isSlotAvailable,
  zonedWallTimeToUtc,
  localCalendarDate,
  type AvailabilityRule,
} from "../src/lib/mentorship/availability.ts";

let passed = 0;
let failed = 0;

function check(name: string, condition: boolean, detail = "") {
  if (condition) {
    passed += 1;
    console.log(`  ok   ${name}`);
  } else {
    failed += 1;
    console.error(`  FAIL ${name}${detail ? ` — ${detail}` : ""}`);
  }
}

function group(name: string) {
  console.log(`\n${name}`);
}

// ---------------------------------------------------------------------------
group("Platform fee");

{
  const split = splitPrice(15000);
  check("takes 20% of a $150 session", split.platformFeeCents === 3000, String(split.platformFeeCents));
  check("mentor keeps the rest", split.mentorPayoutCents === 12000, String(split.mentorPayoutCents));
  check("the rate is recorded on the split", split.platformFeeBps === PLATFORM_FEE_BPS);
}

{
  // 20% of 999 is 199.8 — the half-cent has to go somewhere, and it must not
  // go missing.
  const split = splitPrice(999);
  check("rounds a fractional cent", split.platformFeeCents === 200, String(split.platformFeeCents));
  check(
    "the split always sums to the price",
    split.platformFeeCents + split.mentorPayoutCents === 999,
  );
}

{
  let allSum = true;
  for (let price = 0; price <= 5000; price += 1) {
    const s = splitPrice(price);
    if (s.platformFeeCents + s.mentorPayoutCents !== price) allSum = false;
  }
  check("no cent is invented or lost, for any price up to $50", allSum);
}

{
  const free = splitPrice(0);
  check("a free session costs nothing and pays nothing", free.platformFeeCents === 0 && free.mentorPayoutCents === 0);
}

{
  let threw = false;
  try {
    splitPrice(10.5);
  } catch {
    threw = true;
  }
  check("rejects a fractional price", threw);
}

{
  let threw = false;
  try {
    assertSellablePrice(900_000);
  } catch {
    threw = true;
  }
  check("rejects an implausible price", threw);
}

check("formats USD from minor units", formatMoney(15000, "usd") === "$150.00", formatMoney(15000, "usd"));
check(
  "respects zero-decimal currencies",
  formatMoney(1500, "jpy") === "¥1,500",
  formatMoney(1500, "jpy"),
);

// ---------------------------------------------------------------------------
group("Timezone conversion");

{
  // New York is UTC-4 in August (EDT).
  const summer = zonedWallTimeToUtc(2026, 8, 4, 9 * 60, "America/New_York");
  check("09:00 EDT is 13:00 UTC", summer.toISOString() === "2026-08-04T13:00:00.000Z", summer.toISOString());

  // ...and UTC-5 in January (EST). Same wall clock, different instant — this is
  // the case a single cached offset gets wrong.
  const winter = zonedWallTimeToUtc(2026, 1, 6, 9 * 60, "America/New_York");
  check("09:00 EST is 14:00 UTC", winter.toISOString() === "2026-01-06T14:00:00.000Z", winter.toISOString());
}

{
  const instant = new Date("2026-08-04T02:30:00.000Z");
  const local = localCalendarDate(instant, "America/New_York");
  check(
    "an instant after UTC midnight is still the previous local day",
    local.year === 2026 && local.month === 8 && local.day === 3,
    JSON.stringify(local),
  );
}

// ---------------------------------------------------------------------------
group("Slot generation");

// Tuesdays 09:00-12:00 in New York.
const tuesdayMornings: AvailabilityRule[] = [
  { weekday: 2, startMinute: 9 * 60, endMinute: 12 * 60 },
];

const baseOptions = {
  timezone: "America/New_York",
  rules: tuesdayMornings,
  busy: [],
  durationMinutes: 60,
  minNoticeHours: 12,
  horizonDays: 14,
  now: new Date("2026-08-01T12:00:00.000Z"), // Saturday
};

{
  const slots = generateSlots(baseOptions);
  check("finds slots", slots.length > 0, String(slots.length));
  check(
    "three 60-minute slots per Tuesday over two weeks",
    slots.length === 6,
    String(slots.length),
  );
  check(
    "the first is Tuesday 09:00 New York",
    slots[0].startsAt.toISOString() === "2026-08-04T13:00:00.000Z",
    slots[0].startsAt.toISOString(),
  );
  check(
    "slots are an hour long",
    slots[0].endsAt.getTime() - slots[0].startsAt.getTime() === 60 * 60_000,
  );
  check(
    "no slot runs past the end of the window",
    slots.every((s) => s.endsAt.getTime() - s.startsAt.getTime() === 3_600_000),
  );
  check(
    "slots come back in chronological order",
    slots.every((s, i) => i === 0 || s.startsAt >= slots[i - 1].startsAt),
  );
}

{
  // A 90-minute session does not fit twice into a 3-hour window without
  // spilling, so the window yields exactly two.
  const slots = generateSlots({ ...baseOptions, durationMinutes: 90, horizonDays: 7 });
  check("a 90-minute session fits twice in a 3-hour window", slots.length === 2, String(slots.length));
  check(
    "and never overruns the window",
    slots.every((s) => s.endsAt.toISOString() <= "2026-08-04T16:00:00.000Z"),
  );
}

{
  // Saturday noon + 96h is Wednesday noon UTC, which clears the whole of the
  // first Tuesday. (72h would not: it lands at Tuesday 08:00 EDT, before the
  // 09:00 slot, so that Tuesday would legitimately still be on offer.)
  const slots = generateSlots({ ...baseOptions, minNoticeHours: 96 });
  check(
    "the notice period hides slots that are too soon",
    slots.every((s) => s.startsAt >= new Date("2026-08-05T12:00:00.000Z")),
  );
  check("but leaves the following week", slots.length === 3, String(slots.length));
}

{
  const busy = [
    {
      startsAt: new Date("2026-08-04T13:00:00.000Z"),
      endsAt: new Date("2026-08-04T14:00:00.000Z"),
    },
  ];
  const slots = generateSlots({ ...baseOptions, busy, horizonDays: 7 });
  check("an existing booking removes its slot", slots.length === 2, String(slots.length));
  check(
    "and it is the right one that went",
    !slots.some((s) => s.startsAt.toISOString() === "2026-08-04T13:00:00.000Z"),
  );
}

{
  // A 30-minute block in the middle of an hour slot still kills that hour: the
  // session cannot fit around it.
  const busy = [
    {
      startsAt: new Date("2026-08-04T14:30:00.000Z"),
      endsAt: new Date("2026-08-04T15:00:00.000Z"),
    },
  ];
  const slots = generateSlots({ ...baseOptions, busy, horizonDays: 7 });
  check(
    "a partial overlap still blocks the slot",
    !slots.some((s) => s.startsAt.toISOString() === "2026-08-04T14:00:00.000Z"),
    JSON.stringify(slots.map((s) => s.startsAt.toISOString())),
  );
  check("neighbouring slots survive", slots.length === 2, String(slots.length));
}

{
  // Back-to-back is not an overlap: a session ending at 14:00 must not block
  // one starting at 14:00.
  const busy = [
    {
      startsAt: new Date("2026-08-04T13:00:00.000Z"),
      endsAt: new Date("2026-08-04T14:00:00.000Z"),
    },
  ];
  const slots = generateSlots({ ...baseOptions, busy, horizonDays: 7 });
  check(
    "an adjacent booking does not block the next slot",
    slots.some((s) => s.startsAt.toISOString() === "2026-08-04T14:00:00.000Z"),
  );
}

{
  const slots = generateSlots({ ...baseOptions, horizonDays: 1 });
  check("the horizon closes the calendar", slots.length === 0, String(slots.length));
}

{
  check("no rules means nothing is bookable", generateSlots({ ...baseOptions, rules: [] }).length === 0);
}

{
  // Overlapping rules for the same day must not produce the same start twice.
  const overlapping: AvailabilityRule[] = [
    { weekday: 2, startMinute: 9 * 60, endMinute: 12 * 60 },
    { weekday: 2, startMinute: 9 * 60, endMinute: 11 * 60 },
  ];
  const slots = generateSlots({ ...baseOptions, rules: overlapping, horizonDays: 7 });
  const starts = slots.map((s) => s.startsAt.toISOString());
  check("overlapping rules do not duplicate slots", new Set(starts).size === starts.length);
}

{
  // Across the US DST boundary (1 Nov 2026) the wall-clock rule must hold: both
  // Tuesdays are 09:00 locally even though the UTC instants differ.
  const slots = generateSlots({
    ...baseOptions,
    now: new Date("2026-10-25T12:00:00.000Z"),
    horizonDays: 14,
  });
  const firstOfDay = new Map<string, string>();
  for (const slot of slots) {
    const local = localCalendarDate(slot.startsAt, "America/New_York");
    const key = `${local.year}-${local.month}-${local.day}`;
    if (!firstOfDay.has(key)) firstOfDay.set(key, slot.startsAt.toISOString());
  }
  const instants = [...firstOfDay.values()];
  check(
    "the rule stays at 09:00 local across a DST change",
    instants.includes("2026-10-27T13:00:00.000Z") && instants.includes("2026-11-03T14:00:00.000Z"),
    JSON.stringify(instants),
  );
}

// ---------------------------------------------------------------------------
group("Booking validation");

{
  check(
    "an offered slot validates",
    isSlotAvailable(new Date("2026-08-04T13:00:00.000Z"), baseOptions),
  );
  check(
    "an instant outside the mentor's hours does not",
    !isSlotAvailable(new Date("2026-08-04T20:00:00.000Z"), baseOptions),
  );
  check(
    "nor does one that is merely close",
    !isSlotAvailable(new Date("2026-08-04T13:30:00.000Z"), baseOptions),
  );
  check(
    "nor does one inside the notice period",
    !isSlotAvailable(new Date("2026-08-04T13:00:00.000Z"), {
      ...baseOptions,
      minNoticeHours: 96,
    }),
  );
  check(
    "nor one already taken",
    !isSlotAvailable(new Date("2026-08-04T13:00:00.000Z"), {
      ...baseOptions,
      busy: [
        {
          startsAt: new Date("2026-08-04T13:00:00.000Z"),
          endsAt: new Date("2026-08-04T14:00:00.000Z"),
        },
      ],
    }),
  );
}

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);
