/**
 * Contracts — port of ~/bldesy-web/app/portal/jobs/contracts/page.tsx.
 * Business side pre-launch: the Stage 2 teaser (zoneIsLive('contracts')).
 * Behind the flag: My / Explore sub-tabs, free-text search, Quick Apply,
 * remove (hide + withdraw).
 */
import { useMemo, useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ApplyModal } from '@/components/jobs/apply-modal';
import { FeedEmpty, FeedSkeleton } from '@/components/jobs/feed-primitives';
import { HideJobModal } from '@/components/jobs/hide-job-modal';
import { TradieJobCard } from '@/components/jobs/tradie-job-card';
import { Stage2Teaser } from '@/components/portal/stage2-teaser';
import { PortalPage } from '@/components/tradie/portal-page';
import { useToast } from '@/components/ui';
import { Colors, FontFamily, Radius, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useTradieFeed } from '@/hooks/use-tradie-feed';
import { filterContracts, type ContractsSubTab, type Job } from '@/lib/data/tradie-jobs';
import { zoneIsLive } from '@/lib/launch-flags';
import { ROUTES } from '@/lib/routes';

export default function ContractsScreen() {
  if (!zoneIsLive('contracts')) {
    return (
      <PortalPage title="Contracts">
        <Stage2Teaser kind="contracts" />
      </PortalPage>
    );
  }
  return <ContractsFeed />;
}

function ContractsFeed() {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const toast = useToast();
  const feed = useTradieFeed('contract');

  const [subTab, setSubTab] = useState<ContractsSubTab>('explore');
  const [search, setSearch] = useState('');
  const [applyingJob, setApplyingJob] = useState<Job | null>(null);
  const [dismissTarget, setDismissTarget] = useState<string | null>(null);
  const [withdrawing, setWithdrawing] = useState(false);

  const filteredContracts = useMemo(
    () =>
      filterContracts(feed.jobs, {
        hiddenJobIds: feed.hiddenJobIds,
        appliedJobIds: feed.appliedJobIds,
        subTab,
        search,
      }),
    [feed.jobs, feed.hiddenJobIds, feed.appliedJobIds, subTab, search],
  );

  async function handleDismiss(jobId: string) {
    setWithdrawing(true);
    try {
      await feed.hide(jobId);
    } catch (e) {
      toast.show(e instanceof Error ? e.message : String(e), { variant: 'error' });
    } finally {
      setDismissTarget(null);
      setWithdrawing(false);
    }
  }

  const tabs: { value: ContractsSubTab; label: string }[] = [
    { value: 'my', label: 'My Contracts' },
    { value: 'explore', label: 'Explore Contracts' },
  ];

  return (
    <PortalPage
      title="Contracts"
      subtitle="Ongoing work over weeks or months. Apply to contracts in your trade and area."
      scroll={false}
    >
      <FlatList
        data={filteredContracts}
        keyExtractor={(job) => job.id}
        contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + Spacing['4xl'] }]}
        ListHeaderComponent={
          <View style={styles.header}>
            <View style={[styles.tabs, { borderBottomColor: c.border }]}>
              {tabs.map((t) => {
                const active = subTab === t.value;
                return (
                  <Pressable
                    key={t.value}
                    onPress={() => setSubTab(t.value)}
                    accessibilityRole="tab"
                    accessibilityState={{ selected: active }}
                    style={[styles.tab, active && { borderBottomColor: c.indigo, borderBottomWidth: 2 }]}
                  >
                    <Text style={[styles.tabText, { color: active ? c.indigo : c.textSecondary }]}>
                      {t.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            <View style={[styles.search, { backgroundColor: c.surface, borderColor: c.border }]}>
              <MaterialIcons name="search" size={16} color={c.textSecondary} />
              <TextInput
                value={search}
                onChangeText={setSearch}
                placeholder="Search by title, description, or location..."
                placeholderTextColor={c.textSecondary + '80'}
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="search"
                style={[styles.searchInput, { color: c.textPrimary }]}
                accessibilityLabel="Search contracts"
              />
            </View>
          </View>
        }
        ListEmptyComponent={
          feed.loading ? (
            <FeedSkeleton />
          ) : (
            <FeedEmpty
              icon={<MaterialIcons name="description" size={48} color={c.indigo + '4D'} />}
              message={
                subTab === 'my'
                  ? "You haven't applied to any contracts yet."
                  : 'No contracts in your trade and area right now.'
              }
            />
          )
        }
        renderItem={({ item: job }) => (
          <TradieJobCard
            job={job}
            kind="contract"
            applied={feed.appliedJobIds.has(job.id)}
            onHide={() => setDismissTarget(job.id)}
            onViewDetails={() => router.push(ROUTES.portalJob(job.id))}
            onQuickApply={() => setApplyingJob(job)}
            onViewCompany={() => router.push(ROUTES.companyProfile(job.customer_id))}
          />
        )}
        refreshControl={
          <RefreshControl refreshing={feed.refreshing} onRefresh={feed.refresh} tintColor={c.indigo} />
        }
        keyboardShouldPersistTaps="handled"
      />

      <ApplyModal
        visible={applyingJob !== null}
        job={applyingJob}
        kind="contract"
        onClose={() => setApplyingJob(null)}
        onApplied={feed.markApplied}
      />
      <HideJobModal
        visible={dismissTarget !== null}
        kind="contract"
        applied={dismissTarget !== null && feed.appliedJobIds.has(dismissTarget)}
        busy={withdrawing}
        onCancel={() => {
          if (!withdrawing) setDismissTarget(null);
        }}
        onConfirm={() => dismissTarget && handleDismiss(dismissTarget)}
      />
    </PortalPage>
  );
}

const styles = StyleSheet.create({
  list: { paddingHorizontal: Spacing.lg, gap: Spacing.lg },
  header: { gap: Spacing['2xl'], marginBottom: Spacing.sm },
  tabs: { flexDirection: 'row', gap: Spacing.sm, borderBottomWidth: 1 },
  tab: { paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm, marginBottom: -1 },
  tabText: { fontSize: 14, fontFamily: FontFamily.bodySemiBold, fontWeight: '600' },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    borderWidth: 1,
    borderRadius: Radius.xl,
    paddingHorizontal: Spacing.md,
    minHeight: 44,
  },
  searchInput: { flex: 1, fontSize: 14, fontFamily: FontFamily.body, paddingVertical: 10 },
});
