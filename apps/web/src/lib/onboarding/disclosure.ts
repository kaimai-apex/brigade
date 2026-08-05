/**
 * When a question shows its options, and when it hides them behind a menu.
 *
 * A choice screen costs the person answering it roughly in proportion to the
 * number of things they have to read before they can decide. Twenty chips is
 * twenty decisions dressed up as one, and the answer people give to that screen
 * is worse than the answer they give to a menu that opens on demand — they pick
 * from the first row and continue.
 *
 * So the rule is mechanical rather than a matter of taste: past
 * `INLINE_OPTION_LIMIT`, the options collapse behind a trigger that states the
 * question's current answer and nothing else. The threshold lives here, as one
 * number, because the point of a rule is that every screen obeys the same one.
 *
 * This module imports nothing on purpose. It is the one piece of the onboarding
 * flow that can be asserted directly in a spec (the step definitions cannot —
 * they import the taxonomy, and the spec runner resolves imports literally).
 */

export type OptionControl =
  /** Options are on screen, one tap answers. */
  | "inline"
  /** Options are behind a trigger the person opens. */
  | "dropdown";

/**
 * The most options a question may put on screen before it has to collapse.
 *
 * Five is a working number, not a law of nature: it is small enough to be read
 * as a set rather than scanned as a list, and it keeps the genuinely short
 * questions — session length, seniority — as one-tap answers, which is faster
 * than any menu. Raise or lower it here and every question in the product
 * follows.
 */
export const INLINE_OPTION_LIMIT = 5;

/**
 * Where a menu stops being scannable and needs a search box.
 *
 * Twenty skills or forty timezones are not read top to bottom; the person
 * already knows the word they are looking for and wants to type it.
 */
export const SEARCH_OPTION_LIMIT = 8;

export interface DisclosureInput {
  options?: readonly unknown[];
  /** Set only to overrule the count, and only with a reason in the step. */
  control?: OptionControl;
}

/**
 * The control a question gets, derived from its own option count.
 *
 * Derived rather than declared per question, so a list that grows past the
 * limit collapses on its own instead of waiting for someone to notice.
 */
export function controlFor(question: DisclosureInput): OptionControl {
  if (question.control) return question.control;
  return (question.options?.length ?? 0) > INLINE_OPTION_LIMIT ? "dropdown" : "inline";
}

/** Whether a menu of this many options should offer a search box. */
export function shouldSearch(optionCount: number): boolean {
  return optionCount > SEARCH_OPTION_LIMIT;
}

/**
 * What a closed multi-select trigger says.
 *
 * The answer has to survive the menu closing, or the person has to reopen it to
 * remember what they picked — which is the recall problem the menu was supposed
 * to solve. Two names and a count reads at a glance; six names wrap and stop
 * being readable at all.
 */
export function summariseSelection(labels: readonly string[], visible = 2): string {
  if (labels.length === 0) return "";
  if (labels.length <= visible) return labels.join(", ");
  return `${labels.slice(0, visible).join(", ")} +${labels.length - visible}`;
}
