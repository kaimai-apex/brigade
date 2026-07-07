import { Controller, Get, Post, Put, Body, Param, Query, Req, UseGuards } from '@nestjs/common';
import { NotificationService } from './notification.service';
import { JwtAuthGuard, loadConfig, AuthenticatedRequest } from '@connectpro/common';
import { IsOptional, IsBoolean } from 'class-validator';

const config = loadConfig('notification-service', 3008);
const jwtGuard = new JwtAuthGuard(config.jwtSecret);

class PreferencesDto {
  @IsOptional() @IsBoolean() inApp?: boolean;
  @IsOptional() @IsBoolean() push?: boolean;
  @IsOptional() @IsBoolean() email?: boolean;
  @IsOptional() @IsBoolean() sms?: boolean;
}

@Controller('notifications')
@UseGuards(jwtGuard)
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Get()
  list(@Req() req: AuthenticatedRequest, @Query('limit') limit?: string) {
    return this.notificationService.list(req.user.sub, limit ? parseInt(limit, 10) : 20);
  }

  @Post(':id/read')
  markRead(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    return this.notificationService.markRead(id, req.user.sub);
  }

  @Put('preferences')
  updatePreferences(@Body() dto: PreferencesDto, @Req() req: AuthenticatedRequest) {
    return this.notificationService.updatePreferences(req.user.sub, dto);
  }
}
