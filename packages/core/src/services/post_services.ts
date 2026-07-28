import { BaseService, ForbiddenError, NotFoundError, ServiceError, type ServiceContext } from "./base_service.ts";
import { NotifyService } from "./notify_service.ts";

/**
 * Post creation, and the fan-out it triggers.
 *
 * The shape to notice: the service validates, writes the row, and returns.
 * Everything expensive — fan-out to every follower's feed, mention processing,
 * link crawling, search indexing — is a job. The user's request finishes as
 * soon as the row is committed, regardless of whether they have ten
 * connections or ten thousand.
 */

export type CreatePostArgs = {
  ctx: ServiceContext;
  profileId: string;
  text: string;
  visibility?: "public" | "connections" | "unlisted" | "direct";
  inReplyToId?: string | null;
  reblogOfId?: string | null;
  asCompanyId?: string | null;
  mentionedProfileIds?: string[];
};

export type CreatePostResult = { postId: string; conversationId: string };

const MAX_LENGTH = 5000;

export class CreatePostService extends BaseService<CreatePostArgs, CreatePostResult> {
  async call({
    ctx,
    profileId,
    text,
    visibility = "public",
    inReplyToId = null,
    reblogOfId = null,
    asCompanyId = null,
    mentionedProfileIds = [],
  }: CreatePostArgs): Promise<CreatePostResult> {
    const { db } = ctx;
    const body = text.trim();

    if (!body && !reblogOfId) {
      throw new ServiceError("A post needs something in it", "empty_post", 422);
    }
    if (body.length > MAX_LENGTH) {
      throw new ServiceError(`Posts are limited to ${MAX_LENGTH} characters`, "too_long", 422);
    }

    // Posting as a company requires an explicit grant. Without the check, any
    // employee could speak for the employer.
    if (asCompanyId) {
      const authorised = await db.query(
        `SELECT 1 FROM brigade.company_admins WHERE company_id = $1 AND profile_id = $2`,
        [asCompanyId, profileId],
      );
      if (!authorised.rowCount) {
        throw new ForbiddenError("You are not authorised to post for that company");
      }
    }

    // The thread root, denormalised so fetching a conversation is one indexed
    // query rather than a recursive walk.
    let conversationId: string | null = null;
    let parentProfileId: string | null = null;

    if (inReplyToId) {
      const parent = await db.query<{ id: string; conversation_id: string | null; profile_id: string }>(
        `SELECT id::text, conversation_id::text, profile_id::text FROM brigade.posts
         WHERE id = $1 AND deleted_at IS NULL`,
        [inReplyToId],
      );
      const parentRow = parent.rows[0];
      if (!parentRow) throw new NotFoundError("The post being replied to does not exist");
      conversationId = parentRow.conversation_id ?? parentRow.id;
      parentProfileId = parentRow.profile_id;
    }

    const inserted = await db.query<{ id: string }>(
      `INSERT INTO brigade.posts
         (profile_id, text, visibility, in_reply_to_id, conversation_id, reblog_of_id, as_company_id)
       VALUES ($1, $2, $3::brigade.post_visibility, $4, $5, $6, $7)
       RETURNING id::text`,
      [profileId, body, visibility, inReplyToId, conversationId, reblogOfId, asCompanyId],
    );
    const postId = inserted.rows[0]?.id;
    if (!postId) throw new ServiceError("Could not create the post", "post_failed");

    // A root post is its own conversation.
    if (!conversationId) {
      await db.query(`UPDATE brigade.posts SET conversation_id = id WHERE id = $1`, [postId]);
      conversationId = postId;
    }

    await db.query(
      `UPDATE brigade.profile_stats
       SET posts_count = posts_count + 1, last_post_at = now(), updated_at = now()
       WHERE profile_id = $1`,
      [profileId],
    );

    if (inReplyToId) {
      await db.query(
        `UPDATE brigade.post_stats SET replies_count = replies_count + 1, updated_at = now()
         WHERE post_id = $1`,
        [inReplyToId],
      );
      if (parentProfileId) {
        await new NotifyService().call({
          ctx,
          profileId: parentProfileId,
          fromProfileId: profileId,
          type: "post_comment",
          postId,
        });
      }
    }

    if (reblogOfId) {
      await db.query(
        `UPDATE brigade.post_stats SET reshares_count = reshares_count + 1, updated_at = now()
         WHERE post_id = $1`,
        [reblogOfId],
      );
    }

    for (const mentioned of mentionedProfileIds) {
      await db.query(
        `INSERT INTO brigade.mentions (post_id, profile_id) VALUES ($1, $2)
         ON CONFLICT DO NOTHING`,
        [postId, mentioned],
      );
      await new NotifyService().call({
        ctx,
        profileId: mentioned,
        fromProfileId: profileId,
        type: "mention",
        postId,
      });
    }

    // Direct messages never fan out to feeds.
    if (visibility !== "direct") {
      ctx.enqueue({
        queue: "default",
        worker: "FanOutOnWriteWorker",
        args: { postId },
      });
    }

    return { postId, conversationId };
  }
}

export class DeletePostService extends BaseService<
  { ctx: ServiceContext; postId: string; actorProfileId: string },
  { deleted: boolean }
> {
  async call({ ctx, postId, actorProfileId }: { ctx: ServiceContext; postId: string; actorProfileId: string }) {
    const { db } = ctx;

    const post = await db.query<{ profile_id: string }>(
      `SELECT profile_id::text FROM brigade.posts WHERE id = $1 AND deleted_at IS NULL`,
      [postId],
    );
    const row = post.rows[0];
    if (!row) throw new NotFoundError("Post not found");
    if (row.profile_id !== actorProfileId) throw new ForbiddenError("That is not your post");

    await db.query(`UPDATE brigade.posts SET deleted_at = now() WHERE id = $1`, [postId]);
    await db.query(
      `UPDATE brigade.profile_stats SET posts_count = GREATEST(posts_count - 1, 0) WHERE profile_id = $1`,
      [actorProfileId],
    );

    // Feeds tolerate ids whose posts have vanished, so this is cleanup rather
    // than correctness — but leaving them makes every page shorter than it
    // claims to be.
    ctx.enqueue({ queue: "default", worker: "RemoveFromFeedsWorker", args: { postId } });

    return { deleted: true };
  }
}

export class ReactToPostService extends BaseService<
  { ctx: ServiceContext; postId: string; profileId: string; type?: string },
  { reacted: boolean; type: string }
> {
  async call({
    ctx,
    postId,
    profileId,
    type = "like",
  }: { ctx: ServiceContext; postId: string; profileId: string; type?: string }) {
    const { db } = ctx;

    const post = await db.query<{ profile_id: string }>(
      `SELECT profile_id::text FROM brigade.posts WHERE id = $1 AND deleted_at IS NULL`,
      [postId],
    );
    const author = post.rows[0]?.profile_id;
    if (!author) throw new NotFoundError("Post not found");

    // One reaction per person per post: changing type is an UPDATE, so the
    // aggregate count never double-counts a single reader.
    const result = await db.query<{ inserted: boolean }>(
      `INSERT INTO brigade.reactions (post_id, profile_id, type) VALUES ($1, $2, $3)
       ON CONFLICT (post_id, profile_id) DO UPDATE SET type = EXCLUDED.type, updated_at = now()
       RETURNING (xmax = 0) AS inserted`,
      [postId, profileId, type],
    );

    if (result.rows[0]?.inserted) {
      await db.query(
        `UPDATE brigade.post_stats SET reactions_count = reactions_count + 1, updated_at = now()
         WHERE post_id = $1`,
        [postId],
      );
      await new NotifyService().call({
        ctx,
        profileId: author,
        fromProfileId: profileId,
        type: "post_reaction",
        postId,
        payload: { reaction: type },
      });
    }

    return { reacted: true, type };
  }
}
