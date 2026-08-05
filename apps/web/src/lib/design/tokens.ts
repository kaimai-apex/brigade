/**
 * The few colours that cannot be a CSS variable.
 *
 * Everything that lands in a CSS value — style props, SVG fill/stroke, Tailwind
 * arbitrary values — uses var(--token) and lives in app/tokens.css. This file
 * exists only for values consumed outside CSS, where a variable would render
 * literally as the string "var(--brand-gold)".
 *
 * Keep in sync with app/tokens.css. Allowlisted by scripts/check-guardrails.mjs.
 */

/** Browser UI tint (the <meta name="theme-color"> tag). Mirrors --brand-gold. */
export const THEME_COLOR = "#e8b84b";

/**
 * Email.
 *
 * Mail clients strip <style> blocks and do not resolve custom properties, so an
 * email is the one surface where the colour has to be written into the markup
 * as a literal. Kept here with the rest of the non-CSS values rather than
 * inline in the template, so a palette change is still one file.
 *
 * Mirrors --brand-white, --brand-ink, and the two greys the app uses for
 * secondary and tertiary text (ink at 65% and 55% over white, precomputed —
 * `rgba` on text is unreliable across clients).
 */
export const EMAIL_COLORS = {
  background: "#ffffff",
  text: "#1a1a17",
  muted: "#5e5e5d",
  faint: "#767675",
} as const;
