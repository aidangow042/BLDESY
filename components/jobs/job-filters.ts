/**
 * /jobs browse filters — pure port of the query-string handling in
 * ~/bldesy-web/app/jobs/page.tsx (type + urgency pills, page arithmetic, the
 * "{n} jobs found for “kw”" line). Unit-tested under __tests__/homeowner.
 */
import { JOBS_PAGE_SIZE, type JobPosterTypeFilter, type SearchJobsFilters } from '@/lib/data/jobs';

export const POSTER_TYPE_PILLS: readonly { value: JobPosterTypeFilter; label: string }[] = [
  { value: 'all', label: 'All Jobs' },
  { value: 'commercial', label: 'Project' },
  { value: 'contract', label: 'Contract' },
  { value: 'residential', label: 'Home' },
];

export const URGENCY_PILLS: readonly { value: string; label: string }[] = [
  { value: '', label: 'Any urgency' },
  { value: 'asap', label: 'ASAP' },
  { value: 'this_week', label: 'This Week' },
  { value: 'flexible', label: 'Flexible' },
];

export interface JobBrowseState {
  keywords: string;
  trade: string;
  location: string;
  urgency: string;
  type: JobPosterTypeFilter;
  page: number;
}

export const INITIAL_BROWSE_STATE: JobBrowseState = {
  keywords: '',
  trade: '',
  location: '',
  urgency: '',
  type: 'all',
  page: 1,
};

/** Project / Contract pills are indigo when active; All / Home are primary. */
export function isIndigoPoster(type: JobPosterTypeFilter): boolean {
  return type === 'commercial' || type === 'contract';
}

export function toSearchFilters(state: JobBrowseState): SearchJobsFilters {
  return {
    keywords: state.keywords.trim(),
    trade: state.trade,
    location: state.location.trim(),
    urgency: state.urgency,
    posterType: state.type,
    page: state.page,
  };
}

export function totalPages(total: number, pageSize: number = JOBS_PAGE_SIZE): number {
  return Math.ceil(total / pageSize);
}

/** "3 jobs found" · "1 job found for “tap”" */
export function resultsCountLabel(total: number, keywords: string): string {
  const base = `${total} job${total !== 1 ? 's' : ''} found`;
  return keywords ? `${base} for “${keywords}”` : base;
}

/** "Page 2 of 5" */
export function pageLabel(page: number, pages: number): string {
  return `Page ${page} of ${pages}`;
}
