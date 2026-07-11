import { Controller, Get, Post, Param, Query, UseGuards } from '@nestjs/common';
import { DirectoryService } from './directory.service';
import { ExploreWriteGuard } from './explore-write.guard';
import type { Bbox } from './overpass';

/** Parse "south,west,north,east" into a Bbox (returns undefined if malformed or too large). */
function parseBbox(raw?: string): Bbox | undefined {
  if (!raw) return undefined;
  const parts = raw.split(',').map((n) => Number(n.trim()));
  if (parts.length !== 4 || parts.some((n) => Number.isNaN(n))) return undefined;
  const [south, west, north, east] = parts;
  if (south >= north || west >= east) return undefined;
  if (north - south > 2 || east - west > 2) return undefined;
  return { south, west, north, east };
}

function parsePage(page?: string, limit?: string) {
  return {
    page: page ? parseInt(page, 10) : undefined,
    limit: limit ? parseInt(limit, 10) : undefined,
  };
}

/**
 * Curated Explore directory (schools, associations, suppliers, news,
 * job-listings, neighbourhoods). Nested under /explore so we don't collide
 * with job-service's /api/v1/jobs.
 */
@Controller('explore')
export class DirectoryController {
  constructor(private readonly directory: DirectoryService) {}

  /** Upsert curated seed data — used by ingest:explore and first-boot. */
  @Post('seed')
  @UseGuards(ExploreWriteGuard)
  async seed() {
    const counts = await this.directory.seedAll();
    return { ok: true, ...counts };
  }

  @Get('schools')
  listSchools(
    @Query('bbox') bbox?: string,
    @Query('city') city?: string,
    @Query('program') program?: string,
    @Query('q') q?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.directory.listSchools({
      bbox: parseBbox(bbox),
      city: city || undefined,
      program: program || undefined,
      q: q || undefined,
      ...parsePage(page, limit),
    });
  }

  @Get('schools/:slug')
  getSchool(@Param('slug') slug: string) {
    return this.directory.getSchool(slug);
  }

  @Get('associations')
  listAssociations(
    @Query('scope') scope?: string,
    @Query('q') q?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.directory.listAssociations({
      scope: scope || undefined,
      q: q || undefined,
      ...parsePage(page, limit),
    });
  }

  @Get('suppliers')
  listSuppliers(
    @Query('bbox') bbox?: string,
    @Query('category') category?: string,
    @Query('region') region?: string,
    @Query('q') q?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.directory.listSuppliers({
      bbox: parseBbox(bbox),
      category: category || undefined,
      region: region || undefined,
      q: q || undefined,
      ...parsePage(page, limit),
    });
  }

  @Get('news')
  listNews(
    @Query('tag') tag?: string,
    @Query('q') q?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.directory.listNews({
      tag: tag || undefined,
      q: q || undefined,
      ...parsePage(page, limit),
    });
  }

  /** Explore link-out job listings — NOT native Brigade job postings. */
  @Get('job-listings')
  listJobs(
    @Query('bbox') bbox?: string,
    @Query('type') type?: string,
    @Query('neighbourhood') neighbourhood?: string,
    @Query('employment') employment?: string,
    @Query('q') q?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.directory.listJobListings({
      bbox: parseBbox(bbox),
      type: type || undefined,
      neighbourhood: neighbourhood || undefined,
      employment: employment || undefined,
      q: q || undefined,
      ...parsePage(page, limit),
    });
  }

  @Get('neighbourhoods')
  listNeighbourhoods(
    @Query('bbox') bbox?: string,
    @Query('q') q?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.directory.listNeighbourhoods({
      bbox: parseBbox(bbox),
      q: q || undefined,
      ...parsePage(page, limit),
    });
  }

  @Get('map-pins')
  mapPins(@Query('bbox') bbox?: string) {
    return this.directory.mapPins(parseBbox(bbox));
  }
}
