import { Module } from '@nestjs/common';
import { JobController, ApplicationController } from './job.controller';
import { JobService } from './job.service';
import { HealthController } from './health.controller';

@Module({
  controllers: [HealthController, JobController, ApplicationController],
  providers: [JobService],
})
export class AppModule {}
