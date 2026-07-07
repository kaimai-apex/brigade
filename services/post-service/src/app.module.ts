import { Module } from '@nestjs/common';
import { PostController } from './post.controller';
import { PostService } from './post.service';
import { HealthController } from './health.controller';

@Module({
  controllers: [HealthController, PostController],
  providers: [PostService],
})
export class AppModule {}
