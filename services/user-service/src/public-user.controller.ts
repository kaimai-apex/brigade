import { Controller, Get, Param } from '@nestjs/common';
import { UserService } from './user.service';

@Controller('users')
export class PublicUserController {
  constructor(private readonly userService: UserService) {}

  @Get('directory/public')
  listDirectory() {
    return this.userService.listDirectory();
  }

  @Get('public/:id')
  getPublicProfile(@Param('id') id: string) {
    return this.userService.getProfile(id);
  }
}
