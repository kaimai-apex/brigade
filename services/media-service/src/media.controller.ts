import { Controller, Post, Get, Body, Query, Req, UseGuards } from '@nestjs/common';
import { MediaService } from './media.service';
import { JwtAuthGuard, loadConfig, AuthenticatedRequest } from '@connectpro/common';
import { IsString } from 'class-validator';

const config = loadConfig('media-service', 3012);
const jwtGuard = new JwtAuthGuard(config.jwtSecret);

class UploadUrlDto {
  @IsString() filename!: string;
  @IsString() contentType!: string;
}

@Controller('media')
@UseGuards(jwtGuard)
export class MediaController {
  constructor(private readonly mediaService: MediaService) {}

  @Post('upload-url')
  getUploadUrl(@Body() dto: UploadUrlDto, @Req() req: AuthenticatedRequest) {
    return this.mediaService.getUploadUrl(req.user.sub, dto.filename, dto.contentType);
  }

  @Get('delivery')
  getDelivery(@Query('key') key: string, @Req() req: AuthenticatedRequest) {
    return this.mediaService.getDeliveryUrl(key, req.user.sub);
  }
}
