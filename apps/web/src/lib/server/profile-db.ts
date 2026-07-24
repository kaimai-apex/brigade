import { getPool } from "@connectpro/common";
import type { DirectoryParams } from "@/lib/directory/params";

/**
 * Direct-Postgres data layer for profiles, the member directory and connections.
 *
 * These features must work on the hosted site, where the microservices are not
 * deployed — so the web app talks to Postgres (Supabase in prod, Docker locally)
 * the same way it already does for auth and the waitlist. Using this path in BOTH
 * dev and prod means what we test locally is exactly what runs in production.
 *
 * The microservices remain the scale-up path and still own feed, messaging,
 * notifications and search.
 */

function pool() {
  return getPool();
}

const PROFILE_COLUMNS = `
  user_id, first_name, last_name, headline, about, industry, location, website,
  resume_url, avatar_url, cover_url, city, state, country, current_position,
  current_employer, instagram_url, linkedin_url, expertise_areas, years_experience,
  onboarding_step, onboarding_completed, open_to_opportunities,
  available_private_events, available_contract_work, available_emergency_staffing,
  visible_in_directory, role, completeness, created_at, updated_at
`;

/** Shape the web's mapProfile()/mapDirectoryRow() already expect (camelCase). */
function toCamel(row: Record<string, unknown>) {
  return {
    id: row.user_id,
    userId: row.user_id,
    firstName: row.first_name,
    lastName: row.last_name,
    headline: row.headline,
    about: row.about,
    bio: row.about,
    industry: row.industry,
    location: row.location,
    website: row.website,
    websiteUrl: row.website,
    resumeUrl: row.resume_url,
    avatarUrl: row.avatar_url,
    profileImageUrl: row.avatar_url,
    coverUrl: row.cover_url,
    city: row.city,
    state: row.state,
    country: row.country,
    currentPosition: row.current_position,
    currentEmployer: row.current_employer,
    instagramUrl: row.instagram_url,
    linkedinUrl: row.linkedin_url,
    expertiseAreas: row.expertise_areas ?? [],
    yearsExperience: row.years_experience,
    onboardingStep: row.onboarding_step,
    onboardingCompleted: row.onboarding_completed,
    openToOpportunities: row.open_to_opportunities,
    availablePrivateEvents: row.available_private_events,
    availableContractWork: row.available_contract_work,
    availableEmergencyStaffing: row.available_emergency_staffing,
    visibleInDirectory: row.visible_in_directory,
    role: row.role,
    completeness: row.completeness,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/* ------------------------------------------------------------------ */
/* Directory                                                           */
/* ------------------------------------------------------------------ */

export async function dbListDirectory(params: DirectoryParams = {}) {
  const limit = Math.min(Math.max(params.limit ?? 24, 1), 48);
  const offset = Math.max(params.offset ?? 0, 0);

  const where: string[] = [
    "deleted_at IS NULL",
    "onboarding_completed = true",
    "visible_in_directory = true",
  ];
  const values: unknown[] = [];
  const add = (value: unknown) => {
    values.push(value);
    return `$${values.length}`;
  };

  if (params.q?.trim()) {
    const p = add(`%${params.q.trim()}%`);
    where.push(
      `(first_name ILIKE ${p} OR last_name ILIKE ${p} OR headline ILIKE ${p} ` +
        `OR role ILIKE ${p} OR city ILIKE ${p} OR state ILIKE ${p} ` +
        `OR current_employer ILIKE ${p})`,
    );
  }
  if (params.role) where.push(`role = ${add(params.role)}`);
  if (params.expertise?.length) {
    where.push(`expertise_areas @> ${add(params.expertise)}::text[]`);
  }
  if (params.city) where.push(`city = ${add(params.city)}`);
  if (params.state) where.push(`state = ${add(params.state)}`);
  if (params.country) where.push(`country = ${add(params.country)}`);
  if (params.openToWork) where.push("open_to_opportunities = true");
  if (params.emergency) where.push("available_emergency_staffing = true");
  if (params.privateEvents) where.push("available_private_events = true");
  if (params.contract) where.push("available_contract_work = true");
  if (typeof params.minYears === "number") {
    where.push(`years_experience >= ${add(params.minYears)}`);
  }
  if (params.hasPhoto) where.push("avatar_url IS NOT NULL AND avatar_url <> ''");

  const whereSql = where.join(" AND ");
  const orderSql =
    {
      recent: "updated_at DESC",
      newest: "created_at DESC",
      name: "last_name ASC, first_name ASC",
      experience: "years_experience DESC NULLS LAST",
      complete: "completeness DESC",
    }[params.sort ?? "recent"] ?? "updated_at DESC";

  const rowsSql = `SELECT ${PROFILE_COLUMNS} FROM users.profiles
     WHERE ${whereSql} ORDER BY ${orderSql}
     LIMIT ${add(limit)} OFFSET ${add(offset)}`;
  // Facets/total use the same filters but not the pagination params.
  const facetValues = values.slice(0, values.length - 2);

  const [rows, total, roleFacet, cityFacet, expertiseFacet] = await Promise.all([
    pool().query(rowsSql, values),
    pool().query(
      `SELECT count(*)::int AS total FROM users.profiles WHERE ${whereSql}`,
      facetValues,
    ),
    pool().query(
      `SELECT role AS value, count(*)::int AS count FROM users.profiles
       WHERE ${whereSql} AND role IS NOT NULL GROUP BY role ORDER BY count DESC`,
      facetValues,
    ),
    pool().query(
      `SELECT city AS value, state, count(*)::int AS count FROM users.profiles
       WHERE ${whereSql} AND city IS NOT NULL AND city <> ''
       GROUP BY city, state ORDER BY count DESC LIMIT 40`,
      facetValues,
    ),
    pool().query(
      `SELECT unnest(expertise_areas) AS value, count(*)::int AS count FROM users.profiles
       WHERE ${whereSql} GROUP BY value ORDER BY count DESC LIMIT 40`,
      facetValues,
    ),
  ]);

  return {
    data: rows.rows.map(toCamel),
    total: total.rows[0]?.total ?? 0,
    limit,
    offset,
    facets: {
      roles: roleFacet.rows,
      cities: cityFacet.rows,
      expertise: expertiseFacet.rows,
    },
  };
}

/* ------------------------------------------------------------------ */
/* Profile read                                                        */
/* ------------------------------------------------------------------ */

export async function dbGetProfile(userId: string) {
  const result = await pool().query(
    `SELECT ${PROFILE_COLUMNS} FROM users.profiles
     WHERE user_id = $1 AND deleted_at IS NULL`,
    [userId],
  );
  if (result.rows.length === 0) return null;

  const [experience, education, portfolioLinks, workPhotos, skills] =
    await Promise.all([
      pool().query(
        `SELECT id, company, position, location, start_date, end_date, description
         FROM users.experience WHERE user_id = $1 ORDER BY start_date DESC NULLS LAST`,
        [userId],
      ),
      pool().query(
        `SELECT id, school, degree, field, start_date, end_date
         FROM users.education WHERE user_id = $1 ORDER BY start_date DESC NULLS LAST`,
        [userId],
      ),
      pool().query(
        `SELECT id, type, url FROM users.portfolio_links WHERE user_id = $1`,
        [userId],
      ),
      pool().query(
        `SELECT id, image_url, sort_order FROM users.profile_work_photos
         WHERE user_id = $1 ORDER BY sort_order ASC`,
        [userId],
      ),
      pool().query(
        `SELECT s.id, s.name, us.endorsements FROM users.user_skills us
         JOIN users.skills s ON s.id = us.skill_id WHERE us.user_id = $1`,
        [userId],
      ),
    ]);

  return {
    ...toCamel(result.rows[0]),
    experience: experience.rows.map((e) => ({
      id: e.id,
      company: e.company,
      position: e.position,
      location: e.location,
      startDate: e.start_date,
      endDate: e.end_date,
      description: e.description,
    })),
    education: education.rows.map((e) => ({
      id: e.id,
      school: e.school,
      degree: e.degree,
      field: e.field,
      startDate: e.start_date,
      endDate: e.end_date,
    })),
    portfolioLinks: portfolioLinks.rows,
    workPhotos: workPhotos.rows.map((p) => ({
      id: p.id,
      imageUrl: p.image_url,
      sortOrder: p.sort_order,
    })),
    skills: skills.rows,
  };
}

/* ------------------------------------------------------------------ */
/* Profile write                                                       */
/* ------------------------------------------------------------------ */

/** camelCase DTO key -> column. Mirrors user-service updateProfile. */
const COLUMN_MAP: Record<string, string> = {
  firstName: "first_name",
  lastName: "last_name",
  headline: "headline",
  about: "about",
  industry: "industry",
  location: "location",
  website: "website",
  avatarUrl: "avatar_url",
  coverUrl: "cover_url",
  resumeUrl: "resume_url",
  city: "city",
  state: "state",
  country: "country",
  currentPosition: "current_position",
  currentEmployer: "current_employer",
  instagramUrl: "instagram_url",
  linkedinUrl: "linkedin_url",
  yearsExperience: "years_experience",
  openToOpportunities: "open_to_opportunities",
  availablePrivateEvents: "available_private_events",
  availableContractWork: "available_contract_work",
  availableEmergencyStaffing: "available_emergency_staffing",
  visibleInDirectory: "visible_in_directory",
  onboardingStep: "onboarding_step",
  onboardingCompleted: "onboarding_completed",
  role: "role",
};

export async function dbEnsureProfile(
  userId: string,
  firstName = "Member",
  lastName = "",
) {
  await pool().query(
    `INSERT INTO users.profiles (user_id, first_name, last_name, completeness, onboarding_step)
     VALUES ($1, $2, $3, 10, 0) ON CONFLICT (user_id) DO NOTHING`,
    [userId, firstName, lastName],
  );
}

export async function dbUpdateProfile(
  userId: string,
  patch: Record<string, unknown>,
) {
  const fields: string[] = [];
  const values: unknown[] = [];

  for (const [key, col] of Object.entries(COLUMN_MAP)) {
    const val = patch[key];
    if (val !== undefined) {
      values.push(val);
      fields.push(`${col} = $${values.length}`);
    }
  }
  if (patch.expertiseAreas !== undefined) {
    values.push(patch.expertiseAreas);
    fields.push(`expertise_areas = $${values.length}`);
  }
  if (fields.length === 0) return dbGetProfile(userId);

  values.push(userId);
  await pool().query(
    `UPDATE users.profiles SET ${fields.join(", ")}, updated_at = now()
     WHERE user_id = $${values.length} AND deleted_at IS NULL`,
    values,
  );
  return dbGetProfile(userId);
}

export async function dbReplaceExperience(
  userId: string,
  items: { company: string; position: string; startDate?: string; endDate?: string; description?: string }[],
) {
  await pool().query("DELETE FROM users.experience WHERE user_id = $1", [userId]);
  for (const it of items) {
    if (!it.company) continue;
    await pool().query(
      `INSERT INTO users.experience (user_id, company, position, start_date, end_date, description)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        userId,
        it.company,
        it.position || "Team Member",
        it.startDate || null,
        it.endDate || null,
        it.description || null,
      ],
    );
  }
}

export async function dbReplaceEducation(
  userId: string,
  items: { school: string; degree?: string; field?: string; startDate?: string; endDate?: string }[],
) {
  await pool().query("DELETE FROM users.education WHERE user_id = $1", [userId]);
  for (const it of items) {
    if (!it.school) continue;
    await pool().query(
      `INSERT INTO users.education (user_id, school, degree, field, start_date, end_date)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [userId, it.school, it.degree || null, it.field || null, it.startDate || null, it.endDate || null],
    );
  }
}

export async function dbReplacePortfolioLinks(
  userId: string,
  links: { type: string; url: string }[],
) {
  await pool().query("DELETE FROM users.portfolio_links WHERE user_id = $1", [userId]);
  for (const l of links) {
    if (!l.url) continue;
    await pool().query(
      `INSERT INTO users.portfolio_links (user_id, type, url) VALUES ($1, $2, $3)`,
      [userId, l.type || "other", l.url],
    );
  }
}

export async function dbReplaceWorkPhotos(userId: string, imageUrls: string[]) {
  await pool().query("DELETE FROM users.profile_work_photos WHERE user_id = $1", [userId]);
  let order = 0;
  for (const url of imageUrls) {
    if (!url) continue;
    await pool().query(
      `INSERT INTO users.profile_work_photos (user_id, image_url, sort_order)
       VALUES ($1, $2, $3)`,
      [userId, url, order++],
    );
  }
}

export async function dbRecordProfileView(profileId: string, viewerId: string) {
  if (profileId === viewerId) return;
  await pool().query(
    `INSERT INTO users.profile_views (profile_id, viewer_id) VALUES ($1, $2)`,
    [profileId, viewerId],
  );
}

/* ------------------------------------------------------------------ */
/* Saved members                                                       */
/* ------------------------------------------------------------------ */

export async function dbListSavedMemberIds(userId: string): Promise<string[]> {
  const res = await pool().query(
    `SELECT saved_user_id FROM users.directory_saves
     WHERE user_id = $1 ORDER BY created_at DESC`,
    [userId],
  );
  return res.rows.map((r) => r.saved_user_id);
}

export async function dbSaveMember(userId: string, savedUserId: string) {
  if (userId === savedUserId) return { saved: false };
  await pool().query(
    `INSERT INTO users.directory_saves (user_id, saved_user_id)
     VALUES ($1, $2) ON CONFLICT DO NOTHING`,
    [userId, savedUserId],
  );
  return { saved: true };
}

export async function dbUnsaveMember(userId: string, savedUserId: string) {
  await pool().query(
    `DELETE FROM users.directory_saves WHERE user_id = $1 AND saved_user_id = $2`,
    [userId, savedUserId],
  );
  return { saved: false };
}

/* ------------------------------------------------------------------ */
/* Connections (the Directory's primary CTA)                           */
/* ------------------------------------------------------------------ */

export async function dbSendConnectionRequest(senderId: string, receiverId: string) {
  if (senderId === receiverId) {
    throw new Error("You cannot invite yourself");
  }
  const res = await pool().query(
    `INSERT INTO connections.connections (sender_id, receiver_id, status)
     VALUES ($1, $2, 'pending')
     ON CONFLICT (sender_id, receiver_id) DO UPDATE SET updated_at = now()
     RETURNING id, sender_id, receiver_id, status`,
    [senderId, receiverId],
  );
  const row = res.rows[0];
  return {
    id: row.id,
    senderId: row.sender_id,
    receiverId: row.receiver_id,
    status: row.status,
  };
}

export async function dbListConnections(userId: string, status = "accepted") {
  const res =
    status === "pending"
      ? await pool().query(
          `SELECT id, sender_id, receiver_id, status, created_at
           FROM connections.connections
           WHERE receiver_id = $1 AND status = 'pending' ORDER BY created_at DESC`,
          [userId],
        )
      : await pool().query(
          `SELECT id, sender_id, receiver_id, status, created_at
           FROM connections.connections
           WHERE (sender_id = $1 OR receiver_id = $1) AND status = $2
           ORDER BY created_at DESC`,
          [userId, status],
        );
  return res.rows.map((r) => ({
    id: r.id,
    senderId: r.sender_id,
    receiverId: r.receiver_id,
    status: r.status,
    createdAt: r.created_at,
  }));
}

export async function dbRespondToConnection(
  connectionId: string,
  userId: string,
  status: "accepted" | "rejected",
) {
  const res = await pool().query(
    `UPDATE connections.connections SET status = $1, updated_at = now()
     WHERE id = $2 AND receiver_id = $3 RETURNING id, status`,
    [status, connectionId, userId],
  );
  if (res.rows.length === 0) throw new Error("Invitation not found");
  return { id: res.rows[0].id, status: res.rows[0].status };
}
