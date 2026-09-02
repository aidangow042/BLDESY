import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiError, api } from '@/lib/api';
import {
  EOI_GENERIC_ERROR,
  EOI_NOT_TAKING_ENQUIRIES,
  EOI_RATE_LIMITED_MESSAGE,
  EoiError,
  WAITLIST_CLOSED_ERROR,
  buildEoiBody,
  classifyEoiError,
  submitExpressionOfInterest,
} from '@/lib/data/eoi';

vi.mock('@/lib/api', () => import('./mocks/api-mock'));

const post = api.post as unknown as ReturnType<typeof vi.fn>;

beforeEach(() => {
  post.mockReset();
});

describe('buildEoiBody', () => {
  it('trims, drops blanks (like the website\'s `|| undefined`) and keeps the honeypot empty', () => {
    expect(
      buildEoiBody({ tradie_id: 't1', name: '  Sam ', email: ' sam@example.com ', phone: '', message: '   ' }),
    ).toEqual({ tradie_id: 't1', name: 'Sam', email: 'sam@example.com', phone: undefined, message: undefined, company: '' });
  });

  it('lets a signed-in caller omit email/phone (server uses the account\'s)', () => {
    expect(buildEoiBody({ tradie_id: 't1', name: 'Sam' })).toEqual({
      tradie_id: 't1',
      name: 'Sam',
      email: undefined,
      phone: undefined,
      message: undefined,
      company: '',
    });
  });
});

describe('classifyEoiError', () => {
  it('maps the waitlist 403 to waitlist_closed with the shared copy', () => {
    const e = new ApiError(403, WAITLIST_CLOSED_ERROR.error, 'waitlist_mode');
    expect(classifyEoiError(e)).toEqual({ kind: 'waitlist_closed', message: WAITLIST_CLOSED_ERROR.error, status: 403 });
  });

  it('maps a plain 403 to not_taking_enquiries', () => {
    const e = new ApiError(403, EOI_NOT_TAKING_ENQUIRIES);
    expect(classifyEoiError(e)).toEqual({ kind: 'not_taking_enquiries', message: EOI_NOT_TAKING_ENQUIRIES, status: 403 });
  });

  it('overrides 429 with "Steady on — try again in a bit."', () => {
    expect(classifyEoiError(new ApiError(429, 'Too many submissions. Please try again later.'))).toEqual({
      kind: 'rate_limited',
      message: EOI_RATE_LIMITED_MESSAGE,
      status: 429,
    });
  });

  it('keeps the server copy for 404 / 400 / other statuses', () => {
    expect(classifyEoiError(new ApiError(404, 'Tradie not found.'))).toMatchObject({ kind: 'not_found', message: 'Tradie not found.' });
    expect(classifyEoiError(new ApiError(400, 'Please add your name.'))).toMatchObject({ kind: 'invalid', message: 'Please add your name.' });
    expect(classifyEoiError(new ApiError(500, "Couldn't send that. Please try again."))).toMatchObject({ kind: 'unknown', status: 500 });
  });

  it('treats anything non-HTTP as a network failure with the generic copy', () => {
    expect(classifyEoiError(new TypeError('Network request failed'))).toEqual({ kind: 'network', message: EOI_GENERIC_ERROR });
    expect(classifyEoiError(undefined)).toEqual({ kind: 'network', message: EOI_GENERIC_ERROR });
  });

  it('passes an EoiError through unchanged', () => {
    expect(classifyEoiError(new EoiError('rate_limited', 'x', 429))).toEqual({ kind: 'rate_limited', message: 'x', status: 429 });
  });
});

describe('submitExpressionOfInterest', () => {
  it('posts the built body and resolves with the business name', async () => {
    post.mockResolvedValue({ ok: true, business_name: 'Harbour City Plumbing' });
    await expect(submitExpressionOfInterest({ tradie_id: 't1', name: 'Sam', email: 'sam@example.com' })).resolves.toEqual({
      ok: true,
      business_name: 'Harbour City Plumbing',
    });
    expect(post).toHaveBeenCalledWith('/api/eoi', {
      tradie_id: 't1',
      name: 'Sam',
      email: 'sam@example.com',
      phone: undefined,
      message: undefined,
      company: '',
    });
  });

  it('tolerates the honeypot/dedupe success without a business name', async () => {
    post.mockResolvedValue({ ok: true });
    await expect(submitExpressionOfInterest({ tradie_id: 't1', name: 'Sam' })).resolves.toEqual({ ok: true, business_name: null });
  });

  it('rejects with a classified EoiError', async () => {
    post.mockRejectedValue(new ApiError(403, WAITLIST_CLOSED_ERROR.error, 'waitlist_mode'));
    const err = await submitExpressionOfInterest({ tradie_id: 't1', name: 'Sam' }).catch((e) => e);
    expect(err).toBeInstanceOf(EoiError);
    expect(err.kind).toBe('waitlist_closed');
    expect(err.message).toBe(WAITLIST_CLOSED_ERROR.error);

    post.mockResolvedValue({ ok: false, error: 'nope' });
    const err2 = await submitExpressionOfInterest({ tradie_id: 't1', name: 'Sam' }).catch((e) => e);
    expect(err2).toBeInstanceOf(EoiError);
    expect(err2).toMatchObject({ kind: 'unknown', message: 'nope' });
  });
});
