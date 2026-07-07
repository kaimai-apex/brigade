import { IsOptional, IsString, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class PaginationQuery {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @IsOptional()
  @IsString()
  cursor?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  nextCursor?: string;
}

export function paginate<T extends { id: string; createdAt?: Date | string }>(
  items: T[],
  limit: number,
): PaginatedResponse<T> {
  const hasMore = items.length > limit;
  const data = hasMore ? items.slice(0, limit) : items;
  const nextCursor = hasMore ? data[data.length - 1]?.id : undefined;
  return { data, nextCursor };
}
