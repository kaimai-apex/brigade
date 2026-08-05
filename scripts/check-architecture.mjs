#!/usr/bin/env node
/**
 * Architecture check for the mentorship app.
 *
 * Route handlers stay thin: no embedded SQL writes, no direct model imports.
 * Run in CI and from the pre-push hook.
 *
 * Usage: node scripts/check-architecture.mjs
 */
import { readFileSync, existsSync } from "node:fs";
import { readdir } from "node:fs/promises";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const CONTROLLERS = "apps/web/src/app/api";
const WRITE_SQL =
  /\b(INSERT\s+INTO|UPDATE\s+\w|DELETE\s+FROM|ALTER\s+TABLE|DROP\s+TABLE)\b/i;

function stripComments(src) {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, " "))
    .replace(/(^|[^:])\/\/[^\n]*/g, (_m, p) => p);
}

/** @type {{name: string, applies: (f: string) => boolean, check: (src: string, f: string) => string[]}[]} */
const RULES = [
  {
    name: "Controllers may not import models directly",
    applies: (f) => f.startsWith(CONTROLLERS),
    check: (src) =>
      [...src.matchAll(/^\s*import[^;]*from\s+["']([^"']+)["']/gm)]
        .filter(([, spec]) => /(^|\/)models\//.test(spec))
        .map(([, spec]) => `imports a model directly: ${spec}`),
  },
  {
    name: "Controllers may not contain DB writes",
    applies: (f) => f.startsWith(CONTROLLERS),
    check: (src) =>
      src
        .split("\n")
        .map((line, i) => [line, i + 1])
        .filter(([line]) => WRITE_SQL.test(String(line)))
        .map(
          ([line, n]) =>
            `line ${n} writes to the database: ${String(line).trim().slice(0, 70)}`,
        ),
  },
  {
    name: "Notifications are created only via notify-db",
    applies: (f) =>
      !f.endsWith("notify-db.ts") && !f.includes("/lib/server/notify-db"),
    check: (src) =>
      /INSERT\s+INTO\s+notifications\.notifications/i.test(src)
        ? ["writes notifications.notifications directly; call dbNotify instead"]
        : [],
  },
];

async function* walk(dir) {
  let entries;
  try {
    entries = await readdir(path.join(ROOT, dir), { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    const rel = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (["node_modules", ".next", "dist", ".turbo"].includes(entry.name)) {
        continue;
      }
      yield* walk(rel);
    } else if (/\.(ts|tsx|mts)$/.test(entry.name)) {
      yield rel;
    }
  }
}

const violations = [];
for await (const file of walk(CONTROLLERS)) {
  const src = stripComments(readFileSync(path.join(ROOT, file), "utf8"));
  for (const rule of RULES) {
    if (!rule.applies(file)) continue;
    for (const detail of rule.check(src, file)) {
      violations.push({ file, rule: rule.name, detail });
    }
  }
}
// Notification rule also scans lib/
for await (const file of walk("apps/web/src/lib")) {
  const src = stripComments(readFileSync(path.join(ROOT, file), "utf8"));
  for (const rule of RULES) {
    if (rule.name !== "Notifications are created only via notify-db") continue;
    if (!rule.applies(file)) continue;
    for (const detail of rule.check(src, file)) {
      violations.push({ file, rule: rule.name, detail });
    }
  }
}

const BASELINE_PATH = path.join(ROOT, ".architecture-baseline.json");
const baseline = existsSync(BASELINE_PATH)
  ? (JSON.parse(readFileSync(BASELINE_PATH, "utf8")).allowed ?? [])
  : [];

const key = (v) => `${v.file}::${v.rule}`;
const seen = new Set(violations.map(key));
const unexpected = violations.filter((v) => !baseline.includes(key(v)));
const stale = baseline.filter((entry) => !seen.has(entry));

if (unexpected.length === 0 && stale.length === 0) {
  const suffix = baseline.length ? `, ${baseline.length} baselined` : "";
  console.log(`architecture: OK (${RULES.length} rules${suffix})`);
} else {
  if (unexpected.length) {
    console.error(`architecture: ${unexpected.length} new violation(s)\n`);
    for (const v of unexpected) {
      console.error(`  ${v.file}`);
      console.error(`    ${v.rule}`);
      console.error(`    → ${v.detail}\n`);
    }
  }
  if (stale.length) {
    console.error(
      `architecture: ${stale.length} baseline entr(ies) no longer violate anything.\n` +
        `Remove them from .architecture-baseline.json — the baseline only shrinks.\n`,
    );
    for (const entry of stale) console.error(`  ${entry}`);
  }
  process.exitCode = 1;
}
