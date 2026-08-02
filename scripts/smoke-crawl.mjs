#!/usr/bin/env node
/**
 * Authenticated smoke crawl of web pages + key APIs.
 * Usage: node scripts/smoke-crawl.mjs
 */
import { writeFileSync } from "node:fs";

const BASE = process.env.SMOKE_BASE ?? "http://localhost:3100";
const DEMO_PASSWORD = process.env.DEMO_PASSWORD ?? "joinbrigade";

const PAGES = [
  "/",
  "/waitlist",
  "/demo",
  "/login",
  "/login/forgot-password",
  "/feed",
  "/brigade",
  "/directory",
  "/discover",
  "/mentors",
  "/mentorship",
  "/sessions",
  "/messages",
  "/notifications",
  "/profile/me",
  "/settings/profile",
  "/settings/notifications",
  "/search",
  "/explore",
  "/explore/restaurants",
  "/explore/jobs",
  "/explore/news",
  "/explore/professionals",
  "/explore/resources",
  "/explore/suppliers",
  "/explore/map",
  "/opportunities",
  "/companies",
  "/my-brigades",
  "/onboarding",
  "/onboarding/basic-info",
  "/onboarding/experience",
  "/onboarding/education",
  "/onboarding/portfolio",
  "/onboarding/availability",
  "/onboarding/accolades",
  "/onboarding/review",
  "/admin",
  "/dashboard",
  "/network",
  "/connections",
  "/jobs",
];

const APIS = [
  { path: "/api/auth/session", ok: (s) => s === 200 },
  { path: "/api/mentorship/mentors", ok: (s) => s === 200 },
  { path: "/api/mentorship/bookings", ok: (s) => s === 200 },
  { path: "/api/notifications", ok: (s) => s === 200 },
  // Waitlist is POST-only; GET 405 is the correct contract.
  { path: "/api/waitlist", ok: (s) => s === 405 || s === 200 },
];

function parseSetCookie(res) {
  const raw = res.headers.getSetCookie?.() ?? [];
  const jar = new Map();
  for (const line of raw) {
    const [pair] = line.split(";");
    const i = pair.indexOf("=");
    if (i > 0) jar.set(pair.slice(0, i), pair.slice(i + 1));
  }
  return jar;
}

function cookieHeader(jar) {
  return [...jar.entries()].map(([k, v]) => `${k}=${v}`).join("; ");
}

async function fetchFollow(url, init = {}, jar = new Map(), maxRedirects = 8) {
  let current = url;
  let res;
  for (let i = 0; i <= maxRedirects; i++) {
    res = await fetch(current, {
      ...init,
      redirect: "manual",
      headers: {
        ...(init.headers ?? {}),
        cookie: cookieHeader(jar),
      },
    });
    for (const [k, v] of parseSetCookie(res)) jar.set(k, v);
    if ([301, 302, 303, 307, 308].includes(res.status)) {
      const loc = res.headers.get("location");
      if (!loc) break;
      current = new URL(loc, current).toString();
      init = { method: "GET", headers: init.headers };
      continue;
    }
    break;
  }
  const text = await res.text();
  return { status: res.status, url: current, text, jar };
}

function looksBroken(html) {
  return /Internal Server Error|Application error|Module not found|Unhandled Runtime Error/i.test(
    html,
  );
}

async function main() {
  const jar = new Map();
  const login = await fetchFollow(
    `${BASE}/api/demo/login`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ password: DEMO_PASSWORD }),
    },
    jar,
  );
  console.log(`demo login: ${login.status} → ${login.url}`);
  if (login.status >= 400 && !jar.has("connectpro_access_token")) {
    console.error("Demo login failed — aborting crawl");
    console.error(login.text.slice(0, 300));
    process.exit(1);
  }

  const pageResults = [];
  for (const path of PAGES) {
    const r = await fetchFollow(`${BASE}${path}`, { method: "GET" }, jar);
    const broken = looksBroken(r.text);
    const ok = r.status === 200 && !broken;
    pageResults.push({
      path,
      status: r.status,
      final: new URL(r.url).pathname,
      ok,
      broken,
    });
    const mark = ok ? "OK" : broken ? "BROKEN" : `HTTP ${r.status}`;
    console.log(`${mark.padEnd(10)} ${path} → ${new URL(r.url).pathname}`);
  }

  const apiResults = [];
  for (const api of APIS) {
    const r = await fetchFollow(`${BASE}${api.path}`, { method: "GET" }, jar);
    const ok = api.ok(r.status);
    apiResults.push({ path: api.path, status: r.status, ok, sample: r.text.slice(0, 160) });
    console.log(`${(ok ? "OK" : "FAIL").padEnd(10)} ${api.path} (${r.status})`);
  }

  // Mentor detail if any
  const mentorsRes = await fetchFollow(`${BASE}/api/mentorship/mentors`, {}, jar);
  let mentorId = null;
  try {
    const data = JSON.parse(mentorsRes.text);
    const list = data.mentors ?? data.data ?? data;
    if (Array.isArray(list) && list[0]?.userId) mentorId = list[0].userId;
  } catch {
    /* ignore */
  }
  if (mentorId) {
    const r = await fetchFollow(`${BASE}/mentors/${mentorId}`, {}, jar);
    const broken = looksBroken(r.text);
    pageResults.push({
      path: `/mentors/${mentorId}`,
      status: r.status,
      final: new URL(r.url).pathname,
      ok: r.status === 200 && !broken,
      broken,
    });
    console.log(
      `${(r.status === 200 && !broken ? "OK" : "FAIL").padEnd(10)} /mentors/${mentorId}`,
    );
  }

  const failed = [...pageResults, ...apiResults].filter((r) => !r.ok);
  const summary = {
    base: BASE,
    pages: pageResults.length,
    apis: apiResults.length,
    failed: failed.length,
    failures: failed,
  };
  writeFileSync("/tmp/brigade-smoke.json", JSON.stringify(summary, null, 2));
  console.log("\n=== SUMMARY ===");
  console.log(`pages ${pageResults.length} · apis ${apiResults.length} · failed ${failed.length}`);
  if (failed.length) {
    for (const f of failed) {
      console.log(` - ${f.path}: ${f.status}${f.broken ? " (error html)" : ""} → ${f.final ?? ""}`);
    }
    process.exit(2);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
