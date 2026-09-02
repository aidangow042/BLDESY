/**
 * Formatting helpers shared by the homeowner job surfaces — verbatim ports of
 * ~/bldesy-web/lib/format.ts (`relativeTime`) and the small helpers inside
 * ~/bldesy-web/app/my-jobs/page.tsx (`urgencyConfig`, `statusConfig`,
 * `appStatusConfig`, `initials`). Pure, unit-tested under __tests__/homeowner.
 */
import type { ApplicationStatus, JobStatus, Urgency } from '@/types/database';

/** Format a date string into a human-readable relative time (e.g. "just now", "5m ago"). */
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

export type UrgencyVariant = 'error' | 'warning' | 'success';

export interface UrgencyConfig {
  label: string;
  variant: UrgencyVariant;
}

/** Verbatim URGENCY_LABELS / urgencyConfig maps (step-review.tsx, my-jobs/page.tsx). */
export const URGENCY_CONFIG: Record<Urgency, UrgencyConfig> = {
  asap: { label: 'ASAP', variant: 'error' },
  this_week: { label: 'This Week', variant: 'warning' },
  flexible: { label: 'Flexible', variant: 'success' },
};

export function urgencyConfig(u: string): UrgencyConfig {
  return URGENCY_CONFIG[u as Urgency] ?? URGENCY_CONFIG.flexible;
}

/** Tone of a job status pill: success (green) · info (blue) · neutral (grey). */
export type StatusTone = 'success' | 'info' | 'neutral';

/** my-jobs/page.tsx statusConfig — "Assigned" is the homeowner label for in_progress. */
export const JOB_STATUS_CONFIG: Record<JobStatus, { label: string; tone: StatusTone }> = {
  open: { label: 'Open', tone: 'success' },
  in_progress: { label: 'Assigned', tone: 'info' },
  completed: { label: 'Completed', tone: 'neutral' },
  closed: { label: 'Closed', tone: 'neutral' },
};

export function statusConfig(s: string): { label: string; tone: StatusTone } {
  return JOB_STATUS_CONFIG[s as JobStatus] ?? JOB_STATUS_CONFIG.open;
}

export const APPLICATION_STATUS_CONFIG: Record<
  ApplicationStatus,
  { label: string; variant: UrgencyVariant }
> = {
  pending: { label: 'Pending', variant: 'warning' },
  accepted: { label: 'Accepted', variant: 'success' },
  rejected: { label: 'Rejected', variant: 'error' },
};

export function appStatusConfig(s: string): { label: string; variant: UrgencyVariant } {
  return APPLICATION_STATUS_CONFIG[s as ApplicationStatus] ?? APPLICATION_STATUS_CONFIG.pending;
}

/** Up to two initials from a business/person name ("Acme Plumbing" → "AP"). */
export function initials(name: string): string {
  return name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

/** `$1,200` — the website's `${Number(budget).toLocaleString("en-AU")}`. */
export function formatBudget(budget: string | number): string {
  return `$${Number(budget).toLocaleString('en-AU')}`;
}

/** "12 Mar" — the website's short en-AU date on role schedules and job cards. */
export function formatShortDate(value: string): string {
  try {
    return new Date(value).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' });
  } catch {
    return value;
  }
}

/** "March 2026" — the customer profile's "Member since". */
export function formatMonthYear(value: string): string {
  try {
    return new Date(value).toLocaleDateString('en-AU', { month: 'long', year: 'numeric' });
  } catch {
    return value;
  }
}

/** "{n} applicant" / "{n} applicants" (dashboard job card). */
export function pluralise(count: number, noun: string): string {
  return `${count} ${noun}${count !== 1 ? 's' : ''}`;
}
