import type { Request } from 'express';

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export interface AuthUser {
  id: number;
  email: string;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthUser;
}
