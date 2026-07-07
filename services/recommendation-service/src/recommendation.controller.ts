import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import { RecommendationService } from './recommendation.service';
import { JwtAuthGuard, loadConfig, AuthenticatedRequest } from '@connectpro/common';

const config = loadConfig('recommendation-service', 3014);
const jwtGuard = new JwtAuthGuard(config.jwtSecret);

@Controller('recommendations')
@UseGuards(jwtGuard)
export class RecommendationController {
  constructor(private readonly recommendationService: RecommendationService) {}

  @Get('people')
  people(@Req() req: AuthenticatedRequest, @Query('limit') limit?: string) {
    return this.recommendationService.getPeopleYouMayKnow(
      req.user.sub,
      limit ? parseInt(limit, 10) : 10,
    );
  }

  @Get('jobs')
  jobs(@Req() req: AuthenticatedRequest, @Query('limit') limit?: string) {
    return this.recommendationService.getRecommendedJobs(
      req.user.sub,
      limit ? parseInt(limit, 10) : 10,
    );
  }

  @Get('content')
  content(@Req() req: AuthenticatedRequest, @Query('limit') limit?: string) {
    return this.recommendationService.getRecommendedContent(
      req.user.sub,
      limit ? parseInt(limit, 10) : 10,
    );
  }
}
