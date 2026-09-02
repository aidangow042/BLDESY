/**
 * Project Jobs — port of ~/bldesy-web/app/portal/jobs/commercial/page.tsx.
 * Business side pre-launch: the Stage 2 teaser instead of an empty feed
 * (zoneIsLive('project_jobs') mirrors STAGE2_JOBS_LIVE). The full feed below
 * — capability match pills, speciality-first sort, "Hide jobs I don't fully
 * match", Quick Apply, remove — is untouched; Stage 2 launch = flip the flag.
 */
import { useMemo, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ApplyModal } from '@/components/jobs/apply-modal';
import { FeedEmpty, FeedSkeleton, FilterPill, UrgencyFilterRow } from '@/components/jobs/feed-primitives';
import { HideJobModal } from '@/components/jobs/hide-job-modal';
import { TradieJobCard } from '@/components/jobs/tradie-job-card';
import { Stage2Teaser } from '@/components/portal/stage2-teaser';
import { PortalPage } from '@/components/tradie/portal-page';
import { useToast } from '@/components/ui';
import { Colors, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useTradieFeed } from '@/hooks/use-tradie-feed';
import {
  applyUrgencyFilter,
  filterFullMatches,
  matchResultsFor,
  type Job,
  type UrgencyFilter,
} from '@/lib/data/tradie-jobs';
import { zoneIsLive } from '@/lib/launch-flags';
import { ROUTES } from '@/lib/routes';

export default function CommercialJobsScreen() {
  if (!zoneIsLive('project_jobs')) {
    return (
      <PortalPage title="Project Jobs">
        <Stage2Teaser kind="projects" />
      </PortalPage>
    );
  }
  return <CommercialJobsFeed />;
}

function CommercialJobsFeed() {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const toast = useToast();
  const feed = useTradieFeed('project');

  const [filter, setFilter] = useState<UrgencyFilter>('all');
  const [hideUnmatched, setHideUnmatched] = useState(false);
  const [applyingJob, setApplyingJob] = useState<Job | null>(null);
  const [dismissTarget, setDismissTarget] = useState<string | null>(null);
  const [withdrawing, setWithdrawing] = useState(false);

  // Precompute per-job match results so we can both filter and render
  // without recomputing per element.
  const matchByJob = useMemo(() => matchResultsFor(feed.jobs, feed.capabilities), [feed.jobs, feed.capabilities]);

  const filteredJobs = useMemo(() => {
    const visible = applyUrgencyFilter(feed.jobs, filter).filter((j) => !feed.hiddenJobIds.has(j.id));
    // feed.jobs already floats speciality matches first (listTradieFeed).
    return filterFullMatches(visible, matchByJob, hideUnmatched);
  }, [feed.jobs, feed.hiddenJobIds, filter, hideUnmatched, matchByJob]);

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

  return (
    <PortalPage
      title="Project Jobs"
      subtitle="Open project jobs in your trade from verified builders."
      scroll={false}
    >
      <FlatList
        data={filteredJobs}
        keyExtractor={(job) => job.id}
        contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + Spacing['4xl'] }]}
        ListHeaderComponent={
          <View style={styles.header}>
            <UrgencyFilterRow
              value={filter}
              onChange={setFilter}
              accent={c.indigo}
              trailing={
                <FilterPill
                  label="Hide jobs I don't fully match"
                  active={hideUnmatched}
                  accent={c.indigo}
                  onPress={() => setHideUnmatched((v) => !v)}
                  accessibilityHint="Only show jobs where you meet every required capability"
                />
              }
            />
          </View>
        }
        ListEmptyComponent={
          feed.loading ? (
            <FeedSkeleton />
          ) : (
            <FeedEmpty
              icon={<MaterialIcons name="apartment" size={48} color={c.indigo + '4D'} />}
              message={`No project jobs in your trade${filter !== 'all' ? ' for this filter' : ''} right now.`}
            />
          )
        }
        renderItem={({ item: job }) => (
          <TradieJobCard
            job={job}
            kind="project"
            applied={feed.appliedJobIds.has(job.id)}
            match={matchByJob.get(job.id) ?? null}
            viewerSpecs={feed.viewerSpecs}
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
        kind="project"
        onClose={() => setApplyingJob(null)}
        onApplied={feed.markApplied}
      />
      <HideJobModal
        visible={dismissTarget !== null}
        kind="project"
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
