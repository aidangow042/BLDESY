import { describe, expect, it, vi } from 'vitest';

import { INITIAL_WHEN_AND_HOW } from '@/components/jobs/when-and-how-step';
import {
  CUSTOMER_STEP_LABELS,
  ENTERPRISE_STEP_LABELS,
  INITIAL_FORM,
  buildCreateJobInput,
  clampRoleIndex,
  contractWorkersTotal,
  emptyContractRole,
  isWhenAndHowStep,
  locationStepNumber,
  normaliseAiSuggestion,
  normaliseContractRoles,
  postedDestination,
  postedNoun,
  reviewStepNumber,
  stepLabelsFor,
  submitLabel,
  titleCaseSlug,
  totalStepsFor,
  validateStep,
  type FormFields,
} from '@/components/jobs/wizard-model';

// when-and-how-step.tsx is a React Native component module; only the pure
// INITIAL_WHEN_AND_HOW constant is needed here.
vi.mock('@/components/jobs/when-and-how-step', () => ({
  INITIAL_WHEN_AND_HOW: {
    employmentType: '',
    startDate: '',
    endDate: '',
    isOngoing: false,
    dailyStartTime: '',
    dailyFinishTime: '',
    workDays: [],
    payType: '',
    payRateMin: '',
    payRateMax: '',
    requiredCapabilities: {},
    minPublicLiability: null,
  },
}));
vi.mock('@/lib/api', () => import('../data/mocks/api-mock'));
vi.mock('@/lib/supabase', () => import('../data/mocks/supabase-mock'));

const filled: FormFields = {
  ...INITIAL_FORM,
  title: 'Fix leaking tap in bathroom',
  tradeCategory: 'plumber',
  urgency: 'asap',
  description: 'The kitchen mixer drips constantly and the cupboard below is wet.',
  budget: '250',
  suburb: 'Bondi Beach',
  postcode: '2026',
  contactEmail: 'sam@example.com',
};

describe('step arithmetic', () => {
  it('homeowners get 4 steps, enterprises 5 with When & How third', () => {
    expect(stepLabelsFor(false)).toEqual(CUSTOMER_STEP_LABELS);
    expect(stepLabelsFor(true)).toEqual(ENTERPRISE_STEP_LABELS);
    expect(ENTERPRISE_STEP_LABELS).toEqual(['Details', 'Description', 'When & How', 'Location', 'Review']);
    expect(totalStepsFor(false)).toBe(4);
    expect(totalStepsFor(true)).toBe(5);
    expect(locationStepNumber(false)).toBe(3);
    expect(locationStepNumber(true)).toBe(4);
    expect(reviewStepNumber(false)).toBe(4);
    expect(reviewStepNumber(true)).toBe(5);
    expect(isWhenAndHowStep(3, true)).toBe(true);
    expect(isWhenAndHowStep(3, false)).toBe(false);
  });
});

describe('validateStep', () => {
  it('step 1 requires title, trade and urgency with the web copy', () => {
    expect(validateStep(1, INITIAL_FORM, false)).toEqual({
      title: 'Job title is required.',
      tradeCategory: 'Please select a trade.',
      urgency: 'Please select an urgency level.',
    });
    expect(validateStep(1, filled, false)).toEqual({});
  });

  it('contracts need at least one role with a trade (copy depends on sub-type)', () => {
    const contract: FormFields = { ...filled, postingKind: 'contract', contractRoles: [emptyContractRole()] };
    expect(validateStep(1, contract, true).contractRoles).toBe('Add at least one role and pick its trade.');
    expect(validateStep(1, { ...contract, contractType: 'onboarding' }, true).contractRoles).toBe(
      'Add at least one trade you want to onboard.',
    );
    expect(validateStep(1, { ...contract, contractRoles: [{ ...emptyContractRole(), trade: 'plumber' }] }, true)).toEqual({});
    // Homeowners never see the role rule.
    expect(validateStep(1, contract, false)).toEqual({});
  });

  it('step 2 enforces the 20-character minimum', () => {
    expect(validateStep(2, { ...filled, description: '' }, false)).toEqual({ description: 'Description is required.' });
    expect(validateStep(2, { ...filled, description: 'Too short' }, false)).toEqual({
      description: 'Description must be at least 20 characters.',
    });
    expect(validateStep(2, filled, false)).toEqual({});
  });

  it('the location step validates suburb and a 4-digit postcode (step 3 homeowner, 4 enterprise)', () => {
    expect(validateStep(3, { ...filled, suburb: ' ', postcode: '' }, false)).toEqual({
      suburb: 'Suburb is required.',
      postcode: 'Postcode is required.',
    });
    expect(validateStep(3, { ...filled, postcode: '20' }, false)).toEqual({
      postcode: 'Must be a 4-digit Australian postcode.',
    });
    expect(validateStep(4, { ...filled, postcode: 'abcd' }, true)).toEqual({
      postcode: 'Must be a 4-digit Australian postcode.',
    });
    // Step 3 is When & How for enterprises — nothing required.
    expect(validateStep(3, { ...filled, suburb: '', postcode: '' }, true)).toEqual({});
  });
});

describe('contract roles', () => {
  const roles = [
    { trade: ' plumber ', workers: 3, rate: ' $45/hr ', notes: ' night shift ', startDate: '2026-10-01', duration: ' 2 weeks ' },
    { trade: '', workers: 2, rate: '$50', notes: 'ignored — no trade', startDate: '', duration: '' },
    { trade: 'electrician', workers: 0, rate: '', notes: '', startDate: undefined, duration: undefined },
  ];

  it('drops blank rows and trims a multiple-roles contract', () => {
    const out = normaliseContractRoles({ postingKind: 'contract', contractType: 'project', contractRoles: roles });
    expect(out).toEqual([
      { trade: 'plumber', workers: 3, rate: '$45/hr', notes: 'night shift', startDate: '2026-10-01', duration: '2 weeks' },
      { trade: 'electrician', workers: 0, rate: '', notes: '', startDate: '', duration: '' },
    ]);
    expect(contractWorkersTotal(out)).toBe(3);
    expect(contractWorkersTotal([])).toBe(1);
  });

  it('strips count / rate / schedule for onboarding contracts', () => {
    const out = normaliseContractRoles({ postingKind: 'contract', contractType: 'onboarding', contractRoles: roles });
    expect(out[0]).toEqual({ trade: 'plumber', workers: 0, rate: '', notes: 'night shift', startDate: '', duration: '' });
  });

  it('is empty for jobs', () => {
    expect(normaliseContractRoles({ postingKind: 'job', contractType: 'project', contractRoles: roles })).toEqual([]);
  });

  it('clamps the open role tab into range', () => {
    expect(clampRoleIndex(5, 2)).toBe(1);
    expect(clampRoleIndex(0, 0)).toBe(0);
    expect(clampRoleIndex(1, 3)).toBe(1);
  });
});

describe('buildCreateJobInput', () => {
  it('homeowner posts send the core fields, email, budget, photos and specialisations', () => {
    const input = buildCreateJobInput({
      form: filled,
      whenAndHow: INITIAL_WHEN_AND_HOW,
      specialisations: { plumber: ['blocked-drains'], roofer: ['ignored'] },
      jobPhotos: ['https://x/a.jpg'],
      jobDocs: ['https://x/ignored.pdf'],
      isEnterprise: false,
    });
    expect(input).toEqual({
      title: 'Fix leaking tap in bathroom',
      description: filled.description,
      trade_category: 'plumber',
      urgency: 'asap',
      suburb: 'Bondi Beach',
      postcode: '2026',
      specialisations: ['blocked-drains'],
      email: 'sam@example.com',
      budget: '250',
      photo_urls: ['https://x/a.jpg'],
      poster_type: 'customer',
    });
  });

  it('omits blanks instead of sending empty strings', () => {
    const input = buildCreateJobInput({
      form: { ...filled, budget: ' ', contactEmail: '' },
      whenAndHow: INITIAL_WHEN_AND_HOW,
      specialisations: {},
      jobPhotos: [],
      jobDocs: [],
      isEnterprise: false,
    });
    expect(input.budget).toBeUndefined();
    expect(input.email).toBeUndefined();
    expect(input.photo_urls).toBeUndefined();
    expect(input.specialisations).toBeUndefined();
  });

  it('enterprise jobs add poster_type, workers and every When & How term', () => {
    const input = buildCreateJobInput({
      form: { ...filled, workersNeeded: '3', startDate: '2026-09-01' },
      whenAndHow: {
        ...INITIAL_WHEN_AND_HOW,
        employmentType: 'casual',
        startDate: '2026-10-05',
        isOngoing: true,
        dailyStartTime: '07:00',
        workDays: ['mon', 'tue'],
        payType: 'hourly',
        payRateMin: '45',
        payRateMax: '55',
        requiredCapabilities: { white_card: 'required' },
        minPublicLiability: 10_000_000,
      },
      specialisations: {},
      jobPhotos: [],
      jobDocs: ['https://x/plans.pdf'],
      isEnterprise: true,
    });
    expect(input).toMatchObject({
      poster_type: 'enterprise',
      posting_kind: 'job',
      workers_needed: 3,
      // When & How start date wins over the legacy Step 1 field.
      start_date: '2026-10-05',
      document_urls: ['https://x/plans.pdf'],
      employment_type: 'casual',
      is_ongoing: true,
      daily_start_time: '07:00',
      work_days: ['mon', 'tue'],
      pay_type: 'hourly',
      pay_rate_min: 45,
      pay_rate_max: 55,
      required_capabilities: { white_card: 'required' },
      min_public_liability: 10_000_000,
    });
    expect(input.contract_type).toBeUndefined();
    expect(input.contract_roles).toBeUndefined();
    expect(input.end_date).toBeUndefined();
  });

  it('contracts send the sub-type + roles and leave workers_needed / day_rate blank', () => {
    const input = buildCreateJobInput({
      form: {
        ...filled,
        postingKind: 'contract',
        contractType: 'project',
        workersNeeded: '9',
        dayRate: '$500',
        contractDuration: '6 months',
        contractRoles: [{ trade: 'plumber', workers: 2, rate: '$45/hr', notes: '', startDate: '', duration: '' }],
      },
      whenAndHow: INITIAL_WHEN_AND_HOW,
      specialisations: {},
      jobPhotos: [],
      jobDocs: [],
      isEnterprise: true,
    });
    expect(input.posting_kind).toBe('contract');
    expect(input.contract_type).toBe('project');
    expect(input.contract_roles).toEqual([{ trade: 'plumber', workers: 2, rate: '$45/hr', notes: '', startDate: '', duration: '' }]);
    expect(input.workers_needed).toBeUndefined();
    expect(input.day_rate).toBeUndefined();
    expect(input.contract_duration).toBe('6 months');
  });

  it('onboarding contracts drop the duration too', () => {
    const input = buildCreateJobInput({
      form: {
        ...filled,
        postingKind: 'contract',
        contractType: 'onboarding',
        contractDuration: '6 months',
        contractRoles: [{ trade: 'plumber', workers: 2, rate: '$45/hr', notes: '', startDate: '', duration: '' }],
      },
      whenAndHow: INITIAL_WHEN_AND_HOW,
      specialisations: {},
      jobPhotos: [],
      jobDocs: [],
      isEnterprise: true,
    });
    expect(input.contract_duration).toBeUndefined();
    expect(input.contract_roles?.[0]).toMatchObject({ workers: 0, rate: '' });
  });
});

describe('success card', () => {
  it('nouns and destinations follow poster + kind', () => {
    expect(postedNoun('job')).toBe('Job');
    expect(postedNoun('contract')).toBe('Contract');
    expect(postedDestination(false, 'job')).toEqual({ path: '/my-jobs', label: 'View My Jobs' });
    expect(postedDestination(true, 'job')).toEqual({ path: '/enterprise/jobs', label: 'View My Jobs' });
    expect(postedDestination(true, 'contract')).toEqual({ path: '/enterprise/jobs?kind=contract', label: 'View My Contracts' });
  });

  it('submit label', () => {
    expect(submitLabel('job', false)).toBe('Post Job');
    expect(submitLabel('contract', false)).toBe('Post Contract');
    expect(submitLabel('job', true)).toBe('Posting...');
  });
});

describe('AI suggestion shapes', () => {
  it('accepts the web field names and the deployed function field names', () => {
    expect(normaliseAiSuggestion({ trade: 'plumber', urgency: 'asap', title_refined: 'Fix tap' })).toEqual({
      trade: 'plumber',
      urgency: 'asap',
      titleRefined: 'Fix tap',
      clarifyingQuestion: null,
    });
    expect(
      normaliseAiSuggestion({ suggested_trade: 'electrician', suggested_urgency: 'this_week', clarifying_question: 'Which room?' }),
    ).toEqual({ trade: 'electrician', urgency: 'this_week', titleRefined: null, clarifyingQuestion: 'Which room?' });
    expect(normaliseAiSuggestion({ suggested_trade: null, suggested_urgency: '' })).toBeNull();
    expect(normaliseAiSuggestion(null)).toBeNull();
    expect(normaliseAiSuggestion('nope')).toBeNull();
  });

  it('title-cases slugs like the web chip', () => {
    expect(titleCaseSlug('metal-roofing')).toBe('Metal Roofing');
    expect(titleCaseSlug('plumber')).toBe('Plumber');
  });
});
