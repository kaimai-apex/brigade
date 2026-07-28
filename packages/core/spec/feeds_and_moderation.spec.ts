/**
 * Phase 4 (feeds) and Phase 8 (trust & safety) against real Postgres + Redis.
 *
 * Run: node --experimental-strip-types packages/core/spec/feeds_and_moderation.spec.ts
 */
import pg from "pg";
import { createClient } from "redis";
import { runService } from "../src/services/run_service.ts";
import { SignUpService } from "../src/services/sign_up_service.ts";
import {
  AcceptConnectionService,
  RequestConnectionService,
} from "../src/services/connection_services.ts";
import { BlockService } from "../src/services/block_service.ts";
import { CreatePostService, DeletePostService, ReactToPostService } from "../src/services/post_services.ts";
import { FanOutOnWriteService } from "../src/services/fan_out_on_write_service.ts";
import {
  FeedManager,
  buildCrutches,
  shouldFilter,
  homeKey,
  MAX_ITEMS,
  type FeedPost,
} from "../src/lib/feed_manager.ts";
import {
  ReportService,
  EnforceModerationService,
  SubmitAppealService,
  ReviewAppealService,
  ModerationQueueService,
  ScoreProfileRiskService,
  BlockCanonicalEmailService,
} from "../src/services/moderation_services.ts";
import { Permission } from "../src/policies/profile_policy.ts";
import { buildRegistry } from "../src/workers/registry.ts";
import { drain } from "../src/lib/queue.ts";

const pool = new pg.Pool({
  connectionString:
    process.env.CORE_DATABASE_URL ??
    "postgresql://connectpro:connectpro@localhost:5432/connectpro",
});
const redis = createClient({ url: process.env.CORE_REDIS_URL ?? "redis://localhost:6379" });

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

async function signUp(username: string, displayName: string) {
  const r = await runService(pool, (ctx) =>
    new SignUpService().call({
      ctx,
      email: `${username}@example.test`,
      encryptedPassword: "hashed",
      username,
      displayName,
      discoverable: true,
    }),
  );
  return r.profileId;
}

async function connect(a: string, b: string) {
  await runService(pool, (ctx) =>
    new RequestConnectionService().call({ ctx, actorProfileId: a, targetProfileId: b }),
  );
  await runService(pool, (ctx) =>
    new AcceptConnectionService().call({ ctx, actorProfileId: b, targetProfileId: a }),
  );
}

async function main() {
  await redis.connect();

  await pool.query(`
    TRUNCATE brigade.jobs, brigade.risk_signals, brigade.appeals, brigade.profile_warnings,
             brigade.reports, brigade.canonical_email_blocks, brigade.suggestions,
             brigade.notifications, brigade.reactions, brigade.mentions, brigade.post_stats,
             brigade.posts, brigade.connections, brigade.follows, brigade.blocks,
             brigade.mutes, brigade.connection_degrees, brigade.experiences,
             brigade.profile_stats, brigade.user_settings, brigade.profiles, brigade.users
    RESTART IDENTITY CASCADE`);
  await pool.query(`TRUNCATE brigade.moderation_log`);
  for (const key of await redis.keys("feed:home:*")) await redis.del(key);

  const kai = await signUp("kaimai", "Kai Mai");
  const jordan = await signUp("jordanchan", "Jordan Chan");
  const sam = await signUp("samokada", "Sam Okada");
  const stranger = await signUp("stranger", "A Stranger");

  await connect(kai, jordan);
  await connect(jordan, sam);

  const registry = buildRegistry(pool, { redis: redis as never });
  const feeds = new FeedManager(redis as never, pool);

  console.log("\nFan-out on write");
  const post = await runService(pool, (ctx) =>
    new CreatePostService().call({ ctx, profileId: jordan, text: "Service starts at six." }),
  );
  await drain(pool, registry);

  const kaiFeed = await feeds.getHome(kai);
  check("a connection's post reaches the feed", kaiFeed.includes(post.postId));
  const strangerFeed = await redis.zRange(homeKey(stranger), 0, -1);
  check("a stranger's feed does not receive it", !strangerFeed.includes(post.postId));

  const authorFeed = await feeds.getHome(jordan);
  check("the author sees their own post", authorFeed.includes(post.postId));

  console.log("\nVisibility filtering");
  const connectionsOnly = await runService(pool, (ctx) =>
    new CreatePostService().call({
      ctx,
      profileId: jordan,
      text: "Connections only.",
      visibility: "connections",
    }),
  );
  await drain(pool, registry);
  check(
    "a connections-only post reaches a connection",
    (await feeds.getHome(kai)).includes(connectionsOnly.postId),
  );

  const dm = await runService(pool, (ctx) =>
    new CreatePostService().call({
      ctx,
      profileId: jordan,
      text: "private",
      visibility: "direct",
    }),
  );
  await drain(pool, registry);
  check(
    "a direct message never enters a feed",
    !(await feeds.getHome(kai)).includes(dm.postId),
  );

  console.log("\nCrutches — filtering runs without queries");
  const crutches = await buildCrutches(pool, kai);
  check("crutches load the connection set", crutches.connected.has(jordan));
  const fakePost: FeedPost = {
    id: "1",
    profileId: stranger,
    visibility: "connections",
    inReplyToId: null,
    inReplyToProfileId: null,
    reblogOfId: null,
  };
  check(
    "a connections-only post from a non-connection is filtered",
    shouldFilter(fakePost, kai, crutches),
  );
  check(
    "the same post is kept when public",
    !shouldFilter({ ...fakePost, visibility: "public" }, kai, crutches),
  );
  check(
    "a reply to a stranger is filtered out of the feed",
    shouldFilter(
      { ...fakePost, visibility: "public", inReplyToId: "9", inReplyToProfileId: stranger },
      kai,
      crutches,
    ),
  );

  console.log("\nReshare dedupe");
  const original = await runService(pool, (ctx) =>
    new CreatePostService().call({ ctx, profileId: jordan, text: "Original." }),
  );
  await drain(pool, registry);
  const reshare = await runService(pool, (ctx) =>
    new CreatePostService().call({
      ctx,
      profileId: jordan,
      text: "",
      reblogOfId: original.postId,
    }),
  );
  await drain(pool, registry);
  const afterReshare = await feeds.getHome(kai, 100);
  check(
    "a reshare of a post already in view does not stack a duplicate",
    afterReshare.includes(original.postId) && !afterReshare.includes(reshare.postId),
  );

  console.log("\nMerge and unmerge on connect/disconnect");
  const samPost = await runService(pool, (ctx) =>
    new CreatePostService().call({ ctx, profileId: sam, text: "Sam posted before we connected." }),
  );
  await drain(pool, registry);
  check(
    "before connecting, Sam's post is absent from Kai's feed",
    !(await feeds.getHome(kai, 100)).includes(samPost.postId),
  );

  await connect(kai, sam);
  await drain(pool, registry);
  check(
    "connecting backfills their earlier posts retroactively",
    (await feeds.getHome(kai, 100)).includes(samPost.postId),
  );

  console.log("\nBlock purges the feed in both directions");
  await runService(pool, (ctx) =>
    new BlockService().call({ ctx, actorProfileId: kai, targetProfileId: sam }),
  );
  await drain(pool, registry);
  check(
    "the blocked profile's posts leave the blocker's feed",
    !(await feeds.getHome(kai, 100)).includes(samPost.postId),
  );

  console.log("\nFeeds are a rebuildable cache");
  await redis.del(homeKey(kai));
  const rebuilt = await feeds.getHome(kai, 100);
  check("a wiped feed repopulates from Postgres on read", rebuilt.length > 0, `n=${rebuilt.length}`);
  check(
    "and the block still holds after the rebuild",
    !rebuilt.includes(samPost.postId),
  );

  console.log("\nTrim");
  const many = Array.from({ length: MAX_ITEMS + 50 }, (_, i) => ({
    score: i + 1,
    value: String(i + 1),
  }));
  await redis.del(homeKey(stranger));
  await redis.zAdd(homeKey(stranger), many);
  await new FeedManager(redis as never, pool).pushToHome(stranger, {
    id: String(MAX_ITEMS + 100),
    profileId: stranger,
    visibility: "public",
    inReplyToId: null,
    inReplyToProfileId: null,
    reblogOfId: null,
  });
  const size = await redis.zCard(homeKey(stranger));
  check("the feed is trimmed to MAX_ITEMS", size === MAX_ITEMS, `size=${size}`);
  const oldestKept = await redis.zRange(homeKey(stranger), 0, 0);
  check("trimming drops the oldest entries, not the newest", Number(oldestKept[0]) > 1);

  console.log("\nDeleted posts");
  const doomed = await runService(pool, (ctx) =>
    new CreatePostService().call({ ctx, profileId: jordan, text: "This will go." }),
  );
  await drain(pool, registry);
  await runService(pool, (ctx) =>
    new DeletePostService().call({ ctx, postId: doomed.postId, actorProfileId: jordan }),
  );
  await drain(pool, registry);
  check(
    "a deleted post is removed from recipients' feeds",
    !(await feeds.getHome(kai, 200)).includes(doomed.postId),
  );

  await expectThrows(
    "you cannot delete someone else's post",
    () =>
      runService(pool, (ctx) =>
        new DeletePostService().call({ ctx, postId: original.postId, actorProfileId: kai }),
      ),
    "not your post",
  );

  console.log("\nReactions");
  await runService(pool, (ctx) =>
    new ReactToPostService().call({ ctx, postId: original.postId, profileId: kai, type: "like" }),
  );
  await runService(pool, (ctx) =>
    new ReactToPostService().call({ ctx, postId: original.postId, profileId: kai, type: "celebrate" }),
  );
  const reactionCount = await pool.query<{ reactions_count: number }>(
    `SELECT reactions_count FROM brigade.post_stats WHERE post_id = $1`,
    [original.postId],
  );
  check(
    "changing reaction type does not double-count",
    reactionCount.rows[0]?.reactions_count === 1,
    String(reactionCount.rows[0]?.reactions_count),
  );

  /* ---------------------------------------------------------------- */
  console.log("\nModeration — reporting");

  const moderator = { profileId: sam, permissions: Permission.ManageProfiles | Permission.ViewModerationQueue };
  const member = { profileId: kai, permissions: 0n };

  const spamReport = await runService(pool, (ctx) =>
    new ReportService().call({
      ctx,
      reporterProfileId: kai,
      targetProfileId: stranger,
      category: "spam",
      comment: "Bulk connection requests",
    }),
  );
  const fraudReport = await runService(pool, (ctx) =>
    new ReportService().call({
      ctx,
      reporterProfileId: jordan,
      targetProfileId: stranger,
      category: "scam_or_fraud",
      comment: "Asked for payment to apply",
    }),
  );
  check("fraud outranks spam in the queue", fraudReport.priority > spamReport.priority);

  const queue = await runService(pool, (ctx) =>
    new ModerationQueueService().call({ ctx, viewer: moderator }),
  );
  check("the fraud report is first in the queue", queue.reports[0]?.category === "scam_or_fraud");
  check("the queue shows how many reports the target has", Number(queue.reports[0]?.reports_against_target) === 2);

  await expectThrows(
    "an ordinary member cannot read the moderation queue",
    () => runService(pool, (ctx) => new ModerationQueueService().call({ ctx, viewer: member })),
    "moderator permission",
  );

  await expectThrows(
    "you cannot report yourself",
    () =>
      runService(pool, (ctx) =>
        new ReportService().call({
          ctx,
          reporterProfileId: kai,
          targetProfileId: kai,
          category: "spam",
        }),
      ),
    "cannot report yourself",
  );

  console.log("\nGraduated enforcement");
  await expectThrows(
    "an action without a statement of reasons is refused",
    () =>
      runService(pool, (ctx) =>
        new EnforceModerationService().call({
          ctx,
          viewer: moderator,
          targetProfileId: stranger,
          action: "suspend",
          text: "   ",
        }),
      ),
    "statement of reasons",
  );

  const silenced = await runService(pool, (ctx) =>
    new EnforceModerationService().call({
      ctx,
      viewer: moderator,
      targetProfileId: stranger,
      action: "silence",
      text: "Suspected bulk spam; limiting reach pending review.",
      reportId: fraudReport.reportId,
    }),
  );
  check("silencing does NOT notify the target", silenced.notified === false);

  const silencedRow = await pool.query<{ silenced_at: Date | null; suspended_at: Date | null }>(
    `SELECT silenced_at, suspended_at FROM brigade.profiles WHERE id = $1`,
    [stranger],
  );
  check("the profile is silenced", silencedRow.rows[0]?.silenced_at !== null);
  check("but not suspended — silence is the lighter step", silencedRow.rows[0]?.suspended_at === null);

  const resolved = await pool.query<{ action_taken_at: Date | null }>(
    `SELECT action_taken_at FROM brigade.reports WHERE id = $1`,
    [fraudReport.reportId],
  );
  check("the report is marked actioned", resolved.rows[0]?.action_taken_at !== null);

  const logged = await pool.query<{ action: string; reason: string }>(
    `SELECT action, reason FROM brigade.moderation_log WHERE target_id = $1 ORDER BY id DESC LIMIT 1`,
    [stranger],
  );
  check("the action is written to the immutable log", logged.rows[0]?.action === "enforce:silence");
  check("with the reason attached", logged.rows[0]?.reason.includes("bulk spam"));

  const suspended = await runService(pool, (ctx) =>
    new EnforceModerationService().call({
      ctx,
      viewer: moderator,
      targetProfileId: stranger,
      action: "suspend",
      text: "Confirmed recruitment fraud.",
    }),
  );
  check("suspension DOES notify the target", suspended.notified === true);
  const notified = await pool.query<{ payload: { appealable?: boolean } }>(
    `SELECT payload FROM brigade.notifications WHERE profile_id = $1 AND type = 'moderation_action'
     ORDER BY id DESC LIMIT 1`,
    [stranger],
  );
  check("and tells them it can be appealed", notified.rows[0]?.payload.appealable === true);

  console.log("\nAppeals");
  const appeal = await runService(pool, (ctx) =>
    new SubmitAppealService().call({
      ctx,
      profileId: stranger,
      warningId: suspended.warningId,
      text: "This was my real employer.",
    }),
  );
  check("the suspended member can appeal", Boolean(appeal.appealId));

  await expectThrows(
    "you cannot appeal someone else's action",
    () =>
      runService(pool, (ctx) =>
        new SubmitAppealService().call({
          ctx,
          profileId: kai,
          warningId: suspended.warningId,
          text: "nope",
        }),
      ),
    "not your appeal",
  );

  await expectThrows(
    "you cannot appeal the same action twice",
    () =>
      runService(pool, (ctx) =>
        new SubmitAppealService().call({
          ctx,
          profileId: stranger,
          warningId: suspended.warningId,
          text: "again",
        }),
      ),
    "already appealed",
  );

  const reviewed = await runService(pool, (ctx) =>
    new ReviewAppealService().call({
      ctx,
      viewer: moderator,
      appealId: appeal.appealId,
      approve: true,
      note: "Verified with the employer.",
    }),
  );
  check("an upheld appeal reports what it reversed", reviewed.reversed === "suspend");

  const restored = await pool.query<{ suspended_at: Date | null }>(
    `SELECT suspended_at FROM brigade.profiles WHERE id = $1`,
    [stranger],
  );
  check("upholding an appeal actually lifts the suspension", restored.rows[0]?.suspended_at === null);

  await expectThrows(
    "an appeal cannot be decided twice",
    () =>
      runService(pool, (ctx) =>
        new ReviewAppealService().call({
          ctx,
          viewer: moderator,
          appealId: appeal.appealId,
          approve: false,
        }),
      ),
    "already been decided",
  );

  console.log("\nBan evasion and risk");
  const blocked = await runService(pool, (ctx) =>
    new BlockCanonicalEmailService().call({ ctx, viewer: moderator, profileId: stranger }),
  );
  check("blocking the canonical email hash works", blocked.blocked);

  // Plus-tagging is the universal evasion technique and is stripped for every
  // domain. Dot-stripping is a Gmail quirk and is applied ONLY to Gmail —
  // collapsing dots everywhere would merge genuinely distinct mailboxes.
  await expectThrows(
    "a blocked mailbox cannot sign up again under a plus-tagged variant",
    () =>
      runService(pool, (ctx) =>
        new SignUpService().call({
          ctx,
          email: "STRANGER+comeback@example.test",
          encryptedPassword: "x",
          username: "stranger2",
          displayName: "Back Again",
        }),
      ),
    "cannot be used",
  );

  const dotted = await runService(pool, (ctx) =>
    new SignUpService().call({
      ctx,
      email: "str.anger@example.test",
      encryptedPassword: "x",
      username: "stranger3",
      displayName: "Different Person",
    }),
  )
    .then(() => "allowed")
    .catch((e: Error) => e.message);
  check(
    "but dots stay significant outside Gmail — distinct mailboxes are not merged",
    dotted === "allowed",
    String(dotted),
  );

  const risk = await runService(pool, (ctx) =>
    new ScoreProfileRiskService().call({ ctx, profileId: stranger }),
  );
  check("reports accumulate into a risk score", risk.score > 0 && risk.signals >= 2, JSON.stringify(risk));

  const immutable = await pool
    .query(`UPDATE brigade.moderation_log SET reason = 'tampered'`)
    .then(() => "allowed")
    .catch((e: Error) => e.message);
  check("the moderation log cannot be rewritten", String(immutable).includes("append-only"));

  console.log(`\n${passed} passed, ${failed} failed`);
  await redis.quit();
  await pool.end();
  process.exit(failed === 0 ? 0 : 1);
}

main().catch(async (error) => {
  console.error(error);
  await redis.quit().catch(() => undefined);
  await pool.end();
  process.exit(1);
});
