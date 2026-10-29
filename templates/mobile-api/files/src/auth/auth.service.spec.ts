import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { hashSync } from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  const prisma = {
    user: { findUnique: jest.fn(), create: jest.fn() },
    refreshToken: {
      findUnique: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn(),
    },
  };
  const jwt = new JwtService({ secret: 'test-secret-with-more-than-32-characters' });
  const config = { get: jest.fn().mockReturnValue(30) } as unknown as ConfigService;
  const service = new AuthService(prisma as unknown as PrismaService, jwt, config);

  beforeEach(() => {
    jest.clearAllMocks();
    (config.get as jest.Mock).mockReturnValue(30);
  });

  it('registers a user with a hashed password and returns both tokens', async () => {
    prisma.user.findUnique.mockResolvedValue(null);
    prisma.user.create.mockResolvedValue({ id: 1, email: 'a@example.com' });

    const tokens = await service.register(' A@Example.com ', 'correct horse battery');

    const data = prisma.user.create.mock.calls[0][0].data;
    expect(data.email).toBe('a@example.com');
    expect(data.passwordHash).not.toContain('correct horse');
    expect(tokens.accessToken.split('.')).toHaveLength(3);
    expect(tokens.refreshToken.length).toBeGreaterThan(40);
    // Only a hash of the refresh token is stored.
    expect(prisma.refreshToken.create.mock.calls[0][0].data.tokenHash).not.toBe(
      tokens.refreshToken,
    );
  });

  it('rejects duplicate registrations', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: 1 });
    await expect(service.register('a@example.com', 'correct horse battery')).rejects.toBeInstanceOf(
      ConflictException,
    );
  });

  it('logs in with the right password and rejects the wrong one', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 1,
      email: 'a@example.com',
      passwordHash: hashSync('right-password', 4),
    });
    await expect(service.login('a@example.com', 'right-password')).resolves.toHaveProperty(
      'accessToken',
    );
    await expect(service.login('a@example.com', 'wrong-password')).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('rejects login for unknown emails with the same error', async () => {
    prisma.user.findUnique.mockResolvedValue(null);
    await expect(service.login('nobody@example.com', 'whatever')).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('rotates refresh tokens and refuses expired or unknown ones', async () => {
    prisma.refreshToken.findUnique.mockResolvedValueOnce({
      id: 7,
      expiresAt: new Date(Date.now() + 60_000),
      user: { id: 1, email: 'a@example.com' },
    });
    await service.refresh('some-valid-refresh-token-value');
    expect(prisma.refreshToken.delete).toHaveBeenCalledWith({ where: { id: 7 } });

    prisma.refreshToken.findUnique.mockResolvedValueOnce({
      id: 8,
      expiresAt: new Date(Date.now() - 1_000),
      user: { id: 1, email: 'a@example.com' },
    });
    await expect(service.refresh('expired-refresh-token-value-x')).rejects.toBeInstanceOf(
      UnauthorizedException,
    );

    prisma.refreshToken.findUnique.mockResolvedValueOnce(null);
    await expect(service.refresh('unknown-refresh-token-value-x')).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });
});
