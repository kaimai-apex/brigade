import { IsString, IsOptional, IsDateString, IsUUID, IsInt, IsBoolean, IsArray, IsIn, Min } from 'class-validator';
import { Transform, Type } from 'class-transformer';

/** Coerce query-string "true"/"1" (or a present flag) into a real boolean. */
const toBool = ({ value }: { value: unknown }) =>
  value === true || value === 'true' || value === '1' || value === '';

export class DirectoryQueryDto {
  @IsOptional() @IsString() q?: string;
  @IsOptional() @IsString() role?: string;
  // Accepts ?expertise=a,b or repeated ?expertise=a&expertise=b.
  @IsOptional()
  @Transform(({ value }) =>
    Array.isArray(value)
      ? value
      : typeof value === 'string'
        ? value.split(',').map((v) => v.trim()).filter(Boolean)
        : undefined,
  )
  @IsArray()
  @IsString({ each: true })
  expertise?: string[];
  @IsOptional() @IsString() city?: string;
  @IsOptional() @IsString() state?: string;
  @IsOptional() @IsString() country?: string;
  @IsOptional() @Transform(toBool) @IsBoolean() openToWork?: boolean;
  @IsOptional() @Transform(toBool) @IsBoolean() emergency?: boolean;
  @IsOptional() @Transform(toBool) @IsBoolean() privateEvents?: boolean;
  @IsOptional() @Transform(toBool) @IsBoolean() contract?: boolean;
  @IsOptional() @Transform(toBool) @IsBoolean() hasPhoto?: boolean;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) minYears?: number;
  @IsOptional() @IsIn(['recent', 'newest', 'name', 'experience', 'complete']) sort?:
    | 'recent'
    | 'newest'
    | 'name'
    | 'experience'
    | 'complete';
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) limit?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) offset?: number;
}

export class UpdateProfileDto {
  @IsOptional() @IsString() firstName?: string;
  @IsOptional() @IsString() lastName?: string;
  @IsOptional() @IsString() headline?: string;
  @IsOptional() @IsString() about?: string;
  @IsOptional() @IsString() industry?: string;
  @IsOptional() @IsString() location?: string;
  @IsOptional() @IsString() website?: string;
  @IsOptional() @IsString() avatarUrl?: string;
  @IsOptional() @IsString() coverUrl?: string;
  @IsOptional() @IsString() resumeUrl?: string;
  @IsOptional() @IsString() city?: string;
  @IsOptional() @IsString() state?: string;
  @IsOptional() @IsString() country?: string;
  @IsOptional() @IsString() currentPosition?: string;
  @IsOptional() @IsString() currentEmployer?: string;
  @IsOptional() @IsString() instagramUrl?: string;
  @IsOptional() @IsString() linkedinUrl?: string;
  @IsOptional() @IsArray() @IsString({ each: true }) expertiseAreas?: string[];
  @IsOptional() @IsInt() yearsExperience?: number;
  @IsOptional() @IsBoolean() openToOpportunities?: boolean;
  @IsOptional() @IsBoolean() availablePrivateEvents?: boolean;
  @IsOptional() @IsBoolean() availableContractWork?: boolean;
  @IsOptional() @IsBoolean() availableEmergencyStaffing?: boolean;
  @IsOptional() @IsBoolean() visibleInDirectory?: boolean;
  @IsOptional() @IsInt() onboardingStep?: number;
  @IsOptional() @IsBoolean() onboardingCompleted?: boolean;
  /** Display title on profile (e.g. Chef) — not JWT RBAC. */
  @IsOptional() @IsString() role?: string;
}

export class AddExperienceDto {
  @IsString() company!: string;
  @IsString() position!: string;
  @IsOptional() @IsString() location?: string;
  @IsDateString() startDate!: string;
  @IsOptional() @IsDateString() endDate?: string;
  @IsOptional() @IsString() description?: string;
}

export class AddEducationDto {
  @IsString() school!: string;
  @IsOptional() @IsString() degree?: string;
  @IsOptional() @IsString() field?: string;
  @IsOptional() @IsDateString() startDate?: string;
  @IsOptional() @IsDateString() endDate?: string;
}

export class AddSkillDto {
  @IsString() name!: string;
}

export class EndorseSkillDto {
  @IsUUID() skillId!: string;
}

export class ReplacePortfolioLinksDto {
  @IsArray()
  links!: { type: string; url: string }[];
}

export class ReplaceWorkPhotosDto {
  @IsArray()
  @IsString({ each: true })
  imageUrls!: string[];
}
