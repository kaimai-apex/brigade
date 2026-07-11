import { IsString, IsOptional, IsDateString, IsUUID, IsInt, IsBoolean, IsArray } from 'class-validator';

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
  @IsOptional() @IsInt() onboardingStep?: number;
  @IsOptional() @IsBoolean() onboardingCompleted?: boolean;
  @IsOptional() @IsBoolean() openToOpportunities?: boolean;
  @IsOptional() @IsBoolean() availablePrivateEvents?: boolean;
  @IsOptional() @IsBoolean() availableContractWork?: boolean;
  @IsOptional() @IsBoolean() availableEmergencyStaffing?: boolean;
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
