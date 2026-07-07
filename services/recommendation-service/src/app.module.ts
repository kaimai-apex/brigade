import { Module } from '@nestjs/common';
import { RecommendationController } from './recommendation.controller';
import { RecommendationService } from './recommendation.service';
import { HealthController } from './health.controller';

@Module({
  controllers: [HealthController, RecommendationController],
  providers: [RecommendationService],
})
export class AppModule {}
