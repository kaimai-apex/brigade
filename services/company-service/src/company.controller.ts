import { Controller, Get, Post, Put, Body, Param, Req, UseGuards } from '@nestjs/common';
import { CompanyService } from './company.service';
import { JwtAuthGuard, loadConfig, AuthenticatedRequest } from '@connectpro/common';
import { IsString, IsOptional } from 'class-validator';

const config = loadConfig('company-service', 3011);
const jwtGuard = new JwtAuthGuard(config.jwtSecret);

class CompanyDto {
  @IsString() name!: string;
  @IsOptional() @IsString() industry?: string;
  @IsOptional() @IsString() website?: string;
  @IsOptional() @IsString() size?: string;
  @IsOptional() @IsString() logoUrl?: string;
}

@Controller('companies')
@UseGuards(jwtGuard)
export class CompanyController {
  constructor(private readonly companyService: CompanyService) {}

  @Get()
  list() {
    return this.companyService.list();
  }

  @Post()
  create(@Body() dto: CompanyDto) {
    return this.companyService.create(dto);
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return this.companyService.get(id);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() dto: CompanyDto) {
    return this.companyService.update(id, dto);
  }

  @Post(':id/follow')
  follow(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    return this.companyService.follow(id, req.user.sub);
  }

  @Get(':id/analytics')
  analytics(@Param('id') id: string) {
    return this.companyService.analytics(id);
  }
}
