import {User} from './user';

// Authentication Types

// Matches better-auth's actual session structure
export interface SessionData {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  userId: string;
  expiresAt: Date;
  token: string;
  ipAddress?: string | null;
  userAgent?: string | null;
  impersonatedBy?: string | null;
}

// This matches what better-auth returns: { session: {...}, user: {...} }
export interface SessionWithUser {
  session: SessionData;
  user: User;
}

export interface Account {
  id: string;
  accountId: string;
  providerId: string;
  userId: string;
  accessToken?: string | null;
  refreshToken?: string | null;
  idToken?: string | null;
  accessTokenExpiresAt?: Date | null;
  refreshTokenExpiresAt?: Date | null;
  scope?: string | null;
  password?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Verification {
  id: string;
  identifier: string;
  value: string;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface RegisterInput {
  name: string;
  email: string;
  password: string;
  role?: 'customer' | 'driver';
}

export interface ResetPasswordInput {
  email: string;
}

export interface ChangePasswordInput {
  currentPassword: string;
  newPassword: string;
}

export interface VerifyEmailInput {
  token: string;
}

export interface AuthResponse {
  user: User;
  session: SessionWithUser;
  token: string;
}

export interface ImpersonateInput {
  adminId: string;
  targetUserId: string;
}
