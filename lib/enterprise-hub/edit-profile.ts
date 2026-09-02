/**
 * lib/enterprise-hub/edit-profile.ts — the enterprise Edit Company Profile
 * save path.
 *
 * Port of ~/bldesy-web/app/enterprise/edit-profile/page.tsx: the one-shot
 * hydrate from the profile row (`enterpriseEditFormFrom`), `handleSave`'s
 * checks + UPDATE payload (`validateEnterpriseEditForm`,
 * `buildEnterpriseProfileUpdate`), the chip / project helpers, and the
 * one-tap SUGGESTED_REGIONS list. Own-row writes go straight to
 * enterprise_profiles under RLS, as the website does.
 *
 * NOT here: ABN / licence / insurance verification (AbnVerifyInline,
 * MultiLicenceList, InsuranceSlots) — credential verification is a web
 * hand-off in the app (CLAUDE.md §7), so `credentials_verified` is never in
 * the payload.
 */
import type { EnterpriseProfile, EnterpriseProfileUpdate } from '@/lib/data/enterprise';
import { requireUserId } from '@/lib/data/own-session';
import { db } from '@/lib/supabase';
import { AU_STATES, CITY_REGIONS } from '@/lib/web/service-areas';
import type { CompanySize, Database, EnterprisePastProject, ProjectVideo } from '@/types/database';

/** The editable columns plus the `updated_at` stamp handleSave writes. */
export type EnterpriseProfileSavePatch = EnterpriseProfileUpdate &
  Pick<Database['public']['Tables']['enterprise_profiles']['Update'], 'updated_at'>;

export const ENTERPRISE_EDIT_STEPS = ['Basics', 'Location', 'Credentials', 'Projects', 'Contact'] as const;
export type EnterpriseEditStep = (typeof ENTERPRISE_EDIT_STEPS)[number];

// Same cap as the builder portal editor — keeps public profiles light.
export const MAX_PROJECT_VIDEOS = 3;

export const COMPANY_SIZES: readonly CompanySize[] = ['1-10', '11-50', '51-200', '200+'];

// One-tap service-region picks: capital metros first, then whole states for
// big operators (e.g. works from Sydney + Newcastle + all of QLD).
const SUGGESTED_CITIES = [
  'Sydney',
  'Newcastle',
  'Wollongong',
  'Central Coast',
  'Melbourne',
  'Geelong',
  'Brisbane',
  'Gold Coast',
  'Sunshine Coast',
  'Perth',
  'Adelaide',
  'Hobart',
  'Canberra',
  'Darwin',
];

export const SUGGESTED_REGIONS: readonly string[] = [
  ...CITY_REGIONS.filter((c) => SUGGESTED_CITIES.includes(c.name)).map((c) => c.name),
  ...AU_STATES.map((s) => `All of ${s}`),
];

/* ── Strings (verbatim) ─────────────────────────────────────────────── */

export const ERR_COMPANY_NAME_REQUIRED = 'Company name is required.';
export const ERR_POSTCODE_FORMAT = 'Postcode must be a 4-digit number.';
export const ERR_MAX_PROJECT_VIDEOS = `Maximum ${MAX_PROJECT_VIDEOS} videos per project.`;
export const SAVED_MESSAGE = 'Profile saved successfully.';

export function uploadFailedMessage(message: string): string {
  return `Upload failed: ${message}`;
}

/* ── Form state ─────────────────────────────────────────────────────── */

export interface EnterpriseEditForm {
  /* Basics */
  companyName: string;
  abn: string;
  bio: string;
  companySize: CompanySize | '';
  industryFocus: string;
  logoUrl: string;
  coverPhotoUrl: string;
  /* Location */
  suburb: string;
  postcode: string;
  serviceRegions: string[];
  /* Credentials */
  specialties: string[];
  certifications: string[];
  yearsEstablished: string;
  teamSize: string;
  safetyRecord: string;
  insuranceDetails: string;
  tradesNeeded: string[];
  /* Projects */
  pastProjects: EnterprisePastProject[];
  /* Contact */
  website: string;
  contactName: string;
  contactPhone: string;
  contactEmail: string;
}

export type EnterpriseEditSource = Pick<
  EnterpriseProfile,
  | 'company_name'
  | 'abn'
  | 'bio'
  | 'company_size'
  | 'industry_focus'
  | 'logo_url'
  | 'cover_photo_url'
  | 'suburb'
  | 'postcode'
  | 'service_regions'
  | 'specialties'
  | 'certifications'
  | 'years_established'
  | 'team_size'
  | 'safety_record'
  | 'insurance_details'
  | 'trades_needed'
  | 'past_projects'
  | 'website'
  | 'contact_name'
  | 'contact_phone'
  | 'contact_email'
>;

/** The page's one-shot hydrate, as a pure mapping. */
export function enterpriseEditFormFrom(p: EnterpriseEditSource): EnterpriseEditForm {
  return {
    companyName: p.company_name || '',
    abn: p.abn || '',
    bio: p.bio || '',
    companySize: p.company_size || '',
    industryFocus: p.industry_focus || '',
    logoUrl: p.logo_url || '',
    coverPhotoUrl: p.cover_photo_url || '',
    suburb: p.suburb || '',
    postcode: p.postcode || '',
    serviceRegions: p.service_regions ?? [],
    specialties: p.specialties ?? [],
    certifications: p.certifications ?? [],
    yearsEstablished: p.years_established ? String(p.years_established) : '',
    teamSize: p.team_size ? String(p.team_size) : '',
    safetyRecord: p.safety_record || '',
    insuranceDetails: p.insurance_details || '',
    tradesNeeded: p.trades_needed ?? [],
    pastProjects: p.past_projects ?? [],
    website: p.website || '',
    contactName: p.contact_name || '',
    contactPhone: p.contact_phone || '',
    contactEmail: p.contact_email || '',
  };
}

/** handleSave's pre-flight checks, in order. Null = valid. */
export function validateEnterpriseEditForm(form: EnterpriseEditForm): string | null {
  if (!form.companyName.trim()) return ERR_COMPANY_NAME_REQUIRED;
  if (form.postcode && !/^\d{4}$/.test(form.postcode)) return ERR_POSTCODE_FORMAT;
  return null;
}

/**
 * The exact UPDATE payload of handleSave (blanks → null, empty lists → null,
 * untitled projects dropped, `updated_at` stamped). `company_size` is only
 * sent when chosen — the column is NOT NULL.
 */
export function buildEnterpriseProfileUpdate(form: EnterpriseEditForm, now: Date = new Date()): EnterpriseProfileSavePatch {
  const cleanProjects = form.pastProjects.filter((p) => p.title.trim());
  const patch: EnterpriseProfileSavePatch = {
    company_name: form.companyName.trim(),
    abn: form.abn.trim() || null,
    bio: form.bio.trim() || null,
    industry_focus: form.industryFocus.trim() || null,
    logo_url: form.logoUrl.trim() || null,
    cover_photo_url: form.coverPhotoUrl.trim() || null,
    suburb: form.suburb.trim() || null,
    postcode: form.postcode.trim() || null,
    service_regions: form.serviceRegions.length > 0 ? form.serviceRegions : null,
    specialties: form.specialties.length > 0 ? form.specialties : null,
    certifications: form.certifications.length > 0 ? form.certifications : null,
    years_established: form.yearsEstablished ? parseInt(form.yearsEstablished, 10) : null,
    team_size: form.teamSize ? parseInt(form.teamSize, 10) : null,
    safety_record: form.safetyRecord.trim() || null,
    insurance_details: form.insuranceDetails.trim() || null,
    trades_needed: form.tradesNeeded.length > 0 ? form.tradesNeeded : null,
    past_projects: cleanProjects.length > 0 ? cleanProjects : null,
    website: form.website.trim() || null,
    contact_name: form.contactName.trim() || null,
    contact_phone: form.contactPhone.trim() || null,
    contact_email: form.contactEmail.trim() || null,
    updated_at: now.toISOString(),
  };
  if (form.companySize) patch.company_size = form.companySize;
  return patch;
}

/* ── Chips / regions ────────────────────────────────────────────────── */

/** addChip: trimmed, non-empty, not already present. Never mutates. */
export function addChip(list: readonly string[], input: string): string[] {
  const val = input.trim();
  if (val && !list.includes(val)) return [...list, val];
  return [...list];
}

export function removeChip(list: readonly string[], val: string): string[] {
  return list.filter((v) => v !== val);
}

/** The one-tap picks not already chosen (case-insensitive, like the web filter). */
export function suggestedRegionsFor(selected: readonly string[]): string[] {
  return SUGGESTED_REGIONS.filter((s) => !selected.some((r) => r.toLowerCase() === s.toLowerCase()));
}

export function toggleTradeNeeded(list: readonly string[], slug: string): string[] {
  return list.includes(slug) ? list.filter((t) => t !== slug) : [...list, slug];
}

/* ── Past projects ──────────────────────────────────────────────────── */

export function emptyPastProject(): EnterprisePastProject {
  return {
    title: '',
    description: '',
    photo_urls: [],
    videos: [],
    location: null,
    value_range: null,
    year_completed: null,
    trades_involved: [],
  };
}

export function updateProject(
  projects: readonly EnterprisePastProject[],
  index: number,
  patch: Partial<EnterprisePastProject>,
): EnterprisePastProject[] {
  return projects.map((p, i) => (i === index ? { ...p, ...patch } : p));
}

export function removeProject(projects: readonly EnterprisePastProject[], index: number): EnterprisePastProject[] {
  return projects.filter((_, i) => i !== index);
}

export function addProjectPhoto(
  projects: readonly EnterprisePastProject[],
  index: number,
  url: string,
): EnterprisePastProject[] {
  return projects.map((p, i) => (i === index ? { ...p, photo_urls: [...(p.photo_urls || []), url] } : p));
}

export function removeProjectPhoto(
  projects: readonly EnterprisePastProject[],
  index: number,
  photoIndex: number,
): EnterprisePastProject[] {
  return projects.map((p, i) =>
    i === index ? { ...p, photo_urls: (p.photo_urls || []).filter((_, j) => j !== photoIndex) } : p,
  );
}

export type AddProjectVideoResult =
  | { ok: true; projects: EnterprisePastProject[] }
  | { ok: false; error: string };

/** Append a video, enforcing MAX_PROJECT_VIDEOS. Never mutates. */
export function addProjectVideo(
  projects: readonly EnterprisePastProject[],
  index: number,
  video: ProjectVideo,
): AddProjectVideoResult {
  const target = projects[index];
  if (!target) return { ok: false, error: 'Project not found.' };
  if ((target.videos || []).length >= MAX_PROJECT_VIDEOS) return { ok: false, error: ERR_MAX_PROJECT_VIDEOS };
  return {
    ok: true,
    projects: projects.map((p, i) => (i === index ? { ...p, videos: [...(p.videos || []), video] } : p)),
  };
}

export function removeProjectVideo(
  projects: readonly EnterprisePastProject[],
  index: number,
  videoIndex: number,
): EnterprisePastProject[] {
  return projects.map((p, i) =>
    i === index ? { ...p, videos: (p.videos || []).filter((_, j) => j !== videoIndex) } : p,
  );
}

/* ── Own-row IO ─────────────────────────────────────────────────────── */

/**
 * handleSave: validate → one UPDATE → sync the logo to profiles.avatar_url so
 * it shows in nav + messages. Throws Error with the website's strings (or the
 * Postgres message, which is what the page surfaces).
 */
export async function saveEnterpriseProfile(form: EnterpriseEditForm): Promise<void> {
  const invalid = validateEnterpriseEditForm(form);
  if (invalid) throw new Error(invalid);
  const uid = await requireUserId();
  // Own row under RLS (the website's browser-client update), including the
  // `updated_at` stamp the page writes alongside the editable columns.
  const { error } = await db.from('enterprise_profiles').update(buildEnterpriseProfileUpdate(form)).eq('user_id', uid);
  if (error) throw new Error(error.message);
  const avatar = form.logoUrl.trim() || null;
  if (avatar) {
    const { error: avatarError } = await db.from('profiles').update({ avatar_url: avatar }).eq('id', uid);
    if (avatarError) console.warn('avatar sync failed', avatarError.message);
  }
}
