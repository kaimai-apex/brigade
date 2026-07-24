import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { Pool } from 'pg';
import {
  loadConfig,
  getPool,
  KafkaClient,
  RedisCache,
  DomainEvent,
  NotFoundError,
  ForbiddenError,
} from '@connectpro/common';
import {
  UpdateProfileDto,
  AddExperienceDto,
  AddEducationDto,
  AddSkillDto,
  ReplacePortfolioLinksDto,
  ReplaceWorkPhotosDto,
} from './dto/user.dto';

const config = loadConfig('user-service', 3003);
const PROFILE_CACHE_TTL = 15 * 60;

interface UserCreatedPayload {
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
}

export interface DirectoryQuery {
  q?: string;
  role?: string;
  expertise?: string[];
  city?: string;
  state?: string;
  country?: string;
  openToWork?: boolean;
  emergency?: boolean;
  privateEvents?: boolean;
  contract?: boolean;
  minYears?: number;
  hasPhoto?: boolean;
  sort?: 'recent' | 'newest' | 'name' | 'experience' | 'complete';
  limit?: number;
  offset?: number;
}

@Injectable()
export class UserService implements OnModuleInit, OnModuleDestroy {
  private pool: Pool;
  private kafka: KafkaClient;
  private redis: RedisCache;
  private processedEvents = new Set<string>();

  constructor() {
    this.pool = getPool(config.databaseUrl);
    this.kafka = new KafkaClient('user-service', config.kafkaBrokers);
    this.redis = new RedisCache(config.redisUrl);
  }

  async onModuleInit() {
    await this.redis.connect();
    await this.kafka.subscribe(
      'user-service',
      ['user-created'],
      async (event) => this.handleUserCreated(event as DomainEvent<UserCreatedPayload>),
    );
  }

  async onModuleDestroy() {
    await this.kafka.disconnect();
    await this.redis.disconnect();
  }

  private async handleUserCreated(event: DomainEvent<UserCreatedPayload>) {
    if (this.processedEvents.has(event.id)) return;
    this.processedEvents.add(event.id);

    const { userId, firstName, lastName } = event.payload;
    await this.ensureProfile(userId, firstName, lastName);
  }

  private async ensureProfile(userId: string, firstName = 'Member', lastName = '') {
    await this.pool.query(
      `INSERT INTO users.profiles (user_id, first_name, last_name, completeness, onboarding_step)
       VALUES ($1, $2, $3, 10, 0) ON CONFLICT (user_id) DO NOTHING`,
      [userId, firstName, lastName],
    );
  }

  async listDirectory(params: DirectoryQuery = {}) {
    const limit = Math.min(Math.max(params.limit ?? 24, 1), 48);
    const offset = Math.max(params.offset ?? 0, 0);

    // Shared filter clauses (everything except pagination / ordering). Parameterized —
    // user input never touched string concatenation.
    const where: string[] = [
      'deleted_at IS NULL',
      'onboarding_completed = true',
      'visible_in_directory = true',
    ];
    const values: unknown[] = [];
    const add = (value: unknown) => {
      values.push(value);
      return `$${values.length}`;
    };

    if (params.q && params.q.trim()) {
      const like = `%${params.q.trim()}%`;
      const p = add(like);
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
    if (params.openToWork) where.push('open_to_opportunities = true');
    if (params.emergency) where.push('available_emergency_staffing = true');
    if (params.privateEvents) where.push('available_private_events = true');
    if (params.contract) where.push('available_contract_work = true');
    if (typeof params.minYears === 'number') {
      where.push(`years_experience >= ${add(params.minYears)}`);
    }
    if (params.hasPhoto) where.push("avatar_url IS NOT NULL AND avatar_url <> ''");

    const whereSql = where.join(' AND ');

    const orderSql =
      {
        recent: 'updated_at DESC',
        newest: 'created_at DESC',
        name: 'last_name ASC, first_name ASC',
        experience: 'years_experience DESC NULLS LAST',
        complete: 'completeness DESC',
      }[params.sort ?? 'recent'] ?? 'updated_at DESC';

    const rowsPromise = this.pool.query(
      `SELECT user_id, first_name, last_name, headline, city, state, country,
              avatar_url, role, expertise_areas, years_experience, completeness,
              open_to_opportunities, available_private_events, available_contract_work,
              available_emergency_staffing, onboarding_completed, created_at, updated_at
       FROM users.profiles
       WHERE ${whereSql}
       ORDER BY ${orderSql}
       LIMIT ${add(limit)} OFFSET ${add(offset)}`,
      values,
    );

    // Facet counts + total use the SAME filter values but not the pagination params,
    // so slice values back to the pre-limit/offset set.
    const facetValues = values.slice(0, values.length - 2);
    const totalPromise = this.pool.query(
      `SELECT count(*)::int AS total FROM users.profiles WHERE ${whereSql}`,
      facetValues,
    );
    const roleFacetPromise = this.pool.query(
      `SELECT role AS value, count(*)::int AS count FROM users.profiles
       WHERE ${whereSql} AND role IS NOT NULL GROUP BY role ORDER BY count DESC`,
      facetValues,
    );
    const cityFacetPromise = this.pool.query(
      `SELECT city AS value, state, count(*)::int AS count FROM users.profiles
       WHERE ${whereSql} AND city IS NOT NULL AND city <> ''
       GROUP BY city, state ORDER BY count DESC LIMIT 40`,
      facetValues,
    );
    const expertiseFacetPromise = this.pool.query(
      `SELECT unnest(expertise_areas) AS value, count(*)::int AS count FROM users.profiles
       WHERE ${whereSql} GROUP BY value ORDER BY count DESC LIMIT 40`,
      facetValues,
    );

    const [rows, total, roleFacet, cityFacet, expertiseFacet] = await Promise.all([
      rowsPromise,
      totalPromise,
      roleFacetPromise,
      cityFacetPromise,
      expertiseFacetPromise,
    ]);

    return {
      data: rows.rows.map((row) => ({
        id: row.user_id,
        userId: row.user_id,
        firstName: row.first_name,
        lastName: row.last_name,
        headline: row.headline,
        city: row.city,
        state: row.state,
        country: row.country,
        profileImageUrl: row.avatar_url,
        role: row.role,
        expertiseAreas: row.expertise_areas ?? [],
        yearsExperience: row.years_experience,
        completeness: row.completeness,
        openToOpportunities: row.open_to_opportunities,
        availablePrivateEvents: row.available_private_events,
        availableContractWork: row.available_contract_work,
        availableEmergencyStaffing: row.available_emergency_staffing,
        onboardingCompleted: row.onboarding_completed,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      })),
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

  async listSavedMemberIds(userId: string): Promise<string[]> {
    const result = await this.pool.query(
      `SELECT saved_user_id FROM users.directory_saves
       WHERE user_id = $1 ORDER BY created_at DESC`,
      [userId],
    );
    return result.rows.map((row) => row.saved_user_id);
  }

  async saveMember(userId: string, savedUserId: string) {
    if (userId === savedUserId) return { saved: false };
    await this.pool.query(
      `INSERT INTO users.directory_saves (user_id, saved_user_id)
       VALUES ($1, $2) ON CONFLICT DO NOTHING`,
      [userId, savedUserId],
    );
    return { saved: true };
  }

  async unsaveMember(userId: string, savedUserId: string) {
    await this.pool.query(
      `DELETE FROM users.directory_saves WHERE user_id = $1 AND saved_user_id = $2`,
      [userId, savedUserId],
    );
    return { saved: false };
  }

  async getProfile(userId: string): Promise<Record<string, unknown>> {
    const cacheKey = `profile:${userId}`;
    const cached = await this.redis.get<Record<string, unknown>>(cacheKey);
    if (cached) return cached;

    const result = await this.pool.query(
      `SELECT p.*,
              COALESCE(json_agg(DISTINCT jsonb_build_object(
                'id', e.id, 'company', e.company, 'position', e.position,
                'location', e.location, 'startDate', e.start_date,
                'endDate', e.end_date, 'description', e.description
              )) FILTER (WHERE e.id IS NOT NULL), '[]') as experience,
              COALESCE(json_agg(DISTINCT jsonb_build_object(
                'id', ed.id, 'school', ed.school, 'degree', ed.degree,
                'field', ed.field, 'startDate', ed.start_date, 'endDate', ed.end_date
              )) FILTER (WHERE ed.id IS NOT NULL), '[]') as education,
              COALESCE(json_agg(DISTINCT jsonb_build_object(
                'id', s.id, 'name', s.name, 'endorsements', us.endorsements
              )) FILTER (WHERE s.id IS NOT NULL), '[]') as skills,
              COALESCE(json_agg(DISTINCT jsonb_build_object(
                'id', pl.id, 'type', pl.type, 'url', pl.url
              )) FILTER (WHERE pl.id IS NOT NULL), '[]') as portfolio_links,
              COALESCE(json_agg(DISTINCT jsonb_build_object(
                'id', wp.id, 'imageUrl', wp.image_url, 'sortOrder', wp.sort_order
              )) FILTER (WHERE wp.id IS NOT NULL), '[]') as work_photos
       FROM users.profiles p
       LEFT JOIN users.experience e ON e.user_id = p.user_id
       LEFT JOIN users.education ed ON ed.user_id = p.user_id
       LEFT JOIN users.user_skills us ON us.user_id = p.user_id
       LEFT JOIN users.skills s ON s.id = us.skill_id
       LEFT JOIN users.portfolio_links pl ON pl.user_id = p.user_id
       LEFT JOIN users.profile_work_photos wp ON wp.user_id = p.user_id
       WHERE p.user_id = $1 AND p.deleted_at IS NULL
       GROUP BY p.id`,
      [userId],
    );

    if (result.rows.length === 0) {
      await this.ensureProfile(userId);
      return this.getProfile(userId);
    }

    const profile = this.formatProfile(result.rows[0]);
    await this.redis.set(cacheKey, profile, PROFILE_CACHE_TTL);
    return profile;
  }

  async updateProfile(userId: string, requesterId: string, dto: UpdateProfileDto) {
    if (userId !== requesterId) throw new ForbiddenError('Cannot update another user profile');

    const fields: string[] = [];
    const values: unknown[] = [];
    let idx = 1;

    const mapping: Record<string, string> = {
      firstName: 'first_name',
      lastName: 'last_name',
      headline: 'headline',
      about: 'about',
      industry: 'industry',
      location: 'location',
      website: 'website',
      avatarUrl: 'avatar_url',
      coverUrl: 'cover_url',
      resumeUrl: 'resume_url',
      city: 'city',
      state: 'state',
      country: 'country',
      currentPosition: 'current_position',
      currentEmployer: 'current_employer',
      instagramUrl: 'instagram_url',
      linkedinUrl: 'linkedin_url',
      yearsExperience: 'years_experience',
      openToOpportunities: 'open_to_opportunities',
      availablePrivateEvents: 'available_private_events',
      availableContractWork: 'available_contract_work',
      availableEmergencyStaffing: 'available_emergency_staffing',
      visibleInDirectory: 'visible_in_directory',
      onboardingStep: 'onboarding_step',
      onboardingCompleted: 'onboarding_completed',
      role: 'role',
    };

    for (const [key, col] of Object.entries(mapping)) {
      const val = dto[key as keyof UpdateProfileDto];
      if (val !== undefined) {
        fields.push(`${col} = $${idx++}`);
        values.push(val);
      }
    }

    if (dto.expertiseAreas !== undefined) {
      fields.push(`expertise_areas = $${idx++}`);
      values.push(dto.expertiseAreas);
    }

    if (fields.length === 0) return this.getProfile(userId);

    values.push(userId);
    await this.pool.query(
      `UPDATE users.profiles SET ${fields.join(', ')}, updated_at = now()
       WHERE user_id = $${idx} AND deleted_at IS NULL`,
      values,
    );

    await this.recalculateCompleteness(userId);
    await this.redis.del(`profile:${userId}`);

    await this.kafka.publish('profile-updated', 'profile.updated', { userId });

    return this.getProfile(userId);
  }

  async replaceExperience(userId: string, requesterId: string, rows: AddExperienceDto[]) {
    if (userId !== requesterId) throw new ForbiddenError();
    await this.pool.query('DELETE FROM users.experience WHERE user_id = $1', [userId]);
    for (const dto of rows) {
      await this.pool.query(
        `INSERT INTO users.experience (user_id, company, position, location, start_date, end_date, description)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          userId,
          dto.company,
          dto.position,
          dto.location ?? null,
          dto.startDate,
          dto.endDate ?? null,
          dto.description ?? null,
        ],
      );
    }
    await this.recalculateCompleteness(userId);
    await this.redis.del(`profile:${userId}`);
    return this.getProfile(userId);
  }

  async replaceEducation(userId: string, requesterId: string, rows: AddEducationDto[]) {
    if (userId !== requesterId) throw new ForbiddenError();
    await this.pool.query('DELETE FROM users.education WHERE user_id = $1', [userId]);
    for (const dto of rows) {
      await this.pool.query(
        `INSERT INTO users.education (user_id, school, degree, field, start_date, end_date)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          userId,
          dto.school,
          dto.degree ?? null,
          dto.field ?? null,
          dto.startDate ?? null,
          dto.endDate ?? null,
        ],
      );
    }
    await this.recalculateCompleteness(userId);
    await this.redis.del(`profile:${userId}`);
    return this.getProfile(userId);
  }

  async replacePortfolioLinks(
    userId: string,
    requesterId: string,
    dto: ReplacePortfolioLinksDto,
  ) {
    if (userId !== requesterId) throw new ForbiddenError();
    await this.pool.query('DELETE FROM users.portfolio_links WHERE user_id = $1', [userId]);
    for (const link of dto.links) {
      if (!link.url) continue;
      await this.pool.query(
        'INSERT INTO users.portfolio_links (user_id, type, url) VALUES ($1, $2, $3)',
        [userId, link.type, link.url],
      );
    }
    await this.redis.del(`profile:${userId}`);
    return this.getProfile(userId);
  }

  async replaceWorkPhotos(userId: string, requesterId: string, dto: ReplaceWorkPhotosDto) {
    if (userId !== requesterId) throw new ForbiddenError();
    await this.pool.query('DELETE FROM users.profile_work_photos WHERE user_id = $1', [userId]);
    for (const [index, url] of dto.imageUrls.slice(0, 5).entries()) {
      await this.pool.query(
        'INSERT INTO users.profile_work_photos (user_id, image_url, sort_order) VALUES ($1, $2, $3)',
        [userId, url, index],
      );
    }
    await this.redis.del(`profile:${userId}`);
    return this.getProfile(userId);
  }

  // "Who viewed your profile" — record a view (skipping self-views).
  async recordProfileView(profileId: string, viewerId: string) {
    if (profileId === viewerId) return { recorded: false };
    await this.pool.query(
      'INSERT INTO users.profile_views (profile_id, viewer_id) VALUES ($1, $2)',
      [profileId, viewerId],
    );
    return { recorded: true };
  }

  async getProfileViews(profileId: string, requesterId: string) {
    if (profileId !== requesterId) throw new ForbiddenError();
    const counts = await this.pool.query(
      `SELECT count(*)::int AS total, count(DISTINCT viewer_id)::int AS unique_viewers
       FROM users.profile_views WHERE profile_id = $1`,
      [profileId],
    );
    const recent = await this.pool.query(
      `SELECT viewer_id, first_name, last_name, headline, viewed_at FROM (
         SELECT DISTINCT ON (v.viewer_id)
                v.viewer_id, v.viewed_at, p.first_name, p.last_name, p.headline
         FROM users.profile_views v
         LEFT JOIN users.profiles p ON p.user_id = v.viewer_id
         WHERE v.profile_id = $1
         ORDER BY v.viewer_id, v.viewed_at DESC
       ) s ORDER BY viewed_at DESC LIMIT 20`,
      [profileId],
    );
    return {
      total: counts.rows[0].total,
      uniqueViewers: counts.rows[0].unique_viewers,
      recent: recent.rows.map((r) => ({
        viewerId: r.viewer_id,
        name: [r.first_name, r.last_name].filter(Boolean).join(' ') || null,
        headline: r.headline ?? null,
        viewedAt: r.viewed_at,
      })),
    };
  }

  async addExperience(userId: string, requesterId: string, dto: AddExperienceDto) {
    if (userId !== requesterId) throw new ForbiddenError();
    await this.pool.query(
      `INSERT INTO users.experience (user_id, company, position, location, start_date, end_date, description)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [userId, dto.company, dto.position, dto.location ?? null, dto.startDate, dto.endDate ?? null, dto.description ?? null],
    );
    await this.recalculateCompleteness(userId);
    await this.redis.del(`profile:${userId}`);
    return this.getProfile(userId);
  }

  async addEducation(userId: string, requesterId: string, dto: AddEducationDto) {
    if (userId !== requesterId) throw new ForbiddenError();
    await this.pool.query(
      `INSERT INTO users.education (user_id, school, degree, field, start_date, end_date)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [userId, dto.school, dto.degree ?? null, dto.field ?? null, dto.startDate ?? null, dto.endDate ?? null],
    );
    await this.recalculateCompleteness(userId);
    await this.redis.del(`profile:${userId}`);
    return this.getProfile(userId);
  }

  async addSkill(userId: string, requesterId: string, dto: AddSkillDto) {
    if (userId !== requesterId) throw new ForbiddenError();
    let skillResult = await this.pool.query(
      'SELECT id FROM users.skills WHERE name = $1',
      [dto.name],
    );
    if (skillResult.rows.length === 0) {
      skillResult = await this.pool.query(
        'INSERT INTO users.skills (name) VALUES ($1) RETURNING id',
        [dto.name],
      );
    }
    const skillId = skillResult.rows[0].id;

    await this.pool.query(
      `INSERT INTO users.user_skills (user_id, skill_id) VALUES ($1, $2)
       ON CONFLICT DO NOTHING`,
      [userId, skillId],
    );

    await this.kafka.publish('skill-added', 'skill.added', { userId, skillId, name: dto.name });
    await this.recalculateCompleteness(userId);
    await this.redis.del(`profile:${userId}`);
    return this.getProfile(userId);
  }

  async endorseSkill(userId: string, skillId: string, endorserId: string) {
    if (userId === endorserId) throw new ForbiddenError('Cannot endorse own skill');
    const result = await this.pool.query(
      `UPDATE users.user_skills SET endorsements = endorsements + 1
       WHERE user_id = $1 AND skill_id = $2 RETURNING *`,
      [userId, skillId],
    );
    if (result.rows.length === 0) throw new NotFoundError('Skill not found on profile');
    await this.redis.del(`profile:${userId}`);
    return { success: true };
  }

  async softDelete(userId: string, requesterId: string) {
    if (userId !== requesterId) throw new ForbiddenError();
    await this.pool.query(
      'UPDATE users.profiles SET deleted_at = now() WHERE user_id = $1',
      [userId],
    );
    await this.redis.del(`profile:${userId}`);
    return { success: true };
  }

  private async recalculateCompleteness(userId: string) {
    const result = await this.pool.query(
      `SELECT p.*,
        (SELECT count(*) FROM users.experience e WHERE e.user_id = p.user_id) as exp_count,
        (SELECT count(*) FROM users.education ed WHERE ed.user_id = p.user_id) as edu_count,
        (SELECT count(*) FROM users.user_skills us WHERE us.user_id = p.user_id) as skill_count
       FROM users.profiles p WHERE p.user_id = $1`,
      [userId],
    );
    if (result.rows.length === 0) return;
    const p = result.rows[0];
    let score = 0;
    if (p.first_name && p.last_name) score += 15;
    if (p.headline) score += 15;
    if (p.about) score += 15;
    if (p.location || p.city) score += 10;
    if (p.avatar_url) score += 10;
    if (parseInt(p.exp_count) > 0) score += 15;
    if (parseInt(p.edu_count) > 0) score += 10;
    if (parseInt(p.skill_count) > 0) score += 10;
    await this.pool.query(
      'UPDATE users.profiles SET completeness = $1 WHERE user_id = $2',
      [Math.min(score, 100), userId],
    );
  }

  private formatProfile(row: Record<string, unknown>) {
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
      experience: row.experience,
      education: row.education,
      skills: row.skills,
      portfolioLinks: row.portfolio_links,
      workPhotos: row.work_photos,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}
