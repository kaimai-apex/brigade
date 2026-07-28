import { BaseService, NotFoundError, type ServiceContext } from "./base_service.ts";

/**
 * Profile completeness is a first-class feature here, not a nice-to-have. It
 * drives onboarding prompts and it is a weight in directory ranking — a
 * half-filled profile is a worse search result, and telling someone exactly
 * what is missing is the cheapest way to fix that.
 *
 * The weights are deliberately visible and hand-tuned rather than learned. A
 * score that affects who gets found in a hiring context has to be explainable.
 */

const WEIGHTS = {
  displayName: 5,
  headline: 10,
  bio: 10,
  avatar: 10,
  location: 5,
  currentRole: 20, // a current, dated experience
  anyExperience: 5,
  education: 10,
  skills: 10, // three or more
  verifiedEmployment: 15, // the differentiator, weighted accordingly
} as const;

export type CompletenessArgs = { ctx: ServiceContext; profileId: string };
export type CompletenessResult = { score: number; missing: string[] };

export class ComputeProfileCompletenessService extends BaseService<
  CompletenessArgs,
  CompletenessResult
> {
  async call({ ctx, profileId }: CompletenessArgs): Promise<CompletenessResult> {
    const { db } = ctx;

    const result = await db.query<{
      display_name: string | null;
      headline: string | null;
      bio: string | null;
      avatar_url: string | null;
      city: string | null;
      country_code: string | null;
      experiences: string;
      current_experiences: string;
      verified_experiences: string;
      educations: string;
      skills: string;
    }>(
      `SELECT p.display_name, p.headline, p.bio, p.avatar_url, p.city, p.country_code,
              (SELECT count(*) FROM brigade.experiences e WHERE e.profile_id = p.id) AS experiences,
              (SELECT count(*) FROM brigade.experiences e WHERE e.profile_id = p.id AND e.is_current) AS current_experiences,
              (SELECT count(*) FROM brigade.experiences e WHERE e.profile_id = p.id AND e.verified_at IS NOT NULL) AS verified_experiences,
              (SELECT count(*) FROM brigade.educations ed WHERE ed.profile_id = p.id) AS educations,
              (SELECT count(*) FROM brigade.profile_skills s WHERE s.profile_id = p.id) AS skills
       FROM brigade.profiles p
       WHERE p.id = $1 AND p.deleted_at IS NULL`,
      [profileId],
    );

    const row = result.rows[0];
    if (!row) throw new NotFoundError("Profile not found");

    const has = {
      displayName: Boolean(row.display_name?.trim()),
      headline: Boolean(row.headline?.trim()),
      bio: Boolean(row.bio?.trim()),
      avatar: Boolean(row.avatar_url),
      location: Boolean(row.city || row.country_code),
      currentRole: Number(row.current_experiences) > 0,
      anyExperience: Number(row.experiences) > 0,
      education: Number(row.educations) > 0,
      skills: Number(row.skills) >= 3,
      verifiedEmployment: Number(row.verified_experiences) > 0,
    };

    let score = 0;
    const missing: string[] = [];
    for (const [key, weight] of Object.entries(WEIGHTS) as [keyof typeof WEIGHTS, number][]) {
      if (has[key]) score += weight;
      else missing.push(key);
    }

    await db.query(
      `UPDATE brigade.profiles SET completeness = $2 WHERE id = $1`,
      [profileId, Math.min(score, 100)],
    );

    // Ranking and search both read completeness, so a change invalidates both.
    ctx.enqueue({
      queue: "pull",
      worker: "ProfileIndexWorker",
      args: { profileId },
    });

    return { score: Math.min(score, 100), missing };
  }
}
