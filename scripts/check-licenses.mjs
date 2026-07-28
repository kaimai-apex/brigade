#!/usr/bin/env node
/**
 * License scan.
 *
 * Brigade's architecture is informed by reading Mastodon, which is AGPL-3.0.
 * The design is not copyrightable and no code was copied (see
 * docs/ARCHITECTURE.md), but a GPL-family dependency arriving through the
 * package tree would create the same exposure by a different route. So the
 * build fails on one.
 *
 * Usage: node scripts/check-licenses.mjs
 */
import { readFileSync, existsSync } from "node:fs";
import { readdir } from "node:fs/promises";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const MODULES = path.join(ROOT, "node_modules");

const FORBIDDEN = /\b(AGPL|GPL-2|GPL-3|GPLv2|GPLv3|SSPL|CC-BY-NC|BUSL|Commons-Clause)\b/i;
// LGPL is weak copyleft and does not trigger the network clause; allowed but
// listed so it shows up in the report.
const NOTABLE = /\bLGPL\b/i;

/** Packages known to be dual-licensed or misdeclared. Each needs a reason. */
const ALLOWLIST = new Map([
  // e.g. ["some-pkg", "dual-licensed MIT, see LICENSE.MIT"],
]);

async function* packages(dir, depth = 0) {
  if (depth > 3) return;
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    if (!entry.isDirectory() && !entry.isSymbolicLink()) continue;
    const full = path.join(dir, entry.name);
    if (entry.name.startsWith("@")) {
      yield* packages(full, depth);
      continue;
    }
    if (existsSync(path.join(full, "package.json"))) yield full;
    const nested = path.join(full, "node_modules");
    if (existsSync(nested)) yield* packages(nested, depth + 1);
  }
}

if (!existsSync(MODULES)) {
  console.error("license-scan: node_modules not found — run pnpm install first");
  process.exit(1);
}

const offenders = [];
const notable = [];
let scanned = 0;

for await (const dir of packages(MODULES)) {
  let pkg;
  try {
    pkg = JSON.parse(readFileSync(path.join(dir, "package.json"), "utf8"));
  } catch {
    continue;
  }
  if (!pkg.name) continue;
  scanned += 1;

  const license =
    typeof pkg.license === "string"
      ? pkg.license
      : pkg.license?.type ?? (Array.isArray(pkg.licenses) ? pkg.licenses.map((l) => l.type).join(", ") : "");
  if (!license) continue;

  if (FORBIDDEN.test(license)) {
    if (ALLOWLIST.has(pkg.name)) continue;
    offenders.push(`${pkg.name}@${pkg.version ?? "?"} — ${license}`);
  } else if (NOTABLE.test(license)) {
    notable.push(`${pkg.name}@${pkg.version ?? "?"} — ${license}`);
  }
}

if (notable.length) {
  console.log(`license-scan: ${notable.length} weak-copyleft package(s), allowed:`);
  for (const n of notable) console.log(`  ${n}`);
}

if (offenders.length) {
  console.error(`\nlicense-scan: ${offenders.length} forbidden license(s) in the dependency tree\n`);
  for (const o of offenders) console.error(`  ${o}`);
  console.error("\nGPL-family and source-available licenses are not permitted — see docs/ARCHITECTURE.md.");
  process.exit(1);
}

console.log(`license-scan: OK (${scanned} packages scanned, 0 forbidden)`);
