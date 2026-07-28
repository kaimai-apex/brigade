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
