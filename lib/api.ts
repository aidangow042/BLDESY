import Constants from 'expo-constants';

import { supabase } from './supabase';

// Use the www host directly — the apex (bldesy.com.au) 307-redirects to www,
// and that cross-origin redirect strips the Authorization header on POSTs.
const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? 'https://www.bldesy.com.au';

// Shared secret that lets the website skip Cloudflare Turnstile for requests
// from the app (see ~/bldesy-web/lib/turnstile.ts verifyMobileSecret). It is
// only ever a CAPTCHA bypass — every rate limit still applies. Lives in
// EXPO_PUBLIC_MOBILE_APP_SECRET (local .env / EAS env var), never in git.
const MOBILE_APP_SECRET = process.env.EXPO_PUBLIC_MOBILE_APP_SECRET;

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

type Method = 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';

async function authHeaders(): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  const headers: Record<string, string> = {
    'X-Client': 'mobile',
    'X-App-Version': Constants.expoConfig?.version ?? 'dev',
    Accept: 'application/json',
  };
  if (MOBILE_APP_SECRET) headers['X-Mobile-Secret'] = MOBILE_APP_SECRET;
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

async function request<T>(method: Method, path: string, body?: unknown, retry = true): Promise<T> {
  const url = path.startsWith('http') ? path : `${API_BASE_URL}${path}`;
  const headers = await authHeaders();
  if (body !== undefined) headers['Content-Type'] = 'application/json';

  const res = await fetch(url, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  // 401 once → refresh session and retry once
  if (res.status === 401 && retry) {
    const { data, error } = await supabase.auth.refreshSession();
    if (!error && data.session) {
      return request<T>(method, path, body, false);
    }
  }

  // 204 No Content (beacons such as /api/track and contact-reveal)
  if (res.status === 204) return undefined as T;

  const text = await res.text();
  let payload: any = null;
  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      payload = { error: text };
    }
  }

  if (!res.ok) {
    const message = payload?.error || payload?.message || `Request failed (${res.status})`;
    throw new ApiError(res.status, message, payload?.code);
  }

  return payload as T;
}

export const api = {
  get: <T>(path: string) => request<T>('GET', path),
  post: <T>(path: string, body?: unknown) => request<T>('POST', path, body),
  patch: <T>(path: string, body?: unknown) => request<T>('PATCH', path, body),
  put: <T>(path: string, body?: unknown) => request<T>('PUT', path, body),
  delete: <T>(path: string, body?: unknown) => request<T>('DELETE', path, body),
};

/** True when the website returned its waitlist-mode 403 (`code: "waitlist_mode"`). */
export function isWaitlistClosed(e: unknown): boolean {
  return e instanceof ApiError && e.status === 403 && e.code === 'waitlist_mode';
}
