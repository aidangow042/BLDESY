/**
 * lib/enterprise-hub/edit-job.ts — the enterprise Edit Job Post save path.
 *
 * Port of ~/bldesy-web/app/enterprise/jobs/[id]/edit/page.tsx: the hydrate
 * from the job row, `handleSave`'s checks + UPDATE payload, the urgency
 * options. The write is the business's own `jobs` row under RLS with the
 * explicit owner filter, as the website does.
 */
import type { EnterpriseJob } from '@/lib/data/enterprise';
import { requireUserId } from '@/lib/data/own-session';
import { db } from '@/lib/supabase';
import type { Database, Urgency } from '@/types/database';

export const URGENCY_OPTIONS: readonly { value: Urgency; label: string }[] = [
  { value: 'asap', label: 'ASAP' },
  { value: 'this_week', label: 'This Week' },
  { value: 'flexible', label: 'Flexible' },
];

/* ── Strings (verbatim) ─────────────────────────────────────────────── */

export const ERR_TITLE_REQUIRED = 'Title is required.';
export const ERR_DESCRIPTION_REQUIRED = 'Description is required.';
export const ERR_POSTCODE_FORMAT = 'Postcode must be a 4-digit number.';
export const JOB_UPDATED_MESSAGE = 'Job updated successfully.';

/* ── Form state ─────────────────────────────────────────────────────── */

export interface EditJobForm {
  title: string;
  description: string;
  tradeCategory: string;
  urgency: Urgency;
  budget: string;
  suburb: string;
  postcode: string;
  /** As typed; parsed to an integer (min 1) on save. */
  workersNeeded: string;
  dayRate: string;
  contractDuration: string;
  /** YYYY-MM-DD or "". */
  startDate: string;
  siteRequirements: string;
  photoUrls: string[];
  documentUrls: string[];
}

export type EditJobSource = Pick<
  EnterpriseJob,
  | 'title'
  | 'description'
  | 'trade_category'
  | 'urgency'
  | 'budget'
  | 'suburb'
  | 'postcode'
  | 'workers_needed'
  | 'day_rate'
  | 'contract_duration'
  | 'start_date'
  | 'site_requirements'
  | 'photo_urls'
  | 'document_urls'
>;

export function editJobFormFrom(job: EditJobSource): EditJobForm {
  return {
    title: job.title || '',
    description: job.description || '',
    tradeCategory: job.trade_category || '',
    urgency: job.urgency || 'asap',
    budget: job.budget || '',
    suburb: job.suburb || '',
    postcode: job.postcode || '',
    workersNeeded: String(job.workers_needed ?? 1),
    dayRate: job.day_rate || '',
    contractDuration: job.contract_duration || '',
    startDate: job.start_date || '',
    siteRequirements: job.site_requirements || '',
    photoUrls: job.photo_urls ?? [],
    documentUrls: job.document_urls ?? [],
  };
}

/** handleSave's checks, in order. Null = valid. */
export function validateEditJobForm(form: EditJobForm): string | null {
  if (!form.title.trim()) return ERR_TITLE_REQUIRED;
  if (!form.description.trim()) return ERR_DESCRIPTION_REQUIRED;
  if (form.postcode.trim() && !/^\d{4}$/.test(form.postcode.trim())) return ERR_POSTCODE_FORMAT;
  return null;
}

export type JobUpdate = Database['public']['Tables']['jobs']['Update'];

/** The exact UPDATE payload of handleSave. */
export function buildJobUpdate(form: EditJobForm): JobUpdate {
  return {
    title: form.title.trim(),
    description: form.description.trim(),
    trade_category: form.tradeCategory,
    urgency: form.urgency,
    budget: form.budget.trim() || null,
    suburb: form.suburb.trim(),
    postcode: form.postcode.trim(),
    workers_needed: parseInt(form.workersNeeded, 10) || 1,
    day_rate: form.dayRate.trim() || null,
    contract_duration: form.contractDuration.trim() || null,
    start_date: form.startDate || null,
    site_requirements: form.siteRequirements.trim() || null,
    photo_urls: form.photoUrls.length > 0 ? form.photoUrls : null,
    document_urls: form.documentUrls.length > 0 ? form.documentUrls : null,
  };
}

/** Validate → UPDATE the own job. Throws the website's strings or the Postgres message. */
export async function saveEnterpriseJob(jobId: string, form: EditJobForm): Promise<void> {
  const invalid = validateEditJobForm(form);
  if (invalid) throw new Error(invalid);
  const uid = await requireUserId();
  const { error } = await db.from('jobs').update(buildJobUpdate(form)).eq('id', jobId).eq('customer_id', uid);
  if (error) throw new Error(error.message);
}
