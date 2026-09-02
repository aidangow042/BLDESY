/**
 * Saved tradies — ports of ~/bldesy-web/lib/hooks/use-saved-builders.ts
 * (`useSavedBuilders`: saved id set + optimistic toggle with revert) and the
 * data half of ~/bldesy-web/app/saved/page.tsx (`listSavedBuilders`: saved
 * order → `public_builder_profiles` rows).
 *
 * `saved_builders.builder_id` is the tradie's **`user_id`** (the website
 * convention; the legacy app mixed the builder_profiles PK and user_id — every
 * new caller must pass `user_id`). Own-row reads/writes go direct under RLS
 * exactly as the website does.
 */
import { useCallback, useEffect, useState } from 'react';

import { useUser } from '@/lib/auth-context';
import { SEARCH_SELECT, fetchRatingAggregates } from '@/lib/data/search';
import { db } from '@/lib/supabase';
import { applySearchableFilters } from '@/lib/web/queries/searchable-filter';
import type { BuilderSearchResult, BuilderWithProfile } from '@/types';

/** The signed-in user's saved tradie `user_id`s, newest save first. */
export async function listSavedBuilderIds(userId: string): Promise<string[]> {
  const { data, error } = await db
    .from('saved_builders')
    .select('builder_id')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => r.builder_id);
}

/** Save a tradie (by `user_id`). */
export async function saveBuilder(userId: string, builderUserId: string): Promise<void> {
  const { error } = await db
    .from('saved_builders')
    .insert({ user_id: userId, builder_id: builderUserId });
  if (error) throw new Error(error.message);
}

/** Remove a saved tradie (by `user_id`). */
export async function unsaveBuilder(userId: string, builderUserId: string): Promise<void> {
  const { error } = await db
    .from('saved_builders')
    .delete()
    .eq('user_id', userId)
    .eq('builder_id', builderUserId);
  if (error) throw new Error(error.message);
}

/** Re-order profile rows into the saved order (`ids`), dropping ids with no row. */
export function orderBySavedIds<T extends { user_id: string }>(ids: string[], rows: T[]): T[] {
  const byId = new Map(rows.map((r) => [r.user_id, r]));
  return ids.map((id) => byId.get(id)).filter((r): r is T => Boolean(r));
}

/**
 * The saved list as result cards: view rows in saved order + the review
 * aggregate the shared BuilderCard reads for its stars.
 *
 * `searchableOnly` (default true, per the app rulebook) applies the discovery
 * predicate so unlisted/paused tradies drop out; the website's /saved page
 * does NOT filter — pass `false` for that behaviour (the card then hides
 * enquiry CTAs via `accepting_enquiries`).
 */
export async function listSavedBuilders(
  userId: string,
  opts: { searchableOnly?: boolean } = {},
): Promise<BuilderSearchResult[]> {
  const { searchableOnly = true } = opts;
  const ids = await listSavedBuilderIds(userId);
  if (ids.length === 0) return [];

  let query = db.from('public_builder_profiles').select(SEARCH_SELECT).in('user_id', ids);
  if (searchableOnly) query = applySearchableFilters(query);
  const { data, error } = await query;
  if (error) throw new Error(error.message);

  const ordered = orderBySavedIds(ids, (data ?? []) as unknown as BuilderWithProfile[]);
  const ratings = await fetchRatingAggregates(ordered.map((b) => b.user_id));
  return ordered.map((b) => ({ ...b, _rating: ratings.get(b.user_id) ?? null }));
}

const EMPTY_IDS: ReadonlySet<string> = new Set();

/**
 * Hook to manage saved/bookmarked tradies. Returns the set of saved
 * `user_id`s, `isSaved`, and an optimistic `toggleSave` that reverts on error
 * and resolves to the new saved state (false for guests). `loaded` flips true
 * once the first read settles (or immediately for guests) so SaveButton-style
 * consumers don't hang on a skeleton. Anonymous sessions are guests.
 */
export function useSavedBuilders(): {
  savedIds: ReadonlySet<string>;
  isSaved: (builderUserId: string) => boolean;
  toggleSave: (builderUserId: string) => Promise<boolean>;
  loaded: boolean;
} {
  const { authedUser } = useUser();
  const userId = authedUser?.id ?? null;
  const [state, setState] = useState<{ userId: string; ids: Set<string> } | null>(null);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    listSavedBuilderIds(userId)
      .then((ids) => {
        if (!cancelled) setState({ userId, ids: new Set(ids) });
      })
      .catch((e) => {
        console.warn('Failed to fetch saved builders:', e instanceof Error ? e.message : e);
        // Web parity: a failed read still counts as loaded (empty set).
        if (!cancelled) setState({ userId, ids: new Set() });
      });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const current = userId && state?.userId === userId ? state.ids : null;
  const savedIds: ReadonlySet<string> = current ?? EMPTY_IDS;
  const loaded = !userId || current !== null;

  const isSaved = useCallback((builderUserId: string) => savedIds.has(builderUserId), [savedIds]);

  const toggleSave = useCallback(
    async (builderUserId: string): Promise<boolean> => {
      if (!userId) return false;
      const currentlySaved = savedIds.has(builderUserId);

      const apply = (saved: boolean) =>
        setState((prev) => {
          const next = new Set(prev?.userId === userId ? prev.ids : []);
          if (saved) next.add(builderUserId);
          else next.delete(builderUserId);
          return { userId, ids: next };
        });

      // Optimistic update
      apply(!currentlySaved);

      try {
        if (currentlySaved) await unsaveBuilder(userId, builderUserId);
        else await saveBuilder(userId, builderUserId);
      } catch (e) {
        console.warn(
          currentlySaved ? 'Failed to unsave builder:' : 'Failed to save builder:',
          e instanceof Error ? e.message : e,
        );
        // Revert
        apply(currentlySaved);
        return currentlySaved;
      }
      return !currentlySaved;
    },
    [userId, savedIds],
  );

  return { savedIds, isSaved, toggleSave, loaded };
}
