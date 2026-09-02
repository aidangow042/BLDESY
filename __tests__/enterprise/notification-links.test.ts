import { describe, expect, it } from 'vitest';

import { bellRelativeTime, notificationHref, unreadBadgeLabel } from '@/lib/enterprise-hub/notification-links';
import { ROUTES } from '@/lib/routes';

describe('notificationHref (notification-bell.tsx getLink)', () => {
  it('enterprise: job_id → the job, else the dashboard', () => {
    expect(notificationHref({ type: 'new_application', metadata: { job_id: 'j1' } }, 'enterprise')).toBe(
      ROUTES.enterpriseJob('j1'),
    );
    expect(notificationHref({ type: 'milestone', metadata: null }, 'enterprise')).toBe(ROUTES.enterprise);
    expect(notificationHref({ type: 'job_filled', metadata: { job_id: 42 } }, 'enterprise')).toBe(ROUTES.enterprise);
  });
  it('tradie: pulse, messages, referrals, job matches, default', () => {
    expect(notificationHref({ type: 'milestone', metadata: { weekly_pulse: 'availability' } }, 'tradie')).toBe(
      `${ROUTES.portal}?confirm=availability`,
    );
    expect(notificationHref({ type: 'message_received', metadata: null }, 'tradie')).toBe(ROUTES.portalMessages);
    expect(notificationHref({ type: 'referral_verified', metadata: null }, 'tradie')).toBe(ROUTES.portalRefer);
    expect(notificationHref({ type: 'new_job_match', metadata: { job_id: 'j2' } }, 'tradie')).toBe(ROUTES.portalJob('j2'));
    expect(notificationHref({ type: 'new_job_match', metadata: null }, 'tradie')).toBe(ROUTES.portalJobsResidential);
    expect(notificationHref({ type: 'eoi_received', metadata: null }, 'tradie')).toBe(ROUTES.portal);
    expect(notificationHref({ type: 'eoi_received', metadata: { job_id: 'j3' } }, 'tradie')).toBe(ROUTES.portalJob('j3'));
  });
});

describe('tray helpers', () => {
  const NOW = new Date('2026-08-31T10:00:00Z').getTime();
  it('bellRelativeTime buckets like the web tray', () => {
    expect(bellRelativeTime(new Date(NOW - 5_000).toISOString(), NOW)).toBe('just now');
    expect(bellRelativeTime(new Date(NOW - 120_000).toISOString(), NOW)).toBe('2m ago');
    expect(bellRelativeTime(new Date(NOW - 2 * 3_600_000).toISOString(), NOW)).toBe('2h ago');
    expect(bellRelativeTime(new Date(NOW - 3 * 86_400_000).toISOString(), NOW)).toBe('3d ago');
    expect(bellRelativeTime(new Date(NOW - 10 * 86_400_000).toISOString(), NOW)).toMatch(/^\d{1,2} [A-Z][a-z]{2}$/);
  });
  it('unreadBadgeLabel caps at 9+', () => {
    expect(unreadBadgeLabel(3)).toBe('3');
    expect(unreadBadgeLabel(10)).toBe('9+');
  });
});
