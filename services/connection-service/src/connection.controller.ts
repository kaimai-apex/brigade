import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ConnectionService } from './connection.service';
import { JwtAuthGuard, loadConfig, AuthenticatedRequest } from '@connectpro/common';
import { IsUUID } from 'class-validator';

const config = loadConfig('connection-service', 3004);
const jwtGuard = new JwtAuthGuard(config.jwtSecret);

class ConnectionRequestDto {
  @IsUUID() receiverId!: string;
}

class FollowDto {
  @IsUUID() followeeId!: string;
}

@Controller()
@UseGuards(jwtGuard)
export class ConnectionController {
  constructor(private readonly connectionService: ConnectionService) {}

  @Post('connections/request')
  sendRequest(@Body() dto: ConnectionRequestDto, @Req() req: AuthenticatedRequest) {
    return this.connectionService.sendRequest(req.user.sub, dto.receiverId);
  }

  @Post('connections/:id/accept')
  accept(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    return this.connectionService.accept(id, req.user.sub);
  }

  @Post('connections/:id/reject')
  reject(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    return this.connectionService.reject(id, req.user.sub);
  }

  @Delete('connections/:id')
  remove(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    return this.connectionService.remove(id, req.user.sub);
  }

  @Get('connections')
  list(@Req() req: AuthenticatedRequest, @Query('status') status?: string) {
    return this.connectionService.listConnections(req.user.sub, status ?? 'accepted');
  }

  @Post('follows')
  follow(@Body() dto: FollowDto, @Req() req: AuthenticatedRequest) {
    return this.connectionService.follow(req.user.sub, dto.followeeId);
  }

  @Delete('follows/:userId')
  unfollow(@Param('userId') userId: string, @Req() req: AuthenticatedRequest) {
    return this.connectionService.unfollow(req.user.sub, userId);
  }
}
