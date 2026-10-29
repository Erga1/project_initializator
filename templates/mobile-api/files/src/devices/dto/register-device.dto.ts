import { IsIn, IsString, MaxLength, MinLength } from 'class-validator';

export class RegisterDeviceDto {
  @IsString()
  @MinLength(10)
  @MaxLength(512)
  token: string;

  @IsIn(['ios', 'android'])
  platform: string;
}
