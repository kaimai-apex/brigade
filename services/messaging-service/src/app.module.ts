import { Module } from '@nestjs/common';
import { MessagingController } from './messaging.controller';
import { MessagingService } from './messaging.service';
import { HealthController } from './health.controller';

@Module({
  controllers: [HealthController, MessagingController],
  providers: [MessagingService],
})
export class AppModule {}
