#!/usr/bin/env node
/**
 * Accessibility check — axe-core against the running app.
 *
 * Not optional here. AODA makes WCAG 2.0 AA an enforceable requirement for
 * Ontario organisations and public-facing web content, and the company is
 * incorporated there. Enterprise procurement also asks for conformance
 * documentation. And a professional network that excludes disabled
 * professionals is failing at its stated purpose.
 *
 * Only `critical` and `serious` violations fail the build. Retrofitting
 * accessibility costs roughly ten times what building with it does, so the
 * gate exists from the start rather than after a complaint.
 *
 * Usage:
 *   node scripts/check-a11y.mjs                  # against http://localhost:3100
 *   BASE_URL=https://... node scripts/check-a11y.mjs
 */
import { chromium } from "playwright";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const BASE = process.env.BASE_URL ?? "http://localhost:3100";

/** Public pages only — anything behind auth needs a session and is checked
 *  separately once there is a fixture user in CI. */
const PAGES = ["/", "/demo", "/login", "/waitlist"];

const FAIL_ON = new Set(["critical", "serious"]);

async function main() {
  const axeSource = readFileSync(require.resolve("axe-core/axe.min.js"), "utf8");
  const browser = await chromium.launch();
  const failures = [];
  let checked = 0;

  for (const path of PAGES) {
    const page = await browser.newPage();
    try {
      const response = await page.goto(`${BASE}${path}`, {
        waitUntil: "networkidle",
        timeout: 30_000,
      });
      if (!response || response.status() >= 400) {
        failures.push({ path, id: "page-unavailable", impact: "critical", nodes: [String(response?.status())] });
        continue;
      }

      await page.addScriptTag({ content: axeSource });
      const results = await page.evaluate(async () => {
        // @ts-expect-error injected above
        return await window.axe.run(document, {
          resultTypes: ["violations"],
          runOnly: { type: "tag", values: ["wcag2a", "wcag2aa"] },
        });
      });

      checked += 1;
      for (const violation of results.violations) {
        if (!FAIL_ON.has(violation.impact)) continue;
        failures.push({
          path,
          id: violation.id,
          impact: violation.impact,
          help: violation.help,
          nodes: violation.nodes.slice(0, 3).map((n) => n.html.slice(0, 100)),
        });
      }
    } catch (error) {
      failures.push({
        path,
        id: "check-failed",
        impact: "critical",
        nodes: [error instanceof Error ? error.message : String(error)],
      });
    } finally {
      await page.close();
    }
  }

  await browser.close();

  if (failures.length === 0) {
    console.log(`a11y: OK (${checked} pages, 0 critical or serious WCAG 2 AA violations)`);
    process.exit(0);
  }

  console.error(`a11y: ${failures.length} violation(s)\n`);
  for (const f of failures) {
    console.error(`  ${f.path} — [${f.impact}] ${f.id}`);
    if (f.help) console.error(`    ${f.help}`);
    for (const node of f.nodes) console.error(`    → ${node}`);
    console.error("");
  }
  process.exit(1);
}

main().catch((error) => {
  console.error("a11y: could not run —", error instanceof Error ? error.message : error);
  process.exit(1);
});
