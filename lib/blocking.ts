/**
 * User-blocking helpers. Blocks are self-scoped writes — RLS authorises a user
 * to manage only their own `blocked_users` rows, so these go directly through
 * the Supabase client. The DB also enforces blocking on the messages write path
 * (see 20260603_ugc_moderation.sql) — these helpers are the app-side mirror for
 * UX (hide content, prevent opening a DM).
 */
import { supabase } from './supabase';

/** Ids the user has blocked (one direction: blocker → blocked). For hiding their content. */
export async function getBlockedIds(userId: string): Promise<Set<string>> {
  const { data } = await supabase
    .from('blocked_users')
    .select('blocked_id')
    .eq('blocker_id', userId);
  return new Set((data ?? []).map((r: any) => r.blocked_id as string));
}

/** Ids blocked in EITHER direction relative to the user. For gating messaging. */
export async function getMutualBlockIds(userId: string): Promise<Set<string>> {
  const { data } = await supabase
    .from('blocked_users')
    .select('blocker_id, blocked_id')
    .or(`blocker_id.eq.${userId},blocked_id.eq.${userId}`);
  const ids = new Set<string>();
  for (const r of (data ?? []) as any[]) {
    ids.add(r.blocker_id === userId ? r.blocked_id : r.blocker_id);
  }
  return ids;
}

/** True if a block exists between the two users in either direction. */
export async function isBlockedEitherWay(userId: string, otherId: string): Promise<boolean> {
  if (userId === otherId) return false;
  const { data } = await supabase
    .from('blocked_users')
    .select('id')
    .or(
      `and(blocker_id.eq.${userId},blocked_id.eq.${otherId}),and(blocker_id.eq.${otherId},blocked_id.eq.${userId})`,
    )
    .limit(1);
  return !!(data && data.length > 0);
}

export async function blockUser(userId: string, blockedId: string): Promise<{ error?: string }> {
  if (blockedId === userId) return { error: 'You cannot block yourself.' };
  const { error } = await supabase
    .from('blocked_users')
    .upsert(
      { blocker_id: userId, blocked_id: blockedId },
      { onConflict: 'blocker_id,blocked_id' },
    );
  return error ? { error: error.message } : {};
}

export async function unblockUser(userId: string, blockedId: string): Promise<{ error?: string }> {
  const { error } = await supabase
    .from('blocked_users')
    .delete()
    .eq('blocker_id', userId)
    .eq('blocked_id', blockedId);
  return error ? { error: error.message } : {};
}
