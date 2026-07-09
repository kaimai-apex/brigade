import { IsEmail, IsString, MinLength, Length } from 'class-validator';

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
  @Length(6, 6)
  code!: string;
}

export class PasswordResetDto {
  @IsEmail()
  email!: string;
}
