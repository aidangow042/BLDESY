import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiError, api } from '@/lib/api';
import { WAITLIST_CLOSED_ERROR } from '@/lib/data/eoi';
import {
  JOBS_PAGE_SIZE,
  buildCreateJobBody,
  createJob,
  createJobFailure,
  escapeIlikePattern,
  jobSearchRange,
  posterTypeFilter,
  sanitiseOrToken,
} from '@/lib/data/jobs';

vi.mock('@/lib/api', () => import('./mocks/api-mock'));
vi.mock('@/lib/supabase', () => import('./mocks/supabase-mock'));

const post = api.post as unknown as ReturnType<typeof vi.fn>;

beforeEach(() => {
  post.mockReset();
});

describe('query helpers', () => {
  it('escapeIlikePattern escapes % and _', () => {
    expect(escapeIlikePattern('100%_sure')).toBe('100\\%\\_sure');
  });

  it('sanitiseOrToken strips PostgREST delimiters and escapes _', () => {
    expect(sanitiseOrToken('x,status.eq.draft')).toBe('xstatuseqdraft');
    expect(sanitiseOrToken('Surry Hills (2010) 50%!*')).toBe('Surry Hills 2010 50');
    expect(sanitiseOrToken('pest_control')).toBe('pest\\_control');
  });

  it('posterTypeFilter maps the /jobs toggle to column filters', () => {
    expect(posterTypeFilter('all')).toEqual({});
    expect(posterTypeFilter('commercial')).toEqual({ poster_type: 'enterprise', posting_kind: 'job' });
    expect(posterTypeFilter('residential')).toEqual({ poster_type: 'customer' });
    expect(posterTypeFilter('contract')).toEqual({ poster_type: 'enterprise', posting_kind: 'contract' });
  });

  it('jobSearchRange is 12 per page, inclusive, and clamps page < 1', () => {
    expect(JOBS_PAGE_SIZE).toBe(12);
    expect(jobSearchRange(1)).toEqual({ from: 0, to: 11 });
    expect(jobSearchRange(3)).toEqual({ from: 24, to: 35 });
    expect(jobSearchRange(0)).toEqual({ from: 0, to: 11 });
    expect(jobSearchRange(2, 5)).toEqual({ from: 5, to: 9 });
  });
});

describe('buildCreateJobBody', () => {
  it('trims required strings and drops blank optionals', () => {
    const body = buildCreateJobBody({
      title: '  Fix tap ',
      description: ' Leaking kitchen tap. ',
      trade_category: 'plumber',
      urgency: 'asap',
      suburb: ' Newtown ',
      postcode: ' 2042 ',
      budget: '   ',
      email: 'me@example.com',
      photo_urls: [],
      specialisations: ['hot-water'],
    });
    expect(body).toMatchObject({
      title: 'Fix tap',
      description: 'Leaking kitchen tap.',
      trade_category: 'plumber',
      urgency: 'asap',
      suburb: 'Newtown',
      postcode: '2042',
      email: 'me@example.com',
      specialisations: ['hot-water'],
    });
    expect(body.budget).toBeUndefined();
    expect(body.photo_urls).toBeUndefined();
    expect(body.poster_type).toBeUndefined();
    // JSON.stringify drops the undefined keys — nothing blank reaches the server.
    expect(Object.keys(JSON.parse(JSON.stringify(body)))).toEqual([
      'title',
      'description',
      'trade_category',
      'urgency',
      'suburb',
      'postcode',
      'specialisations',
      'email',
    ]);
  });

  it('sends enterprise fields natively typed (arrays/objects/numbers/booleans)', () => {
    const body = buildCreateJobBody({
      title: 'Fit-out',
      description: 'Three carpenters for a shop fit-out',
      trade_category: 'carpenter',
      urgency: 'this_week',
      suburb: 'Alexandria',
      postcode: '2015',
      poster_type: 'enterprise',
      posting_kind: 'contract',
      contract_type: 'project',
      contract_roles: [{ trade: 'carpenter', workers: 3, rate: '$55/hr', notes: '' }],
      workers_needed: 3,
      day_rate: '450',
      employment_type: 'casual',
      is_ongoing: false,
      work_days: ['mon', 'tue'],
      pay_type: 'hourly',
      pay_rate_min: 50,
      pay_rate_max: 60,
      required_capabilities: { white_card: 'required' },
      min_public_liability: 10_000_000,
      document_urls: ['https://example.com/plan.pdf'],
    });
    expect(body.contract_roles).toEqual([{ trade: 'carpenter', workers: 3, rate: '$55/hr', notes: '' }]);
    expect(body.workers_needed).toBe(3);
    expect(body.day_rate).toBe('450');
    expect(body.is_ongoing).toBe(false);
    expect(body.work_days).toEqual(['mon', 'tue']);
    expect(body.pay_rate_min).toBe(50);
    expect(body.required_capabilities).toEqual({ white_card: 'required' });
    expect(body.min_public_liability).toBe(10_000_000);
    expect(body.document_urls).toEqual(['https://example.com/plan.pdf']);
  });
});

describe('createJob', () => {
  const input = {
    title: 'Fix tap',
    description: 'Leaking kitchen tap.',
    trade_category: 'plumber',
    urgency: 'asap' as const,
    suburb: 'Newtown',
    postcode: '2042',
  };

  it('resolves with the 201 payload', async () => {
    post.mockResolvedValue({ ok: true, jobId: 'j1', redirect: '/my-jobs' });
    await expect(createJob(input)).resolves.toEqual({ ok: true, jobId: 'j1', redirect: '/my-jobs' });
    expect(post).toHaveBeenCalledWith('/api/jobs', expect.objectContaining({ title: 'Fix tap' }));
  });

  it('maps HTTP failures to { ok: false, status, error, code, cause }', async () => {
    const waitlist = new ApiError(403, WAITLIST_CLOSED_ERROR.error, 'waitlist_mode');
    post.mockRejectedValue(waitlist);
    const res = await createJob(input);
    expect(res).toMatchObject({ ok: false, status: 403, error: WAITLIST_CLOSED_ERROR.error, code: 'waitlist_mode' });
    expect(res.ok === false && res.cause).toBe(waitlist);

    post.mockRejectedValue(new ApiError(429, "You're posting too many jobs. Please wait before posting again.", 'rate_limited'));
    await expect(createJob(input)).resolves.toMatchObject({ ok: false, status: 429, code: 'rate_limited' });

    post.mockRejectedValue(new ApiError(402, 'Payment required. Please subscribe or pay per post to publish this job.', 'payment_required'));
    await expect(createJob(input)).resolves.toMatchObject({ ok: false, status: 402, code: 'payment_required' });

    post.mockRejectedValue(new ApiError(400, 'Postcode must be a 4-digit Australian postcode.'));
    await expect(createJob(input)).resolves.toMatchObject({ ok: false, status: 400, code: null, error: 'Postcode must be a 4-digit Australian postcode.' });
  });

  it('nulls unknown codes and rethrows non-HTTP failures', () => {
    expect(createJobFailure(new ApiError(500, 'x', 'mystery')).code).toBeNull();
    expect(createJobFailure(new ApiError(500, 'x', 'insert_failed')).code).toBe('insert_failed');
    post.mockRejectedValue(new TypeError('Network request failed'));
    return expect(createJob(input)).rejects.toBeInstanceOf(TypeError);
  });
});
