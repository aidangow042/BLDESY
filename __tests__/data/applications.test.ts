import { beforeEach, describe, expect, it, vi } from 'vitest';

import { api } from '@/lib/api';
import {
  APPLICANT_PROFILE_SELECT,
  MY_APPLICATION_JOB_SELECT,
  attachApplicants,
  attachJobs,
  buildNewApplicationNotification,
  decideApplication,
  isApplyPermissionError,
  type ApplicantProfile,
  type MyApplicationJob,
} from '@/lib/data/applications';
import type { Application } from '@/types';

vi.mock('@/lib/api', () => import('./mocks/api-mock'));
vi.mock('@/lib/supabase', () => import('./mocks/supabase-mock'));

const post = api.post as unknown as ReturnType<typeof vi.fn>;

beforeEach(() => {
  post.mockReset();
});

const app = (id: string, builder_id: string, job_id = 'j1'): Application => ({
  id,
  job_id,
  builder_id,
  message: null,
  status: 'pending',
  created_at: '2026-01-01T00:00:00Z',
});

describe('isApplyPermissionError', () => {
  it('recognises RLS rejections by code or message', () => {
    expect(isApplyPermissionError({ code: '42501', message: 'new row violates row-level security policy' })).toBe(true);
    expect(isApplyPermissionError({ code: null, message: 'permission denied for table applications' })).toBe(true);
    expect(isApplyPermissionError({ code: '23505', message: 'duplicate key value' })).toBe(false);
    expect(isApplyPermissionError({})).toBe(false);
  });
});

describe('buildNewApplicationNotification', () => {
  it('matches the website\'s enterprise-owner note verbatim', () => {
    expect(
      buildNewApplicationNotification({ id: 'j1', customer_id: 'owner', poster_type: 'enterprise', title: 'Fit-out', suburb: 'Newtown' }),
    ).toEqual({
      user_id: 'owner',
      type: 'new_application',
      title: 'New application for "Fit-out"',
      body: 'A tradie has applied to your job in Newtown',
      metadata: { job_id: 'j1' },
    });
  });
});

describe('attachApplicants', () => {
  it('joins the view profile and the public_profiles fallback by builder_id', () => {
    const profiles: ApplicantProfile[] = [
      { user_id: 'b1', slug: 'x', business_name: 'X Plumbing', trade_category: 'plumber', suburb: 'Newtown', phone: null, profile_photo_url: null },
    ];
    const publics = [{ id: 'b2', name: 'Jo', avatar_url: null }];
    const out = attachApplicants([app('a1', 'b1'), app('a2', 'b2'), app('a3', 'b3')], profiles, publics);
    expect(out[0].applicant?.business_name).toBe('X Plumbing');
    expect(out[0].applicant_public).toBeNull();
    expect(out[1].applicant).toBeNull();
    expect(out[1].applicant_public?.name).toBe('Jo');
    expect(out[2].applicant).toBeNull();
    expect(out[2].applicant_public).toBeNull();
  });

  it('selects the union of the my-jobs and enterprise applicant columns', () => {
    expect(APPLICANT_PROFILE_SELECT.split(', ')).toEqual(
      expect.arrayContaining(['user_id', 'business_name', 'trade_category', 'suburb', 'phone', 'profile_photo_url']),
    );
  });
});

describe('attachJobs', () => {
  it('joins the job summary by job_id, null when the job is not visible', () => {
    const jobs: MyApplicationJob[] = [
      { id: 'j1', title: 'Tap', trade_category: 'plumber', urgency: 'asap', suburb: 'Newtown', postcode: '2042', poster_type: 'customer', posting_kind: 'job', workers_needed: 1, day_rate: null, contract_duration: null, customer_id: 'c' },
    ];
    const out = attachJobs([app('a1', 'b1', 'j1'), app('a2', 'b1', 'j2')], jobs);
    expect(out[0].job?.title).toBe('Tap');
    expect(out[1].job).toBeNull();
    expect(MY_APPLICATION_JOB_SELECT).toBe(
      'id, title, trade_category, urgency, suburb, postcode, poster_type, posting_kind, workers_needed, day_rate, contract_duration, customer_id',
    );
  });
});

describe('decideApplication', () => {
  it('posts { applicationId, action } to the decision route', async () => {
    post.mockResolvedValue({ ok: true, autoRejected: ['a2'] });
    await expect(decideApplication('a1', 'accept')).resolves.toEqual({ ok: true, autoRejected: ['a2'] });
    expect(post).toHaveBeenCalledWith('/api/applications/decision', { applicationId: 'a1', action: 'accept' });
  });
});
