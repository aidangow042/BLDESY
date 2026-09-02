/**
 * Test double for @/lib/api — same ApiError shape and isWaitlistClosed rule
 * as the real module, with vi.fn() request helpers. Loaded through
 * `vi.mock('@/lib/api', () => import('./mocks/api-mock'))` so the real module
 * (which pulls expo-constants + the Supabase client) never loads in vitest.
 */
import { vi } from 'vitest';

export class ApiError extends Error {
  status: number;
  code?: string;

  constructor(status: number, message: string, code?: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}

export const api = {
  get: vi.fn(),
  post: vi.fn(),
  patch: vi.fn(),
  put: vi.fn(),
  delete: vi.fn(),
};

export function isWaitlistClosed(e: unknown): boolean {
  return e instanceof ApiError && e.status === 403 && e.code === 'waitlist_mode';
}
