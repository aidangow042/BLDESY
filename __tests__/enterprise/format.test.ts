import { describe, expect, it } from 'vitest';

import {
  appliedAgo,
  capitalise,
  humaniseSlug,
  jobStatusLabel,
  jobStatusTone,
  pluralise,
  relativeTime,
  urgencyHeadline,
  urgencyLabel,
} from '@/lib/enterprise-hub/format';

const NOW = new Date('2026-08-31T10:00:00Z').getTime();
const ago = (ms: number) => new Date(NOW - ms).toISOString();

describe('relativeTime (lib/format.ts verbatim)', () => {
  it('buckets seconds, minutes, hours, yesterday, days', () => {
    expect(relativeTime(ago(10_000), NOW)).toBe('just now');
    expect(relativeTime(ago(5 * 60_000), NOW)).toBe('5m ago');
    expect(relativeTime(ago(3 * 3_600_000), NOW)).toBe('3h ago');
    expect(relativeTime(ago(1 * 86_400_000), NOW)).toBe('yesterday');
    expect(relativeTime(ago(4 * 86_400_000), NOW)).toBe('4d ago');
  });
  it('falls back to a d MMM date past a week', () => {
    expect(relativeTime(ago(9 * 86_400_000), NOW)).toMatch(/^\d{1,2} [A-Z][a-z]{2}$/);
  });
});

describe('appliedAgo (applicant row)', () => {
  it('m / h / d without "just now"', () => {
    expect(appliedAgo(ago(30_000), NOW)).toBe('0m ago');
    expect(appliedAgo(ago(90 * 60_000), NOW)).toBe('1h ago');
    expect(appliedAgo(ago(49 * 3_600_000), NOW)).toBe('2d ago');
  });
});

describe('status + urgency labels', () => {
  it('jobStatusLabel title-cases snake_case', () => {
    expect(jobStatusLabel('in_progress')).toBe('In Progress');
    expect(jobStatusLabel('open')).toBe('Open');
  });
  it('jobStatusTone falls back to open like the web map', () => {
    expect(jobStatusTone('closed')).toBe('closed');
    expect(jobStatusTone('weird')).toBe('open');
  });
  it('urgencyLabel + urgencyHeadline', () => {
    expect(urgencyLabel('asap')).toEqual({ label: 'ASAP', tone: 'error' });
    expect(urgencyLabel('this_week')).toEqual({ label: 'This Week', tone: 'warning' });
    expect(urgencyLabel('other')).toEqual({ label: 'other', tone: 'secondary' });
    expect(urgencyHeadline('asap')).toBe('ASAP');
    expect(urgencyHeadline('anything')).toBe('Flexible');
  });
});

describe('small helpers', () => {
  it('humaniseSlug, pluralise, capitalise', () => {
    expect(humaniseSlug('commercial-builder')).toBe('Commercial Builder');
    expect(humaniseSlug('gas_fitter')).toBe('Gas Fitter');
    expect(pluralise(1, 'applicant')).toBe('1 applicant');
    expect(pluralise(3, 'applicant')).toBe('3 applicants');
    expect(capitalise('accepted')).toBe('Accepted');
  });
});
