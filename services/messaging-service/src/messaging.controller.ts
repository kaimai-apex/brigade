import { Controller, Get, Post, Body, Param, Query, Req, UseGuards } from '@nestjs/common';
import { MessagingService } from './messaging.service';
import { JwtAuthGuard, loadConfig, AuthenticatedRequest } from '@connectpro/common';
import { IsString, IsArray, IsOptional } from 'class-validator';

const config = loadConfig('messaging-service', 3007);
const jwtGuard = new JwtAuthGuard(config.jwtSecret);

class CreateConversationDto {
  @IsArray() participantIds!: string[];
  @IsOptional() @IsString() type?: string;
  @IsOptional() @IsString() title?: string;
}

class SendMessageDto {
  @IsString() conversationId!: string;
  @IsString() body!: string;
}

class ReactionDto {
  @IsString() emoji!: string;
}

@Controller()
@UseGuards(jwtGuard)
export class MessagingController {
  constructor(private readonly messagingService: MessagingService) {}

  @Get('conversations')
  list(@Req() req: AuthenticatedRequest) {
    return this.messagingService.listConversations(req.user.sub);
  }

  @Post('conversations')
  create(@Body() dto: CreateConversationDto, @Req() req: AuthenticatedRequest) {
    return this.messagingService.createConversation(
      req.user.sub,
      dto.participantIds,
      dto.type,
      dto.title,
    );
  }

  @Get('conversations/:id/messages')
  messages(
    @Param('id') id: string,
    @Req() req: AuthenticatedRequest,
    @Query('limit') limit?: string,
  ) {
    return this.messagingService.getMessages(id, req.user.sub, limit ? parseInt(limit, 10) : 50);
  }

  @Post('messages')
  send(@Body() dto: SendMessageDto, @Req() req: AuthenticatedRequest) {
    return this.messagingService.sendMessage(dto.conversationId, req.user.sub, dto.body);
  }

  @Post('messages/:id/reactions')
  react(@Param('id') id: string, @Body() dto: ReactionDto, @Req() req: AuthenticatedRequest) {
    return this.messagingService.addReaction(id, req.user.sub, dto.emoji);
  }
}
