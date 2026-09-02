import { describe, expect, it } from 'vitest';

import {
  appStatusConfig,
  formatBudget,
  initials,
  pluralise,
  relativeTime,
  statusConfig,
  urgencyConfig,
} from '@/components/jobs/job-format';

const NOW = new Date('2026-09-02T10:00:00Z').getTime();
const ago = (seconds: number) => new Date(NOW - seconds * 1000).toISOString();

describe('relativeTime (lib/format.ts)', () => {
  it('matches the website thresholds', () => {
    expect(relativeTime(ago(5), NOW)).toBe('just now');
    expect(relativeTime(ago(59), NOW)).toBe('just now');
    expect(relativeTime(ago(60), NOW)).toBe('1m ago');
    expect(relativeTime(ago(45 * 60), NOW)).toBe('45m ago');
    expect(relativeTime(ago(3 * 3600), NOW)).toBe('3h ago');
    expect(relativeTime(ago(86400), NOW)).toBe('yesterday');
    expect(relativeTime(ago(3 * 86400), NOW)).toBe('3d ago');
  });

  it('falls back to a short en-AU date after a week', () => {
    const out = relativeTime(ago(10 * 86400), NOW);
    expect(out).toMatch(/^\d{1,2} [A-Z][a-z]{2}/);
  });
});

describe('pill configs (my-jobs/page.tsx)', () => {
  it('urgency', () => {
    expect(urgencyConfig('asap')).toEqual({ label: 'ASAP', variant: 'error' });
    expect(urgencyConfig('this_week')).toEqual({ label: 'This Week', variant: 'warning' });
    expect(urgencyConfig('flexible')).toEqual({ label: 'Flexible', variant: 'success' });
    expect(urgencyConfig('bogus')).toEqual({ label: 'Flexible', variant: 'success' });
  });

  it('job status — in_progress reads "Assigned" on My Jobs', () => {
    expect(statusConfig('open')).toEqual({ label: 'Open', tone: 'success' });
    expect(statusConfig('in_progress')).toEqual({ label: 'Assigned', tone: 'info' });
    expect(statusConfig('completed')).toEqual({ label: 'Completed', tone: 'neutral' });
    expect(statusConfig('closed')).toEqual({ label: 'Closed', tone: 'neutral' });
    expect(statusConfig('weird')).toEqual({ label: 'Open', tone: 'success' });
  });

  it('application status', () => {
    expect(appStatusConfig('pending')).toEqual({ label: 'Pending', variant: 'warning' });
    expect(appStatusConfig('accepted')).toEqual({ label: 'Accepted', variant: 'success' });
    expect(appStatusConfig('rejected')).toEqual({ label: 'Rejected', variant: 'error' });
    expect(appStatusConfig('?')).toEqual({ label: 'Pending', variant: 'warning' });
  });
});

describe('small formatters', () => {
  it('initials', () => {
    expect(initials('Acme Plumbing Co')).toBe('AP');
    expect(initials('Solo')).toBe('S');
    expect(initials('?')).toBe('?');
  });

  it('budget', () => {
    expect(formatBudget('1200')).toBe('$1,200');
    expect(formatBudget(250)).toBe('$250');
  });

  it('pluralise', () => {
    expect(pluralise(1, 'applicant')).toBe('1 applicant');
    expect(pluralise(0, 'applicant')).toBe('0 applicants');
    expect(pluralise(3, 'applicant')).toBe('3 applicants');
  });
});
