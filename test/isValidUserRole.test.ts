import { describe, it, expect } from 'vitest';
import { isValidUserRole, getValidatedRole } from '../utils/isValidUserRole';
import { SessionWithUser } from '@/content/database_types';

describe('isValidUserRole', () => {
  it('should return true for valid admin role', () => {
    expect(isValidUserRole('admin')).toBe(true);
  });

  it('should return true for valid driver role', () => {
    expect(isValidUserRole('driver')).toBe(true);
  });

  it('should return true for valid customer role', () => {
    expect(isValidUserRole('customer')).toBe(true);
  });

  it('should return false for invalid role', () => {
    expect(isValidUserRole('superuser')).toBe(false);
    expect(isValidUserRole('moderator')).toBe(false);
    expect(isValidUserRole('guest')).toBe(false);
  });

  it('should return false for empty string', () => {
    expect(isValidUserRole('')).toBe(false);
  });

  it('should return false for role with wrong casing', () => {
    expect(isValidUserRole('Admin')).toBe(false);
    expect(isValidUserRole('DRIVER')).toBe(false);
    expect(isValidUserRole('Customer')).toBe(false);
  });

  it('should return false for role with whitespace', () => {
    expect(isValidUserRole(' admin')).toBe(false);
    expect(isValidUserRole('driver ')).toBe(false);
    expect(isValidUserRole(' customer ')).toBe(false);
  });

  it('should return false for numeric strings', () => {
    expect(isValidUserRole('123')).toBe(false);
    expect(isValidUserRole('0')).toBe(false);
  });

  it('should return false for special characters', () => {
    expect(isValidUserRole('admin@')).toBe(false);
    expect(isValidUserRole('#driver')).toBe(false);
  });
});

describe('getValidatedRole', () => {
  const createMockSession = (role: string | null | undefined): SessionWithUser => ({
    session: {
      id: '123',
      createdAt: new Date(),
      updatedAt: new Date(),
      userId: 'user-123',
      expiresAt: new Date(),
      token: 'token-123',
    },
    user: {
      id: 'user-123',
      name: 'Test User',
      email: 'test@example.com',
      emailVerified: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      role: role,
    },
  });

  it('should return valid role for admin session', () => {
    const session = createMockSession('admin');
    expect(getValidatedRole(session)).toBe('admin');
  });

  it('should return valid role for driver session', () => {
    const session = createMockSession('driver');
    expect(getValidatedRole(session)).toBe('driver');
  });

  it('should return valid role for customer session', () => {
    const session = createMockSession('customer');
    expect(getValidatedRole(session)).toBe('customer');
  });

  it('should return null for invalid role', () => {
    const session = createMockSession('superuser');
    expect(getValidatedRole(session)).toBeNull();
  });

  it('should return null for null session', () => {
    expect(getValidatedRole(null)).toBeNull();
  });

  it('should return null for session with null role', () => {
    const session = createMockSession(null);
    expect(getValidatedRole(session)).toBeNull();
  });

  it('should return null for session with undefined role', () => {
    const session = createMockSession(undefined);
    expect(getValidatedRole(session)).toBeNull();
  });

  it('should return null for session with empty string role', () => {
    const session = createMockSession('');
    expect(getValidatedRole(session)).toBeNull();
  });

  it('should handle session without user property', () => {
    const sessionWithoutUser = {
      session: {
        id: '123',
        createdAt: new Date(),
        updatedAt: new Date(),
        userId: 'user-123',
        expiresAt: new Date(),
        token: 'token-123',
      },
    } as any;
    
    expect(getValidatedRole(sessionWithoutUser)).toBeNull();
  });

  it('should return null for role with incorrect casing', () => {
    const session = createMockSession('Admin');
    expect(getValidatedRole(session)).toBeNull();
  });

  it('should return null for role with whitespace', () => {
    const session = createMockSession(' admin ');
    expect(getValidatedRole(session)).toBeNull();
  });
});
