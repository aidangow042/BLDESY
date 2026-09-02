import { describe, expect, it, vi } from 'vitest';

import { COMPANY_JOBS_SELECT, COMPANY_SELECT, establishedLabel, openPositionsCta, stripCompanyPii } from '@/lib/data/discovery-company';

vi.mock('@/lib/supabase', () => import('../data/mocks/supabase-mock'));

describe('COMPANY_SELECT', () => {
  it('is the website column list — no billing columns, PII columns present (the view nulls them for guests)', () => {
    const cols = COMPANY_SELECT.split(', ');
    expect(cols[0]).toBe('user_id');
    expect(cols).toEqual(expect.arrayContaining(['company_name', 'contact_phone', 'contact_email', 'past_projects', 'credentials_verified', 'licensed_states']));
    expect(COMPANY_SELECT).not.toMatch(/stripe_|subscription_|has_active_subscription/);
    expect(COMPANY_JOBS_SELECT.split(', ')).toContain('workers_needed');
  });
});

describe('stripCompanyPii', () => {
  const row = { contact_phone: '0400 000 000', contact_email: 'a@b.com', company_name: 'Acme' };
  it('nulls contact details for guests and leaves them for signed-in users', () => {
    expect(stripCompanyPii(row, false)).toEqual({ ...row, contact_phone: null, contact_email: null });
    expect(stripCompanyPii(row, true)).toBe(row);
  });
});

describe('labels', () => {
  it('derives the established years from the founding year', () => {
    expect(establishedLabel(2010, new Date('2026-01-01'))).toBe('Est. 16+ years');
    expect(establishedLabel(null)).toBeNull();
  });
  it('pluralises the open-positions CTA', () => {
    expect(openPositionsCta(1)).toBe('View 1 Open Position');
    expect(openPositionsCta(3)).toBe('View 3 Open Positions');
  });
});
