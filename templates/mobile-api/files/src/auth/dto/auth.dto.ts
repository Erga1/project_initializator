import { IsEmail, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class RegisterDto {
  @IsEmail()
  @MaxLength(254)
  email: string;

  // bcrypt only uses the first 72 bytes, so longer passwords are rejected.
  @IsString()
  @MinLength(8)
  @MaxLength(72)
  password: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;
}

export class LoginDto {
  @IsEmail()
  @MaxLength(254)
  email: string;

  @IsString()
  @MaxLength(72)
  password: string;
}

export class RefreshDto {
  @IsString()
  @MinLength(20)
  @MaxLength(256)
  refreshToken: string;
}
