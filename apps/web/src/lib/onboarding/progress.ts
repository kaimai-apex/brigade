/**
 * How far through onboarding someone is, and how far is left.
 *
 * The flow used to carry a hand-written `percent` on each step, copied from the
 * PRD. Four consecutive questions shared one number, so the bar sat perfectly
 * still while somebody answered four things — which reads as "this is not
 * working" or "this is endless", and both of those close the tab. A progress
 * bar earns its space only by moving when something happens, so the number is
 * computed from position now and every single answer nudges it.
 *
 * The estimate is the other half. "Six questions left" is a number people can
 * act on; an unlabelled bar is a number they can only worry about. It is
 * derived from the real remaining steps and a per-kind cost, so it goes down
 * when they answer and it is never a comforting fiction.
 *
 * This module imports nothing, on purpose — like `disclosure.ts`, it is the
 * part of the flow that can be asserted directly in a spec, and the spec runner
 * resolves imports literally.
 */

/** The bit of a step this module needs. Structurally satisfied by `MenteeStep`. */
export interface ProgressStep {
  id: string;
  phase: string;
  kind: string;
  /** The single profile column this step writes. */
  field?: string;
  /** The several columns a `fields` step writes. */
  fields?: readonly { name: string }[];
  optional?: boolean;
}

/**
 * Roughly how long each kind of question takes, in seconds.
 *
 * Measured by reading them out loud and answering honestly, not by optimism.
 * Only the relative sizes matter — a multi-select genuinely costs more than a
 * tap, and the estimate is wrong in a way people notice if that is flattened.
 */
const SECONDS_BY_KIND: Record<string, number> = {
  welcome: 2,
  single: 5,
  multi: 11,
  text: 22,
  fields: 12,
  toggles: 7,
};

const DEFAULT_SECONDS = 8;

/**
 * Where the bar sits on a given step, 1–99.
 *
 * Never 0: an empty bar on the first screen says "you have got nowhere", when
 * in fact they have just arrived. Never 100 either — that belongs to the screen
 * after the last one, and a bar that fills before the work is done is a lie
 * people remember.
 */
export function progressPercent(index: number, total: number): number {
  if (total <= 0) return 0;
  const clamped = Math.min(Math.max(index, 0), total - 1);
  return Math.round(((clamped + 1) / (total + 1)) * 100);
}

/** Seconds of work left from `index` onward, inclusive. */
export function remainingSeconds(steps: readonly ProgressStep[], index: number): number {
  return steps
    .slice(Math.max(index, 0))
    .reduce((total, step) => total + (SECONDS_BY_KIND[step.kind] ?? DEFAULT_SECONDS), 0);
}

/**
 * The estimate, in words.
 *
 * Rounded up, always: someone told "about a minute" who spends ninety seconds
 * has been misled, and someone told "about two" who spends ninety has been
 * given a small gift. The bands are coarse because a countdown to the second
 * would be a stopwatch, and nobody answers honestly against a stopwatch.
 */
export function timeRemainingLabel(seconds: number): string {
  if (seconds <= 0) return "Done";
  if (seconds <= 20) return "One more";
  if (seconds <= 75) return "Under a minute left";
  const minutes = Math.ceil(seconds / 60);
  return `About ${minutes} min left`;
}

/** How many questions are left after this one — the honest count. */
export function questionsRemaining(steps: readonly ProgressStep[], index: number): number {
  return steps.slice(index + 1).filter((step) => step.kind !== "welcome").length;
}

/**
 * Whether moving from `index` to the next step crosses into a new section.
 *
 * This is what a celebration is allowed to hang off. Celebrating every answer
 * makes the celebration worth nothing; celebrating a section is a real edge in
 * the flow, and it happens about five times, which is roughly how often praise
 * stays believable.
 */
export function isPhaseBoundary(steps: readonly ProgressStep[], index: number): boolean {
  const current = steps[index];
  const next = steps[index + 1];
  if (!current || !next) return false;
  return current.phase !== next.phase;
}

/** The columns a step is responsible for. */
export function fieldsOf(step: ProgressStep): string[] {
  if (step.field) return [step.field];
  return (step.fields ?? []).map((field) => field.name);
}

/** Whether an answer exists — an empty string or empty list is not an answer. */
export function hasAnswer(value: unknown): boolean {
  if (value === null || value === undefined) return false;
  if (typeof value === "string") return value.trim().length > 0;
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === "boolean") return value;
  return true;
}

/** Whether a step counts as answered: any one of its columns is filled. */
export function isStepAnswered(step: ProgressStep, answers: Record<string, unknown>): boolean {
  if (step.kind === "welcome") return true;
  const fields = fieldsOf(step);
  if (fields.length === 0) return true;
  return fields.some((field) => hasAnswer(answers[field]));
}

/** How many real questions have been answered so far. */
export function answeredCount(
  steps: readonly ProgressStep[],
  answers: Record<string, unknown>,
): number {
  return steps.filter((step) => step.kind !== "welcome" && isStepAnswered(step, answers)).length;
}

/**
 * Where someone should land when they come back.
 *
 * Onboarding is long enough that people leave in the middle of it, and being
 * put back on "Welcome to Brigade" after answering nine questions reads as
 * having lost them. So: a member with nothing saved starts at the beginning,
 * and everyone else resumes at the first thing they still have to answer.
 *
 * Only required steps can hold the resume point. Skipping is a real answer —
 * treating a deliberate skip as unfinished business would drop someone back
 * onto the one question they had already decided not to answer.
 */
export function resumeIndex(
  steps: readonly ProgressStep[],
  answers: Record<string, unknown>,
): number {
  if (steps.length === 0) return 0;
  if (answeredCount(steps, answers) === 0) return 0;

  const next = steps.findIndex(
    (step) => !step.optional && step.kind !== "welcome" && !isStepAnswered(step, answers),
  );
  return next === -1 ? steps.length - 1 : next;
}

/**
 * The sections and how many questions each holds.
 *
 * Shown on the welcome screen, because the worst thing about a multi-step form
 * is not its length — it is not knowing its length. Four named sections with
 * counts is a shape someone can hold in their head and decide to start; an
 * unlabelled "step 1" could be the first of five or the first of fifty, and
 * people assume fifty.
 */
export function phaseOutline(
  steps: readonly ProgressStep[],
): { phase: string; questions: number }[] {
  const outline: { phase: string; questions: number }[] = [];
  for (const step of steps) {
    if (step.kind === "welcome") continue;
    const last = outline[outline.length - 1];
    if (last && last.phase === step.phase) last.questions += 1;
    else outline.push({ phase: step.phase, questions: 1 });
  }
  return outline;
}

/**
 * What the flow says when a section is finished.
 *
 * Specific to the section, and about what the person just did rather than how
 * we feel about it. "Great job!" after every screen is noise; "that is the part
 * the matching runs on" is a reason to have bothered.
 */
export function milestoneMessage(phase: string): string {
  const messages: Record<string, string> = {
    Welcome: "Let's go",
    "About you": "That's the introductions done",
    Background: "Good — we know where you're coming from",
    Interests: "That's the part the matching actually runs on",
    Goals: "Now we know what you're aiming at",
    Mentorship: "Last stretch — just your profile left",
    "Your profile": "That's everything",
  };
  return messages[phase] ?? "Section complete";
}
