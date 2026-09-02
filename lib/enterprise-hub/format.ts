/**
 * lib/enterprise-hub/format.ts — the Enterprise Hub's display formatters.
 *
 * Copied from the website: `relativeTime` is ~/bldesy-web/lib/format.ts
 * verbatim; the rest are the inline helpers of app/enterprise/jobs/page.tsx
 * (statusBadge, urgencyLabel, postedDate) and app/enterprise/jobs/[id]/page.tsx
 * (appliedAgo, the trade humaniser, the urgency ternary). Pure — no React
 * Native imports so vitest can exercise them.
 */

/** "just now" · "5m ago" · "3h ago" · "yesterday" · "4d ago" · "12 Aug". */
export function relativeTime(dateStr: string, now: number = Date.now()): string {
  const diff = Math.floor((now - new Date(dateStr).getTime()) / 1000);
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  const days = Math.floor(diff / 86400);
  if (days === 1) return 'yesterday';
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString('en-AU', {
    day: 'numeric',
    month: 'short',
  });
}

/** The applicant row's "Applied 5m ago" tail (jobs/[id]/page.tsx appliedAgo). */
export function appliedAgo(createdAt: string, now: number = Date.now()): string {
  const diff = now - new Date(createdAt).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

/** "in_progress" → "In Progress". */
export function jobStatusLabel(status: string): string {
  return status.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export type JobStatusTone = 'open' | 'in_progress' | 'completed' | 'closed';

/** Colour bucket for the status pill — unknown statuses render as open, like the web's `map[status] ?? map.open`. */
export function jobStatusTone(status: string): JobStatusTone {
  if (status === 'in_progress' || status === 'completed' || status === 'closed') return status;
  return 'open';
}

export type UrgencyTone = 'error' | 'warning' | 'secondary';

/** The jobs-list urgency pill (`urgencyLabel`). */
export function urgencyLabel(urgency: string): { label: string; tone: UrgencyTone } {
  switch (urgency) {
    case 'asap':
      return { label: 'ASAP', tone: 'error' };
    case 'this_week':
      return { label: 'This Week', tone: 'warning' };
    case 'flexible':
      return { label: 'Flexible', tone: 'secondary' };
    default:
      return { label: urgency, tone: 'secondary' };
  }
}

/** The job-detail header's urgency ternary — anything unknown reads "Flexible". */
export function urgencyHeadline(urgency: string): string {
  return urgency === 'asap' ? 'ASAP' : urgency === 'this_week' ? 'This Week' : 'Flexible';
}

/** "12 Aug" */
export function formatDayMonth(iso: string): string {
  return new Date(iso).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' });
}

/** "12 Aug 2026" */
export function formatDayMonthYear(iso: string): string {
  return new Date(iso).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' });
}

/** "commercial-builder" → "Commercial Builder" (the detail page's inline regex, not formatTradeName). */
export function humaniseSlug(slug: string): string {
  return slug.replace(/[-_]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

/** "1 applicant" / "3 applicants". */
export function pluralise(count: number, singular: string, plural: string = `${singular}s`): string {
  return `${count} ${count === 1 ? singular : plural}`;
}

/** "Accepted" / "Rejected" — the non-pending status pill. */
export function capitalise(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
