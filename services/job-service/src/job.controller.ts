import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JobService } from './job.service';
import { JwtAuthGuard, loadConfig, AuthenticatedRequest } from '@connectpro/common';
import { IsString, IsOptional, IsUUID, IsInt } from 'class-validator';

const config = loadConfig('job-service', 3010);
const jwtGuard = new JwtAuthGuard(config.jwtSecret);

class CreateJobDto {
  @IsUUID() companyId!: string;
  @IsString() title!: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsString() location?: string;
  @IsOptional() @IsInt() salaryMin?: number;
  @IsOptional() @IsInt() salaryMax?: number;
  @IsOptional() @IsString() employmentType?: string;
}

class ApplyDto {
  @IsOptional() @IsString() resumeUrl?: string;
}

class StatusDto {
  @IsString() status!: string;
}

@Controller('jobs')
@UseGuards(jwtGuard)
export class JobController {
  constructor(private readonly jobService: JobService) {}

  @Get()
  list(
    @Query('q') q?: string,
    @Query('location') location?: string,
    @Query('type') type?: string,
    @Query('limit') limit?: string,
  ) {
    return this.jobService.listJobs({ q, location, type }, limit ? parseInt(limit, 10) : 20);
  }

  @Post()
  create(@Body() dto: CreateJobDto, @Req() req: AuthenticatedRequest) {
    return this.jobService.createJob(req.user.sub, req.user.roles, dto);
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return this.jobService.getJob(id);
  }

  @Post(':id/apply')
  apply(@Param('id') id: string, @Body() dto: ApplyDto, @Req() req: AuthenticatedRequest) {
    return this.jobService.apply(id, req.user.sub, dto.resumeUrl);
  }

  @Post(':id/save')
  save(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    return this.jobService.saveJob(id, req.user.sub);
  }

  @Get(':id/applicants')
  applicants(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    return this.jobService.getApplicants(id, req.user.sub);
  }
}

@Controller('applications')
@UseGuards(jwtGuard)
export class ApplicationController {
  constructor(private readonly jobService: JobService) {}

  @Put(':id/status')
  updateStatus(
    @Param('id') id: string,
    @Body() dto: StatusDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.jobService.updateApplicationStatus(id, req.user.sub, dto.status);
  }
}
