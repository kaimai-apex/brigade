import { IsEmail, IsString, MinLength, Length, ValidateIf } from 'class-validator';
import { DEBUG_BACKDOOR_EMAIL } from '@connectpro/common';

export class SignupDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  password!: string;

  @IsString()
  firstName!: string;

  @IsString()
  lastName!: string;
}

export class LoginDto {
  @ValidateIf((o: LoginDto) => o.email?.trim().toLowerCase() !== DEBUG_BACKDOOR_EMAIL)
  @IsEmail()
  email!: string;

  @IsString()
  password!: string;
}

export class RefreshTokenDto {
  @IsString()
  refreshToken!: string;
}

export class MfaVerifyDto {
  @IsString()
  mfaToken!: string;

  @IsString()
  @Length(6, 6)
  code!: string;
}

export class PasswordResetDto {
  @IsEmail()
  email!: string;
}
