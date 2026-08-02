/**
 * The shared vocabulary, and the ranking built on it.
 *
 * Run: node --experimental-strip-types apps/web/spec/onboarding.spec.ts
 *
 * These two modules are pure, and they are where a quiet mistake is most
 * expensive: a taxonomy that drifts stops the two sides matching at all, and a
 * weighting bug produces recommendations that look plausible and are wrong.
 * Neither failure shows up as an error — which is exactly why they are tested
 * directly rather than through the UI.
 */
import {
  INDUSTRIES,
  SKILLS,
  GOALS,
  HELP_TYPES,
  HOSPITALITY_ROLES,
  EXPERIENCE_LEVELS,
  MENTOR_EXPERIENCE_PREFERENCE,
  MENTEE_TYPES,
  keepKnown,
  keepTags,
  minYearsForPreference,
} from "../src/lib/onboarding/taxonomy.ts";
import {
  scoreMentor,
  rankMentors,
  summariseReasons,
  timezoneDistanceHours,
  WEIGHTS,
  MIN_USEFUL_SCORE,
  type MenteeSignals,
  type MentorSignals,
} from "../src/lib/onboarding/matching.ts";

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
group("Taxonomy");

{
  const lists = { INDUSTRIES, SKILLS, GOALS, HELP_TYPES, HOSPITALITY_ROLES, MENTEE_TYPES };
  for (const [name, list] of Object.entries(lists)) {
    check(`${name} is non-empty`, list.length > 0);
    check(
      `${name} has no duplicates`,
      new Set(list.map((v) => v.toLowerCase())).size === list.length,
    );
    check(
      `${name} entries are trimmed`,
      list.every((v) => v === v.trim() && v.length > 0),
    );
  }

  // The whole design rests on this: a mentee picks from SKILLS and a mentor
  // picks from SKILLS, so an exact string compare is a real match.
  check("skills read both ways", SKILLS.includes("Food costing"));
  check("help types are formats, not subjects", HELP_TYPES.includes("Mock interviews"));

  check(
    "every experience level has a floor",
    EXPERIENCE_LEVELS.every((e) => typeof e.minYears === "number" && e.minYears >= 0),
  );
  check(
    "experience floors ascend",
    EXPERIENCE_LEVELS.map((e) => e.minYears).every((v, i, all) => i === 0 || v >= all[i - 1]),
  );
  check("'no preference' asks for nothing", minYearsForPreference("any") === 0);
  check("'10+' asks for ten", minYearsForPreference("10+") === 10);
  check("an unknown preference asks for nothing", minYearsForPreference("nonsense") === 0);
  check(
    "every mentor-experience option is a known shape",
    MENTOR_EXPERIENCE_PREFERENCE.every((e) => e.value.length > 0 && e.label.length > 0),
  );
}

{
  // These land in text[] columns the matcher and the directory facets read, so
  // anything not on the list has to be dropped at the boundary.
  check("keepKnown drops unknown values", keepKnown(["Leadership", "Nonsense"], SKILLS).length === 1);
  check("keepKnown de-duplicates", keepKnown(["Leadership", "Leadership"], SKILLS).length === 1);
  check("keepKnown trims", keepKnown(["  Leadership  "], SKILLS)[0] === "Leadership");
  check("keepKnown rejects non-arrays", keepKnown("Leadership", SKILLS).length === 0);
  check("keepKnown rejects non-strings", keepKnown([1, null, {}], SKILLS).length === 0);

  check("keepTags allows free text", keepTags(["Sourdough"]).length === 1);
  check(
    "keepTags de-duplicates case-insensitively",
    keepTags(["Pastry", "pastry", "PASTRY"]).length === 1,
  );
  check("keepTags caps the list", keepTags(Array.from({ length: 50 }, (_, i) => `t${i}`)).length === 12);
  check("keepTags drops blanks", keepTags(["", "   ", "Real"]).length === 1);
}

// ---------------------------------------------------------------------------
group("Matching");

const mentee: MenteeSignals = {
  skillsWanted: ["Food costing", "Menu development"],
  helpWanted: ["Business strategy"],
  interestIndustries: ["Private chef"],
  languages: ["English"],
  timezone: "America/New_York",
  minMentorYears: minYearsForPreference("10+"),
  experienceLevel: "student",
};

function mentor(overrides: Partial<MentorSignals> = {}): MentorSignals {
  return {
    userId: "m1",
    expertise: [],
    helpOffered: [],
    industries: [],
    languages: [],
    menteeTypes: [],
    timezone: "America/New_York",
    yearsExperience: null,
    activeSessionCount: 1,
    ...overrides,
  };
}

{
  // A far timezone too — the default fixture sits in the mentee's own zone,
  // which is itself a match and would make this a weaker assertion than it looks.
  const none = scoreMentor(mentee, mentor({ timezone: "Asia/Tokyo" }));
  check("a mentor with nothing in common barely scores", none.score === WEIGHTS.hasSessions, String(none.score));
  check("and gets no reasons", none.reasons.length === 0, JSON.stringify(none.reasons));

  const oneSkill = scoreMentor(mentee, mentor({ expertise: ["Food costing"] }));
  check("a shared skill is the strongest single signal", oneSkill.score > WEIGHTS.help * 2);
  check("and it explains itself", oneSkill.reasons[0]?.label === "Food costing");

  // Case should not decide whether two people match.
  const casing = scoreMentor(mentee, mentor({ expertise: ["food COSTING"] }));
  check("matching ignores case", casing.reasons.some((r) => r.kind === "skill"));

  const twoSkills = scoreMentor(mentee, mentor({ expertise: ["Food costing", "Menu development"] }));
  check("two shared skills beat one", twoSkills.score > oneSkill.score);

  // Ticking every box must not beat being right about the few that matter.
  const stuffed = scoreMentor(
    mentee,
    mentor({ expertise: [...SKILLS] }),
  );
  const focused = scoreMentor(
    mentee,
    mentor({ expertise: ["Food costing", "Menu development"], helpOffered: ["Business strategy"] }),
  );
  check("overlap is capped, so keyword stuffing does not win", stuffed.score <= focused.score, `${stuffed.score} vs ${focused.score}`);

  const help = scoreMentor(mentee, mentor({ helpOffered: ["Business strategy"] }));
  check("help type counts", help.reasons.some((r) => r.kind === "help"));
  check("but less than a skill", help.score < oneSkill.score);

  const industry = scoreMentor(mentee, mentor({ industries: ["Private chef"] }));
  check("industry counts", industry.reasons.some((r) => r.kind === "industry"));

  const language = scoreMentor(mentee, mentor({ languages: ["English"] }));
  check("a shared language counts", language.reasons.some((r) => r.kind === "language"));
}

{
  // Seniority is only credited when the mentee asked for it AND the mentor has it.
  const senior = scoreMentor(mentee, mentor({ yearsExperience: 15 }));
  check("a mentor meeting the experience ask is credited", senior.reasons.some((r) => r.kind === "experience"));
  const junior = scoreMentor(mentee, mentor({ yearsExperience: 2 }));
  check("one who does not is not", !junior.reasons.some((r) => r.kind === "experience"));
  const noAsk = scoreMentor(
    { ...mentee, minMentorYears: minYearsForPreference("any") },
    mentor({ yearsExperience: 15 }),
  );
  check("no preference means no experience credit", !noAsk.reasons.some((r) => r.kind === "experience"));
}

{
  const wantsStudents = scoreMentor(mentee, mentor({ menteeTypes: ["Students"] }));
  check("a mentor who wants students is credited for a student", wantsStudents.reasons.some((r) => r.kind === "menteeType"));

  const wantsFounders = scoreMentor(mentee, mentor({ menteeTypes: ["Founders and owners"] }));
  check("one who wants founders is not", !wantsFounders.reasons.some((r) => r.kind === "menteeType"));

  // "Anyone who asks" is a real answer and must not be punished.
  const open = scoreMentor(mentee, mentor({ menteeTypes: ["Anyone who asks"] }));
  check("'anyone who asks' still counts", open.reasons.some((r) => r.kind === "menteeType"));
  check("but less than naming the stage", open.score < wantsStudents.score);
}

{
  check("same zone is zero hours apart", (timezoneDistanceHours("America/New_York", "America/New_York") ?? -1) === 0);
  check("New York and Los Angeles are three", (timezoneDistanceHours("America/New_York", "America/Los_Angeles") ?? 0) === 3);
  check("New York and Tokyo are far", (timezoneDistanceHours("America/New_York", "Asia/Tokyo") ?? 0) > 10);
  check("an unknown zone is not an error", timezoneDistanceHours("Not/AZone", "UTC") === null);
  check("a missing zone is not an error", timezoneDistanceHours(null, "UTC") === null);

  const near = scoreMentor(mentee, mentor({ timezone: "America/Chicago" }));
  check("a workable timezone counts", near.reasons.some((r) => r.kind === "timezone"));
  const far = scoreMentor(mentee, mentor({ timezone: "Asia/Tokyo" }));
  check("an unworkable one does not", !far.reasons.some((r) => r.kind === "timezone"));
}

// ---------------------------------------------------------------------------
group("Ranking");

{
  const good = (id: string, extra: Partial<MentorSignals> = {}) =>
    mentor({ userId: id, expertise: ["Food costing"], ...extra });

  const ranked = rankMentors(mentee, [
    good("a"),
    good("b", { expertise: ["Food costing", "Menu development"] }),
    good("c"),
    mentor({ userId: "z" }),
  ]);

  check("the best match leads", ranked.matches[0]?.mentorUserId === "b");
  check("mentors with nothing in common are dropped", !ranked.matches.some((m) => m.mentorUserId === "z"));
  check("three good matches is confident", ranked.confident);

  // A list that reshuffles between refreshes looks broken.
  const first = rankMentors(mentee, [good("c"), good("a")]).matches.map((m) => m.mentorUserId);
  const second = rankMentors(mentee, [good("a"), good("c")]).matches.map((m) => m.mentorUserId);
  check("ties are ordered stably", JSON.stringify(first) === JSON.stringify(second), first.join(","));

  check("the limit is respected", rankMentors(mentee, Array.from({ length: 30 }, (_, i) => good(`m${i}`)), { limit: 5 }).matches.length === 5);
}

{
  // The two ways a "picked for you" heading would be a lie.
  const silent: MenteeSignals = {
    ...mentee,
    skillsWanted: [],
    helpWanted: [],
    interestIndustries: [],
  };
  check(
    "a member who told us nothing gets no confident recommendations",
    !rankMentors(silent, [mentor({ expertise: ["Food costing"] })]).confident,
  );
  check(
    "too few matches is not confident either",
    !rankMentors(mentee, [mentor({ userId: "a", expertise: ["Food costing"] })]).confident,
  );
  check(
    "but the matches are still returned for the caller to show as browsing",
    rankMentors(mentee, [mentor({ userId: "a", expertise: ["Food costing"] })]).matches.length === 1,
  );
  check("the bar is at least one real skill match", MIN_USEFUL_SCORE === WEIGHTS.skill);
}

{
  const withSkill = scoreMentor(mentee, mentor({ expertise: ["Food costing"] }));
  check("a match summarises as its strongest reason", summariseReasons(withSkill.reasons) === "Teaches Food costing");
  check("no reasons summarises to nothing", summariseReasons([]) === "");
}

console.log(`\n${passed} passed, ${failed} failed`);
// process.exitCode rather than process.exit(): Node can SIGSEGV in its own
// static-destructor teardown when exit() is called. See scripts/README-exit-codes.md.
process.exitCode = failed === 0 ? 0 : 1;
