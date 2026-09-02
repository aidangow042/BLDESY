/**
 * /saved — port of ~/bldesy-web/app/saved/page.tsx: the signed-in user's saved
 * tradies in saved order, rendered with the shared search `BuilderCard`
 * (saved state + unsave). Guests are sent to login.
 *
 * App rule (CLAUDE.md §2): discovery surfaces apply `applySearchableFilters`,
 * so unlisted / paused tradies drop out of the list here (the web page shows
 * every saved row).
 */
import { useCallback, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useRouter, type Href } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';

import { AppShell } from '@/components/layout';
import { BuilderCard } from '@/components/search/builder-card';
import { Button, Card, Skeleton } from '@/components/ui';
import { Colors, FontFamily, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useUser } from '@/lib/auth-context';
import { listSavedBuilders, unsaveBuilder } from '@/lib/data/saved';
import { ROUTES } from '@/lib/routes';
import type { BuilderSearchResult } from '@/types';

export default function SavedTradiesScreen() {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];
  const router = useRouter();
  const { authedUser, loading: authLoading } = useUser();
  const [builders, setBuilders] = useState<BuilderSearchResult[] | null>(null);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [refreshing, setRefreshing] = useState(false);

  const fetchSaved = useCallback(async () => {
    if (!authedUser) return;
    try {
      const rows = await listSavedBuilders(authedUser.id);
      setBuilders(rows);
      setSavedIds(new Set(rows.map((b) => b.user_id)));
    } catch (e) {
      console.warn('listSavedBuilders failed', e instanceof Error ? e.message : e);
      setBuilders([]);
      setSavedIds(new Set());
    }
  }, [authedUser]);

  // Redirect guests; re-sync on focus (a profile visit may have toggled the bookmark).
  useFocusEffect(
    useCallback(() => {
      if (!authLoading && !authedUser) {
        router.replace(ROUTES.login as Href);
        return;
      }
      fetchSaved();
    }, [authLoading, authedUser, router, fetchSaved]),
  );

  async function handleRefresh() {
    setRefreshing(true);
    await fetchSaved();
    setRefreshing(false);
  }

  function handleToggleSave(builderId: string) {
    if (!authedUser) return;
    // Optimistic remove
    setBuilders((prev) => (prev ?? []).filter((b) => b.user_id !== builderId));
    setSavedIds((prev) => {
      const next = new Set(prev);
      next.delete(builderId);
      return next;
    });
    unsaveBuilder(authedUser.id, builderId).catch((e) => {
      console.warn('unsave failed', e instanceof Error ? e.message : e);
    });
  }

  const loading = authLoading || !authedUser || builders === null;
  const count = builders?.length ?? 0;

  return (
    <AppShell showBack>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={c.primary} />}
      >
        <View style={styles.header}>
          <View>
            <Text accessibilityRole="header" style={[styles.h1, { color: c.textPrimary }]}>
              Saved Tradies
            </Text>
            <Text style={[styles.sub, { color: c.textSecondary }]}>{loading ? 'Loading...' : `${count} saved`}</Text>
          </View>
          {!loading && count > 0 ? (
            <Button variant="ghost" size="sm" onPress={() => router.push(ROUTES.search as Href)}>
              Browse more
            </Button>
          ) : null}
        </View>

        {loading ? (
          <View style={styles.list}>
            {[1, 2, 3].map((i) => (
              <Card key={i}>
                <Skeleton variant="image" style={{ borderRadius: 0 }} />
                <View style={{ padding: Spacing.xl, gap: Spacing.md }}>
                  <Skeleton variant="text" style={{ width: '66%', height: 20 }} />
                  <Skeleton variant="text" style={{ width: '33%' }} />
                  <Skeleton variant="text" style={{ height: 40, borderRadius: 12 }} />
                </View>
              </Card>
            ))}
          </View>
        ) : count === 0 ? (
          <Card padding={Spacing['5xl']} style={styles.empty}>
            <View style={[styles.emptyIcon, { backgroundColor: c.primaryBg }]}>
              <Ionicons name="bookmark-outline" size={28} color={c.primary} />
            </View>
            <Text accessibilityRole="header" style={[styles.emptyTitle, { color: c.textPrimary }]}>
              No saved tradies yet
            </Text>
            <Text style={[styles.emptyBody, { color: c.textSecondary }]}>
              Tap the bookmark on any tradie&apos;s profile to save them here for later.
            </Text>
            <Button onPress={() => router.push(ROUTES.search as Href)}>Browse Tradies</Button>
          </Card>
        ) : (
          <View style={styles.list}>
            {builders!.map((b) => (
              <BuilderCard key={b.user_id} builder={b} saved={savedIds.has(b.user_id)} onToggleSave={handleToggleSave} />
            ))}
          </View>
        )}
      </ScrollView>
    </AppShell>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: Spacing.lg, paddingBottom: Spacing['5xl'], gap: Spacing['2xl'] },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: Spacing.md,
    paddingTop: Spacing.lg,
  },
  h1: { fontSize: 24, fontFamily: FontFamily.bodyBold, fontWeight: '700' },
  sub: { fontSize: 14, fontFamily: FontFamily.body, marginTop: 2 },
  list: { gap: Spacing.xl },
  empty: { alignItems: 'center', gap: Spacing.sm },
  emptyIcon: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.sm },
  emptyTitle: { fontSize: 18, fontFamily: FontFamily.bodyBold, fontWeight: '700' },
  emptyBody: {
    fontSize: 14,
    lineHeight: 20,
    fontFamily: FontFamily.body,
    textAlign: 'center',
    maxWidth: 320,
    marginBottom: Spacing.lg,
  },
});
