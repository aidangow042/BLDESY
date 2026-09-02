import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiError, api } from '@/lib/api';
import { WAITLIST_CLOSED_ERROR } from '@/lib/data/eoi';
import {
  CONNECTION_ERROR,
  CONVERSATION_OPEN_ERROR,
  MESSAGE_BODY_REQUIRED,
  MESSAGE_MAX_LENGTH,
  MESSAGE_TOO_LONG,
  conversationErrorMessage,
  createConversation,
  getUnreadCount,
  sendMessage,
  sendMessageErrorMessage,
  threadPath,
  validateMessageBody,
} from '@/lib/data/messages';

vi.mock('@/lib/api', () => import('./mocks/api-mock'));
vi.mock('@/lib/supabase', () => import('./mocks/supabase-mock'));
vi.mock('@/lib/auth-context', () => import('./mocks/auth-context-mock'));
vi.mock('react-native', () => ({
  AppState: { addEventListener: () => ({ remove() {} }) },
}));

const post = api.post as unknown as ReturnType<typeof vi.fn>;
const get = api.get as unknown as ReturnType<typeof vi.fn>;

beforeEach(() => {
  post.mockReset();
  get.mockReset();
});

describe('validateMessageBody', () => {
  it('trims and enforces the 1–2000 rule with the schema copy', () => {
    expect(validateMessageBody('  hi  ')).toEqual({ ok: true, body: 'hi' });
    expect(validateMessageBody('   ')).toEqual({ ok: false, error: MESSAGE_BODY_REQUIRED });
    expect(validateMessageBody('x'.repeat(MESSAGE_MAX_LENGTH))).toMatchObject({ ok: true });
    expect(validateMessageBody('x'.repeat(MESSAGE_MAX_LENGTH + 1))).toEqual({ ok: false, error: MESSAGE_TOO_LONG });
  });
});

describe('threadPath', () => {
  it('builds the thread route with an optional encoded `before` cursor', () => {
    expect(threadPath('c1')).toBe('/api/messages/c1');
    expect(threadPath('c1', '2026-01-01T00:00:00+10:00')).toBe('/api/messages/c1?before=2026-01-01T00%3A00%3A00%2B10%3A00');
    expect(threadPath('c1', null)).toBe('/api/messages/c1');
  });
});

describe('conversationErrorMessage', () => {
  it('shows the waitlist copy, else the generic open error, else the connection line', () => {
    expect(conversationErrorMessage(new ApiError(403, WAITLIST_CLOSED_ERROR.error, 'waitlist_mode'))).toBe(WAITLIST_CLOSED_ERROR.error);
    expect(conversationErrorMessage(new ApiError(403, "This tradie isn't taking new enquiries right now."))).toBe(CONVERSATION_OPEN_ERROR);
    expect(conversationErrorMessage(new ApiError(429, 'Too many requests'))).toBe(CONVERSATION_OPEN_ERROR);
    expect(conversationErrorMessage(new TypeError('Network request failed'))).toBe(CONNECTION_ERROR);
  });
});

describe('sendMessageErrorMessage', () => {
  it('surfaces the server copy for HTTP errors and the connection line otherwise', () => {
    expect(sendMessageErrorMessage(new ApiError(400, 'Message is too long (max 2000 characters).'))).toBe('Message is too long (max 2000 characters).');
    expect(sendMessageErrorMessage(new ApiError(429, 'Too many messages. Please slow down.'))).toBe('Too many messages. Please slow down.');
    expect(sendMessageErrorMessage(new ApiError(403, WAITLIST_CLOSED_ERROR.error, 'waitlist_mode'))).toBe(WAITLIST_CLOSED_ERROR.error);
    expect(sendMessageErrorMessage(new Error('boom'))).toBe(CONNECTION_ERROR);
  });
});

describe('API calls', () => {
  it('createConversation posts recipient_id and returns the id', async () => {
    post.mockResolvedValue({ conversation_id: 'c9' });
    await expect(createConversation('u2')).resolves.toBe('c9');
    expect(post).toHaveBeenCalledWith('/api/messages/conversations', { recipient_id: 'u2' });
  });

  it('sendMessage validates locally before posting the trimmed body', async () => {
    await expect(sendMessage('c1', '   ')).rejects.toMatchObject({ status: 400, message: MESSAGE_BODY_REQUIRED });
    expect(post).not.toHaveBeenCalled();
    post.mockResolvedValue({ id: 'm1', body: 'hi' });
    await expect(sendMessage('c1', ' hi ')).resolves.toMatchObject({ id: 'm1' });
    expect(post).toHaveBeenCalledWith('/api/messages/c1', { body: 'hi' });
  });

  it('getUnreadCount reads { unread } and coerces a missing value to 0', async () => {
    get.mockResolvedValue({ unread: 3 });
    await expect(getUnreadCount()).resolves.toBe(3);
    get.mockResolvedValue({});
    await expect(getUnreadCount()).resolves.toBe(0);
    expect(get).toHaveBeenCalledWith('/api/messages/unread');
  });
});
