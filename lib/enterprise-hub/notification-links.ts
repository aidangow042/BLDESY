/**
 * lib/enterprise-hub/notification-links.ts — where a notification-bell row
 * deep-links. Port of `getLink()` in
 * ~/bldesy-web/components/enterprise/notification-bell.tsx (both the tradie
 * and enterprise contexts), expressed through lib/routes.ts so the app screens
 * that mirror those paths resolve. Pure — no React Native imports.
 */
import { ROUTES } from '@/lib/routes';

export type NotificationBellContext = 'tradie' | 'enterprise';

export interface NotificationLinkSource {
  type: string;
  metadata: Record<string, unknown> | null;
}

export function notificationHref(n: NotificationLinkSource, context: NotificationBellContext): string {
  const jobId = typeof n.metadata?.job_id === 'string' ? n.metadata.job_id : null;
  if (context === 'tradie') {
    // Weekly availability pulse lands on the one-tap confirm banner.
    if (n.metadata?.weekly_pulse === 'availability') {
      return `${ROUTES.portal}?confirm=availability`;
    }
    switch (n.type) {
      case 'message_received':
        return ROUTES.portalMessages;
      case 'referral_verified':
        return ROUTES.portalRefer;
      case 'new_job_match':
        return jobId ? ROUTES.portalJob(jobId) : ROUTES.portalJobsResidential;
      default:
        // eoi_received, builder_approved, billing_*, milestone → dashboard
        return jobId ? ROUTES.portalJob(jobId) : ROUTES.portal;
    }
  }
  if (jobId) return ROUTES.enterpriseJob(jobId);
  return ROUTES.enterprise;
}

/** The web tray's relative timestamp ("just now" · "5m ago" · "3h ago" · "2d ago" · "12 Aug"). */
export function bellRelativeTime(dateStr: string, now: number = Date.now()): string {
  const diff = Math.floor((now - new Date(dateStr).getTime()) / 1000);
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return new Date(dateStr).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' });
}

/** Badge caption — "9+" past nine, like the web. */
export function unreadBadgeLabel(unreadCount: number): string {
  return unreadCount > 9 ? '9+' : String(unreadCount);
}
