/**
 * Customer (homeowner) trust profile — ports of:
 *   - ~/bldesy-web/components/dashboard/customer-profile-section.tsx (labels,
 *     validation copy, the `customer_profiles` upsert + `profiles.avatar_url`
 *     sync; own-row writes under RLS)
 *   - ~/bldesy-web/app/dashboard/layout.tsx (the dashboard shell's identity
 *     fallback chain)
 *   - ~/bldesy-web/app/api/customers/[id]/profile/route.ts (the trust profile
 *     a tradie sees in messages — RLS-gated to an active job or shared
 *     conversation; 404 is deliberately ambiguous)
 */
import type { User } from '@supabase/supabase-js';

import { api, ApiError } from '@/lib/api';
import { db } from '@/lib/supabase';
import type { Database } from '@/types/database';

export type CustomerProfile = Database['public']['Tables']['customer_profiles']['Row'];
export type CustomerProfileInsert = Database['public']['Tables']['customer_profiles']['Insert'];
export type HomeownerType = CustomerProfile['homeowner_type'];
export type PropertyType = CustomerProfile['property_type'];

/** Verbatim from customer-profile-section.tsx / customer-profile-modal.tsx. */
export const HOMEOWNER_LABELS: Record<HomeownerType, string> = {
  'owner-occupier': 'Owner-occupier',
  investor: 'Investor',
  'property-manager': 'Property manager',
};

export const PROPERTY_LABELS: Record<PropertyType, string> = {
  house: 'House',
  unit: 'Unit',
  commercial: 'Commercial',
};

export const CUSTOMER_BIO_MAX_LENGTH = 200;

/** Website copy — customer-profile-section.tsx. */
export const CUSTOMER_FIRST_NAME_REQUIRED = 'Enter your first name.';
export const CUSTOMER_SUBURB_REQUIRED = 'Enter your suburb.';
export const CUSTOMER_PROFILE_SAVE_ERROR = "Couldn't save your profile. Please try again.";

/** What /api/customers/[id]/profile returns to a permitted tradie. */
export interface CustomerPublicProfile {
  first_name: string;
  suburb: string;
  avatar_url: string | null;
  bio: string | null;
  homeowner_type: HomeownerType;
  property_type: PropertyType;
  member_since: string;
  email_verified: boolean;
  phone_verified: boolean;
}

export interface CustomerProfileInput {
  first_name: string;
  suburb: string;
  bio?: string | null;
  homeowner_type: HomeownerType;
  property_type: PropertyType;
  avatar_url?: string | null;
}

/* ───────────────────────────── Pure helpers ───────────────────────────── */

/** The editor's required-field checks; null = valid. */
export function validateCustomerProfileInput(input: CustomerProfileInput): string | null {
  if (!input.first_name.trim()) return CUSTOMER_FIRST_NAME_REQUIRED;
  if (!input.suburb.trim()) return CUSTOMER_SUBURB_REQUIRED;
  return null;
}

/** The upsert row exactly as the website builds it (id = auth user id, blank bio → null). */
export function buildCustomerProfileRow(userId: string, input: CustomerProfileInput): CustomerProfileInsert {
  return {
    id: userId,
    first_name: input.first_name.trim(),
    suburb: input.suburb.trim(),
    bio: input.bio?.trim() || null,
    homeowner_type: input.homeowner_type,
    property_type: input.property_type,
    avatar_url: input.avatar_url ?? null,
  };
}

export interface CustomerDashboardIdentity {
  displayName: string;
  subtitle: string;
  avatarUrl: string | null;
}

/**
 * The dashboard shell's identity: prefer the customer profile, fall back to
 * the base profile, then auth metadata / email, so the shell works before
 * the user opts in. `||` (not `??`) because phone-only accounts have email "".
 */
export function resolveCustomerDashboardIdentity(args: {
  customerProfile: Pick<CustomerProfile, 'first_name' | 'suburb' | 'avatar_url'> | null;
  baseProfile: { name: string | null; avatar_url: string | null } | null;
  user: Pick<User, 'email' | 'user_metadata'> | null;
}): CustomerDashboardIdentity {
  const { customerProfile, baseProfile, user } = args;
  const displayName =
    customerProfile?.first_name ||
    baseProfile?.name ||
    (user?.user_metadata?.name as string | undefined) ||
    user?.email ||
    'Your account';
  const subtitle = customerProfile?.suburb || 'Customer';
  const avatarUrl = customerProfile?.avatar_url || baseProfile?.avatar_url || null;
  return { displayName, subtitle, avatarUrl };
}

/* ───────────────────────────── Data access ───────────────────────────── */

/**
 * A customer's trust profile as seen by a tradie in messages. Null on 404 —
 * either the customer hasn't opted into a profile or the caller isn't
 * allowed to see it (indistinguishable by design).
 */
export async function getCustomerProfile(customerId: string): Promise<CustomerPublicProfile | null> {
  try {
    return await api.get<CustomerPublicProfile>(`/api/customers/${encodeURIComponent(customerId)}/profile`);
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) return null;
    throw e;
  }
}

/** The signed-in user's own `customer_profiles` row; null before they opt in. */
export async function getOwnCustomerProfile(userId: string): Promise<CustomerProfile | null> {
  const { data, error } = await db.from('customer_profiles').select('*').eq('id', userId).maybeSingle();
  if (error) throw new Error(error.message);
  return data ?? null;
}

/**
 * Create or update the caller's trust profile. Rejects with the editor's
 * validation copy or "Couldn't save your profile. Please try again.". Keeps
 * the shared `profiles.avatar_url` (navbar, messages) in sync, like builders do.
 */
export async function upsertOwnCustomerProfile(
  userId: string,
  input: CustomerProfileInput,
): Promise<CustomerProfile> {
  const invalid = validateCustomerProfileInput(input);
  if (invalid) throw new Error(invalid);

  const row = buildCustomerProfileRow(userId, input);
  const { data, error } = await db.from('customer_profiles').upsert(row).select().single();
  if (error || !data) throw new Error(CUSTOMER_PROFILE_SAVE_ERROR);

  if (row.avatar_url) {
    const { error: avatarError } = await db
      .from('profiles')
      .update({ avatar_url: row.avatar_url })
      .eq('id', userId);
    if (avatarError) console.warn('profiles.avatar_url sync failed', avatarError.message);
  }

  return data;
}

/** Customer dashboard shell identity for the signed-in user (two own-row reads). */
export async function getCustomerDashboardIdentity(user: User): Promise<CustomerDashboardIdentity> {
  const [{ data: customerProfile }, { data: baseProfile }] = await Promise.all([
    db.from('customer_profiles').select('first_name, suburb, avatar_url').eq('id', user.id).maybeSingle(),
    db.from('profiles').select('name, avatar_url').eq('id', user.id).maybeSingle(),
  ]);
  return resolveCustomerDashboardIdentity({
    customerProfile: customerProfile ?? null,
    baseProfile: baseProfile ?? null,
    user,
  });
}
