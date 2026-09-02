import { describe, expect, it, vi } from 'vitest';

import {
  buildJobUpdate,
  editJobFormFrom,
  ERR_DESCRIPTION_REQUIRED,
  ERR_POSTCODE_FORMAT,
  ERR_TITLE_REQUIRED,
  URGENCY_OPTIONS,
  validateEditJobForm,
  type EditJobSource,
} from '@/lib/enterprise-hub/edit-job';

vi.mock('@/lib/supabase', () => ({ db: {}, supabase: {} }));

const job: EditJobSource = {
  title: 'Fit-out crew',
  description: 'Two carpenters for a shop fit-out.',
  trade_category: 'carpenter',
  urgency: 'this_week',
  budget: null,
  suburb: 'Surry Hills',
  postcode: '2010',
  workers_needed: 2,
  day_rate: '$480/day',
  contract_duration: null,
  start_date: '2026-09-15',
  site_requirements: null,
  photo_urls: null,
  document_urls: ['https://x/plan.pdf'],
};

describe('editJobFormFrom', () => {
  it('hydrates the edit form like the page', () => {
    const f = editJobFormFrom(job);
    expect(f.workersNeeded).toBe('2');
    expect(f.budget).toBe('');
    expect(f.photoUrls).toEqual([]);
    expect(f.documentUrls).toEqual(['https://x/plan.pdf']);
    expect(f.urgency).toBe('this_week');
    expect(URGENCY_OPTIONS.map((o) => o.label)).toEqual(['ASAP', 'This Week', 'Flexible']);
  });
});

describe('validateEditJobForm', () => {
  const f = editJobFormFrom(job);
  it('title, description, postcode — in order', () => {
    expect(validateEditJobForm(f)).toBeNull();
    expect(validateEditJobForm({ ...f, title: ' ' })).toBe(ERR_TITLE_REQUIRED);
    expect(validateEditJobForm({ ...f, description: '' })).toBe(ERR_DESCRIPTION_REQUIRED);
    expect(validateEditJobForm({ ...f, postcode: '12a4' })).toBe(ERR_POSTCODE_FORMAT);
    expect(validateEditJobForm({ ...f, postcode: '' })).toBeNull();
  });
});

describe('buildJobUpdate', () => {
  it('trims, nulls blanks, parses workers (min 1), nulls empty media lists', () => {
    const f = editJobFormFrom(job);
    f.title = '  Fit-out crew ';
    f.workersNeeded = 'abc';
    f.dayRate = '';
    f.startDate = '';
    const u = buildJobUpdate(f);
    expect(u.title).toBe('Fit-out crew');
    expect(u.workers_needed).toBe(1);
    expect(u.day_rate).toBeNull();
    expect(u.start_date).toBeNull();
    expect(u.photo_urls).toBeNull();
    expect(u.document_urls).toEqual(['https://x/plan.pdf']);
    expect(u.urgency).toBe('this_week');
  });
});
