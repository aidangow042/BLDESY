/**
 * Home Jobs — port of ~/bldesy-web/app/portal/jobs/residential/page.tsx:
 * open homeowner jobs in the tradie's trade(s), refined to their coverage,
 * the All / ASAP / This Week / Flexible pills, Quick Apply and hide.
 * The waitlist branch (WaitlistTeaser) never renders — the app is LIVE
 * (zoneIsLive('home_jobs') is always true), but the gate is still consulted.
 */
import { useMemo, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ApplyModal } from '@/components/jobs/apply-modal';
import { FeedEmpty, FeedSkeleton, UrgencyFilterRow } from '@/components/jobs/feed-primitives';
import { HideJobModal } from '@/components/jobs/hide-job-modal';
import { TradieJobCard } from '@/components/jobs/tradie-job-card';
import { PortalPage } from '@/components/tradie/portal-page';
import { useToast } from '@/components/ui';
import { Colors, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useTradieFeed } from '@/hooks/use-tradie-feed';
import { applyUrgencyFilter, type Job, type UrgencyFilter } from '@/lib/data/tradie-jobs';
import { zoneIsLive } from '@/lib/launch-flags';
import { ROUTES } from '@/lib/routes';

export default function ResidentialJobsScreen() {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const toast = useToast();
  const feed = useTradieFeed('home');

  const [filter, setFilter] = useState<UrgencyFilter>('all');
  const [applyingJob, setApplyingJob] = useState<Job | null>(null);
  const [dismissTarget, setDismissTarget] = useState<string | null>(null);
  const [withdrawing, setWithdrawing] = useState(false);

  const filteredJobs = useMemo(
    () => applyUrgencyFilter(feed.jobs, filter).filter((j) => !feed.hiddenJobIds.has(j.id)),
    [feed.jobs, feed.hiddenJobIds, filter],
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

  const homeJobsLive = zoneIsLive('home_jobs');

  return (
    <PortalPage title="Home Jobs" subtitle="Open homeowner jobs in your trade." scroll={false}>
      <FlatList
        data={homeJobsLive ? filteredJobs : []}
        keyExtractor={(job) => job.id}
        contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + Spacing['4xl'] }]}
        ListHeaderComponent={
          <View style={styles.header}>
            <UrgencyFilterRow value={filter} onChange={setFilter} accent={c.primary} />
          </View>
        }
        ListEmptyComponent={
          feed.loading ? (
            <FeedSkeleton />
          ) : (
            <FeedEmpty
              icon={<MaterialIcons name="home" size={48} color={c.textSecondary + '4D'} />}
              message={`No home jobs in your trade${filter !== 'all' ? ' for this filter' : ''} right now.`}
            />
          )
        }
        renderItem={({ item: job }) => (
          <TradieJobCard
            job={job}
            kind="home"
            applied={feed.appliedJobIds.has(job.id)}
            viewerSpecs={feed.viewerSpecs}
            onHide={() => setDismissTarget(job.id)}
            onViewDetails={() => router.push(ROUTES.portalJob(job.id))}
            onQuickApply={() => setApplyingJob(job)}
          />
        )}
        refreshControl={
          <RefreshControl refreshing={feed.refreshing} onRefresh={feed.refresh} tintColor={c.primary} />
        }
        keyboardShouldPersistTaps="handled"
      />

      <ApplyModal
        visible={applyingJob !== null}
        job={applyingJob}
        kind="home"
        onClose={() => setApplyingJob(null)}
        onApplied={feed.markApplied}
      />
      <HideJobModal
        visible={dismissTarget !== null}
        kind="home"
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
  header: { marginBottom: Spacing.sm },
});
