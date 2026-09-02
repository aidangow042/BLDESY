import { beforeEach, describe, expect, it, vi } from 'vitest';

import { api } from '@/lib/api';
import {
  ANONYMOUS_ID_STORAGE_KEY,
  buildTrackPayload,
  getAnonymousId,
  getFirstTouchAttribution,
  getSessionId,
  isValidAnonymousId,
  resetTrackingSession,
  setFirstTouchAttribution,
  trackFunnelEvent,
} from '@/lib/data/tracking';

// vi.mock factories are hoisted above every import, so the state they close
// over must be hoisted with them.
const { storage, uuidCounter } = vi.hoisted(() => ({
  storage: new Map<string, string>(),
  uuidCounter: { n: 0 },
}));

vi.mock('@/lib/api', () => import('./mocks/api-mock'));
vi.mock('@react-native-async-storage/async-storage', () => ({
  default: {
    getItem: vi.fn(async (k: string) => storage.get(k) ?? null),
    setItem: vi.fn(async (k: string, v: string) => {
      storage.set(k, v);
    }),
  },
}));
vi.mock('expo-crypto', () => ({
  randomUUID: vi.fn(() => `00000000-0000-4000-8000-${String(++uuidCounter.n).padStart(12, '0')}`),
}));

const post = api.post as unknown as ReturnType<typeof vi.fn>;

beforeEach(() => {
  post.mockReset();
  post.mockResolvedValue(undefined);
  storage.clear();
  resetTrackingSession();
});

describe('isValidAnonymousId', () => {
  it('accepts the 36-char uuid shape the website checks', () => {
    expect(isValidAnonymousId('0f8fad5b-d9cb-469f-a165-70867728950e')).toBe(true);
    expect(isValidAnonymousId('short')).toBe(false);
    expect(isValidAnonymousId(null)).toBe(false);
  });
});

describe('buildTrackPayload', () => {
  it('matches the website tracker body, omitting absent fields', () => {
    const payload = buildTrackPayload({
      name: 'search_performed',
      meta: { total: 0 },
      anonymousId: 'anon',
      sessionId: 'sess',
      path: '/search',
      touch: { referrer: null, source: 'meta', medium: null, campaign: 'c', content: null, term: null },
    });
    expect(payload).toEqual({
      name: 'search_performed',
      meta: { total: 0 },
      anonymous_id: 'anon',
      session_id: 'sess',
      path: '/search',
      referrer: undefined,
      utm_source: 'meta',
      utm_medium: undefined,
      utm_campaign: 'c',
      utm_content: undefined,
      utm_term: undefined,
    });
    expect(JSON.parse(JSON.stringify(payload))).toEqual({
      name: 'search_performed',
      meta: { total: 0 },
      anonymous_id: 'anon',
      session_id: 'sess',
      path: '/search',
      utm_source: 'meta',
      utm_campaign: 'c',
    });
  });
});

describe('identity', () => {
  it('persists one anonymous id across calls and reuses a stored valid one', async () => {
    const first = await getAnonymousId();
    expect(first).toBe(await getAnonymousId());
    expect(storage.get(ANONYMOUS_ID_STORAGE_KEY)).toBe(first);
    resetTrackingSession();
    expect(await getAnonymousId()).toBe(first);
  });

  it('replaces a corrupt stored id', async () => {
    storage.set(ANONYMOUS_ID_STORAGE_KEY, 'garbage');
    const id = await getAnonymousId();
    expect(isValidAnonymousId(id)).toBe(true);
    expect(storage.get(ANONYMOUS_ID_STORAGE_KEY)).toBe(id);
  });

  it('keeps one session id per launch and first-touch is write-once', () => {
    expect(getSessionId()).toBe(getSessionId());
    expect(getFirstTouchAttribution()).toBeNull();
    setFirstTouchAttribution({ source: 'meta', content: 'ad-1' });
    setFirstTouchAttribution({ source: 'google' });
    expect(getFirstTouchAttribution()).toEqual({ referrer: null, source: 'meta', medium: null, campaign: null, content: 'ad-1', term: null });
  });
});

describe('trackFunnelEvent', () => {
  it('posts to /api/track with identity, path and first-touch attached', async () => {
    setFirstTouchAttribution({ source: 'meta' });
    trackFunnelEvent('search_performed', { trade: 'plumber' }, { path: '/search' });
    await vi.waitFor(() => expect(post).toHaveBeenCalledTimes(1));
    const [path, body] = post.mock.calls[0];
    expect(path).toBe('/api/track');
    expect(body).toMatchObject({
      name: 'search_performed',
      meta: { trade: 'plumber' },
      session_id: getSessionId(),
      path: '/search',
      utm_source: 'meta',
    });
    expect(isValidAnonymousId(body.anonymous_id)).toBe(true);
  });

  it('fires oncePerSession events at most once per launch', async () => {
    trackFunnelEvent('homepage_landed');
    trackFunnelEvent('homepage_landed');
    trackFunnelEvent('search_performed');
    trackFunnelEvent('search_performed');
    await vi.waitFor(() => expect(post).toHaveBeenCalledTimes(3));
    resetTrackingSession();
    trackFunnelEvent('homepage_landed');
    await vi.waitFor(() => expect(post).toHaveBeenCalledTimes(4));
  });

  it('never throws — a failed beacon is warned and swallowed', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    post.mockRejectedValue(new Error('offline'));
    expect(() => trackFunnelEvent('search_performed')).not.toThrow();
    await vi.waitFor(() => expect(warn).toHaveBeenCalled());
    warn.mockRestore();
  });

  it('ignores names outside the registry', async () => {
    trackFunnelEvent('not_an_event' as never);
    await new Promise((r) => setTimeout(r, 10));
    expect(post).not.toHaveBeenCalled();
  });
});
