import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { HealthController } from './health.controller';

@Module({
  controllers: [HealthController, AuthController],
  providers: [AuthService],
})
export class AppModule {}
