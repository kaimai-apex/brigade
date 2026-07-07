import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { SearchService } from './search.service';
import { JwtAuthGuard, loadConfig } from '@connectpro/common';

const config = loadConfig('search-service', 3009);
const jwtGuard = new JwtAuthGuard(config.jwtSecret);

@Controller('search')
@UseGuards(jwtGuard)
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get()
  search(
    @Query('q') q: string,
    @Query('type') type?: string,
    @Query('limit') limit?: string,
  ) {
    return this.searchService.search(q ?? '', type, limit ? parseInt(limit, 10) : 20);
  }

  @Get('autocomplete')
  autocomplete(@Query('q') q: string, @Query('limit') limit?: string) {
    return this.searchService.autocomplete(q ?? '', limit ? parseInt(limit, 10) : 10);
  }
}
