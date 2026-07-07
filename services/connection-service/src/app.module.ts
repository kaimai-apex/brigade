import { Module } from '@nestjs/common';
import { ConnectionController } from './connection.controller';
import { ConnectionService } from './connection.service';
import { HealthController } from './health.controller';

@Module({
  controllers: [HealthController, ConnectionController],
  providers: [ConnectionService],
})
export class AppModule {}
