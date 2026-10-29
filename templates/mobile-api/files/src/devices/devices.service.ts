import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DevicesService {
  constructor(private readonly prisma: PrismaService) {}

  // A token belongs to whoever registered it last (for example after a user switch on one phone).
  async register(userId: number, token: string, platform: string) {
    await this.prisma.deviceToken.upsert({
      where: { token },
      update: { userId, platform },
      create: { token, platform, userId },
    });
  }

  async remove(userId: number, token: string) {
    await this.prisma.deviceToken.deleteMany({ where: { token, userId } });
  }
}
