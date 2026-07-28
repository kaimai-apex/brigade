#!/usr/bin/env node
/**
 * Architecture check.
 *
 * The layer boundaries in the plan are a suggestion until something rejects a
 * violation. This is that something. Run in CI on every PR and from the
 * pre-push hook.
 *
 * Usage: node scripts/check-architecture.mjs [--verbose]
 */
import { readFileSync, existsSync } from "node:fs";
import { readdir } from "node:fs/promises";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const CORE = "packages/core/src";
const CONTROLLERS = "apps/web/src/app/api";

const WRITE_SQL = /\b(INSERT\s+INTO|UPDATE\s+\w|DELETE\s+FROM|ALTER\s+TABLE|DROP\s+TABLE)\b/i;

/**
 * Strip comments before matching.
 *
 * Without this, a rule fires on its own explanation — a doc comment saying
 * "serializers never query" trips the no-query rule. A lint rule that flags
 * prose is one people learn to disable, so the checks only ever look at code.
 * Line positions are preserved so reported line numbers stay accurate.
 */
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
        .map(([line, n]) => `line ${n} writes to the database: ${String(line).trim().slice(0, 70)}`),
  },
  {
    name: "Workers may not contain business logic — they call a service",
    applies: (f) => f.startsWith(`${CORE}/workers`) && !f.endsWith("base_worker.ts"),
    check: (src) =>
      WRITE_SQL.test(src)
        ? ["contains SQL; a worker must delegate to a service"]
        : [],
  },
  {
    name: "Services may not import controllers",
    applies: (f) => f.startsWith(`${CORE}/services`),
    check: (src) =>
      [...src.matchAll(/from\s+["']([^"']+)["']/g)]
        .filter(([, spec]) => /(controllers|app\/api)/.test(spec))
        .map(([, spec]) => `imports a controller: ${spec}`),
  },
  {
    name: "Serializers may not perform queries",
    applies: (f) => f.startsWith(`${CORE}/serializers`),
    check: (src) =>
      /\.(query|execute|findMany|findFirst)\s*\(/.test(src) || /\bSELECT\s+[\w*]/i.test(src)
        ? ["performs a query; serializers receive preloaded data (N+1 defence)"]
        : [],
  },
  {
    // Exit criterion for the service layer: NotifyService is the ONLY place a
    // notification is created. Scattered across a dozen services, muting,
    // batching, digests and per-type preferences each have to be implemented a
    // dozen times — and one will be missed.
    name: "Notifications are created only by NotifyService",
    applies: (f) => !f.endsWith("notify_service.ts"),
    check: (src) =>
      /INSERT\s+INTO\s+brigade\.notifications/i.test(src)
        ? ["writes brigade.notifications directly; call NotifyService instead"]
        : [],
  },
  {
    name: "Nothing in the core imports from the client",
    applies: (f) => f.startsWith(CORE),
    check: (src) =>
      [...src.matchAll(/from\s+["']([^"']+)["']/g)]
        .filter(([, spec]) => /(^|\/)(client|apps\/web)\//.test(spec))
        .map(([, spec]) => `imports client code: ${spec}`),
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
      if (["node_modules", ".next", "dist", ".turbo"].includes(entry.name)) continue;
      yield* walk(rel);
    } else if (/\.(ts|tsx|mts)$/.test(entry.name)) {
      yield rel;
    }
  }
}

const violations = [];
for (const dir of [CORE, CONTROLLERS]) {
  for await (const file of walk(dir)) {
    const src = stripComments(readFileSync(path.join(ROOT, file), "utf8"));
    for (const rule of RULES) {
      if (!rule.applies(file)) continue;
      for (const detail of rule.check(src, file)) {
        violations.push({ file, rule: rule.name, detail });
      }
    }
  }
}

/**
 * Baseline ratchet.
 *
 * The layering is being introduced to a codebase that already exists, so a
 * handful of violations predate the rule. They are listed in
 * .architecture-baseline.json and allowed — but the list can only shrink:
 * a new violation fails the build, and a baseline entry that no longer occurs
 * also fails, so fixing one forces removing it from the list.
 */
const BASELINE_PATH = path.join(ROOT, ".architecture-baseline.json");
const baseline = existsSync(BASELINE_PATH)
  ? JSON.parse(readFileSync(BASELINE_PATH, "utf8")).allowed ?? []
  : [];

const key = (v) => `${v.file}::${v.rule}`;
const seen = new Set(violations.map(key));

const unexpected = violations.filter((v) => !baseline.includes(key(v)));
const stale = baseline.filter((entry) => !seen.has(entry));

if (unexpected.length === 0 && stale.length === 0) {
  const suffix = baseline.length ? `, ${baseline.length} baselined` : "";
  console.log(`architecture: OK (${RULES.length} rules${suffix})`);
  process.exit(0);
}

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

process.exit(1);
