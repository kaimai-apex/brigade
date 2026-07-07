import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { GatewayMiddleware } from './gateway.middleware';

@Module({})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(GatewayMiddleware).forRoutes('*');
  }
}
