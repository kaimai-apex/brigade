#!/usr/bin/env bash
# Generates a NestJS microservice scaffold
set -euo pipefail

SERVICE_NAME=$1
PORT=$2
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DIR="$ROOT/services/$SERVICE_NAME"

mkdir -p "$DIR/src"

cat > "$DIR/package.json" << EOF
{
  "name": "@connectpro/$SERVICE_NAME",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "build": "tsc",
    "dev": "tsx watch src/main.ts",
    "start": "node dist/main.js",
    "lint": "tsc --noEmit",
    "test": "echo \"No tests yet\""
  },
  "dependencies": {
    "@connectpro/common": "workspace:*",
    "@nestjs/common": "^11.0.12",
    "@nestjs/core": "^11.0.12",
    "@nestjs/platform-express": "^11.0.12",
    "pg": "^8.16.0",
    "reflect-metadata": "^0.2.2",
    "rxjs": "^7.8.2"
  },
  "devDependencies": {
    "@types/node": "^22.15.21",
    "@types/pg": "^8.15.2",
    "tsx": "^4.19.4",
    "typescript": "^5.8.3"
  }
}
EOF

cat > "$DIR/tsconfig.json" << 'EOF'
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "commonjs",
    "lib": ["ES2022"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true,
    "declaration": true
  },
  "include": ["src/**/*"]
}
EOF

cat > "$DIR/src/main.ts" << EOF
import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { GlobalExceptionFilter, loadConfig, createLogger } from '@connectpro/common';

const config = loadConfig('$SERVICE_NAME', $PORT);
const log = createLogger('$SERVICE_NAME');

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api/v1');
  app.useGlobalFilters(new GlobalExceptionFilter());
  await app.listen(config.port);
  log.info({ port: config.port }, '$SERVICE_NAME started');
}

bootstrap();
EOF

cat > "$DIR/src/app.module.ts" << EOF
import { Module } from '@nestjs/common';
import { HealthController } from './health.controller';

@Module({
  controllers: [HealthController],
})
export class AppModule {}
EOF

cat > "$DIR/src/health.controller.ts" << EOF
import { Controller, Get } from '@nestjs/common';

@Controller('health')
export class HealthController {
  @Get()
  health() {
    return { status: 'ok', service: '$SERVICE_NAME' };
  }
}
EOF

echo "Created $SERVICE_NAME on port $PORT"
