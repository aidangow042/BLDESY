/**
 * lib/data/visibility.ts — public-profile section visibility.
 *
 * Port of:
 *   ~/bldesy-web/app/portal/profile-visibility/page.tsx        (the JSONB patch + BLDESY Score column)
 *   ~/bldesy-web/components/settings/profile-visibility-panel.tsx (row semantics the screen ports)
 *   ~/bldesy-web/lib/profile-visibility.ts                     (via the verbatim mirror — keys, groups)
 *
 * Storage: builder_profiles.profile_visibility JSONB. ABSENT KEY = VISIBLE;
 * only `false` keys are stored, so existing profiles ship unchanged. The
 * BLDESY Score toggle is a real column (display_bldesy_score, view-gated), not
 * a JSONB key — the patch builder special-cases it exactly like the website.
 */
import { db } from '@/lib/supabase';
import { BLDESY_SCORE_TOGGLE_KEY, isSectionVisible } from '@/lib/web/profile-visibility';
import type { AvailabilityDisplayMode, ProfileVisibilityMap } from '@/types/database';

import { requireUserId } from './own-session';
import type { OwnBuilderProfile } from './portal';

/** The website's toast for a failed toggle write. */
export const VISIBILITY_SAVE_ERROR = "Couldn't save that change — please try again.";

export const VISIBILITY_COLUMNS = [
  'profile_visibility',
  'display_bldesy_score',
  'availability_display_mode',
] as const;

export type VisibilitySettings = Pick<OwnBuilderProfile, (typeof VISIBILITY_COLUMNS)[number]>;

/** What the visibility page renders from. */
export interface VisibilityState {
  visibility: ProfileVisibilityMap;
  displayBldesyScore: boolean;
  availabilityDisplayMode: AvailabilityDisplayMode;
}

/* ── Pure patch building ────────────────────────────────────────────── */

export type VisibilityPatch =
  | { column: 'profile_visibility'; value: ProfileVisibilityMap }
  | { column: 'display_bldesy_score'; value: boolean };

/**
 * The write for one toggle: the BLDESY Score row flips its own column; every
 * other key edits the JSONB — deleting the key when made visible again (only
 * false keys are stored), setting `false` when hidden. Never mutates `current`.
 */
export function buildVisibilityPatch(
  current: ProfileVisibilityMap | null | undefined,
  key: string,
  visible: boolean,
): VisibilityPatch {
  if (key === BLDESY_SCORE_TOGGLE_KEY) {
    return { column: 'display_bldesy_score', value: visible };
  }
  const next: ProfileVisibilityMap = { ...(current ?? {}) };
  if (visible) delete next[key];
  else next[key] = false;
  return { column: 'profile_visibility', value: next };
}

/**
 * Undo ONE key after a failed write — restoring a whole-object snapshot would
 * clobber any other toggle saved while this write was in flight.
 */
export function revertVisibilityKey(
  current: ProfileVisibilityMap,
  key: string,
  wasVisible: boolean,
): ProfileVisibilityMap {
  const reverted: ProfileVisibilityMap = { ...current };
  if (wasVisible) delete reverted[key];
  else reverted[key] = false;
  return reverted;
}

/** Row state for the panel: score row from its column, everything else from the map. */
export function isRowVisible(state: Pick<VisibilityState, 'visibility' | 'displayBldesyScore'>, key: string): boolean {
  return key === BLDESY_SCORE_TOGGLE_KEY ? state.displayBldesyScore : isSectionVisible(state.visibility, key);
}

/** Row → page state (nulls normalised the way the page's useState initialisers do). */
export function visibilityStateFrom(row: VisibilitySettings): VisibilityState {
  return {
    visibility: row.profile_visibility ?? {},
    displayBldesyScore: Boolean(row.display_bldesy_score),
    availabilityDisplayMode: row.availability_display_mode ?? 'hidden',
  };
}

/* ── Own-row IO ─────────────────────────────────────────────────────── */

/** The visibility columns of the own row. */
export async function getVisibility(): Promise<VisibilityState | null> {
  const uid = await requireUserId();
  const { data, error } = await db
    .from('builder_profiles')
    .select(VISIBILITY_COLUMNS.join(', '))
    .eq('user_id', uid)
    .maybeSingle();
  if (error) throw new Error(error.message);
  const row = data as unknown as VisibilitySettings | null;
  return row ? visibilityStateFrom(row) : null;
}

/**
 * Persist one toggle. Returns the next JSONB map (unchanged for the score
 * key) so the caller can keep optimistic state in step. Throws the website's
 * message on failure — the caller reverts with {@link revertVisibilityKey}.
 */
export async function setSectionVisible(
  current: ProfileVisibilityMap,
  key: string,
  visible: boolean,
): Promise<ProfileVisibilityMap> {
  const uid = await requireUserId();
  const patch = buildVisibilityPatch(current, key, visible);
  const { error } = await db
    .from('builder_profiles')
    .update(
      patch.column === 'display_bldesy_score'
        ? { display_bldesy_score: patch.value }
        : { profile_visibility: patch.value },
    )
    .eq('user_id', uid);
  if (error) throw new Error(VISIBILITY_SAVE_ERROR);
  return patch.column === 'profile_visibility' ? patch.value : current;
}
