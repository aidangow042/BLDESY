import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { AppShell } from '@/components/layout';
import { useToast } from '@/components/ui';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useUser } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { unblockUser } from '@/lib/blocking';

interface BlockedRow {
  blocked_id: string;
  name: string;
  avatar_url: string | null;
}

export default function BlockedUsersScreen() {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];
  const toast = useToast();
  const { userId } = useUser();

  const [rows, setRows] = useState<BlockedRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    const { data } = await supabase
      .from('blocked_users')
      .select('blocked_id')
      .eq('blocker_id', userId)
      .order('created_at', { ascending: false });

    const ids = (data ?? []).map((r: any) => r.blocked_id as string);
    if (ids.length === 0) {
      setRows([]);
      setLoading(false);
      return;
    }
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, name, avatar_url')
      .in('id', ids);

    const map: Record<string, { name: string; avatar_url: string | null }> = {};
    for (const p of (profiles ?? []) as any[]) {
      map[p.id] = { name: p.name ?? 'User', avatar_url: p.avatar_url ?? null };
    }
    setRows(
      ids.map((id) => ({
        blocked_id: id,
        name: map[id]?.name ?? 'User',
        avatar_url: map[id]?.avatar_url ?? null,
      })),
    );
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    load();
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

  return (
    <AppShell title="Blocked users" showBack>
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={c.primary} />
        </View>
      ) : rows.length === 0 ? (
        <View style={styles.center}>
          <Text style={[styles.emptyTitle, { color: c.text }]}>No blocked users</Text>
          <Text style={[styles.emptyBody, { color: c.textSecondary }]}>
            People you block won&apos;t be able to message you, and you won&apos;t see their reviews.
          </Text>
        </View>
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(r) => r.blocked_id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <View style={[styles.row, { backgroundColor: c.surface, borderColor: c.border }]}>
              {item.avatar_url ? (
                <Image source={{ uri: item.avatar_url }} style={styles.avatar} />
              ) : (
                <View style={[styles.avatar, styles.avatarFallback, { backgroundColor: c.primary + '22' }]}>
                  <Text style={[styles.avatarInitial, { color: c.primary }]}>
                    {item.name.charAt(0).toUpperCase()}
                  </Text>
                </View>
              )}
              <Text style={[styles.name, { color: c.text }]} numberOfLines={1}>
                {item.name}
              </Text>
              <Pressable
                onPress={() => handleUnblock(item.blocked_id)}
                disabled={busyId === item.blocked_id}
                style={[styles.unblockBtn, { borderColor: c.border }]}
              >
                {busyId === item.blocked_id ? (
                  <ActivityIndicator size="small" color={c.primary} />
                ) : (
                  <Text style={[styles.unblockText, { color: c.primary }]}>Unblock</Text>
                )}
              </Pressable>
            </View>
          )}
        />
      )}
    </AppShell>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing['2xl'], gap: Spacing.sm },
  emptyTitle: { fontSize: 17, fontWeight: '700' },
  emptyBody: { fontSize: 14, lineHeight: 20, textAlign: 'center' },
  list: { padding: Spacing.lg, gap: Spacing.sm },
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
  avatarInitial: { fontSize: 18, fontWeight: '700' },
  name: { flex: 1, fontSize: 15, fontWeight: '600' },
  unblockBtn: {
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    minHeight: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unblockText: { fontSize: 14, fontWeight: '700' },
});
