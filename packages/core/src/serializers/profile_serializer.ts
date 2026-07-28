import {
  ProfilePolicy,
  type PolicyProfile,
  type Relationship,
  type Viewer,
} from "../policies/profile_policy.ts";

/**
 * The one place a Profile's JSON shape is decided.
 *
 * Two rules make this work, and both are enforced by the architecture check:
 *
 *   1. It never queries. Everything it needs arrives preloaded — that is the
 *      N+1 defence, and it is why a directory page of 30 profiles is one query
 *      rather than ninety.
 *   2. Visibility is a parameter, not a branch. The viewer is passed in and
 *      field-level rules delegate to ProfilePolicy, so "contact details are for
 *      connections" is written once. Implemented per-endpoint, one endpoint
 *      eventually forgets and leaks an email address.
 */

export type ProfileRecord = PolicyProfile & {
  type: "person" | "company";
  username: string;
  displayName: string;
  headline: string | null;
  bio: string | null;
  avatarUrl: string | null;
  headerUrl: string | null;
  countryCode: string | null;
  city: string | null;
  region: string | null;
  openTo: string[];
  openToVisibility: string;
  completeness: number;
  lastActiveAt: Date | null;
  createdAt: Date;
  email?: string | null;
  phone?: string | null;
  stats?: {
    connectionsCount: number;
    followersCount: number;
    followingCount: number;
    postsCount: number;
  };
  experiences?: ExperienceRecord[];
};

export type ExperienceRecord = {
  id: string;
  companyName: string;
  companyId: string | null;
  title: string;
  startDate: string;
  endDate: string | null;
  isCurrent: boolean;
  description: string | null;
  verifiedAt: Date | null;
  verificationMethod: string | null;
};

export type SerializedProfile = Record<string, unknown>;

export class ProfileSerializer {
  private readonly policy = new ProfilePolicy();

  serialize(profile: ProfileRecord, viewer: Viewer, rel: Relationship): SerializedProfile {
    const isSelf = viewer?.profileId === profile.id;

    const base: SerializedProfile = {
      id: profile.id,
      type: profile.type,
      username: profile.username,
      display_name: profile.displayName,
      headline: profile.headline,
      bio: profile.bio,
      avatar_url: profile.avatarUrl,
      header_url: profile.headerUrl,
      country_code: profile.countryCode,
      city: profile.city,
      region: profile.region,
      completeness: profile.completeness,
      last_active_at: profile.lastActiveAt?.toISOString() ?? null,
      created_at: profile.createdAt.toISOString(),
      suspended: Boolean(profile.suspendedAt),
      // Deliberately exposed: a viewer should be able to tell whether they are
      // looking at a discoverable profile or one reached by direct link.
      discoverable: profile.discoverable,
    };

    if (profile.stats) {
      base.stats = {
        connections_count: profile.stats.connectionsCount,
        followers_count: profile.stats.followersCount,
        following_count: profile.stats.followingCount,
        posts_count: profile.stats.postsCount,
      };
    }

    base.relationship = {
      degree: rel.degree,
      blocking: rel.blockingTarget,
      is_self: isSelf,
    };

    // Contact details: connections, the profile owner, or a recruiter-tier
    // viewer. Anyone else does not get the keys at all — an explicit null still
    // tells a scraper the field exists and is worth retrying for.
    if (this.policy.viewContactInfo(viewer, profile, rel)) {
      base.email = profile.email ?? null;
      base.phone = profile.phone ?? null;
    }

    // Availability is separately scoped: someone can be open to work without
    // announcing it to their current employer.
    if (this.openToVisible(profile, viewer, rel, isSelf)) {
      base.open_to = profile.openTo;
    }

    if (profile.experiences) {
      const full = this.policy.viewFullHistory(viewer, profile, rel);
      const experiences = full ? profile.experiences : profile.experiences.slice(0, 1);
      base.experiences = experiences.map((e) => this.serializeExperience(e, full));
      base.experiences_truncated = !full && profile.experiences.length > experiences.length;
    }

    return base;
  }

  private openToVisible(
    profile: ProfileRecord,
    viewer: Viewer,
    rel: Relationship,
    isSelf: boolean,
  ): boolean {
    if (isSelf) return true;
    switch (profile.openToVisibility) {
      case "public":
        return true;
      case "connections":
        return rel.degree === 1;
      case "recruiters":
        return this.policy.viewContactInfo(viewer, profile, rel);
      default:
        return false;
    }
  }

  private serializeExperience(e: ExperienceRecord, full: boolean): SerializedProfile {
    return {
      id: e.id,
      company_name: e.companyName,
      company_id: e.companyId,
      title: e.title,
      start_date: e.startDate,
      end_date: e.endDate,
      is_current: e.isCurrent,
      // The description is the long tail nobody needs in a summary view.
      description: full ? e.description : null,
      verified: e.verifiedAt !== null,
      // "Verified by employer" and "verified by email" are different claims and
      // a reader should be able to tell them apart.
      verification_method: e.verificationMethod,
    };
  }
}
