import { Module } from '@nestjs/common';
import { UserController } from './user.controller';
import { PublicUserController } from './public-user.controller';
import { HealthController } from './health.controller';
import { UserService } from './user.service';

@Module({
  controllers: [HealthController, PublicUserController, UserController],
  providers: [UserService],
})
export class AppModule {}
