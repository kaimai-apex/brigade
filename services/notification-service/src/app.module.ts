import { Module } from '@nestjs/common';
import { NotificationController } from './notification.controller';
import { NotificationService } from './notification.service';
import { HealthController } from './health.controller';

@Module({
  controllers: [HealthController, NotificationController],
  providers: [NotificationService],
})
export class AppModule {}
