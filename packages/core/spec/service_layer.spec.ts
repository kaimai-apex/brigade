/**
 * End-to-end exercise of the service layer against a real Postgres.
 *
 * Run: node --experimental-strip-types packages/core/spec/service_layer.spec.ts
 * (expects the docker Postgres from docker-compose.yml)
 *
 * Tests are written against the SERVICES, not HTTP endpoints — that is the
 * point of the layer. Every one of these would be identical if called from a
 * route handler, a worker, a CLI or an admin panel.
 */
import pg from "pg";
import { runService } from "../src/services/run_service.ts";
import { SignUpService, canonicalEmailHash } from "../src/services/sign_up_service.ts";
import {
  AcceptConnectionService,
  RequestConnectionService,
  RemoveConnectionService,
} from "../src/services/connection_services.ts";
import { BlockService } from "../src/services/block_service.ts";
import { ComputeProfileCompletenessService } from "../src/services/compute_profile_completeness_service.ts";
import { ProfileSerializer } from "../src/serializers/profile_serializer.ts";
import { ProfilePolicy, Permission } from "../src/policies/profile_policy.ts";
import { buildRegistry } from "../src/workers/registry.ts";
import { drain } from "../src/lib/queue.ts";

const DATABASE_URL =
  process.env.CORE_DATABASE_URL ??
  "postgresql://connectpro:connectpro@localhost:5432/connectpro";

const pool = new pg.Pool({ connectionString: DATABASE_URL });

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

async function expectThrows(name: string, fn: () => Promise<unknown>, codeIncludes: string) {
  try {
    await fn();
    check(name, false, "expected it to throw");
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const code = (error as { code?: string }).code ?? "";
    check(name, `${code} ${message}`.toLowerCase().includes(codeIncludes.toLowerCase()), message);
  }
}

async function reset() {
  // Truncate rather than DELETE: moderation_log is append-only by trigger.
  await pool.query(`
    TRUNCATE brigade.jobs, brigade.notifications, brigade.connections, brigade.follows,
             brigade.blocks, brigade.mutes, brigade.connection_degrees, brigade.posts,
             brigade.experiences, brigade.profile_skills, brigade.educations,
             brigade.profile_stats, brigade.user_settings, brigade.profiles, brigade.users
    RESTART IDENTITY CASCADE`);
}

async function main() {
  await reset();

  console.log("\nSignUpService");
  const kai = await runService(pool, (ctx) =>
    new SignUpService().call({
      ctx,
      email: "Kai.Mai+test@Gmail.com",
      encryptedPassword: "hashed",
      username: "kaimai",
      displayName: "Kai Mai",
      countryCode: "CA",
      discoverable: true,
    }),
  );
  check("creates a user and a profile", Boolean(kai.userId && kai.profileId));

  const stats = await pool.query(
    `SELECT 1 FROM brigade.profile_stats WHERE profile_id = $1`,
    [kai.profileId],
  );
  check("profile_stats row is created by trigger", stats.rowCount === 1);

  // gmail dot/plus variants must collapse to one canonical hash, or ban evasion
  // is one keystroke away.
  check(
    "canonical email collapses gmail variants",
    canonicalEmailHash("Kai.Mai+test@Gmail.com") === canonicalEmailHash("kaimai@gmail.com"),
  );

  await expectThrows(
    "reserved usernames are refused",
    () =>
      runService(pool, (ctx) =>
        new SignUpService().call({
          ctx,
          email: "someone@example.test",
          encryptedPassword: "x",
          username: "recruiting",
          displayName: "Nope",
        }),
      ),
    "reserved",
  );

  await expectThrows(
    "duplicate email is refused without confirming the address exists",
    () =>
      runService(pool, (ctx) =>
        new SignUpService().call({
          ctx,
          email: "kai.mai+test@gmail.com",
          encryptedPassword: "x",
          username: "another",
          displayName: "Another",
        }),
      ),
    "cannot be used",
  );

  const jordan = await runService(pool, (ctx) =>
    new SignUpService().call({
      ctx,
      email: "jordan@example.test",
      encryptedPassword: "hashed",
      username: "jordanchan",
      displayName: "Jordan Chan",
      discoverable: true,
    }),
  );

  const sam = await runService(pool, (ctx) =>
    new SignUpService().call({
      ctx,
      email: "sam@example.test",
      encryptedPassword: "hashed",
      username: "samokada",
      displayName: "Sam Okada",
      discoverable: true,
    }),
  );

  console.log("\nJobs are enqueued transactionally");
  const queued = await pool.query<{ worker: string; count: string }>(
    `SELECT worker, count(*)::text FROM brigade.jobs WHERE state = 'queued' GROUP BY worker ORDER BY worker`,
  );
  check(
    "signup enqueued bootstrap + completeness for each new profile",
    queued.rows.some((r) => r.worker === "ProfileCompletenessWorker" && Number(r.count) === 3),
    JSON.stringify(queued.rows),
  );

  // A service that throws must leave neither rows nor jobs behind.
  const jobsBefore = await pool.query(`SELECT count(*)::int AS c FROM brigade.jobs`);
  await runService(pool, async (ctx) => {
    await new SignUpService().call({
      ctx,
      email: "rollback@example.test",
      encryptedPassword: "x",
      username: "rollbackuser",
      displayName: "Rollback",
    });
    throw new Error("deliberate failure after the write");
  }).catch(() => undefined);
  const jobsAfter = await pool.query(`SELECT count(*)::int AS c FROM brigade.jobs`);
  const orphan = await pool.query(
    `SELECT 1 FROM brigade.users WHERE email = 'rollback@example.test'`,
  );
  check("a rolled-back service leaves no user", orphan.rowCount === 0);
  check(
    "a rolled-back service leaves no orphaned jobs",
    jobsBefore.rows[0].c === jobsAfter.rows[0].c,
  );

  console.log("\nConnections");
  await runService(pool, (ctx) =>
    new RequestConnectionService().call({
      ctx,
      actorProfileId: kai.profileId,
      targetProfileId: jordan.profileId,
      message: "Worked together at Acme",
    }),
  );

  const pendingNotif = await pool.query<{ type: string; filtered: boolean }>(
    `SELECT type, filtered FROM brigade.notifications WHERE profile_id = $1`,
    [jordan.profileId],
  );
  check("a request notifies the recipient", pendingNotif.rows[0]?.type === "connection_request");
  check(
    "a connection request from a stranger is not filtered away",
    pendingNotif.rows[0]?.filtered === false,
  );

  await expectThrows(
    "the requester cannot accept their own request",
    () =>
      runService(pool, (ctx) =>
        new AcceptConnectionService().call({
          ctx,
          actorProfileId: kai.profileId,
          targetProfileId: jordan.profileId,
        }),
      ),
    "cannot accept your own",
  );

  await runService(pool, (ctx) =>
    new AcceptConnectionService().call({
      ctx,
      actorProfileId: jordan.profileId,
      targetProfileId: kai.profileId,
    }),
  );

  const accepted = await pool.query<{ count: string }>(
    `SELECT count(*)::text FROM brigade.connections WHERE state = 'accepted'`,
  );
  check("acceptance produces exactly one row, not two", accepted.rows[0]?.count === "1");

  const counts = await pool.query<{ profile_id: string; connections_count: number }>(
    `SELECT profile_id::text, connections_count FROM brigade.profile_stats
     WHERE profile_id = ANY($1::bigint[]) ORDER BY profile_id`,
    [[kai.profileId, jordan.profileId]],
  );
  check(
    "both sides' counters move",
    counts.rows.every((r) => r.connections_count === 1),
    JSON.stringify(counts.rows),
  );

  console.log("\nSecond degree");
  // Jordan connects to Sam, which should make Sam a 2nd-degree of Kai.
  await runService(pool, (ctx) =>
    new RequestConnectionService().call({
      ctx,
      actorProfileId: jordan.profileId,
      targetProfileId: sam.profileId,
    }),
  );
  await runService(pool, (ctx) =>
    new AcceptConnectionService().call({
      ctx,
      actorProfileId: sam.profileId,
      targetProfileId: jordan.profileId,
    }),
  );

  const registry = buildRegistry(pool);
  await drain(pool, registry);

  const degrees = await pool.query<{ target: string; degree: number; path_count: number }>(
    `SELECT target_profile_id::text AS target, degree, path_count
     FROM brigade.connection_degrees WHERE profile_id = $1`,
    [kai.profileId],
  );
  check(
    "Sam is 2nd degree from Kai via Jordan",
    degrees.rows.some((r) => r.target === sam.profileId && r.degree === 2),
    JSON.stringify(degrees.rows),
  );
  check(
    "a direct connection is not also listed as 2nd degree",
    !degrees.rows.some((r) => r.target === jordan.profileId),
  );

  console.log("\nWorkers");
  const workerStates = await pool.query<{ worker: string; state: string; last_error: string }>(
    `SELECT worker, state::text, coalesce(last_error, '') AS last_error FROM brigade.jobs
     WHERE worker IN ('ProfileCompletenessWorker', 'BootstrapFeedWorker') ORDER BY worker`,
  );
  check(
    "implemented workers succeed",
    workerStates.rows
      .filter((r) => r.worker === "ProfileCompletenessWorker")
      .every((r) => r.state === "succeeded"),
  );
  // This registry was built without Redis. Feed work then dead-letters with an
  // explicit reason rather than silently succeeding — a deployment missing its
  // cache should fail loudly, not leave every feed quietly empty.
  check(
    "without Redis, feed workers dead-letter with an explicit reason",
    workerStates.rows
      .filter((r) => r.worker === "BootstrapFeedWorker")
      .every((r) => r.state === "dead" && r.last_error.includes("no Redis configured")),
    JSON.stringify(workerStates.rows.filter((r) => r.worker === "BootstrapFeedWorker")),
  );

  console.log("\nCompleteness");
  await pool.query(
    `INSERT INTO brigade.experiences (profile_id, company_name, title, start_date, is_current, verified_at, verification_method)
     VALUES ($1, 'Acme Restaurants', 'Executive Chef', '2020-01-01', true, now(), 'corporate_email')`,
    [kai.profileId],
  );
  const completeness = await runService(pool, (ctx) =>
    new ComputeProfileCompletenessService().call({ ctx, profileId: kai.profileId }),
  );
  check(
    "verified current employment raises completeness",
    completeness.score >= 45,
    `score=${completeness.score}`,
  );
  check(
    "missing fields are reported, not just a number",
    completeness.missing.includes("bio") && completeness.missing.includes("avatar"),
    completeness.missing.join(","),
  );

  console.log("\nSerializer field-level visibility");
  const serializer = new ProfileSerializer();
  const record = {
    id: kai.profileId,
    type: "person" as const,
    username: "kaimai",
    displayName: "Kai Mai",
    headline: "CTO",
    bio: null,
    avatarUrl: null,
    headerUrl: null,
    countryCode: "CA",
    city: null,
    region: null,
    openTo: ["mentoring"],
    openToVisibility: "connections",
    completeness: completeness.score,
    lastActiveAt: new Date(),
    createdAt: new Date(),
    discoverable: true,
    suspendedAt: null,
    silencedAt: null,
    deletedAt: null,
    email: "kai.mai@gmail.com",
    phone: "+1 555 0100",
    experiences: [
      {
        id: "1",
        companyName: "Acme",
        companyId: null,
        title: "Executive Chef",
        startDate: "2020-01-01",
        endDate: null,
        isCurrent: true,
        description: "Ran the pass.",
        verifiedAt: new Date(),
        verificationMethod: "corporate_email",
      },
      {
        id: "2",
        companyName: "Older Place",
        companyId: null,
        title: "Sous Chef",
        startDate: "2016-01-01",
        endDate: "2019-12-31",
        isCurrent: false,
        description: "Earlier role.",
        verifiedAt: null,
        verificationMethod: null,
      },
    ],
  };

  const anon = serializer.serialize(record, null, {
    degree: null,
    blockedByTarget: false,
    blockingTarget: false,
  });
  const second = serializer.serialize(
    record,
    { profileId: sam.profileId, permissions: 0n },
    { degree: 2, blockedByTarget: false, blockingTarget: false },
  );
  const connected = serializer.serialize(
    record,
    { profileId: jordan.profileId, permissions: 0n },
    { degree: 1, blockedByTarget: false, blockingTarget: false },
  );
  const recruiter = serializer.serialize(
    record,
    { profileId: sam.profileId, permissions: Permission.RecruiterContact },
    { degree: 3, blockedByTarget: false, blockingTarget: false },
  );

  check("anonymous sees no contact details", !("email" in anon));
  check("2nd degree sees no contact details", !("email" in second));
  check("a direct connection sees contact details", connected.email === "kai.mai@gmail.com");
  check("a recruiter-tier viewer sees contact details", recruiter.email === "kai.mai@gmail.com");
  check("anonymous gets a truncated history", anon.experiences_truncated === true);
  check("2nd degree gets the full history", second.experiences_truncated === false);
  check(
    "open_to is hidden from a stranger and shown to a connection",
    !("open_to" in second) && Array.isArray(connected.open_to),
  );
  check(
    "the verification method is surfaced, not just a boolean",
    (connected.experiences as Record<string, unknown>[])[0]?.verification_method ===
      "corporate_email",
  );

  console.log("\nBlockService");
  await runService(pool, (ctx) =>
    new BlockService().call({
      ctx,
      actorProfileId: kai.profileId,
      targetProfileId: jordan.profileId,
    }),
  );

  const afterBlock = await pool.query<{ count: string }>(
    `SELECT count(*)::text FROM brigade.connections
     WHERE state = 'accepted' AND (profile_id = $1 OR target_profile_id = $1)`,
    [kai.profileId],
  );
  check("a block severs the connection", afterBlock.rows[0]?.count === "0");

  const notifsAfterBlock = await pool.query<{ count: string }>(
    `SELECT count(*)::text FROM brigade.notifications
     WHERE (profile_id = $1 AND from_profile_id = $2) OR (profile_id = $2 AND from_profile_id = $1)`,
    [kai.profileId, jordan.profileId],
  );
  check("a block cancels notifications between the pair", notifsAfterBlock.rows[0]?.count === "0");

  const suppressed = await runService(pool, (ctx) =>
    new RequestConnectionService()
      .call({ ctx, actorProfileId: jordan.profileId, targetProfileId: kai.profileId })
      .then(() => "did not throw")
      .catch((e: Error) => e.message),
  );
  check(
    "a blocked profile cannot request a connection, and is not told why",
    suppressed === "Profile not found",
    String(suppressed),
  );

  console.log("\nPolicy");
  const policy = new ProfilePolicy();
  const suspendedProfile = { ...record, suspendedAt: new Date() };
  check(
    "a suspended profile is hidden from ordinary viewers",
    !policy.show({ profileId: sam.profileId, permissions: 0n }, suspendedProfile, {
      degree: null,
      blockedByTarget: false,
      blockingTarget: false,
    }),
  );
  check(
    "a moderator can still see a suspended profile",
    policy.show({ profileId: sam.profileId, permissions: Permission.ManageProfiles }, suspendedProfile, {
      degree: null,
      blockedByTarget: false,
      blockingTarget: false,
    }),
  );
  check(
    "a silenced profile leaves the directory but stays reachable",
    !policy.listInDirectory(null, { ...record, silencedAt: new Date() }, {
      degree: null,
      blockedByTarget: false,
      blockingTarget: false,
    }) &&
      policy.show(null, { ...record, silencedAt: new Date() }, {
        degree: null,
        blockedByTarget: false,
        blockingTarget: false,
      }),
  );

  console.log(`\n${passed} passed, ${failed} failed`);
  await pool.end();
  process.exit(failed === 0 ? 0 : 1);
}

main().catch(async (error) => {
  console.error(error);
  await pool.end();
  process.exit(1);
});
