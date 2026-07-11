import { Module } from '@nestjs/common';
import { RestaurantController } from './restaurant.controller';
import { RestaurantService } from './restaurant.service';
import { HealthController } from './health.controller';

@Module({
  controllers: [HealthController, RestaurantController],
  providers: [RestaurantService],
})
export class AppModule {}
