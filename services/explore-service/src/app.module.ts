import { Module } from '@nestjs/common';
import { RestaurantController } from './restaurant.controller';
import { RestaurantService } from './restaurant.service';
import { DirectoryController } from './directory.controller';
import { DirectoryService } from './directory.service';
import { HealthController } from './health.controller';

@Module({
  controllers: [HealthController, RestaurantController, DirectoryController],
  providers: [RestaurantService, DirectoryService],
})
export class AppModule {}
