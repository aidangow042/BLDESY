import { describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/supabase', () => ({ db: {}, supabase: {} }));
vi.mock('expo-constants', () => ({ default: { expoConfig: { version: 'test' } } }));

import {
  AccountDeletionUnsupportedError,
  ApplicationActiveError,
  emailUpdateErrorMessage,
  ERR_CURRENT_PASSWORD_REQUIRED,
  ERR_EMAIL_TAKEN,
  ERR_PASSWORD_MIN,
  ERR_PASSWORD_MISMATCH,
  ERR_PHONE_TAKEN,
  ERR_SEND_CODE,
  phoneUpdateErrorMessage,
  validatePasswordChange,
} from '@/lib/data/settings';

describe('validatePasswordChange', () => {
  it('mirrors the settings form checks and strings, in order', () => {
    expect(validatePasswordChange('', 'longenough', 'longenough')).toBe(ERR_CURRENT_PASSWORD_REQUIRED);
    expect(validatePasswordChange('old', 'short', 'short')).toBe(ERR_PASSWORD_MIN);
    expect(validatePasswordChange('old', 'longenough', 'different')).toBe(ERR_PASSWORD_MISMATCH);
    expect(validatePasswordChange('old', 'longenough', 'longenough')).toBeNull();
    expect(validatePasswordChange('old', 'longenough')).toBeNull();
  });
});

describe('Supabase error mapping', () => {
  it('phone: exists → taken, else generic send failure', () => {
    expect(phoneUpdateErrorMessage('Phone number already exists')).toBe(ERR_PHONE_TAKEN);
    expect(phoneUpdateErrorMessage('phone_exists')).toBe(ERR_PHONE_TAKEN);
    expect(phoneUpdateErrorMessage('rate limited')).toBe(ERR_SEND_CODE);
    expect(phoneUpdateErrorMessage(undefined)).toBe(ERR_SEND_CODE);
  });
  it('email: exists/registered → taken', () => {
    expect(emailUpdateErrorMessage('A user with this email address has already been registered')).toBe(
      ERR_EMAIL_TAKEN,
    );
    expect(emailUpdateErrorMessage('email_exists')).toBe(ERR_EMAIL_TAKEN);
    expect(emailUpdateErrorMessage('boom')).toBe(ERR_SEND_CODE);
  });
});

describe('typed errors', () => {
  it('carry the website status codes and copy', () => {
    const del = new AccountDeletionUnsupportedError();
    expect(del.status).toBe(422);
    expect(del.message).toMatch(/contact support/);
    const active = new ApplicationActiveError();
    expect(active.status).toBe(409);
    expect(active.code).toBe('active');
    expect(active.message).toMatch(/Delete your account from Settings/);
  });
});
