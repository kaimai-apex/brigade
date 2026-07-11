import { Controller, Get, Post, Body, Param, Query } from '@nestjs/common';
import { IsOptional, IsString, IsNumber } from 'class-validator';
import { RestaurantService } from './restaurant.service';
import type { Bbox } from './overpass';

/** Parse "south,west,north,east" into a Bbox (returns undefined if malformed). */
function parseBbox(raw?: string): Bbox | undefined {
  if (!raw) return undefined;
  const parts = raw.split(',').map((n) => Number(n.trim()));
  if (parts.length !== 4 || parts.some((n) => Number.isNaN(n))) return undefined;
  const [south, west, north, east] = parts;
  return { south, west, north, east };
}

class IngestDto {
  @IsOptional() @IsString() label?: string;
  @IsNumber() south!: number;
  @IsNumber() west!: number;
  @IsNumber() north!: number;
  @IsNumber() east!: number;
}

@Controller('restaurants')
export class RestaurantController {
  constructor(private readonly restaurants: RestaurantService) {}

  /**
   * Public directory listing. All filtering + pagination happens in the DB.
   * Read-through: an un-ingested bbox is fetched from OSM and persisted first.
   *   GET /api/v1/restaurants?bbox=s,w,n,e&cuisine=&price=&accolade=&q=&page=&limit=
   */
  @Get()
  list(
    @Query('bbox') bbox?: string,
    @Query('cuisine') cuisine?: string,
    @Query('price') price?: string,
    @Query('accolade') accolade?: string,
    @Query('q') q?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.restaurants.listRestaurants({
      bbox: parseBbox(bbox),
      cuisine: cuisine || undefined,
      price: price || undefined,
      accolade: accolade || undefined,
      q: q || undefined,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  @Get(':slug')
  getOne(@Param('slug') slug: string) {
    return this.restaurants.getBySlug(slug);
  }

  /** Ingest/refresh a bbox on demand — used by the monthly pre-ingest cron. */
  @Post('ingest')
  async ingest(@Body() body: IngestDto) {
    const count = await this.restaurants.ingestBbox(
      { south: body.south, west: body.west, north: body.north, east: body.east },
      body.label ?? 'manual',
    );
    return { ok: true, ingested: count };
  }
}
