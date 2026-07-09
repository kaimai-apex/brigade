import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { AuthService } from './auth.service';
import {
  SignupDto,
  LoginDto,
  RefreshTokenDto,
  MfaVerifyDto,
  PasswordResetDto,
} from './dto/auth.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('signup')
  @HttpCode(HttpStatus.CREATED)
  signup(@Body() dto: SignupDto) {
    return this.authService.signup(dto);
  }

  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Post('logout')
  logout(@Body() dto: RefreshTokenDto) {
    return this.authService.logout(dto.refreshToken);
  }

  @Post('refresh-token')
  refresh(@Body() dto: RefreshTokenDto) {
    return this.authService.refresh(dto.refreshToken);
  }

  @Post('mfa/verify')
  verifyMfa(@Body() dto: MfaVerifyDto & { userId: string }) {
    return this.authService.verifyMfa(dto.userId, dto.code);
  }

  @Post('password/reset')
  passwordReset(@Body() dto: PasswordResetDto) {
    return this.authService.passwordReset(dto.email);
  }
}
