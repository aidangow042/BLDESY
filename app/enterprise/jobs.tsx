/**
 * /enterprise/jobs — My Job Posts / My Contracts (`?kind=contract`). Port of
 * ~/bldesy-web/app/enterprise/jobs/page.tsx: gradient header, the Jobs /
 * Contracts toggle, photo-carousel cards with status, applicant counts and a
 * delete confirmation. Data: lib/data/enterprise.ts listEnterpriseJobs /
 * deleteEnterpriseJob.
 */
import { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';

import { UnderlineTabs } from '@/components/enterprise/hub-form';
import {
  EmptyState,
  GradientHeader,
  HubModal,
  HubScreen,
  JobStatusPill,
  PillButton,
  useHubTheme,
} from '@/components/enterprise/hub-primitives';
import { JobCardImage } from '@/components/enterprise/job-card-image';
import { Skeleton, useToast } from '@/components/ui';
import { FontFamily, Radius, Shadows, Spacing } from '@/constants/theme';
import { deleteEnterpriseJob, listEnterpriseJobs, type EnterpriseJobWithCounts } from '@/lib/data/enterprise';
import { formatDayMonth, pluralise, urgencyLabel } from '@/lib/enterprise-hub/format';
import { ENTERPRISE_CONTRACTS_HREF, toHref } from '@/lib/enterprise-hub/nav';
import { ROUTES } from '@/lib/routes';
import { formatTradeName } from '@/lib/web/trades';
import type { PostingKind } from '@/types/database';

const KIND_TABS = [
  { key: 'job', label: 'Jobs' },
  { key: 'contract', label: 'Contracts' },
] as const;

export default function EnterpriseJobsScreen() {
  const c = useHubTheme();
  const toast = useToast();
  const params = useLocalSearchParams<{ kind?: string | string[] }>();
  const kindParam = Array.isArray(params.kind) ? params.kind[0] : params.kind;
  const kind: PostingKind = kindParam === 'contract' ? 'contract' : 'job';
  const isContract = kind === 'contract';

  const [jobs, setJobs] = useState<EnterpriseJobWithCounts[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<EnterpriseJobWithCounts | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await listEnterpriseJobs(kind);
      setJobs(res.jobs);
    } catch (e) {
      toast.show(e instanceof Error ? e.message : "Couldn't load your job posts.", { variant: 'error' });
    } finally {
      setLoading(false);
    }
  }, [kind, toast]);

  useEffect(() => {
    setLoading(true);
  }, [kind]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  async function onRefresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      await deleteEnterpriseJob(deleteTarget.id);
      setJobs((prev) => prev.filter((j) => j.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch (e) {
      setDeleteError(e instanceof Error ? e.message : 'Failed to delete job. Please try again.');
    } finally {
      setDeleting(false);
    }
  }

  function switchKind(next: 'job' | 'contract') {
    if (next === kind) return;
    router.replace(toHref(next === 'contract' ? ENTERPRISE_CONTRACTS_HREF : ROUTES.enterpriseJobs));
  }

  return (
    <HubScreen refreshing={refreshing} onRefresh={onRefresh} gap={Spacing['3xl']}>
      <GradientHeader
        title={isContract ? 'My Contracts' : 'My Job Posts'}
        subtitle={isContract ? 'Manage your contract postings' : 'Manage your project job postings'}
        action={{ label: isContract ? 'Post Contract' : 'Post Job', onPress: () => router.push(toHref(ROUTES.postJob)) }}
      />

      {/* Kind toggle — Jobs vs Contracts */}
      <UnderlineTabs options={KIND_TABS} value={kind} onChange={switchKind} />

      {loading ? (
        <View style={{ gap: Spacing.lg }}>
          {[1, 2, 3].map((i) => (
            <View key={i} style={[styles.skeletonCard, { backgroundColor: c.surface, borderColor: c.border }]}>
              <Skeleton style={{ width: '66%', height: 20 }} />
              <Skeleton style={{ width: '33%', height: 16, marginTop: Spacing.md }} />
            </View>
          ))}
        </View>
      ) : jobs.length === 0 ? (
        <View style={[styles.emptyCard, { backgroundColor: c.surface, borderColor: c.border }]}>
          <EmptyState
            icon={isContract ? 'document-text-outline' : 'briefcase-outline'}
            title={isContract ? 'No contracts yet' : 'No job posts yet'}
            body={
              isContract
                ? 'Post your first contract to start finding tradies for ongoing work.'
                : 'Post your first job to start finding tradies.'
            }
            action={{
              label: isContract ? 'Post a Contract' : 'Post a Job',
              variant: 'primary',
              onPress: () => router.push(toHref(ROUTES.postJob)),
            }}
          />
        </View>
      ) : (
        <View style={{ gap: Spacing.lg }}>
          {jobs.map((job) => {
            const urg = urgencyLabel(job.urgency);
            const urgColour = urg.tone === 'error' ? c.error : urg.tone === 'warning' ? c.warning : c.textSecondary;
            const hasApplicants = job.applicant_count > 0;
            return (
              <Pressable
                key={job.id}
                accessibilityRole="link"
                onPress={() => router.push(toHref(ROUTES.enterpriseJob(job.id)))}
                style={({ pressed }) => [
                  styles.card,
                  Shadows.sm,
                  { backgroundColor: c.surface, borderColor: c.border },
                  pressed && { opacity: 0.96 },
                ]}
              >
                {/* Hero image carousel */}
                <View style={styles.hero}>
                  <JobCardImage photos={job.photo_urls} title={job.title} />
                  <View style={styles.statusOverlay} pointerEvents="none">
                    <JobStatusPill status={job.status} />
                  </View>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Delete ${job.title}`}
                    onPress={() => {
                      setDeleteError(null);
                      setDeleteTarget(job);
                    }}
                    hitSlop={6}
                    style={({ pressed }) => [
                      styles.deleteBtn,
                      Shadows.sm,
                      { backgroundColor: pressed ? c.error : 'rgba(255,255,255,0.9)' },
                    ]}
                  >
                    {({ pressed }) => (
                      <Ionicons name="trash-outline" size={16} color={pressed ? '#ffffff' : c.textSecondary} />
                    )}
                  </Pressable>
                </View>

                {/* Card body */}
                <View style={styles.body}>
                  <Text numberOfLines={2} style={[styles.title, { color: c.textPrimary }]}>
                    {job.title}
                  </Text>
                  <View style={styles.metaRow}>
                    <Text style={[styles.trade, { color: c.primary }]}>{formatTradeName(job.trade_category)}</Text>
                    <View style={styles.location}>
                      <Ionicons name="location-outline" size={12} color={c.textSecondary} />
                      <Text style={[styles.metaText, { color: c.textSecondary }]}>
                        {job.suburb}, {job.postcode}
                      </Text>
                    </View>
                  </View>

                  {job.description ? (
                    <Text numberOfLines={2} style={[styles.description, { color: c.textSecondary }]}>
                      {job.description}
                    </Text>
                  ) : null}

                  {/* Info pills */}
                  <View style={styles.pillsRow}>
                    <Text style={[styles.pillText, { color: urgColour, fontFamily: FontFamily.bodySemiBold, fontWeight: '600' }]}>
                      {urg.label}
                    </Text>
                    {job.workers_needed > 1 ? (
                      <Text style={[styles.pillText, { color: c.textSecondary }]}>· {job.workers_needed} workers needed</Text>
                    ) : null}
                    {job.budget || job.day_rate ? (
                      <Text style={[styles.pillText, { color: c.textPrimary, fontFamily: FontFamily.bodyMedium, fontWeight: '500' }]}>
                        · {job.day_rate ? `${job.day_rate}/day` : job.budget}
                      </Text>
                    ) : null}
                    {job.contract_duration ? (
                      <Text style={[styles.pillText, { color: c.textSecondary }]}>· {job.contract_duration}</Text>
                    ) : null}
                  </View>

                  {/* Stats row */}
                  <View style={[styles.statsRow, { borderTopColor: c.border }]}>
                    <View style={[styles.applicants, { backgroundColor: hasApplicants ? c.indigo + '1A' : c.canvas }]}>
                      <Ionicons name="people-outline" size={16} color={hasApplicants ? c.indigo : c.textSecondary} />
                      <Text
                        style={[
                          styles.applicantsText,
                          { color: hasApplicants ? c.indigo : c.textSecondary },
                          hasApplicants && { fontFamily: FontFamily.bodyMedium, fontWeight: '500' },
                        ]}
                      >
                        <Text style={{ fontFamily: FontFamily.bodyBold, fontWeight: '700', color: hasApplicants ? c.indigo : c.textPrimary }}>
                          {job.applicant_count}
                        </Text>{' '}
                        {job.applicant_count === 1 ? 'applicant' : 'applicants'}
                      </Text>
                    </View>
                    <Text style={[styles.posted, { color: c.textSecondary }]}>Posted {formatDayMonth(job.created_at)}</Text>
                  </View>

                  {hasApplicants ? (
                    <View style={[styles.viewApplicants, { backgroundColor: c.indigo + '0D' }]}>
                      <Ionicons name="people-outline" size={16} color={c.indigo} />
                      <Text style={[styles.viewApplicantsText, { color: c.indigo }]}>
                        View {pluralise(job.applicant_count, 'Applicant')} →
                      </Text>
                    </View>
                  ) : null}
                </View>
              </Pressable>
            );
          })}
        </View>
      )}

      {/* Delete confirmation modal */}
      <HubModal
        visible={deleteTarget !== null}
        onClose={() => {
          setDeleteTarget(null);
          setDeleteError(null);
        }}
        dismissable={!deleting}
        maxWidth={384}
        accessibilityLabel="Delete job?"
      >
        <View style={[styles.deleteIcon, { backgroundColor: c.error + '1A' }]}>
          <Ionicons name="trash-outline" size={24} color={c.error} />
        </View>
        <Text accessibilityRole="header" style={[styles.modalTitle, { color: c.textPrimary }]}>
          Delete job?
        </Text>
        <Text style={[styles.modalBody, { color: c.textSecondary }]}>
          Are you sure you want to delete &ldquo;{deleteTarget?.title}&rdquo;? Any applicants and messages on this job
          will also be removed. This can&apos;t be undone.
        </Text>
        <Text style={[styles.modalFootnote, { color: c.textSecondary + 'CC' }]}>
          Deleting won&apos;t refund this month&apos;s post against your subscription.
        </Text>
        {deleteError ? (
          <View style={[styles.deleteError, { borderColor: c.error + '4D', backgroundColor: c.error + '0D' }]}>
            <Text style={[styles.deleteErrorText, { color: c.error }]}>{deleteError}</Text>
          </View>
        ) : null}
        <View style={styles.modalActions}>
          <PillButton
            label="Cancel"
            variant="ghost"
            onPress={() => {
              setDeleteTarget(null);
              setDeleteError(null);
            }}
            disabled={deleting}
          />
          <PillButton label={deleting ? 'Deleting…' : 'Delete'} variant="error" onPress={handleDelete} loading={deleting} />
        </View>
      </HubModal>
    </HubScreen>
  );
}

const styles = StyleSheet.create({
  skeletonCard: {
    borderRadius: Radius.xl,
    borderWidth: 1,
    padding: Spacing.xl,
  },
  emptyCard: {
    borderRadius: Radius.xl,
    borderWidth: 1,
  },
  card: {
    borderRadius: Radius.xl,
    borderWidth: 1,
    overflow: 'hidden',
  },
  hero: {
    position: 'relative',
  },
  statusOverlay: {
    position: 'absolute',
    top: 12,
    left: 12,
  },
  deleteBtn: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    padding: Spacing.lg,
  },
  title: {
    fontSize: 16,
    lineHeight: 22,
    fontFamily: FontFamily.bodyBold,
    fontWeight: '700',
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: Spacing.sm,
    marginTop: 6,
  },
  trade: {
    fontSize: 12,
    fontFamily: FontFamily.bodySemiBold,
    fontWeight: '600',
  },
  location: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 12,
    fontFamily: FontFamily.body,
  },
  description: {
    marginTop: Spacing.sm,
    fontSize: 14,
    lineHeight: 22,
    fontFamily: FontFamily.body,
  },
  pillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 6,
    marginTop: Spacing.md,
  },
  pillText: {
    fontSize: 12,
    fontFamily: FontFamily.body,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.md,
    marginTop: Spacing.lg,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
  },
  applicants: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
  },
  applicantsText: {
    fontSize: 12,
    fontFamily: FontFamily.body,
  },
  posted: {
    fontSize: 10,
    fontFamily: FontFamily.body,
  },
  viewApplicants: {
    marginTop: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: Radius.lg,
    paddingVertical: Spacing.sm,
  },
  viewApplicantsText: {
    fontSize: 12,
    fontFamily: FontFamily.bodyBold,
    fontWeight: '700',
  },
  deleteIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
  },
  modalTitle: {
    fontSize: 18,
    lineHeight: 26,
    fontFamily: FontFamily.bodyBold,
    fontWeight: '700',
    marginBottom: 4,
  },
  modalBody: {
    fontSize: 14,
    lineHeight: 20,
    fontFamily: FontFamily.body,
    marginBottom: Spacing.sm,
  },
  modalFootnote: {
    fontSize: 12,
    lineHeight: 16,
    fontFamily: FontFamily.body,
    marginBottom: Spacing['2xl'],
  },
  deleteError: {
    borderRadius: Radius.md,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    marginBottom: Spacing.md,
  },
  deleteErrorText: {
    fontSize: 12,
    fontFamily: FontFamily.body,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: Spacing.md,
  },
});
