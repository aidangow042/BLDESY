/**
 * Map data — port of ~/bldesy-web/lib/map-data.ts (`fetchMapBuilders`,
 * `MAP_SELECT`, `MapBuilder`). The map is a discovery surface, so it reads the
 * PII-safe `public_builder_profiles` view under the same searchable predicate
 * as /search (`applySearchableFilters`) and keeps only rows with coordinates.
 *
 * Gated fields (`phone`, `email`, `bldesy_score`, `next_available_date`)
 * arrive pre-nulled by the view when the tradie hides them or the caller is a
 * guest. `id` is the tradie's `user_id` (the profile route key).
 */
import { db } from '@/lib/supabase';
import { applySearchableFilters } from '@/lib/web/queries/searchable-filter';
import type { AvailabilityStatus, CredentialsVerified } from '@/types/database';

/**
 * Shape of a tradie row as consumed by the map screen. Mirrors the website's
 * `MapBuilder`; `credentials_verified` is typed as the JSONB it really is
 * (the website types it `boolean | null` and only truth-tests it).
 */
export interface MapBuilder {
  /** = `user_id` — the profile route key. */
  id: string;
  user_id: string;
  /** Public-URL slug — builderProfilePath() turns it into the profile link. */
  slug: string | null;
  business_name: string;
  trade_category: string;
  trade_categories: string[] | null;
  suburb: string;
  postcode: string;
  state: string | null;
  latitude: number;
  longitude: number;
  radius_km: number | null;
  availability: AvailabilityStatus;
  profile_photo_url: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  specialisations: Record<string, string[]> | null;
  credentials_verified: CredentialsVerified | null;
  bldesy_score: number | null;
  display_bldesy_score: boolean | null;
  response_time: string | null;
  next_available_date: string | null;
}

/** A raw view row before `id` is derived. */
export type MapBuilderRow = Omit<MapBuilder, 'id'>;

/** Verbatim column list of the website's MAP_SELECT. */
export const MAP_SELECT = [
  'user_id',
  'slug',
  'business_name',
  'trade_category',
  'trade_categories',
  'suburb',
  'postcode',
  'state',
  'latitude',
  'longitude',
  'radius_km',
  'availability',
  'profile_photo_url',
  'phone',
  'email',
  'website',
  'specialisations',
  'credentials_verified',
  'bldesy_score',
  'display_bldesy_score',
  'response_time',
  'next_available_date',
].join(', ');

/** View rows → map pins: `id = user_id`, everything else untouched. */
export function toMapBuilders(rows: MapBuilderRow[]): MapBuilder[] {
  return rows.map((b) => ({ ...b, id: b.user_id }));
}

/**
 * Every searchable tradie with coordinates. `error: true` = the read failed
 * (the screen shows "Failed to load map data"); an empty list with
 * `error: false` = "No tradies on the map yet".
 */
export async function fetchMapBuilders(): Promise<{ builders: MapBuilder[]; error: boolean }> {
  const { data, error } = await applySearchableFilters(
    db.from('public_builder_profiles').select(MAP_SELECT),
  )
    .not('latitude', 'is', null)
    .not('longitude', 'is', null);

  if (error || !data) {
    if (error) console.warn('fetchMapBuilders error', error.message);
    return { builders: [], error: !!error };
  }
  return { builders: toMapBuilders(data as unknown as MapBuilderRow[]), error: false };
}
