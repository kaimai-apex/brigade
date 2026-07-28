#!/usr/bin/env node
/**
 * Product guardrails.
 *
 *   1. No fake-data libraries in any package.json.
 *   2. No mock/placeholder data in application source.
 *   3. next.config must never silence type or lint errors.
 *
 * (1) and (2) exist because the app shows real records or a designed empty
 * state, and there is no third option. (3) exists because a build that passes
 * by ignoring its own errors is not a passing build.
 *
 * Usage: node scripts/check-guardrails.mjs
 */
import { readFileSync, existsSync } from "node:fs";
import { readdir } from "node:fs/promises";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");

const FAKE_DATA_DEPS = ["@faker-js/faker", "faker", "chance", "casual"];
const MOCK_TOKENS =
  /\b(mockData|dummyData|sampleData|placeholderData|MOCK_[A-Z_]+|TEST_DATA)\b|lorem ipsum/i;
const SOURCE_DIRS = ["apps/web/src", "packages/core/src"];

const failures = [];

// ---------------------------------------------------------------------------
// 1. fake-data dependencies
// ---------------------------------------------------------------------------
/**
 * Only Brigade's own workspaces — the pnpm-workspace globs plus the root.
 * Vendored reference checkouts (ui-main) are not ours to police.
 */
async function* workspacePackageJsons() {
  yield "package.json";
  for (const group of ["apps", "services", "packages"]) {
    let entries;
    try {
      entries = await readdir(path.join(ROOT, group), { withFileTypes: true });
    } catch {
      continue;
    }
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      const rel = path.join(group, entry.name, "package.json");
      if (existsSync(path.join(ROOT, rel))) yield rel;
    }
  }
}

for await (const file of workspacePackageJsons()) {
  let pkg;
  try {
    pkg = JSON.parse(readFileSync(path.join(ROOT, file), "utf8"));
  } catch {
    continue;
  }
  const declared = { ...pkg.dependencies, ...pkg.devDependencies };
  for (const dep of FAKE_DATA_DEPS) {
    if (declared[dep]) {
      failures.push(`${file}: declares "${dep}". The app renders real records or an empty state.`);
    }
  }
}

// ---------------------------------------------------------------------------
// 2. mock data in source
// ---------------------------------------------------------------------------
async function* sources(dir) {
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
      yield* sources(rel);
    } else if (/\.(ts|tsx|js|jsx|mjs)$/.test(entry.name)) {
      yield rel;
    }
  }
}

for (const dir of SOURCE_DIRS) {
  for await (const file of sources(dir)) {
    const lines = readFileSync(path.join(ROOT, file), "utf8").split("\n");
    lines.forEach((line, i) => {
      if (MOCK_TOKENS.test(line)) {
        failures.push(`${file}:${i + 1}: ${line.trim().slice(0, 80)}`);
      }
    });
  }
}

// ---------------------------------------------------------------------------
// 3. next.config must not silence errors
// ---------------------------------------------------------------------------
for (const config of ["apps/web/next.config.ts", "apps/web/next.config.mjs", "apps/web/next.config.js"]) {
  const full = path.join(ROOT, config);
  if (!existsSync(full)) continue;
  const src = readFileSync(full, "utf8");
  for (const flag of ["ignoreBuildErrors", "ignoreDuringBuilds"]) {
    if (new RegExp(`${flag}\\s*:\\s*true`).test(src)) {
      failures.push(`${config}: sets ${flag}: true — the build must not ignore its own errors.`);
    }
  }
}

if (failures.length) {
  console.error(`guardrails: ${failures.length} violation(s)\n`);
  for (const f of failures) console.error(`  ${f}`);
  process.exit(1);
}

console.log("guardrails: OK (no fake-data deps, no mock data in source, build errors not silenced)");
