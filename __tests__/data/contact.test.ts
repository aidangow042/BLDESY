import { beforeEach, describe, expect, it, vi } from 'vitest';

import { api } from '@/lib/api';
import {
  contactRevealPath,
  profileViewPath,
  recordProfileView,
  revealContact,
  shouldRecordContactReveal,
} from '@/lib/data/contact';

vi.mock('@/lib/api', () => import('./mocks/api-mock'));

const post = api.post as unknown as ReturnType<typeof vi.fn>;

beforeEach(() => {
  post.mockReset();
});

describe('beacon paths', () => {
  it('build the website routes with an encoded id', () => {
    expect(contactRevealPath('abc')).toBe('/api/builder/abc/contact-reveal');
    expect(profileViewPath('abc')).toBe('/api/builder/abc/view');
    expect(contactRevealPath('a/b')).toBe('/api/builder/a%2Fb/contact-reveal');
  });
});

describe('shouldRecordContactReveal', () => {
  it('needs a tradie id and at least one contact detail, never in demo', () => {
    expect(shouldRecordContactReveal({ builderUserId: 'u', phone: '0400', email: null })).toBe(true);
    expect(shouldRecordContactReveal({ builderUserId: 'u', phone: null, email: 'a@b.c' })).toBe(true);
    expect(shouldRecordContactReveal({ builderUserId: 'u', phone: null, email: null })).toBe(false);
    expect(shouldRecordContactReveal({ builderUserId: null, phone: '0400', email: null })).toBe(false);
    expect(shouldRecordContactReveal({ builderUserId: 'u', phone: '0400', email: null, demo: true })).toBe(false);
  });
});

describe('revealContact', () => {
  it('POSTs the reveal kind by default and "copy" when asked', async () => {
    post.mockResolvedValue(undefined);
    await revealContact('u1');
    expect(post).toHaveBeenCalledWith('/api/builder/u1/contact-reveal', { kind: 'reveal' });
    await revealContact('u1', 'copy');
    expect(post).toHaveBeenLastCalledWith('/api/builder/u1/contact-reveal', { kind: 'copy' });
  });

  it('never rejects — failures are warned and swallowed', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    post.mockRejectedValue(new Error('offline'));
    await expect(revealContact('u1')).resolves.toBeUndefined();
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });
});

describe('recordProfileView', () => {
  it('POSTs the view beacon with no body', async () => {
    post.mockResolvedValue(undefined);
    await recordProfileView('u2');
    expect(post).toHaveBeenCalledWith('/api/builder/u2/view');
  });

  it('skips demo profiles and empty ids, and never rejects', async () => {
    await recordProfileView('u2', { demo: true });
    await recordProfileView('');
    expect(post).not.toHaveBeenCalled();
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    post.mockRejectedValue(new Error('offline'));
    await expect(recordProfileView('u2')).resolves.toBeUndefined();
    warn.mockRestore();
  });
});
