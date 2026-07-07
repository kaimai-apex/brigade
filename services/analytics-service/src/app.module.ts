import { Module } from '@nestjs/common';
import { AnalyticsController } from './analytics.controller';
import { AdminController } from './admin.controller';
import { AnalyticsService } from './analytics.service';
import { HealthController } from './health.controller';

@Module({
  controllers: [HealthController, AnalyticsController, AdminController],
  providers: [AnalyticsService],
})
export class AppModule {}
