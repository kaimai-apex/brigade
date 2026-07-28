/**
 * One policy per resource, one method per action, each returning a boolean.
 *
 * Authorization lives here and nowhere else. In particular `viewContactInfo`
 * is a genuine authorization rule rather than a rendering concern — if it lived
 * in the serializer, some endpoint would eventually forget to check it and leak
 * email addresses.
 */

export type Viewer = {
  profileId: string | null;
  permissions: bigint;
} | null;

export type PolicyProfile = {
  id: string;
  suspendedAt: Date | null;
  silencedAt: Date | null;
  deletedAt: Date | null;
  discoverable: boolean;
};

/** Permission bits — mirrors brigade.user_roles in migration 002. */
export const Permission = {
  Administrator: 1n << 0n,
  ViewModerationQueue: 1n << 1n,
  ManageReports: 1n << 2n,
  ManageProfiles: 1n << 3n,
  ManageRoles: 1n << 4n,
  ManageCompanies: 1n << 5n,
  ManageJobPostings: 1n << 6n,
  ViewAuditLog: 1n << 7n,
  ManageSettings: 1n << 8n,
  RecruiterSearch: 1n << 9n,
  RecruiterPools: 1n << 10n,
  RecruiterContact: 1n << 11n,
  PostJobs: 1n << 12n,
} as const;

export function can(viewer: Viewer, bit: bigint): boolean {
  if (!viewer) return false;
  if ((viewer.permissions & Permission.Administrator) !== 0n) return true;
  return (viewer.permissions & bit) !== 0n;
}

/** How the viewer is connected to the profile. 1 = direct connection. */
export type Relationship = {
  degree: 1 | 2 | 3 | null;
  blockedByTarget: boolean;
  blockingTarget: boolean;
};

export class ProfilePolicy {
  show(viewer: Viewer, profile: PolicyProfile, rel: Relationship): boolean {
    if (profile.deletedAt) return false;
    if (rel.blockedByTarget) return false;
    if (profile.suspendedAt) return can(viewer, Permission.ManageProfiles);
    return true;
  }

  /** Silenced profiles stay reachable by direct link but leave discovery. */
  listInDirectory(viewer: Viewer, profile: PolicyProfile, rel: Relationship): boolean {
    if (!profile.discoverable) return false;
    if (profile.silencedAt || profile.suspendedAt) return false;
    return this.show(viewer, profile, rel);
  }

  update(viewer: Viewer, profile: PolicyProfile): boolean {
    if (!viewer?.profileId) return false;
    if (viewer.profileId === profile.id) return true;
    return can(viewer, Permission.ManageProfiles);
  }

  /**
   * Contact details are visible to direct connections only — or to a viewer
   * holding the recruiter contact permission, which is how the recruiter tier
   * is sold without a second code path.
   */
  viewContactInfo(viewer: Viewer, profile: PolicyProfile, rel: Relationship): boolean {
    if (!viewer?.profileId) return false;
    if (viewer.profileId === profile.id) return true;
    if (rel.degree === 1) return true;
    return can(viewer, Permission.RecruiterContact);
  }

  /** Full experience history opens up at 2nd degree; strangers see a summary. */
  viewFullHistory(viewer: Viewer, profile: PolicyProfile, rel: Relationship): boolean {
    if (!viewer?.profileId) return false;
    if (viewer.profileId === profile.id) return true;
    return rel.degree !== null && rel.degree <= 2;
  }

  suspend(viewer: Viewer): boolean {
    return can(viewer, Permission.ManageProfiles);
  }
}
