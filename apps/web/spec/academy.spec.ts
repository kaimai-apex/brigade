/**
 * Application validation — what may and may not become a submitted application.
 *
 * Run: node --experimental-strip-types apps/web/spec/academy.spec.ts
 */
import {
  APPLICATION_QUESTIONS,
  applicationSections,
  validateAnswers,
} from "../src/lib/academy/application-form.ts";

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

/** A complete, valid answer set built from the question list itself. */
function completeAnswers(): Record<string, unknown> {
  const answers: Record<string, unknown> = {};
  for (const question of APPLICATION_QUESTIONS) {
    if (!question.required) continue;
    if (question.kind === "number") answers[question.id] = 8;
    else if (question.kind === "select") answers[question.id] = question.options![0];
    else answers[question.id] = "A real answer.";
  }
  return answers;
}

/* -- happy path ------------------------------------------------------------ */

const good = validateAnswers(completeAnswers());
check("a complete set validates", good.ok);
if (good.ok) {
  check(
    "years is coerced to a number",
    typeof good.answers.yearsExperience === "number",
    typeof good.answers.yearsExperience,
  );
}

/* -- required answers ------------------------------------------------------ */

const missingOne = completeAnswers();
delete missingOne.whyNow;
const bad = validateAnswers(missingOne);
check("a missing required answer fails", !bad.ok);
check(
  "the failure names the question",
  !bad.ok && bad.invalid.includes("whyNow"),
  !bad.ok ? bad.invalid.join(",") : "",
);

const blank = completeAnswers();
blank.whyPrivate = "   ";
const blankResult = validateAnswers(blank);
check("whitespace is not an answer", !blankResult.ok);

/* -- optional answers ------------------------------------------------------ */

const optionalOmitted = validateAnswers(completeAnswers());
check("optional answers may be absent", optionalOmitted.ok);

/* -- select options -------------------------------------------------------- */

const badSelect = completeAnswers();
badSelect.travel = "To the moon";
const badSelectResult = validateAnswers(badSelect);
check("an off-list select value is rejected", !badSelectResult.ok);
check(
  "the rejected select is named",
  !badSelectResult.ok && badSelectResult.invalid.includes("travel"),
);

/* -- numbers --------------------------------------------------------------- */

for (const [label, value] of [
  ["negative years", -1],
  ["absurd years", 500],
  ["non-numeric years", "eight"],
] as const) {
  const answers = completeAnswers();
  answers.yearsExperience = value;
  check(`${label} is rejected`, !validateAnswers(answers).ok);
}

const decimal = completeAnswers();
decimal.yearsExperience = "8.6";
const decimalResult = validateAnswers(decimal);
check(
  "a decimal year is rounded",
  decimalResult.ok && decimalResult.answers.yearsExperience === 9,
  decimalResult.ok ? String(decimalResult.answers.yearsExperience) : "invalid",
);

/* -- unknown keys ---------------------------------------------------------- */

const extra = completeAnswers();
extra.notAQuestion = "should be dropped";
const extraResult = validateAnswers(extra);
check("unknown keys do not fail the set", extraResult.ok);
check(
  "unknown keys are dropped, not stored",
  extraResult.ok && !("notAQuestion" in extraResult.answers),
);

/* -- long answers are capped ----------------------------------------------- */

const long = completeAnswers();
long.whyPrivate = "x".repeat(9000);
const longResult = validateAnswers(long);
const cap = APPLICATION_QUESTIONS.find((q) => q.id === "whyPrivate")!.maxLength!;
check(
  "a long answer is truncated to its cap",
  longResult.ok && String(longResult.answers.whyPrivate).length === cap,
  longResult.ok ? String(String(longResult.answers.whyPrivate).length) : "invalid",
);

/* -- the form definition itself -------------------------------------------- */

const ids = APPLICATION_QUESTIONS.map((q) => q.id);
check("question ids are unique", new Set(ids).size === ids.length);
check(
  "every select question has options",
  APPLICATION_QUESTIONS.every((q) => q.kind !== "select" || (q.options?.length ?? 0) > 0),
);
check(
  "sections cover every question",
  applicationSections().reduce((sum, s) => sum + s.questions.length, 0) ===
    APPLICATION_QUESTIONS.length,
);

console.log(`\n${passed} passed, ${failed} failed`);
process.exitCode = failed === 0 ? 0 : 1;
