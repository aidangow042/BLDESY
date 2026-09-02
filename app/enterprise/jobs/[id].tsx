/**
 * /enterprise/jobs/[id] — one job post + its applicants. Port of
 * ~/bldesy-web/app/enterprise/jobs/[id]/page.tsx: header with status and
 * Edit / Close / Mark Complete, description + details, the When-and-How
 * terms, "What you asked for" (required capabilities + public liability),
 * contract roles, photos, documents, the applicant summary and the applicant
 * list with the capability match (headline chip on the surface, breakdown on
 * demand), "Only full matches", sort, Accept / Reject, View Profile, Message.
 *
 * `?edit=1` renders the Edit Job Post form (jobs/[id]/edit on the web).
 * Data: lib/data/enterprise.ts; decisions via lib/data/applications.ts
 * (POST /api/applications/decision — the server notifies the tradie).
 */
import { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';

import { ApplicantCard } from '@/components/enterprise/applicant-card';
import { EditJobForm } from '@/components/enterprise/edit-job-form';
import { PillTabs, type SegmentOption } from '@/components/enterprise/hub-form';
import {
  Divider,
  EmptyState,
  HubScreen,
  JobStatusPill,
  LinkText,
  PillButton,
  SectionCard,
  SectionTitle,
  Spinner,
  TinyPill,
  useHubTheme,
} from '@/components/enterprise/hub-primitives';
import { WhenAndHowBlock } from '@/components/jobs/when-and-how-block';
import { useToast } from '@/components/ui';
import { FontFamily, Radius, Spacing } from '@/constants/theme';
import { api, ApiError } from '@/lib/api';
import { useUser } from '@/lib/auth-context';
import { decideApplication } from '@/lib/data/applications';
import {
  getEnterpriseJob,
  getEnterpriseJobApplicants,
  jobHasRequirements,
  sortApplicants,
  updateEnterpriseJobStatus,
  type Applicant,
  type ApplicantSortMode,
  type EnterpriseJob,
} from '@/lib/data/enterprise';
import { conversationErrorMessage, createConversation } from '@/lib/data/messages';
import { formatDayMonth, formatDayMonthYear, humaniseSlug, urgencyHeadline } from '@/lib/enterprise-hub/format';
import { toHref } from '@/lib/enterprise-hub/nav';
import { ROUTES } from '@/lib/routes';
import { CAPABILITY_LABELS, formatPublicLiability, type CapabilityKey } from '@/lib/web/capabilities';
import { formatTradeName } from '@/lib/web/trades';
import type { ApplicationStatus } from '@/types/database';

const MILESTONES = [10, 25, 50];

export default function EnterpriseJobDetailScreen() {
  const c = useHubTheme();
  const toast = useToast();
  const { authedUser } = useUser();
  const params = useLocalSearchParams<{ id: string; edit?: string | string[] }>();
  const id = params.id;
  const editMode = (Array.isArray(params.edit) ? params.edit[0] : params.edit) === '1';

  const [job, setJob] = useState<EnterpriseJob | null>(null);
  const [applicants, setApplicants] = useState<Applicant[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [statusBusy, setStatusBusy] = useState(false);
  const [onlyFullMatches, setOnlyFullMatches] = useState(false);
  const [sortMode, setSortMode] = useState<ApplicantSortMode | null>(null);
  const [expandedApplicant, setExpandedApplicant] = useState<string | null>(null);
  const [messagingId, setMessagingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    try {
      const [j, apps] = await Promise.all([getEnterpriseJob(id), getEnterpriseJobApplicants(id)]);
      setJob(j);
      setApplicants(apps);
    } catch (e) {
      toast.show(e instanceof Error ? e.message : "Couldn't load this job.", { variant: 'error' });
    } finally {
      setLoading(false);
    }
  }, [id, toast]);

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

  const hasRequirements = jobHasRequirements(job);
  const effectiveSort: ApplicantSortMode = sortMode ?? (hasRequirements ? 'best_match' : 'most_recent');
  const visibleApplicants = useMemo(
    () => sortApplicants(applicants, effectiveSort, onlyFullMatches),
    [applicants, effectiveSort, onlyFullMatches],
  );
  const sortOptions = useMemo<SegmentOption<ApplicantSortMode>[]>(
    () => [
      ...(hasRequirements ? [{ key: 'best_match' as const, label: 'Best match' }] : []),
      { key: 'most_recent', label: 'Most recent' },
      { key: 'highest_rated', label: 'Highest rated' },
    ],
    [hasRequirements],
  );

  const pendingCount = applicants.filter((a) => a.status === 'pending').length;
  const acceptedCount = applicants.filter((a) => a.status === 'accepted').length;
  const rejectedCount = applicants.filter((a) => a.status === 'rejected').length;

  function setStatusLocal(appId: string, status: ApplicationStatus): Applicant[] {
    const updated = applicants.map((a) => (a.id === appId ? { ...a, status } : a));
    setApplicants(updated);
    return updated;
  }

  async function handleAccept(appId: string) {
    if (!job) return;
    setActionLoading(appId);
    try {
      // Server route flips the status AND notifies the tradie (in-app + email +
      // push + opt-in SMS). Enterprise jobs are multi-hire: only this
      // application changes.
      await decideApplication(appId, 'accept');
      const updated = setStatusLocal(appId, 'accepted');

      // Check if job is now fully filled
      const newAccepted = updated.filter((a) => a.status === 'accepted').length;
      if (newAccepted >= job.workers_needed && authedUser) {
        api
          .post('/api/notifications', {
            user_id: authedUser.id,
            type: 'job_filled',
            title: `"${job.title}" is fully staffed!`,
            body: `All ${job.workers_needed} position${job.workers_needed !== 1 ? 's' : ''} have been filled.`,
            metadata: { job_id: job.id },
          })
          .catch(() => {
            /* best-effort notification */
          });
      }

      // Milestone notifications
      const totalApps = applicants.length;
      if (authedUser && MILESTONES.includes(totalApps)) {
        api
          .post('/api/notifications', {
            user_id: authedUser.id,
            type: 'milestone',
            title: `"${job.title}" hit ${totalApps} applications!`,
            body: 'Your job post is getting great traction.',
            metadata: { job_id: job.id },
          })
          .catch(() => {
            /* best-effort notification */
          });
      }
    } catch (e) {
      toast.show(e instanceof ApiError ? e.message : 'Something went wrong. Please try again.', { variant: 'error' });
    } finally {
      setActionLoading(null);
    }
  }

  async function handleReject(appId: string) {
    setActionLoading(appId);
    try {
      // Server route flips the status and notifies the tradie of the outcome.
      await decideApplication(appId, 'reject');
      setStatusLocal(appId, 'rejected');
    } catch (e) {
      toast.show(e instanceof ApiError ? e.message : 'Something went wrong. Please try again.', { variant: 'error' });
    } finally {
      setActionLoading(null);
    }
  }

  async function changeStatus(status: 'closed' | 'completed') {
    if (!job) return;
    setStatusBusy(true);
    try {
      await updateEnterpriseJobStatus(job.id, status);
      setJob({ ...job, status });
    } catch (e) {
      toast.show(e instanceof Error ? e.message : 'Something went wrong. Please try again.', { variant: 'error' });
    } finally {
      setStatusBusy(false);
    }
  }

  async function handleMessage(builderId: string) {
    setMessagingId(builderId);
    try {
      const conversationId = await createConversation(builderId);
      router.push(toHref(ROUTES.conversation(conversationId)));
    } catch (e) {
      toast.show(conversationErrorMessage(e), { variant: 'error' });
    } finally {
      setMessagingId(null);
    }
  }

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: c.canvas }}>
        <Spinner minHeight={320} />
      </View>
    );
  }

  if (!job) {
    return (
      <HubScreen>
        <View style={styles.notFound}>
          <Text style={[styles.notFoundText, { color: c.textSecondary }]}>Job not found.</Text>
          <LinkText label="Back to jobs" size={14} onPress={() => router.navigate(toHref(ROUTES.enterpriseJobs))} />
        </View>
      </HubScreen>
    );
  }

  if (editMode) {
    return (
      <EditJobForm
        job={job}
        onBack={() => router.replace(toHref(ROUTES.enterpriseJob(job.id)))}
        onSaved={() => void load()}
      />
    );
  }

  const requiredEntries = Object.entries(job.required_capabilities ?? {}) as [CapabilityKey, string][];
  const showRequirements = requiredEntries.length > 0 || job.min_public_liability != null;

  return (
    <HubScreen refreshing={refreshing} onRefresh={onRefresh} gap={Spacing['2xl']}>
      {/* Back link */}
      <LinkText
        label="Back to jobs"
        icon="chevron-back"
        size={14}
        color={c.textSecondary}
        onPress={() => router.navigate(toHref(ROUTES.enterpriseJobs))}
      />

      {/* Job header */}
      <SectionCard>
        <View style={styles.headerTitleRow}>
          <Text accessibilityRole="header" style={[styles.jobTitle, { color: c.textPrimary }]}>
            {job.title}
          </Text>
          <JobStatusPill status={job.status} />
        </View>
        <View style={styles.headerMeta}>
          {job.posting_kind === 'contract' ? <TinyPill label="Contract" tone="indigo" size="sm" /> : null}
          <TinyPill label={humaniseSlug(job.trade_category)} tone="indigo" size="sm" />
          <Text style={[styles.metaText, { color: c.textSecondary }]}>
            {job.suburb}, {job.postcode}
          </Text>
          <Text style={[styles.metaText, { color: c.textSecondary }]}>·</Text>
          <Text style={[styles.metaText, { color: c.textSecondary }]}>{urgencyHeadline(job.urgency)}</Text>
          <Text style={[styles.metaText, { color: c.textSecondary }]}>·</Text>
          <Text style={[styles.metaText, { color: c.textSecondary }]}>Posted {formatDayMonth(job.created_at)}</Text>
        </View>
        <View style={styles.headerActions}>
          <PillButton
            label="Edit Job"
            variant="outline-indigo"
            size="sm"
            onPress={() => router.push(toHref(`${ROUTES.enterpriseJob(job.id)}?edit=1`))}
          />
          {job.status === 'open' ? (
            <PillButton label="Close Job" variant="outline-error" size="sm" onPress={() => changeStatus('closed')} loading={statusBusy} />
          ) : null}
          {job.status === 'in_progress' ? (
            <PillButton label="Mark Complete" variant="success" size="sm" onPress={() => changeStatus('completed')} loading={statusBusy} />
          ) : null}
        </View>
      </SectionCard>

      {/* Job details cards */}
      <SectionCard>
        <SectionTitle style={{ marginBottom: Spacing.md }}>Job Description</SectionTitle>
        <Text style={[styles.description, { color: c.textSecondary }]}>{job.description}</Text>
      </SectionCard>

      <SectionCard>
        <SectionTitle style={{ marginBottom: Spacing.md }}>Job Details</SectionTitle>
        <View style={styles.detailsGrid}>
          {job.day_rate ? <Detail label="Day Rate" value={job.day_rate} /> : null}
          {job.budget ? <Detail label="Budget" value={job.budget} /> : null}
          {job.contract_duration ? <Detail label="Duration" value={job.contract_duration} /> : null}
          {job.start_date ? <Detail label="Start Date" value={formatDayMonthYear(job.start_date)} /> : null}
          <Detail label="Workers Needed" value={String(job.workers_needed)} />
        </View>
        {job.site_requirements ? (
          <View style={[styles.siteReq, { borderTopColor: c.border }]}>
            <Text style={[styles.detailLabel, { color: c.textSecondary }]}>Site Requirements</Text>
            <Text style={[styles.siteReqText, { color: c.textPrimary }]}>{job.site_requirements}</Text>
          </View>
        ) : null}
      </SectionCard>

      {/* When and how — the employment terms set on the post wizard. Renders nothing if unset. */}
      <WhenAndHowBlock
        employment_type={job.employment_type}
        start_date={job.start_date}
        end_date={job.end_date}
        is_ongoing={job.is_ongoing}
        daily_start_time={job.daily_start_time}
        daily_finish_time={job.daily_finish_time}
        work_days={job.work_days}
        pay_type={job.pay_type}
        pay_rate_min={job.pay_rate_min}
        pay_rate_max={job.pay_rate_max}
      />

      {/* Requirements the owner asked applicants for (capabilities + insurance). */}
      {showRequirements ? (
        <SectionCard>
          <Text style={[styles.upperTitle, { color: c.textPrimary }]}>What you asked for</Text>
          {requiredEntries.length > 0 ? (
            <View style={styles.chipWrap}>
              {requiredEntries.map(([key, level]) => (
                <TinyPill
                  key={key}
                  label={CAPABILITY_LABELS[key] ?? key}
                  tone={level === 'required' ? 'indigo' : 'amber'}
                  size="sm"
                  trailing={<Text style={styles.levelTag}>{level}</Text>}
                />
              ))}
            </View>
          ) : null}
          {job.min_public_liability != null ? (
            <Text style={[styles.liability, { color: c.textSecondary }]}>
              Minimum public liability:{' '}
              <Text style={{ color: c.textPrimary, fontFamily: FontFamily.bodySemiBold, fontWeight: '600' }}>
                {formatPublicLiability(job.min_public_liability)}
              </Text>
            </Text>
          ) : null}
        </SectionCard>
      ) : null}

      {/* Contract roles — per-role breakdown ("multiple jobs") or onboarding. */}
      {job.posting_kind === 'contract' && job.contract_roles && job.contract_roles.length > 0 ? (
        <SectionCard>
          <SectionTitle style={{ marginBottom: Spacing.md }}>
            {job.contract_type === 'onboarding' ? 'Trades being onboarded' : 'Roles on this contract'}
          </SectionTitle>
          <View style={{ gap: Spacing.sm }}>
            {job.contract_roles.map((role, i) => (
              <View key={i} style={styles.roleRow}>
                <TinyPill label={formatTradeName(role.trade)} tone="indigo" size="sm" />
                {job.contract_type !== 'onboarding' && role.workers > 0 ? (
                  <Text style={[styles.roleText, { color: c.textSecondary }]}>× {role.workers}</Text>
                ) : null}
                {job.contract_type !== 'onboarding' && role.rate ? (
                  <Text style={[styles.roleText, { color: c.textPrimary, fontFamily: FontFamily.bodyMedium, fontWeight: '500' }]}>
                    {role.rate}
                  </Text>
                ) : null}
                {job.contract_type !== 'onboarding' && role.startDate ? (
                  <Text style={[styles.roleText, { color: c.textSecondary }]}>· from {formatDayMonth(role.startDate)}</Text>
                ) : null}
                {job.contract_type !== 'onboarding' && role.duration ? (
                  <Text style={[styles.roleText, { color: c.textSecondary }]}>· {role.duration}</Text>
                ) : null}
                {role.notes ? <Text style={[styles.roleText, { color: c.textSecondary }]}>— {role.notes}</Text> : null}
              </View>
            ))}
          </View>
        </SectionCard>
      ) : null}

      {/* Site photos */}
      {job.photo_urls && job.photo_urls.length > 0 ? (
        <SectionCard>
          <SectionTitle style={{ marginBottom: Spacing.md }}>Site Photos &amp; Plans ({job.photo_urls.length})</SectionTitle>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: Spacing.sm }}>
            {job.photo_urls.map((url, i) => (
              <Pressable
                key={`${url}-${i}`}
                accessibilityRole="imagebutton"
                accessibilityLabel={`Site photo ${i + 1}`}
                onPress={() => WebBrowser.openBrowserAsync(url)}
                style={[styles.photo, { borderColor: c.border }]}
              >
                <Image source={{ uri: url }} contentFit="cover" style={StyleSheet.absoluteFill} />
              </Pressable>
            ))}
          </ScrollView>
        </SectionCard>
      ) : null}

      {/* Documents */}
      {job.document_urls && job.document_urls.length > 0 ? (
        <SectionCard>
          <SectionTitle style={{ marginBottom: Spacing.md }}>Documents ({job.document_urls.length})</SectionTitle>
          <View style={{ gap: Spacing.sm }}>
            {job.document_urls.map((url, i) => (
              <Pressable
                key={`${url}-${i}`}
                accessibilityRole="link"
                onPress={() => WebBrowser.openBrowserAsync(url)}
                style={({ pressed }) => [
                  styles.docRow,
                  { backgroundColor: c.canvas, borderColor: pressed ? c.indigo + '4D' : c.border },
                ]}
              >
                <Ionicons name="document-text-outline" size={20} color={c.indigo} />
                <Text style={[styles.docLabel, { color: c.indigo }]}>Document {i + 1}</Text>
                <Ionicons name="open-outline" size={16} color={c.textSecondary + '80'} style={{ marginLeft: 'auto' }} />
              </Pressable>
            ))}
          </View>
        </SectionCard>
      ) : null}

      {/* Applicant summary */}
      {applicants.length > 0 ? (
        <View style={styles.summaryRow}>
          <Summary value={pendingCount} label="Pending" colour={c.warning} />
          <Summary value={acceptedCount} label="Accepted" colour={c.success} />
          <Summary value={rejectedCount} label="Rejected" colour={c.error} />
        </View>
      ) : null}

      {/* View Applicants */}
      <SectionCard padding={0}>
        <View style={[styles.applicantsHeader, { borderBottomColor: c.border }]}>
          <View style={styles.applicantsTitleRow}>
            <View style={styles.applicantsTitleLeft}>
              <Ionicons name="people-outline" size={20} color={c.indigo} />
              <Text style={[styles.applicantsTitle, { color: c.textPrimary }]}>View Applicants</Text>
              {applicants.length > 0 ? <TinyPill label={String(applicants.length)} tone="indigo" size="sm" /> : null}
            </View>
            {pendingCount > 0 ? <TinyPill label={`${pendingCount} pending review`} tone="warning" size="xxs" /> : null}
          </View>

          {/* Filter + sort row (hidden if no applicants) */}
          {applicants.length > 0 ? (
            <View style={styles.filterRow}>
              {hasRequirements ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{ selected: onlyFullMatches }}
                  onPress={() => setOnlyFullMatches((v) => !v)}
                  style={[
                    styles.filterPill,
                    onlyFullMatches
                      ? { backgroundColor: c.indigo, borderColor: c.indigo }
                      : { backgroundColor: c.canvas, borderColor: c.border },
                  ]}
                >
                  <Ionicons name="checkmark" size={14} color={onlyFullMatches ? '#ffffff' : c.textSecondary} />
                  <Text style={[styles.filterLabel, { color: onlyFullMatches ? '#ffffff' : c.textSecondary }]}>
                    Only full matches
                  </Text>
                </Pressable>
              ) : (
                <View />
              )}
              <View style={styles.sortRow}>
                <Text style={[styles.sortLabel, { color: c.textSecondary }]}>Sort</Text>
                <PillTabs options={sortOptions} value={effectiveSort} onChange={setSortMode} />
              </View>
            </View>
          ) : null}
        </View>

        {applicants.length === 0 ? (
          <EmptyState
            icon="people-outline"
            title="No applications yet"
            body="Tradies will apply once they see your job."
            compact
          />
        ) : visibleApplicants.length === 0 ? (
          <View style={styles.filterEmpty}>
            <Text style={[styles.filterEmptyText, { color: c.textSecondary }]}>No applicants match this filter.</Text>
          </View>
        ) : (
          visibleApplicants.map((app, i) => (
            <View key={app.id}>
              {i > 0 ? <Divider /> : null}
              <ApplicantCard
                applicant={app}
                jobHasRequirements={hasRequirements}
                expanded={expandedApplicant === app.id}
                onToggleExpand={() => setExpandedApplicant(expandedApplicant === app.id ? null : app.id)}
                onAccept={() => handleAccept(app.id)}
                onReject={() => handleReject(app.id)}
                actionLoading={actionLoading === app.id}
                onViewProfile={() => router.push(toHref(ROUTES.builderProfile(app.builder_id)))}
                onMessage={() => handleMessage(app.builder_id)}
                messaging={messagingId === app.builder_id}
              />
            </View>
          ))
        )}
      </SectionCard>
    </HubScreen>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  const c = useHubTheme();
  return (
    <View style={styles.detail}>
      <Text style={[styles.detailLabel, { color: c.textSecondary }]}>{label}</Text>
      <Text style={[styles.detailValue, { color: c.textPrimary }]}>{value}</Text>
    </View>
  );
}

function Summary({ value, label, colour }: { value: number; label: string; colour: string }) {
  const c = useHubTheme();
  return (
    <View style={[styles.summary, { backgroundColor: c.surface, borderColor: c.border }]}>
      <Text style={[styles.summaryValue, { color: c.textPrimary }]}>{value}</Text>
      <Text style={[styles.summaryLabel, { color: colour }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  notFound: {
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: Spacing['5xl'],
  },
  notFoundText: {
    fontSize: 14,
    fontFamily: FontFamily.body,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  jobTitle: {
    fontSize: 20,
    lineHeight: 28,
    fontFamily: FontFamily.bodyBold,
    fontWeight: '700',
    flexShrink: 1,
  },
  headerMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  metaText: {
    fontSize: 14,
    fontFamily: FontFamily.body,
  },
  headerActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginTop: Spacing.lg,
  },
  description: {
    fontSize: 14,
    lineHeight: 22,
    fontFamily: FontFamily.body,
  },
  detailsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
  },
  detail: {
    width: '47%',
  },
  detailLabel: {
    fontSize: 12,
    fontFamily: FontFamily.body,
  },
  detailValue: {
    marginTop: 2,
    fontSize: 14,
    fontFamily: FontFamily.bodySemiBold,
    fontWeight: '600',
  },
  siteReq: {
    marginTop: Spacing.md,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
  },
  siteReqText: {
    marginTop: 4,
    fontSize: 14,
    lineHeight: 20,
    fontFamily: FontFamily.body,
  },
  upperTitle: {
    fontSize: 14,
    fontFamily: FontFamily.bodyBold,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: Spacing.md,
  },
  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  levelTag: {
    fontSize: 10,
    fontFamily: FontFamily.body,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    opacity: 0.7,
  },
  liability: {
    marginTop: Spacing.md,
    fontSize: 14,
    fontFamily: FontFamily.body,
  },
  roleRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  roleText: {
    fontSize: 14,
    fontFamily: FontFamily.body,
  },
  photo: {
    width: 160,
    height: 112,
    borderRadius: Radius.md,
    borderWidth: 1,
    overflow: 'hidden',
  },
  docRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: 1,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  docLabel: {
    fontSize: 14,
    fontFamily: FontFamily.bodyMedium,
    fontWeight: '500',
  },
  summaryRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  summary: {
    flex: 1,
    borderRadius: Radius.lg,
    borderWidth: 1,
    padding: Spacing.md,
    alignItems: 'center',
  },
  summaryValue: {
    fontSize: 20,
    fontFamily: FontFamily.bodyBold,
    fontWeight: '700',
  },
  summaryLabel: {
    marginTop: 2,
    fontSize: 10,
    fontFamily: FontFamily.bodySemiBold,
    fontWeight: '600',
  },
  applicantsHeader: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.lg,
    borderBottomWidth: 1,
    gap: Spacing.md,
  },
  applicantsTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.sm,
    flexWrap: 'wrap',
  },
  applicantsTitleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  applicantsTitle: {
    fontSize: 16,
    fontFamily: FontFamily.bodyBold,
    fontWeight: '700',
  },
  filterRow: {
    gap: Spacing.md,
  },
  filterPill: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: Radius.full,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
  },
  filterLabel: {
    fontSize: 12,
    fontFamily: FontFamily.bodyBold,
    fontWeight: '700',
  },
  sortRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    flexWrap: 'wrap',
  },
  sortLabel: {
    fontSize: 12,
    fontFamily: FontFamily.body,
  },
  filterEmpty: {
    paddingVertical: Spacing['4xl'],
    alignItems: 'center',
  },
  filterEmptyText: {
    fontSize: 14,
    fontFamily: FontFamily.body,
  },
});
