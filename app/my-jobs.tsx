/**
 * /my-jobs — port of ~/bldesy-web/app/my-jobs/page.tsx: the homeowner's posted
 * jobs (posting_kind = job, newest first) with applicants, accept / reject via
 * the decision API (a customer accept auto-rejects the rest), Message, and the
 * delete confirmation. Guests are sent to login.
 */
import { useCallback, useEffect, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { useRouter, type Href } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';

import { DeleteJobModal } from '@/components/jobs/delete-job-modal';
import { ErrorBanner } from '@/components/jobs/error-banner';
import { MyJobCard, type ApplicantsState } from '@/components/jobs/my-job-card';
import { AppShell } from '@/components/layout';
import { Button, Card, Skeleton, useToast } from '@/components/ui';
import { Colors, FontFamily, Radius, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useUser } from '@/lib/auth-context';
import { decideApplication, listApplicationsForJob } from '@/lib/data/applications';
import { deleteJob, getJobsByCustomer } from '@/lib/data/jobs';
import { conversationErrorMessage, createConversation } from '@/lib/data/messages';
import { ROUTES } from '@/lib/routes';
import type { Job } from '@/types';
import type { ApplicationStatus, JobStatus } from '@/types/database';

/** Verbatim my-jobs/page.tsx copy. */
const ACCEPT_FAILED = 'Failed to accept application. Please try again.';
const REJECT_FAILED = 'Failed to reject application. Please try again.';
/** Toast outcomes (app addition — the web only re-renders the pill). */
const ACCEPTED_TOAST = 'Application accepted';
const REJECTED_TOAST = 'Application rejected';

export default function MyJobsScreen() {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];
  const router = useRouter();
  const toast = useToast();
  const { authedUser, loading: authLoading } = useUser();

  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Applicants state per job
  const [expandedJob, setExpandedJob] = useState<string | null>(null);
  const [applicants, setApplicants] = useState<Map<string, ApplicantsState>>(new Map());

  // Delete confirmation
  const [deleteTarget, setDeleteTarget] = useState<Job | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Action loading
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [messagingId, setMessagingId] = useState<string | null>(null);

  // Page-level error banner
  const [pageError, setPageError] = useState<string | null>(null);

  // Redirect if not authed
  useEffect(() => {
    if (!authLoading && !authedUser) router.replace(ROUTES.login as Href);
  }, [authLoading, authedUser, router]);

  const fetchJobs = useCallback(async () => {
    if (!authedUser) return;
    const all = await getJobsByCustomer(authedUser.id);
    setJobs(all.filter((j) => j.posting_kind === 'job'));
    setLoading(false);
  }, [authedUser]);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  async function handleRefresh() {
    setRefreshing(true);
    await fetchJobs();
    setRefreshing(false);
  }

  // Fetch applicants for a job (once)
  const fetchApplicants = useCallback(
    async (jobId: string) => {
      if (applicants.get(jobId)) return; // already loaded / loading
      setApplicants((prev) => new Map(prev).set(jobId, { apps: [], loading: true }));
      let apps: ApplicantsState['apps'] = [];
      try {
        apps = await listApplicationsForJob(jobId);
      } catch (e) {
        console.warn('listApplicationsForJob failed', e instanceof Error ? e.message : e);
      }
      setApplicants((prev) => new Map(prev).set(jobId, { apps, loading: false }));
    },
    [applicants],
  );

  function toggleApplicants(jobId: string) {
    if (expandedJob === jobId) {
      setExpandedJob(null);
    } else {
      setExpandedJob(jobId);
      fetchApplicants(jobId);
    }
  }

  function patchApplication(jobId: string, update: (app: ApplicantsState['apps'][number]) => ApplicantsState['apps'][number]) {
    setApplicants((prev) => {
      const entry = prev.get(jobId);
      if (!entry) return prev;
      return new Map(prev).set(jobId, { ...entry, apps: entry.apps.map(update) });
    });
  }

  // Accept an application — server route flips the status, auto-rejects the
  // other pending applications (customer single-hire), assigns the job, and
  // notifies every affected tradie.
  async function handleAccept(jobId: string, appId: string) {
    setActionLoading(appId);
    try {
      const { autoRejected } = await decideApplication(appId, 'accept');
      const rejectedIds = new Set(autoRejected ?? []);
      const job = jobs.find((j) => j.id === jobId);
      if (job?.poster_type !== 'enterprise') {
        setJobs((prev) => prev.map((j) => (j.id === jobId ? { ...j, status: 'in_progress' as JobStatus } : j)));
      }
      patchApplication(jobId, (a) =>
        a.id === appId
          ? { ...a, status: 'accepted' as ApplicationStatus }
          : rejectedIds.has(a.id)
            ? { ...a, status: 'rejected' as ApplicationStatus }
            : a,
      );
      toast.show(ACCEPTED_TOAST, { variant: 'success' });
    } catch {
      setPageError(ACCEPT_FAILED);
    } finally {
      setActionLoading(null);
    }
  }

  // Reject an application — server route flips the status and notifies the tradie.
  async function handleReject(jobId: string, appId: string) {
    setActionLoading(appId);
    try {
      await decideApplication(appId, 'reject');
      patchApplication(jobId, (a) => (a.id === appId ? { ...a, status: 'rejected' as ApplicationStatus } : a));
      toast.show(REJECTED_TOAST);
    } catch {
      setPageError(REJECT_FAILED);
    } finally {
      setActionLoading(null);
    }
  }

  async function handleMessage(builderUserId: string, appId: string) {
    setMessagingId(appId);
    try {
      const conversationId = await createConversation(builderUserId);
      router.push(ROUTES.conversation(conversationId) as Href);
    } catch (e) {
      toast.show(conversationErrorMessage(e), { variant: 'error' });
    } finally {
      setMessagingId(null);
    }
  }

  // Delete a job
  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteJob(deleteTarget.id);
      setJobs((prev) => prev.filter((j) => j.id !== deleteTarget.id));
    } catch (e) {
      setPageError(e instanceof Error ? e.message : 'Failed to delete job. Please try again.');
    } finally {
      setDeleteTarget(null);
      setDeleting(false);
    }
  }

  const showSpinner = authLoading || !authedUser;

  return (
    <AppShell showBack>
      <FlatList
        data={loading || showSpinner ? [] : jobs}
        keyExtractor={(job) => job.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={c.primary} />}
        ListHeaderComponent={
          <View style={styles.headerWrap}>
            {/* Header */}
            <View style={styles.header}>
              <View style={styles.titleRow}>
                <Text accessibilityRole="header" style={[styles.h1, { color: c.textPrimary }]}>
                  My Jobs
                </Text>
                {!loading && !showSpinner ? (
                  <View style={[styles.countPill, { backgroundColor: c.primary + '1A' }]}>
                    <Text style={[styles.countText, { color: c.primary }]}>{jobs.length}</Text>
                  </View>
                ) : null}
              </View>
              <Button size="sm" onPress={() => router.push(ROUTES.postJob as Href)}>
                Post a Job
              </Button>
            </View>

            {/* Page-level error banner */}
            {pageError ? <ErrorBanner message={pageError} onDismiss={() => setPageError(null)} /> : null}

            {/* Loading skeleton */}
            {loading || showSpinner ? (
              <View style={{ gap: Spacing.lg }}>
                {[1, 2, 3].map((i) => (
                  <Card key={i} padding={Spacing['2xl']}>
                    <Skeleton variant="text" style={{ width: '66%', height: 20, marginBottom: 12 }} />
                    <Skeleton variant="text" style={{ width: '33%', marginBottom: 16 }} />
                    <Skeleton variant="text" style={{ marginBottom: 8 }} />
                    <Skeleton variant="text" style={{ width: '80%' }} />
                  </Card>
                ))}
              </View>
            ) : jobs.length === 0 ? (
              /* Empty state */
              <Card padding={Spacing['5xl']} style={styles.empty}>
                <Ionicons name="clipboard-outline" size={56} color={c.textSecondary + '4D'} />
                <Text accessibilityRole="header" style={[styles.emptyTitle, { color: c.textPrimary }]}>
                  No jobs posted yet
                </Text>
                <Text style={[styles.emptyBody, { color: c.textSecondary }]}>
                  Post a job and get quotes from local tradies.
                </Text>
                <Button size="lg" onPress={() => router.push(ROUTES.postJob as Href)}>
                  Post a Job
                </Button>
              </Card>
            ) : null}
          </View>
        }
        renderItem={({ item }) => (
          <MyJobCard
            job={item}
            expanded={expandedJob === item.id}
            applicants={applicants.get(item.id)}
            actionLoading={actionLoading}
            messagingId={messagingId}
            onToggleApplicants={() => toggleApplicants(item.id)}
            onDelete={() => setDeleteTarget(item)}
            onAccept={(appId) => handleAccept(item.id, appId)}
            onReject={(appId) => handleReject(item.id, appId)}
            onMessage={(builderUserId, appId) => handleMessage(builderUserId, appId)}
          />
        )}
        ItemSeparatorComponent={() => <View style={{ height: Spacing.lg }} />}
      />

      <DeleteJobModal
        title={deleteTarget?.title ?? null}
        deleting={deleting}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
      />
    </AppShell>
  );
}

const styles = StyleSheet.create({
  list: {
    padding: Spacing.lg,
    paddingBottom: Spacing['5xl'],
  },
  headerWrap: { gap: Spacing['2xl'], marginBottom: Spacing.lg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.md,
    paddingTop: Spacing.lg,
  },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  h1: { fontSize: 24, fontFamily: FontFamily.display },
  countPill: {
    minWidth: 28,
    height: 28,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.sm,
  },
  countText: { fontSize: 14, fontFamily: FontFamily.bodyBold, fontWeight: '700' },
  empty: { alignItems: 'center', gap: Spacing.sm },
  emptyTitle: { fontSize: 18, fontFamily: FontFamily.bodyBold, fontWeight: '700', marginTop: Spacing.md },
  emptyBody: { fontSize: 14, lineHeight: 20, fontFamily: FontFamily.body, textAlign: 'center', marginBottom: Spacing.lg },
});
