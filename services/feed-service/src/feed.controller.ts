import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import { FeedService } from './feed.service';
import { JwtAuthGuard, loadConfig, AuthenticatedRequest } from '@connectpro/common';

const config = loadConfig('feed-service', 3006);
const jwtGuard = new JwtAuthGuard(config.jwtSecret);

@Controller('feed')
@UseGuards(jwtGuard)
export class FeedController {
  constructor(private readonly feedService: FeedService) {}

  @Get()
  getFeed(@Req() req: AuthenticatedRequest, @Query('limit') limit?: string) {
    return this.feedService.getFeed(req.user.sub, limit ? parseInt(limit, 10) : 20);
  }

  @Get('trending')
  getTrending(@Query('limit') limit?: string) {
    return this.feedService.getTrending(limit ? parseInt(limit, 10) : 20);
  }
}
