import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Req,
  UseGuards,
} from '@nestjs/common';
import { PostService } from './post.service';
import { JwtAuthGuard, loadConfig, AuthenticatedRequest } from '@connectpro/common';
import { IsString, IsOptional } from 'class-validator';

const config = loadConfig('post-service', 3005);
const jwtGuard = new JwtAuthGuard(config.jwtSecret);

class CreatePostDto {
  @IsString() content!: string;
  @IsOptional() @IsString() mediaUrl?: string;
  @IsOptional() @IsString() postType?: string;
  @IsOptional() @IsString() visibility?: string;
}

class CommentDto {
  @IsString() content!: string;
  @IsOptional() @IsString() parentId?: string;
}

class ReactionDto {
  @IsOptional() @IsString() reaction?: string;
}

class RepostDto {
  @IsOptional() @IsString() quote?: string;
}

@Controller('posts')
@UseGuards(jwtGuard)
export class PostController {
  constructor(private readonly postService: PostService) {}

  @Post()
  create(@Body() dto: CreatePostDto, @Req() req: AuthenticatedRequest) {
    return this.postService.createPost(
      req.user.sub,
      dto.content,
      dto.mediaUrl,
      dto.postType,
      dto.visibility,
    );
  }

  @Get('hashtag/:tag')
  byHashtag(@Param('tag') tag: string, @Req() req: AuthenticatedRequest) {
    return this.postService.getPostsByHashtag(tag, req.user.sub);
  }

  @Get(':id')
  get(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    return this.postService.getPost(id, req.user.sub);
  }

  @Delete(':id')
  delete(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    return this.postService.deletePost(id, req.user.sub);
  }

  @Post(':id/comments')
  comment(@Param('id') id: string, @Body() dto: CommentDto, @Req() req: AuthenticatedRequest) {
    return this.postService.addComment(id, req.user.sub, dto.content, dto.parentId);
  }

  @Post(':id/likes')
  like(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    return this.postService.likePost(id, req.user.sub);
  }

  @Delete(':id/likes')
  unlike(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    return this.postService.unlikePost(id, req.user.sub);
  }

  @Post(':id/reactions')
  react(
    @Param('id') id: string,
    @Body() dto: ReactionDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.postService.reactPost(id, req.user.sub, dto.reaction ?? 'like');
  }

  @Delete(':id/reactions')
  unreact(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    return this.postService.unlikePost(id, req.user.sub);
  }

  @Post(':id/share')
  share(
    @Param('id') id: string,
    @Body() dto: RepostDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.postService.sharePost(id, req.user.sub, dto.quote ?? '');
  }
}
