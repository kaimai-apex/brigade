import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { GlobalExceptionFilter, loadConfig, createLogger } from '@connectpro/common';

const config = loadConfig('user-service', 3003);
const log = createLogger('user-service');

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api/v1');
  app.useGlobalFilters(new GlobalExceptionFilter());
  await app.listen(config.port);
  log.info({ port: config.port }, 'user-service started');
}

bootstrap();
