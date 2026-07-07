import { Module } from '@nestjs/common';
import { FeedController } from './feed.controller';
import { FeedService } from './feed.service';
import { HealthController } from './health.controller';

@Module({
  controllers: [HealthController, FeedController],
  providers: [FeedService],
})
export class AppModule {}
