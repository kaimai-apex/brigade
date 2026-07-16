import { Controller, Get, NotFoundException, Param } from '@nestjs/common';
import { UserService } from './user.service';

/**
 * Limited public surface. Directory listing is auth-only (UserController).
 * Individual profiles remain readable by id for shared links.
 */
@Controller('users')
export class PublicUserController {
  constructor(private readonly userService: UserService) {}

  @Get('directory/public')
  listDirectory() {
    throw new NotFoundException('Public directory is no longer available');
  }

  @Get('public/:id')
  getPublicProfile(@Param('id') id: string) {
    return this.userService.getProfile(id);
  }
}
