/**
 * Post a Job wizard — state shape, step arithmetic, validation and the
 * `POST /api/jobs` body builder. Pure port of the logic half of
 * ~/bldesy-web/components/jobs/job-wizard.tsx (FormFields, INITIAL_FORM,
 * locationStepNumber / reviewStepNumber, validateStep, activeContractRoles,
 * contractWorkersTotal, the hidden-input payload and the success-card
 * destination). Unit-tested under __tests__/homeowner/wizard-model.test.ts.
 */
import type { CreateJobContractRole, CreateJobInput } from '@/lib/data/jobs';
import type { BuilderSpecialisations } from '@/lib/web/trade-specialisations';
import type { ContractRole, ContractType, PostingKind, Urgency } from '@/types/database';

import type { WhenAndHowFields } from './when-and-how-step';

export interface FormFields {
  title: string;
  tradeCategory: string;
  urgency: string;
  description: string;
  budget: string;
  suburb: string;
  postcode: string;
  contactEmail: string;
  // Enterprise fields
  postingKind: PostingKind;
  workersNeeded: string;
  contractDuration: string;
  dayRate: string;
  startDate: string;
  siteRequirements: string;
  // Contract-only: sub-type + per-role breakdown ("multiple jobs" or onboarding).
  contractType: ContractType;
  contractRoles: ContractRole[];
}

export function emptyContractRole(): ContractRole {
  return { trade: '', workers: 1, rate: '', notes: '', startDate: '', duration: '' };
}

export const INITIAL_FORM: FormFields = {
  title: '',
  tradeCategory: '',
  urgency: '',
  description: '',
  budget: '',
  suburb: '',
  postcode: '',
  contactEmail: '',
  postingKind: 'job',
  workersNeeded: '1',
  contractDuration: '',
  dayRate: '',
  startDate: '',
  siteRequirements: '',
  contractType: 'project',
  contractRoles: [emptyContractRole()],
};

/* ── Steps ─────────────────────────────────────────────────────────────── */

/**
 * Step layout differs by poster:
 *   Customer:   1 Details → 2 Description → 3 Location → 4 Review
 *   Enterprise: 1 Details → 2 Description → 3 When & How → 4 Location → 5 Review
 * The "When and how" step has no required fields, so it's skipped in validation.
 */
export const CUSTOMER_STEP_LABELS = ['Details', 'Description', 'Location', 'Review'] as const;
export const ENTERPRISE_STEP_LABELS = ['Details', 'Description', 'When & How', 'Location', 'Review'] as const;

export function stepLabelsFor(isEnterprise: boolean): readonly string[] {
  return isEnterprise ? ENTERPRISE_STEP_LABELS : CUSTOMER_STEP_LABELS;
}

export function totalStepsFor(isEnterprise: boolean): number {
  return isEnterprise ? 5 : 4;
}

export function locationStepNumber(isEnterprise: boolean): number {
  return isEnterprise ? 4 : 3;
}

export function reviewStepNumber(isEnterprise: boolean): number {
  return isEnterprise ? 5 : 4;
}

export function isWhenAndHowStep(step: number, isEnterprise: boolean): boolean {
  return isEnterprise && step === 3;
}

/* ── Validation (verbatim messages) ────────────────────────────────────── */

export const POSTCODE_RE = /^\d{4}$/;
export const DESCRIPTION_MIN_LENGTH = 20;

export function validateStep(step: number, data: FormFields, isEnterprise: boolean): Record<string, string> {
  const errors: Record<string, string> = {};

  if (step === 1) {
    if (!data.title.trim()) errors.title = 'Job title is required.';
    if (!data.tradeCategory) errors.tradeCategory = 'Please select a trade.';
    if (!data.urgency) errors.urgency = 'Please select an urgency level.';
    if (isEnterprise && data.postingKind === 'contract') {
      const hasRole = data.contractRoles.some((r) => r.trade.trim());
      if (!hasRole) {
        errors.contractRoles =
          data.contractType === 'onboarding'
            ? 'Add at least one trade you want to onboard.'
            : 'Add at least one role and pick its trade.';
      }
    }
  }

  if (step === 2) {
    if (!data.description.trim()) errors.description = 'Description is required.';
    else if (data.description.trim().length < DESCRIPTION_MIN_LENGTH)
      errors.description = 'Description must be at least 20 characters.';
  }

  if (step === locationStepNumber(isEnterprise)) {
    if (!data.suburb.trim()) errors.suburb = 'Suburb is required.';
    if (!data.postcode.trim()) errors.postcode = 'Postcode is required.';
    else if (!POSTCODE_RE.test(data.postcode)) errors.postcode = 'Must be a 4-digit Australian postcode.';
  }

  return errors;
}

/* ── Contract roles ────────────────────────────────────────────────────── */

/**
 * Normalised roles for submit/review: drop blank rows, and strip rate/count/
 * schedule for onboarding (no specific job, so no per-role rate). Empty array
 * when not a contract.
 */
export function normaliseContractRoles(form: Pick<FormFields, 'postingKind' | 'contractType' | 'contractRoles'>): CreateJobContractRole[] {
  if (form.postingKind !== 'contract') return [];
  const onboarding = form.contractType === 'onboarding';
  return form.contractRoles
    .filter((r) => r.trade.trim())
    .map((r) => ({
      trade: r.trade.trim(),
      workers: onboarding ? 0 : Number(r.workers) || 0,
      rate: onboarding ? '' : r.rate.trim(),
      notes: r.notes.trim(),
      // Per-role schedule — Multiple-roles contracts only.
      startDate: onboarding ? '' : (r.startDate ?? '').trim(),
      duration: onboarding ? '' : (r.duration ?? '').trim(),
    }));
}

export function contractWorkersTotal(roles: readonly CreateJobContractRole[]): number {
  return Math.max(1, roles.reduce((acc, r) => acc + r.workers, 0));
}

/** Open role tab, clamped to the current roles array. */
export function clampRoleIndex(active: number, count: number): number {
  return Math.min(active, Math.max(0, count - 1));
}

/** Sub-trades the poster picked for the selected trade (one trade per job). */
export function specialisationSlugsFor(specialisations: BuilderSpecialisations, tradeCategory: string): string[] {
  return specialisations[tradeCategory] ?? [];
}

/* ── Submit payload ────────────────────────────────────────────────────── */

export interface BuildCreateJobArgs {
  form: FormFields;
  whenAndHow: WhenAndHowFields;
  specialisations: BuilderSpecialisations;
  jobPhotos: string[];
  jobDocs: string[];
  isEnterprise: boolean;
}

function blank(v: string): string | undefined {
  const t = v.trim();
  return t ? t : undefined;
}

function optionalNumber(v: string): number | undefined {
  const t = v.trim();
  if (!t) return undefined;
  const n = Number(t);
  return Number.isFinite(n) ? n : undefined;
}

/**
 * The wizard's hidden-input payload, as a typed `CreateJobInput`. Homeowner
 * posts send the core fields + specialisations/photos/email; enterprise posts
 * add poster_type, posting_kind, contract details and every "When & How" term.
 * The "When and how" start_date takes priority over the legacy Step 1 field.
 */
export function buildCreateJobInput(args: BuildCreateJobArgs): CreateJobInput {
  const { form, whenAndHow: wh, specialisations, jobPhotos, jobDocs, isEnterprise } = args;
  const slugs = specialisationSlugsFor(specialisations, form.tradeCategory);

  const base: CreateJobInput = {
    title: form.title,
    description: form.description,
    trade_category: form.tradeCategory,
    urgency: form.urgency as Urgency,
    suburb: form.suburb,
    postcode: form.postcode,
    specialisations: slugs.length > 0 ? slugs : undefined,
    email: blank(form.contactEmail),
    budget: blank(form.budget),
    photo_urls: jobPhotos.length > 0 ? jobPhotos : undefined,
  };

  if (!isEnterprise) return { ...base, poster_type: 'customer' };

  const isContract = form.postingKind === 'contract';
  const isOnboarding = isContract && form.contractType === 'onboarding';
  const roles = normaliseContractRoles(form);

  return {
    ...base,
    poster_type: 'enterprise',
    posting_kind: form.postingKind,
    // Contract sub-type + roles. workers_needed is left blank for contracts —
    // the server derives it from the role counts.
    contract_type: isContract ? form.contractType : undefined,
    contract_roles: isContract && roles.length > 0 ? roles : undefined,
    workers_needed: isContract ? undefined : optionalNumber(form.workersNeeded),
    contract_duration: isOnboarding ? undefined : blank(form.contractDuration),
    day_rate: isContract ? undefined : blank(form.dayRate),
    start_date: blank(wh.startDate) ?? blank(form.startDate),
    site_requirements: blank(form.siteRequirements),
    document_urls: jobDocs.length > 0 ? jobDocs : undefined,
    employment_type: wh.employmentType || undefined,
    end_date: blank(wh.endDate),
    is_ongoing: wh.isOngoing,
    daily_start_time: blank(wh.dailyStartTime),
    daily_finish_time: blank(wh.dailyFinishTime),
    work_days: wh.workDays.length > 0 ? wh.workDays : undefined,
    pay_type: wh.payType || undefined,
    pay_rate_min: optionalNumber(wh.payRateMin),
    pay_rate_max: optionalNumber(wh.payRateMax),
    required_capabilities: wh.requiredCapabilities,
    min_public_liability: wh.minPublicLiability ?? undefined,
  };
}

/* ── Success card ──────────────────────────────────────────────────────── */

export function postedNoun(postingKind: PostingKind): 'Job' | 'Contract' {
  return postingKind === 'contract' ? 'Contract' : 'Job';
}

/**
 * Enterprise posts belong on the enterprise dashboard (My Job Posts / My
 * Contracts), not the homeowner /my-jobs page. Paths mirror the website.
 */
export function postedDestination(
  isEnterprise: boolean,
  postingKind: PostingKind,
): { path: '/my-jobs' | '/enterprise/jobs' | '/enterprise/jobs?kind=contract'; label: 'View My Jobs' | 'View My Contracts' } {
  const isContract = postingKind === 'contract';
  if (isEnterprise) {
    return isContract
      ? { path: '/enterprise/jobs?kind=contract', label: 'View My Contracts' }
      : { path: '/enterprise/jobs', label: 'View My Jobs' };
  }
  return { path: '/my-jobs', label: 'View My Jobs' };
}

/** Submit button label: "Post Job" / "Post Contract" ("Posting..." while pending). */
export function submitLabel(postingKind: PostingKind, pending: boolean): string {
  if (pending) return 'Posting...';
  return postingKind === 'contract' ? 'Post Contract' : 'Post Job';
}

/* ── AI suggestions (ai-job-suggest edge function) ─────────────────────── */

export interface AiSuggestion {
  trade: string | null;
  urgency: string | null;
  titleRefined: string | null;
  clarifyingQuestion: string | null;
}

/**
 * The web step reads `trade` / `urgency` / `title_refined`; the deployed
 * function answers `suggested_trade` / `suggested_urgency` /
 * `clarifying_question`. Accept both so the chips work whichever is live.
 */
export function normaliseAiSuggestion(data: unknown): AiSuggestion | null {
  if (!data || typeof data !== 'object') return null;
  const d = data as Record<string, unknown>;
  const str = (v: unknown): string | null => (typeof v === 'string' && v.trim() ? v.trim() : null);
  const out: AiSuggestion = {
    trade: str(d.trade) ?? str(d.suggested_trade),
    urgency: str(d.urgency) ?? str(d.suggested_urgency),
    titleRefined: str(d.title_refined),
    clarifyingQuestion: str(d.clarifying_question),
  };
  if (!out.trade && !out.urgency && !out.titleRefined && !out.clarifyingQuestion) return null;
  return out;
}

/** The web's chip label formatter: "metal-roofing" → "Metal Roofing". */
export function titleCaseSlug(slug: string): string {
  return slug.replace(/-/g, ' ').replace(/\b\w/g, (ch) => ch.toUpperCase());
}
