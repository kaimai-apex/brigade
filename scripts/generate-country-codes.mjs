#!/usr/bin/env node
/**
 * Generate the country list for phone capture.
 *
 * Generated rather than hand-maintained: a hand-written array of 250 countries
 * goes stale, and the ones that get dropped are always the same ones — the
 * small territories whose users then cannot sign up.
 *
 * Sources, both already in the tree:
 *   * libphonenumber-js — every calling code it can validate against
 *   * Intl.DisplayNames — country names, no dependency
 *
 * The output is committed so the server and client render identical strings.
 * Computing names at runtime risks a hydration mismatch, because ICU data
 * differs between Node versions and browsers.
 *
 * Usage: pnpm generate:countries
 */
import { writeFileSync } from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { getCountries, getCountryCallingCode } = require(
  path.resolve(import.meta.dirname, "../apps/web/node_modules/libphonenumber-js"),
);

const OUT = path.resolve(
  import.meta.dirname,
  "../apps/web/src/lib/waitlist/country-codes.ts",
);

const displayName = new Intl.DisplayNames(["en"], { type: "region" });

/** Regional indicator symbols: 'US' → 🇺🇸. Derived, never a lookup table. */
function flagOf(iso) {
  return String.fromCodePoint(
    ...[...iso].map((ch) => 0x1f1e6 + ch.charCodeAt(0) - 65),
  );
}

/** A few territories Intl has no name for; libphonenumber knows them. */
const NAME_OVERRIDES = {
  AC: "Ascension Island",
  TA: "Tristan da Cunha",
  XK: "Kosovo",
};

const countries = getCountries()
  .map((iso) => {
    const name = NAME_OVERRIDES[iso] ?? displayName.of(iso) ?? iso;
    return {
      iso,
      dial: `+${getCountryCallingCode(iso)}`,
      name,
      flag: flagOf(iso),
    };
  })
  // Alphabetical by name: the only ordering a person can navigate by typing.
  .sort((a, b) => a.name.localeCompare(b.name, "en"));

const dialCodes = [...new Set(countries.map((c) => c.dial))].sort(
  (a, b) => Number(a.slice(1)) - Number(b.slice(1)),
);

const file = `// GENERATED FILE — do not edit by hand.
// Run \`pnpm generate:countries\` to rebuild from libphonenumber-js.
//
// ${countries.length} countries and territories, ${dialCodes.length} distinct calling codes.
//
// Note that a dialing code is NOT unique: +1 covers ${
  countries.filter((c) => c.dial === "+1").length
} territories including
// the US and Canada, and +7 covers Russia and Kazakhstan. The ISO code is the
// identity; the dialing code is an attribute of it.

export type Country = {
  /** ISO 3166-1 alpha-2. Unique — use this as the option value. */
  iso: string;
  /** E.164 calling code, e.g. "+1". Shared between countries. */
  dial: string;
  name: string;
  flag: string;
};

export const COUNTRIES: readonly Country[] = ${JSON.stringify(countries, null, 2)} as const;

/** Every valid calling code, for server-side validation. */
export const DIAL_CODES: ReadonlySet<string> = new Set(${JSON.stringify(dialCodes)});

const BY_ISO = new Map(COUNTRIES.map((c) => [c.iso, c]));

export function countryByIso(iso: string): Country | undefined {
  return BY_ISO.get(iso.toUpperCase());
}

export const DEFAULT_COUNTRY_ISO = "US";
export const DEFAULT_COUNTRY_CODE = "+1";
`;

writeFileSync(OUT, file);
console.log(
  `generated ${countries.length} countries, ${dialCodes.length} calling codes → ${path.relative(process.cwd(), OUT)}`,
);
