import { Body, Controller, Delete, HttpCode, Param, Post, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthUser } from '../auth/auth.types';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { DevicesService } from './devices.service';
import { RegisterDeviceDto } from './dto/register-device.dto';

@Controller('devices')
@UseGuards(JwtAuthGuard)
export class DevicesController {
  constructor(private readonly devices: DevicesService) {}

  @Post()
  @HttpCode(204)
  async register(@CurrentUser() user: AuthUser, @Body() dto: RegisterDeviceDto): Promise<void> {
    await this.devices.register(user.id, dto.token, dto.platform);
  }

  @Delete(':token')
  @HttpCode(204)
  async remove(@CurrentUser() user: AuthUser, @Param('token') token: string): Promise<void> {
    await this.devices.remove(user.id, token);
  }
}
