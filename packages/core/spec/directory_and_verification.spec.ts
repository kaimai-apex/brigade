/**
 * Phase 3 (API conventions) and Phase 5 (directory, verification, search)
 * against a real Postgres.
 *
 * Run: node --experimental-strip-types packages/core/spec/directory_and_verification.spec.ts
 */
import pg from "pg";
import { runService } from "../src/services/run_service.ts";
import { SignUpService } from "../src/services/sign_up_service.ts";
import {
  AcceptConnectionService,
  RequestConnectionService,
} from "../src/services/connection_services.ts";
import { ListDirectoryService } from "../src/services/list_directory_service.ts";
import { RelationshipsService } from "../src/services/relationships_service.ts";
import {
  StartEmploymentEmailVerificationService,
  ConfirmEmploymentEmailVerificationService,
  VerifyEmploymentBacklinkService,
  ExpireEmploymentVerificationsService,
  findRelMeLink,
} from "../src/services/verify_employment_service.ts";
import { consumeRateLimit, cursorClause, linkHeader, toApiError } from "../src/lib/api.ts";
import { ServiceError } from "../src/services/base_service.ts";
import { buildRegistry } from "../src/workers/registry.ts";
import { drain } from "../src/lib/queue.ts";

const pool = new pg.Pool({
  connectionString:
    process.env.CORE_DATABASE_URL ??
    "postgresql://connectpro:connectpro@localhost:5432/connectpro",
});

let passed = 0;
let failed = 0;

function check(name: string, condition: boolean, detail = "") {
  if (condition) {
    passed += 1;
    console.log(`  ok   ${name}`);
  } else {
    failed += 1;
    console.error(`  FAIL ${name}${detail ? ` — ${detail}` : ""}`);
  }
}

async function expectThrows(name: string, fn: () => Promise<unknown>, includes: string) {
  try {
    await fn();
    check(name, false, "expected it to throw");
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    check(name, message.toLowerCase().includes(includes.toLowerCase()), message);
  }
}

async function signUp(username: string, displayName: string, extra: Record<string, unknown> = {}) {
  const result = await runService(pool, (ctx) =>
    new SignUpService().call({
      ctx,
      email: `${username}@example.test`,
      encryptedPassword: "hashed",
      username,
      displayName,
      discoverable: true,
      ...extra,
    }),
  );
  return result.profileId;
}

async function main() {
  await pool.query(`
    TRUNCATE brigade.jobs, brigade.rate_limits, brigade.employment_verifications,
             brigade.notifications, brigade.connections, brigade.follows, brigade.blocks,
             brigade.mutes, brigade.connection_degrees, brigade.experiences,
             brigade.companies, brigade.profile_stats, brigade.user_settings,
             brigade.profiles, brigade.users
    RESTART IDENTITY CASCADE`);

  console.log("\nSetup");
  const kai = await signUp("kaimai", "Kai Mai", { countryCode: "CA" });
  const jordan = await signUp("jordanchan", "Jordan Chan", { countryCode: "CA" });
  const sam = await signUp("samokada", "Sam Okada", { countryCode: "US" });
  const hidden = await signUp("hiddenperson", "Hidden Person", { discoverable: false });

  await pool.query(
    `UPDATE brigade.profiles SET headline = 'Executive Chef · tasting menus', city = 'Toronto',
       last_active_at = now(), completeness = 80 WHERE id = $1`,
    [kai],
  );
  await pool.query(
    `UPDATE brigade.profiles SET headline = 'Pastry Chef', city = 'Toronto',
       last_active_at = now() - interval '400 days', completeness = 40 WHERE id = $1`,
    [jordan],
  );
  await pool.query(
    `UPDATE brigade.profiles SET headline = 'Sommelier · natural wine', city = 'Portland',
       last_active_at = now(), completeness = 60 WHERE id = $1`,
    [sam],
  );

  const company = await pool.query<{ id: string }>(
    `INSERT INTO brigade.companies (name, slug, domain) VALUES ('Acme Restaurants', 'acme', 'acme.test')
     RETURNING id::text`,
  );
  const companyId = company.rows[0]!.id;

  const experience = await pool.query<{ id: string }>(
    `INSERT INTO brigade.experiences (profile_id, company_id, company_name, title, start_date, is_current)
     VALUES ($1, $2, 'Acme Restaurants', 'Executive Chef', '2020-01-01', true)
     RETURNING id::text`,
    [kai, companyId],
  );
  const experienceId = experience.rows[0]!.id;

  console.log("\nDirectory scopes");
  const all = await runService(pool, (ctx) =>
    new ListDirectoryService().call({ ctx, params: {}, viewerProfileId: null }),
  );
  check("only discoverable profiles are listed", all.total === 3, `total=${all.total}`);
  check(
    "a profile that opted out is absent",
    !all.profiles.some((p) => p.id === hidden),
  );
  check("an anonymous directory response is cacheable", all.cacheable === true);

  const authed = await runService(pool, (ctx) =>
    new ListDirectoryService().call({ ctx, params: {}, viewerProfileId: kai }),
  );
  check("an authenticated response is not cacheable", authed.cacheable === false);
  check("the viewer is excluded from their own results", !authed.profiles.some((p) => p.id === kai));

  const byCity = await runService(pool, (ctx) =>
    new ListDirectoryService().call({ ctx, params: { city: "Toronto" }, viewerProfileId: null }),
  );
  check("city filter narrows the set", byCity.total === 2, `total=${byCity.total}`);

  const search = await runService(pool, (ctx) =>
    new ListDirectoryService().call({ ctx, params: { q: "sommelier" }, viewerProfileId: null }),
  );
  check("full-text search matches a headline", search.profiles[0]?.id === sam);

  const fuzzy = await runService(pool, (ctx) =>
    new ListDirectoryService().call({ ctx, params: { q: "Jordn Chan" }, viewerProfileId: null }),
  );
  check("trigram search tolerates a misspelled name", fuzzy.profiles.some((p) => p.id === jordan));

  const recent = await runService(pool, (ctx) =>
    new ListDirectoryService().call({
      ctx,
      params: { activeWithinDays: 30 },
      viewerProfileId: null,
    }),
  );
  check("active-within filter excludes a dormant profile", !recent.profiles.some((p) => p.id === jordan));

  console.log("\nRelevance ordering");
  const ranked = await runService(pool, (ctx) =>
    new ListDirectoryService().call({ ctx, params: { sort: "relevance" }, viewerProfileId: null }),
  );
  check(
    "relevance puts the complete, recently-active profile first",
    ranked.profiles[0]?.id === kai,
    ranked.profiles.map((p) => p.username).join(","),
  );

  console.log("\nEmployment verification — tier 1, corporate email");
  await expectThrows(
    "free webmail cannot verify employment",
    () =>
      runService(pool, (ctx) =>
        new StartEmploymentEmailVerificationService().call({
          ctx,
          experienceId,
          actorProfileId: kai,
          workEmail: "kai@gmail.com",
        }),
      ),
    "work email",
  );

  await expectThrows(
    "an address at the wrong domain is refused",
    () =>
      runService(pool, (ctx) =>
        new StartEmploymentEmailVerificationService().call({
          ctx,
          experienceId,
          actorProfileId: kai,
          workEmail: "kai@somewhere-else.test",
        }),
      ),
    "not at acme.test",
  );

  await expectThrows(
    "you cannot verify someone else's role",
    () =>
      runService(pool, (ctx) =>
        new StartEmploymentEmailVerificationService().call({
          ctx,
          experienceId,
          actorProfileId: jordan,
          workEmail: "jordan@acme.test",
        }),
      ),
    "your own",
  );

  const started = await runService(pool, (ctx) =>
    new StartEmploymentEmailVerificationService().call({
      ctx,
      experienceId,
      actorProfileId: kai,
      workEmail: "kai@acme.test",
    }),
  );
  check("a corporate address starts a verification", Boolean(started.token));

  const stored = await pool.query<{ token_hash: string; email_hash: string }>(
    `SELECT token_hash, email_hash FROM brigade.employment_verifications WHERE id = $1`,
    [started.verificationId],
  );
  check(
    "the token is stored hashed, never in the clear",
    stored.rows[0]?.token_hash !== started.token && stored.rows[0]?.token_hash?.length === 64,
  );
  check(
    "the work address is stored hashed",
    stored.rows[0]?.email_hash !== "kai@acme.test" && stored.rows[0]?.email_hash?.length === 64,
  );

  await expectThrows(
    "a wrong token is rejected",
    () =>
      runService(pool, (ctx) =>
        new ConfirmEmploymentEmailVerificationService().call({
          ctx,
          verificationId: started.verificationId,
          token: "0".repeat(64),
        }),
      ),
    "not valid",
  );

  const confirmed = await runService(pool, (ctx) =>
    new ConfirmEmploymentEmailVerificationService().call({
      ctx,
      verificationId: started.verificationId,
      token: started.token,
    }),
  );
  check("the correct token verifies the role", confirmed.verified);

  const verifiedRow = await pool.query<{
    verified_at: Date | null;
    verification_method: string | null;
    verification_expires_at: Date | null;
  }>(
    `SELECT verified_at, verification_method, verification_expires_at
     FROM brigade.experiences WHERE id = $1`,
    [experienceId],
  );
  check("the experience carries the badge", verifiedRow.rows[0]?.verified_at !== null);
  check(
    "the method is recorded, so the claim is legible",
    verifiedRow.rows[0]?.verification_method === "corporate_email",
  );
  check(
    "a current role's verification expires",
    verifiedRow.rows[0]?.verification_expires_at !== null,
  );

  await expectThrows(
    "a consumed verification cannot be replayed",
    () =>
      runService(pool, (ctx) =>
        new ConfirmEmploymentEmailVerificationService().call({
          ctx,
          verificationId: started.verificationId,
          token: started.token,
        }),
      ),
    "no longer open",
  );

  console.log("\nverified_only filter");
  const verifiedOnly = await runService(pool, (ctx) =>
    new ListDirectoryService().call({ ctx, params: { verifiedOnly: true }, viewerProfileId: null }),
  );
  check("verified_only returns only verified people", verifiedOnly.total === 1);
  check("and it is the right one", verifiedOnly.profiles[0]?.id === kai);

  console.log("\nVerification expiry");
  await pool.query(
    `UPDATE brigade.experiences SET verification_expires_at = now() - interval '1 day' WHERE id = $1`,
    [experienceId],
  );
  const stillFiltered = await runService(pool, (ctx) =>
    new ListDirectoryService().call({ ctx, params: { verifiedOnly: true }, viewerProfileId: null }),
  );
  check(
    "a lapsed badge stops matching immediately, before the nightly sweep",
    stillFiltered.total === 0,
  );

  const swept = await runService(pool, (ctx) =>
    new ExpireEmploymentVerificationsService().call({ ctx }),
  );
  check("the sweep clears the lapsed badge", swept.expired === 1);

  console.log("\nEmployment verification — tier 2, rel=me backlink");
  check(
    "a plain link is not enough — rel=me is the assertion",
    findRelMeLink('<a href="https://joinbrigade.co/in/kaimai">Kai</a>', [
      "https://joinbrigade.co/in/kaimai",
    ]) === null,
  );
  check(
    "rel=me among several tokens is accepted",
    findRelMeLink(
      '<a rel="nofollow me noopener" href="https://joinbrigade.co/in/kaimai">Kai</a>',
      ["https://joinbrigade.co/in/kaimai"],
    ) === "https://joinbrigade.co/in/kaimai",
  );
  check(
    "a rel=me link to someone else does not verify",
    findRelMeLink('<a rel="me" href="https://joinbrigade.co/in/someoneelse">x</a>', [
      "https://joinbrigade.co/in/kaimai",
    ]) === null,
  );

  await expectThrows(
    "the staff page must be on the employer's domain",
    () =>
      runService(pool, (ctx) =>
        new VerifyEmploymentBacklinkService().call({
          ctx,
          experienceId,
          actorProfileId: kai,
          sourceUrl: "https://not-acme.test/team",
          fetcher: async () => ({ status: 200, body: "", finalUrl: "" }),
        }),
      ),
    "must be on acme.test",
  );

  await expectThrows(
    "an http page proves nothing about domain control",
    () =>
      runService(pool, (ctx) =>
        new VerifyEmploymentBacklinkService().call({
          ctx,
          experienceId,
          actorProfileId: kai,
          sourceUrl: "http://acme.test/team",
          fetcher: async () => ({ status: 200, body: "", finalUrl: "" }),
        }),
      ),
    "https",
  );

  const backlinkOk = await runService(pool, (ctx) =>
    new VerifyEmploymentBacklinkService().call({
      ctx,
      experienceId,
      actorProfileId: kai,
      sourceUrl: "https://acme.test/team",
      fetcher: async () => ({
        status: 200,
        body: `<html><body><ul><li>
                 <a rel="me" href="https://joinbrigade.co/in/kaimai">Kai Mai — Executive Chef</a>
               </li></ul></body></html>`,
        finalUrl: "https://acme.test/team",
      }),
    }),
  );
  check("a rel=me backlink on the company domain verifies", backlinkOk.verified);

  const method = await pool.query<{ verification_method: string }>(
    `SELECT verification_method FROM brigade.experiences WHERE id = $1`,
    [experienceId],
  );
  check(
    "the badge records that it came from a backlink, not an email",
    method.rows[0]?.verification_method === "rel_me_backlink",
  );

  const missing = await runService(pool, (ctx) =>
    new VerifyEmploymentBacklinkService().call({
      ctx,
      experienceId,
      actorProfileId: kai,
      sourceUrl: "https://acme.test/nobody",
      fetcher: async () => ({ status: 200, body: "<html><body>no links</body></html>", finalUrl: "" }),
    }),
  );
  check("a page without the backlink does not verify", missing.verified === false);

  const failedRow = await pool.query<{ state: string; failure_reason: string }>(
    `SELECT state::text, failure_reason FROM brigade.employment_verifications
     WHERE source_url = 'https://acme.test/nobody'`,
  );
  check(
    "the failed attempt is recorded with a reason",
    failedRow.rows[0]?.state === "failed" && Boolean(failedRow.rows[0]?.failure_reason),
  );

  console.log("\nBatch relationships");
  await runService(pool, (ctx) =>
    new RequestConnectionService().call({
      ctx,
      actorProfileId: kai,
      targetProfileId: jordan,
    }),
  );
  await runService(pool, (ctx) =>
    new AcceptConnectionService().call({
      ctx,
      actorProfileId: jordan,
      targetProfileId: kai,
    }),
  );
  await runService(pool, (ctx) =>
    new RequestConnectionService().call({ ctx, actorProfileId: sam, targetProfileId: kai }),
  );
  await drain(pool, buildRegistry(pool));

  const rels = await runService(pool, (ctx) =>
    new RelationshipsService().call({
      ctx,
      viewerProfileId: kai,
      profileIds: [jordan, sam, hidden],
    }),
  );
  check("a connection is reported as 1st degree", rels[jordan]?.connected && rels[jordan]?.degree === 1);
  check("an incoming request is distinguished from an outgoing one", rels[sam]?.pendingIncoming === true);
  check("an outgoing request is not reported as incoming", rels[sam]?.pendingOutgoing === false);
  check("an unrelated profile comes back empty rather than missing", rels[hidden]?.degree === null);

  console.log("\nAPI conventions");
  const cursor = cursorClause({ maxId: "100", limit: 20 });
  check("max_id pages backwards in time", cursor.where.includes("id < $1") && cursor.order === "DESC");
  const forward = cursorClause({ minId: "100" });
  check("min_id sorts ascending so it returns the NEXT page", forward.order === "ASC");
  check("limit is clamped", cursorClause({ limit: 5000 }).limit === 40);

  const link = linkHeader("https://api.test/v1/timelines/home", [{ id: "300" }, { id: "100" }], 2);
  check("Link header advertises next from the oldest id", link?.includes("max_id=100") === true);
  check("Link header advertises prev from the newest id", link?.includes("min_id=300") === true);
  check(
    "a short page advertises no next link",
    linkHeader("https://api.test/x", [{ id: "1" }], 20)?.includes("next") !== true,
  );

  const apiError = toApiError(
    new ServiceError("Email already taken", "email_unavailable", 422, { email: ["taken"] }),
    "req-123",
  );
  check("a service error keeps its status and code", apiError.status === 422 && apiError.body.error === "email_unavailable");
  check("field details survive", apiError.body.details?.email?.[0] === "taken");
  const unknown = toApiError(new Error("connection string leaked in here"), "req-456");
  check("an unexpected error does not leak internals", unknown.body.error_description === "Something went wrong on our side.");
  check("but it carries a request id for correlation", unknown.body.request_id === "req-456");

  console.log("\nRate limiting");
  let last = await consumeRateLimit(pool, "auth:signup", "203.0.113.9");
  check("the first request is allowed", last.allowed && last.remaining === 4);
  for (let i = 0; i < 4; i += 1) last = await consumeRateLimit(pool, "auth:signup", "203.0.113.9");
  check("the limit is reached exactly at the boundary", last.allowed && last.remaining === 0);
  last = await consumeRateLimit(pool, "auth:signup", "203.0.113.9");
  check("the next request is refused", last.allowed === false);
  const other = await consumeRateLimit(pool, "auth:signup", "198.51.100.4");
  check("limits are per subject, not global", other.allowed === true);

  console.log(`\n${passed} passed, ${failed} failed`);
  await pool.end();
  process.exit(failed === 0 ? 0 : 1);
}

main().catch(async (error) => {
  console.error(error);
  await pool.end();
  process.exit(1);
});
