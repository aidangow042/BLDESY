/**
 * Blocked users management — the list the settings screens embed (the old
 * standalone /blocked-users screen minus its shell). Own `blocked_users` rows
 * under RLS; names/avatars through the PII-safe `public_profiles` view.
 */
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';

import { useToast } from '@/components/ui';
import { Colors, FontFamily, Radius, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useUser } from '@/lib/auth-context';
import { unblockUser } from '@/lib/blocking';
import { db } from '@/lib/supabase';

interface BlockedRow {
  blocked_id: string;
  name: string;
  avatar_url: string | null;
}

export function BlockedUsersList() {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];
  const toast = useToast();
  const { userId } = useUser();

  const [rows, setRows] = useState<BlockedRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data } = await db
      .from('blocked_users')
      .select('blocked_id')
      .eq('blocker_id', userId)
      .order('created_at', { ascending: false });

    const ids = ((data ?? []) as { blocked_id: string }[]).map((r) => r.blocked_id);
    if (ids.length === 0) {
      setRows([]);
      setLoading(false);
      return;
    }
    const { data: profiles } = await db.from('public_profiles').select('id, name, avatar_url').in('id', ids);
    const map = new Map<string, { name: string; avatar_url: string | null }>();
    for (const p of profiles ?? []) {
      if (p.id) map.set(p.id, { name: p.name ?? 'User', avatar_url: p.avatar_url ?? null });
    }
    setRows(
      ids.map((id) => ({
        blocked_id: id,
        name: map.get(id)?.name ?? 'User',
        avatar_url: map.get(id)?.avatar_url ?? null,
      })),
    );
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleUnblock(blockedId: string) {
    if (!userId) return;
    setBusyId(blockedId);
    const { error } = await unblockUser(userId, blockedId);
    setBusyId(null);
    if (error) {
      toast.show("Couldn't unblock. Try again.", { variant: 'error' });
      return;
    }
    setRows((prev) => prev.filter((r) => r.blocked_id !== blockedId));
    toast.show('Unblocked', { variant: 'success' });
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={c.primary} />
      </View>
    );
  }

  if (rows.length === 0) {
    return (
      <View style={styles.center}>
        <Text style={[styles.emptyTitle, { color: c.textPrimary }]}>No blocked users</Text>
        <Text style={[styles.emptyBody, { color: c.textSecondary }]}>
          People you block won&apos;t be able to message you, and you won&apos;t see their reviews.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.list}>
      {rows.map((item) => (
        <View key={item.blocked_id} style={[styles.row, { backgroundColor: c.surface, borderColor: c.border }]}>
          {item.avatar_url ? (
            <Image source={{ uri: item.avatar_url }} style={styles.avatar} contentFit="cover" />
          ) : (
            <View style={[styles.avatar, styles.avatarFallback, { backgroundColor: c.primary + '22' }]}>
              <Text style={[styles.avatarInitial, { color: c.primary }]}>{item.name.charAt(0).toUpperCase()}</Text>
            </View>
          )}
          <Text style={[styles.name, { color: c.textPrimary }]} numberOfLines={1}>
            {item.name}
          </Text>
          <Pressable
            onPress={() => handleUnblock(item.blocked_id)}
            disabled={busyId === item.blocked_id}
            style={[styles.unblockBtn, { borderColor: c.border }]}
            accessibilityRole="button"
            accessibilityLabel={`Unblock ${item.name}`}
          >
            {busyId === item.blocked_id ? (
              <ActivityIndicator size="small" color={c.primary} />
            ) : (
              <Text style={[styles.unblockText, { color: c.primary }]}>Unblock</Text>
            )}
          </Pressable>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center', padding: Spacing['2xl'], gap: Spacing.sm },
  emptyTitle: { fontSize: 17, fontFamily: FontFamily.bodyBold, fontWeight: '700' },
  emptyBody: { fontSize: 14, lineHeight: 20, fontFamily: FontFamily.body, textAlign: 'center' },
  list: { gap: Spacing.sm },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    borderWidth: 1,
    borderRadius: Radius.lg,
    padding: Spacing.md,
  },
  avatar: { width: 44, height: 44, borderRadius: 22 },
  avatarFallback: { alignItems: 'center', justifyContent: 'center' },
  avatarInitial: { fontSize: 18, fontFamily: FontFamily.bodyBold, fontWeight: '700' },
  name: { flex: 1, fontSize: 15, fontFamily: FontFamily.bodySemiBold, fontWeight: '600' },
  unblockBtn: {
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    minHeight: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unblockText: { fontSize: 14, fontFamily: FontFamily.bodyBold, fontWeight: '700' },
});
