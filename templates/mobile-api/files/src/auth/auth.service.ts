import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { compare, hash, hashSync } from 'bcryptjs';
import { createHash, randomBytes } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';
import type { TokenPair } from './auth.types';

const BCRYPT_COST = 12;
// Compared against when the email is unknown, so response time does not reveal which emails exist.
const DUMMY_HASH = hashSync('not-a-real-password', BCRYPT_COST);
const DAY_MS = 24 * 60 * 60 * 1000;

const sha256 = (value: string) => createHash('sha256').update(value).digest('hex');
const normalizeEmail = (email: string) => email.trim().toLowerCase();

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  async register(email: string, password: string, name?: string): Promise<TokenPair> {
    const normalized = normalizeEmail(email);
    const existing = await this.prisma.user.findUnique({ where: { email: normalized } });
    if (existing) throw new ConflictException('Email is already registered');

    const user = await this.prisma.user.create({
      data: { email: normalized, name, passwordHash: await hash(password, BCRYPT_COST) },
    });
    return this.issueTokens(user.id, user.email);
  }

  async login(email: string, password: string): Promise<TokenPair> {
    const user = await this.prisma.user.findUnique({ where: { email: normalizeEmail(email) } });
    const valid = await compare(password, user?.passwordHash ?? DUMMY_HASH);
    if (!user || !valid) throw new UnauthorizedException('Invalid email or password');
    return this.issueTokens(user.id, user.email);
  }

  // Refresh tokens are single-use: the presented token is deleted and a new pair is issued.
  async refresh(refreshToken: string): Promise<TokenPair> {
    const stored = await this.prisma.refreshToken.findUnique({
      where: { tokenHash: sha256(refreshToken) },
      include: { user: true },
    });
    if (!stored || stored.expiresAt < new Date()) {
      throw new UnauthorizedException('Invalid refresh token');
    }
    await this.prisma.refreshToken.delete({ where: { id: stored.id } });
    return this.issueTokens(stored.user.id, stored.user.email);
  }

  async logout(refreshToken: string): Promise<void> {
    await this.prisma.refreshToken.deleteMany({ where: { tokenHash: sha256(refreshToken) } });
  }

  async profile(userId: number) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException();
    return { id: user.id, email: user.email, name: user.name };
  }

  private async issueTokens(userId: number, email: string): Promise<TokenPair> {
    const accessToken = await this.jwt.signAsync({ sub: userId, email });
    const refreshToken = randomBytes(48).toString('base64url');
    const ttlDays = this.config.get<number>('REFRESH_TOKEN_TTL_DAYS') ?? 30;

    await this.prisma.refreshToken.create({
      data: {
        tokenHash: sha256(refreshToken),
        userId,
        expiresAt: new Date(Date.now() + ttlDays * DAY_MS),
      },
    });
    return { accessToken, refreshToken };
  }
}
