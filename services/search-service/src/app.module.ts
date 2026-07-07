import { Module } from '@nestjs/common';
import { SearchController } from './search.controller';
import { SearchService } from './search.service';
import { HealthController } from './health.controller';

@Module({
  controllers: [HealthController, SearchController],
  providers: [SearchService],
})
export class AppModule {}
