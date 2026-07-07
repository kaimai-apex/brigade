import { Module } from '@nestjs/common';
import { CompanyController } from './company.controller';
import { CompanyService } from './company.service';
import { HealthController } from './health.controller';

@Module({
  controllers: [HealthController, CompanyController],
  providers: [CompanyService],
})
export class AppModule {}
