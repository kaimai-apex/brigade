import {
  Controller,
  Get,
  Put,
  Post,
  Delete,
  Body,
  Param,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { UserService } from './user.service';
import {
  UpdateProfileDto,
  AddExperienceDto,
  AddEducationDto,
  AddSkillDto,
  ReplacePortfolioLinksDto,
  ReplaceWorkPhotosDto,
  DirectoryQueryDto,
} from './dto/user.dto';
import { JwtAuthGuard, loadConfig, AuthenticatedRequest } from '@connectpro/common';

const config = loadConfig('user-service', 3003);
const jwtGuard = new JwtAuthGuard(config.jwtSecret);

@Controller('users')
@UseGuards(jwtGuard)
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get('directory/list')
  listDirectory(@Query() query: DirectoryQueryDto) {
    return this.userService.listDirectory(query);
  }

  @Get('directory/saves')
  listSaves(@Req() req: AuthenticatedRequest) {
    return this.userService.listSavedMemberIds(req.user.sub);
  }

  @Post('directory/saves/:id')
  saveMember(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    return this.userService.saveMember(req.user.sub, id);
  }

  @Delete('directory/saves/:id')
  unsaveMember(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    return this.userService.unsaveMember(req.user.sub, id);
  }

  @Get(':id')
  getProfile(@Param('id') id: string) {
    return this.userService.getProfile(id);
  }

  @Post(':id/views')
  recordView(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    return this.userService.recordProfileView(id, req.user.sub);
  }

  @Get(':id/profile-views')
  profileViews(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    return this.userService.getProfileViews(id, req.user.sub);
  }

  @Put(':id')
  updateProfile(
    @Param('id') id: string,
    @Body() dto: UpdateProfileDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.userService.updateProfile(id, req.user.sub, dto);
  }

  @Delete(':id')
  deleteProfile(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    return this.userService.softDelete(id, req.user.sub);
  }

  @Put(':id/experience')
  replaceExperience(
    @Param('id') id: string,
    @Body() body: { items: AddExperienceDto[] },
    @Req() req: AuthenticatedRequest,
  ) {
    return this.userService.replaceExperience(id, req.user.sub, body.items ?? []);
  }

  @Put(':id/education')
  replaceEducation(
    @Param('id') id: string,
    @Body() body: { items: AddEducationDto[] },
    @Req() req: AuthenticatedRequest,
  ) {
    return this.userService.replaceEducation(id, req.user.sub, body.items ?? []);
  }

  @Put(':id/portfolio-links')
  replacePortfolioLinks(
    @Param('id') id: string,
    @Body() dto: ReplacePortfolioLinksDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.userService.replacePortfolioLinks(id, req.user.sub, dto);
  }

  @Put(':id/work-photos')
  replaceWorkPhotos(
    @Param('id') id: string,
    @Body() dto: ReplaceWorkPhotosDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.userService.replaceWorkPhotos(id, req.user.sub, dto);
  }

  @Post(':id/experience')
  addExperience(
    @Param('id') id: string,
    @Body() dto: AddExperienceDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.userService.addExperience(id, req.user.sub, dto);
  }

  @Post(':id/education')
  addEducation(
    @Param('id') id: string,
    @Body() dto: AddEducationDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.userService.addEducation(id, req.user.sub, dto);
  }

  @Post(':id/skills')
  addSkill(
    @Param('id') id: string,
    @Body() dto: AddSkillDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.userService.addSkill(id, req.user.sub, dto);
  }

  @Post(':id/skills/:skillId/endorse')
  endorseSkill(
    @Param('id') id: string,
    @Param('skillId') skillId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.userService.endorseSkill(id, skillId, req.user.sub);
  }
}
