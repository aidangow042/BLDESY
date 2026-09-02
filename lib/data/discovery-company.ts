/**
 * Public company profile — data half of ~/bldesy-web/app/company/[id]/page.tsx.
 *
 * Reads the PII-safe `public_enterprise_profiles` view (approved/active rows
 * only). The website nulls `contact_phone`/`contact_email` for signed-out
 * visitors so scrapers can't harvest them at scale — `stripCompanyPii` does the
 * same here (the view already nulls them for guests since migration 20260716;
 * this is defence in depth). Open positions come from `jobs` filtered to the
 * enterprise's open posts, newest first.
 */
import { db } from '@/lib/supabase';
import type { Database } from '@/types/database';

type EnterpriseRow = Database['public']['Tables']['enterprise_profiles']['Row'];

/** The view adds three derived booleans the base Row type doesn't carry. */
export type CompanyProfile = EnterpriseRow & {
  has_abn: boolean | null;
  has_licence: boolean | null;
  has_insurance: boolean | null;
};

/** Verbatim select list of the website's company page. */
export const COMPANY_SELECT =
  'user_id, company_name, has_abn, has_licence, has_insurance, company_size, industry_focus, contact_name, contact_phone, contact_email, bio, logo_url, cover_photo_url, website, suburb, postcode, projects, team_members, trades_needed, specialties, service_regions, years_established, active_projects_count, team_size, safety_record, certifications, past_projects, verified, credentials_verified, licensed_states';

/** Verbatim select list of the website's open-jobs read. */
export const COMPANY_JOBS_SELECT =
  'id, title, trade_category, urgency, suburb, postcode, workers_needed, day_rate, contract_duration, start_date, created_at';

export type CompanyJob = Pick<
  Database['public']['Tables']['jobs']['Row'],
  | 'id'
  | 'title'
  | 'trade_category'
  | 'urgency'
  | 'suburb'
  | 'postcode'
  | 'workers_needed'
  | 'day_rate'
  | 'contract_duration'
  | 'start_date'
  | 'created_at'
>;

/** Null the contact PII unless the viewer holds a real (non-anonymous) session. */
export function stripCompanyPii<T extends { contact_phone: string | null; contact_email: string | null }>(
  row: T,
  contactable: boolean,
): T {
  if (contactable) return row;
  return { ...row, contact_phone: null, contact_email: null };
}

async function hasContactableSession(): Promise<boolean> {
  const { data } = await db.auth.getSession();
  const user = data.session?.user;
  return !!user && user.is_anonymous !== true;
}

/** The public company profile by the enterprise's `user_id`; null when not approved/active or unknown. */
export async function getCompanyById(userId: string): Promise<CompanyProfile | null> {
  const { data, error } = await db
    .from('public_enterprise_profiles')
    .select(COMPANY_SELECT)
    .eq('user_id', userId)
    .in('status', ['approved', 'active'])
    .maybeSingle();
  if (error) {
    console.warn('getCompanyById error', error.message);
    return null;
  }
  if (!data) return null;
  return stripCompanyPii(data as unknown as CompanyProfile, await hasContactableSession());
}

/** The company's open enterprise job posts, newest first. Read failures degrade to []. */
export async function getCompanyOpenJobs(userId: string): Promise<CompanyJob[]> {
  const { data, error } = await db
    .from('jobs')
    .select(COMPANY_JOBS_SELECT)
    .eq('customer_id', userId)
    .eq('poster_type', 'enterprise')
    .eq('status', 'open')
    .order('created_at', { ascending: false });
  if (error) {
    console.warn('getCompanyOpenJobs error', error.message);
    return [];
  }
  return (data ?? []) as unknown as CompanyJob[];
}

/** "Est. 12+ years" — the header stat derives from the founding year. */
export function establishedLabel(yearsEstablished: number | null, now: Date = new Date()): string | null {
  if (!yearsEstablished) return null;
  return `Est. ${now.getFullYear() - yearsEstablished}+ years`;
}

/** "View 3 Open Positions" — the sticky CTA label. */
export function openPositionsCta(count: number): string {
  return `View ${count} Open Position${count !== 1 ? 's' : ''}`;
}
