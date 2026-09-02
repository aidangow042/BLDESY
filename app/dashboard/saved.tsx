/**
 * /dashboard/saved — port of ~/bldesy-web/app/dashboard/saved/page.tsx: the
 * saved tradies grid with review aggregates and optimistic unsave.
 *
 * App rule (CLAUDE.md §2): discovery surfaces apply `applySearchableFilters`,
 * so unlisted / paused tradies drop out of the list here (the web page shows
 * every saved row).
 */
import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { DashboardScreen } from '@/components/customer-dashboard/dashboard-screen';
import { toSavedTradie, type SavedTradie } from '@/components/customer-dashboard/saved-tradie-card';
import { SavedTradiesGrid } from '@/components/customer-dashboard/saved-tradies-grid';
import { ErrorBanner } from '@/components/jobs/error-banner';
import { Card, Skeleton } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useUser } from '@/lib/auth-context';
import { listSavedBuilders } from '@/lib/data/saved';

export default function DashboardSavedScreen() {
  const { authedUser } = useUser();
  const [tradies, setTradies] = useState<SavedTradie[] | null>(null);
  const [count, setCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!authedUser) return;
    try {
      const rows = (await listSavedBuilders(authedUser.id)).map(toSavedTradie);
      setTradies(rows);
      setCount(rows.length);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong. Please try again.');
      setTradies([]);
      setCount(0);
    }
  }, [authedUser]);

  useEffect(() => {
    load();
  }, [load]);

  async function refresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  return (
    <DashboardScreen
      title="Saved Tradies"
      subtitle={tradies ? `${count} saved` : undefined}
      refreshing={refreshing}
      onRefresh={refresh}
    >
      {error ? <ErrorBanner message={error} onDismiss={() => setError(null)} /> : null}
      {tradies === null || !authedUser ? (
        <View style={{ gap: Spacing.lg }}>
          {[1, 2].map((i) => (
            <Card key={i} padding={Spacing.xl}>
              <View style={styles.skeletonRow}>
                <Skeleton variant="avatar" />
                <View style={{ flex: 1, gap: 6 }}>
                  <Skeleton variant="text" style={{ width: '60%' }} />
                  <Skeleton variant="text" style={{ width: '40%', height: 12 }} />
                </View>
              </View>
            </Card>
          ))}
        </View>
      ) : (
        <SavedTradiesGrid
          key={tradies.map((t) => t.user_id).join(',')}
          initialTradies={tradies}
          userId={authedUser.id}
          onCountChange={setCount}
        />
      )}
    </DashboardScreen>
  );
}

const styles = StyleSheet.create({
  skeletonRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
});
