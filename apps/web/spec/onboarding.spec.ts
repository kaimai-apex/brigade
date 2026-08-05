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
  controlFor,
  shouldSearch,
  summariseSelection,
  INLINE_OPTION_LIMIT,
} from "../src/lib/onboarding/disclosure.ts";
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
import {
  answeredCount,
  isPhaseBoundary,
  isStepAnswered,
  milestoneMessage,
  phaseOutline,
  progressPercent,
  questionsRemaining,
  remainingSeconds,
  resumeIndex,
  timeRemainingLabel,
  type ProgressStep,
} from "../src/lib/onboarding/progress.ts";

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
  // Formats and subjects must stay in separate lists, or the matcher would
  // double-count the same signal under two weights.
  check(
    "help types are formats, not subjects",
    HELP_TYPES.every((help) => !SKILLS.includes(help as never)),
  );
  // This MVP is private chef mentorship only. If a role from the wider
  // hospitality world reappears here, the scope has drifted.
  check(
    "roles stay on the private chef track",
    !HOSPITALITY_ROLES.some((r) => /bartender|sommelier|server|hotel|barista/i.test(r)),
  );

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
  check("keepKnown drops unknown values", keepKnown([SKILLS[0], "Nonsense"], SKILLS).length === 1);
  check("keepKnown de-duplicates", keepKnown([SKILLS[0], SKILLS[0]], SKILLS).length === 1);
  check("keepKnown trims", keepKnown([`  ${SKILLS[0]}  `], SKILLS)[0] === SKILLS[0]);
  check("keepKnown rejects non-arrays", keepKnown(SKILLS[0], SKILLS).length === 0);
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
  interestIndustries: ["Private households"],
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

  const industry = scoreMentor(mentee, mentor({ industries: ["Private households"] }));
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

  // Three different situations needing three different sentences. Collapsing
  // them told a member browsing 219 mentors that the list was still filling up.
  check(
    "an empty marketplace says so",
    rankMentors(mentee, []).reason === "no-mentors",
  );
  check(
    "a member who answered nothing is told THAT, not that we have no mentors",
    rankMentors(silent, [mentor({ expertise: ["Food costing"] })]).reason === "no-answers",
  );
  check(
    "some matches but not enough reads as few-matches",
    rankMentors(mentee, [mentor({ userId: "a", expertise: ["Food costing"] })]).reason ===
      "few-matches",
  );
  check(
    "a good result reads as confident",
    rankMentors(mentee, [
      mentor({ userId: "a", expertise: ["Food costing"] }),
      mentor({ userId: "b", expertise: ["Food costing"] }),
      mentor({ userId: "c", expertise: ["Food costing"] }),
    ]).reason === "confident",
  );
}

{
  const withSkill = scoreMentor(mentee, mentor({ expertise: ["Food costing"] }));
  check("a match summarises as its strongest reason", summariseReasons(withSkill.reasons) === "Teaches Food costing");
  check("no reasons summarises to nothing", summariseReasons([]) === "");
}

// ---------------------------------------------------------------------------
group("Progressive disclosure");

/**
 * The rule that decides whether a question shows its options or hides them.
 *
 * It is asserted here rather than trusted to review because it is the one piece
 * of onboarding that is easy to regress silently: adding a twenty-first skill
 * to the taxonomy is a one-line change that, under any hand-declared scheme,
 * would quietly put twenty-one options back on the screen.
 */
{
  const five = ["a", "b", "c", "d", "e"];
  const six = [...five, "f"];

  check("a question at the limit stays on screen", controlFor({ options: five }) === "inline");
  check("one option past the limit collapses", controlFor({ options: six }) === "dropdown");
  check("a question with no options is inline", controlFor({}) === "inline");
  check(
    "an explicit control overrules the count",
    controlFor({ options: six, control: "inline" }) === "inline" &&
      controlFor({ options: five, control: "dropdown" }) === "dropdown",
  );
  check(
    "the limit is small enough to be read as a set",
    INLINE_OPTION_LIMIT > 0 && INLINE_OPTION_LIMIT <= 7,
    `INLINE_OPTION_LIMIT is ${INLINE_OPTION_LIMIT}`,
  );

  // The taxonomy lists are what onboarding actually asks from, so the rule is
  // checked against them and not only against invented arrays.
  const long = { SKILLS, GOALS, HELP_TYPES, INDUSTRIES, HOSPITALITY_ROLES };
  for (const [name, list] of Object.entries(long)) {
    check(
      `${name} (${list.length}) is asked as a menu, not a wall`,
      controlFor({ options: list }) === "dropdown",
    );
  }

  check("a menu long enough to need typing gets a search box", shouldSearch(SKILLS.length));
  check("a short menu does not", !shouldSearch(MENTOR_EXPERIENCE_PREFERENCE.length));
}

{
  check("nothing chosen summarises to nothing", summariseSelection([]) === "");
  check("a short answer summarises in full", summariseSelection(["Yachts", "Estates"]) === "Yachts, Estates");
  check(
    "a long answer summarises to a count, so the trigger never wraps",
    summariseSelection(["Yachts", "Estates", "Villas", "Retreats"]) === "Yachts, Estates +2",
  );
}

// ---------------------------------------------------------------------------
group("Progress");

/**
 * A stand-in for the real flow.
 *
 * Written out here rather than imported: `mentee-steps.ts` imports the taxonomy
 * without a file extension, which the app's bundler resolves and this runner
 * does not. The shape is what matters — these functions never see a real step,
 * only this interface.
 */
const FLOW: ProgressStep[] = [
  { id: "welcome", kind: "welcome", phase: "Welcome" },
  { id: "location", kind: "fields", phase: "About you", fields: [{ name: "city" }] },
  { id: "role", kind: "single", phase: "About you", field: "role" },
  { id: "skills", kind: "multi", phase: "Interests", field: "skillsWanted" },
  { id: "links", kind: "fields", phase: "Profile", optional: true, fields: [{ name: "website" }] },
  { id: "headline", kind: "fields", phase: "Profile", fields: [{ name: "headline" }] },
];

{
  check("the bar is never empty on the first screen", progressPercent(0, FLOW.length) > 0);
  check(
    "the bar is never full before the flow is",
    progressPercent(FLOW.length - 1, FLOW.length) < 100,
  );

  // The bug this replaced: four consecutive steps carried the same hand-written
  // percentage, so answering did nothing visible.
  const walk = FLOW.map((_, index) => progressPercent(index, FLOW.length));
  check(
    "every step moves the bar",
    walk.every((value, index) => index === 0 || value > walk[index - 1]),
    walk.join(" → "),
  );

  check("an empty flow does not divide by zero", progressPercent(0, 0) === 0);
  check("an index past the end is clamped", progressPercent(99, FLOW.length) < 100);
}

{
  check(
    "time left shrinks as the flow is walked",
    remainingSeconds(FLOW, 0) > remainingSeconds(FLOW, 3),
  );
  check("nothing left costs nothing", remainingSeconds(FLOW, FLOW.length) === 0);
  check("a multi-select is costed above a single tap", remainingSeconds([FLOW[3]], 0) > remainingSeconds([FLOW[2]], 0));

  check("the estimate rounds up rather than flattering", timeRemainingLabel(70) === "Under a minute left");
  check("a longer estimate is given in minutes", timeRemainingLabel(200) === "About 4 min left");
  check("the last question is not called a minute", timeRemainingLabel(12) === "One more");

  check("the welcome screen is not counted as a question", questionsRemaining(FLOW, 0) === 5);
  check("nothing remains after the last step", questionsRemaining(FLOW, FLOW.length - 1) === 0);
}

{
  check("a section ending is a boundary", isPhaseBoundary(FLOW, 0));
  check("two questions in one section are not", !isPhaseBoundary(FLOW, 1));
  check("the last step has nothing to cross into", !isPhaseBoundary(FLOW, FLOW.length - 1));

  const outline = phaseOutline(FLOW);
  check("the outline skips the welcome screen", !outline.some((entry) => entry.phase === "Welcome"));
  check(
    "the outline counts questions per section",
    outline.length === 3 && outline[0].questions === 2 && outline[2].questions === 2,
    JSON.stringify(outline),
  );

  check("every section has something to say when it ends", milestoneMessage("Interests").length > 0);
  check("an unknown section still says something", milestoneMessage("Nonsense").length > 0);
}

{
  check("a blank answer is not an answer", !isStepAnswered(FLOW[2], { role: "  " }));
  check("an empty list is not an answer", !isStepAnswered(FLOW[3], { skillsWanted: [] }));
  check("a real answer is", isStepAnswered(FLOW[3], { skillsWanted: ["Food costing"] }));
  check("a fields step is answered by any one of its fields", isStepAnswered(FLOW[1], { city: "Toronto" }));

  check("nothing answered counts as nothing", answeredCount(FLOW, {}) === 0);
  check("the welcome screen never counts", answeredCount(FLOW, { city: "Toronto" }) === 1);
}

{
  check("a brand-new member starts at the welcome screen", resumeIndex(FLOW, {}) === 0);
  check(
    "someone who left mid-flow comes back to what they had not answered",
    resumeIndex(FLOW, { city: "Toronto" }) === 2,
  );
  // A skip is a decision. Resuming onto the question someone chose not to
  // answer would argue with them about it.
  check(
    "a skipped optional step never holds the resume point",
    resumeIndex(FLOW, { city: "Toronto", role: "Private chef", skillsWanted: ["Food costing"] }) === 5,
  );
  check(
    "someone who answered everything lands on the last step, not the first",
    resumeIndex(FLOW, {
      city: "Toronto",
      role: "Private chef",
      skillsWanted: ["Food costing"],
      headline: "Chef",
    }) === FLOW.length - 1,
  );
  check("an empty flow has nowhere to resume to", resumeIndex([], {}) === 0);
}

console.log(`\n${passed} passed, ${failed} failed`);
// process.exitCode rather than process.exit(): Node can SIGSEGV in its own
// static-destructor teardown when exit() is called. See scripts/README-exit-codes.md.
process.exitCode = failed === 0 ? 0 : 1;
