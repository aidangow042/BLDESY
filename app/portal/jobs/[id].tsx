/**
 * Job detail + apply — port of ~/bldesy-web/app/portal/jobs/[id]/page.tsx:
 * poster banner (company or homeowner), photos, header pills + Report, the
 * enterprise "When and how" terms, key details, contract roles, description,
 * capability requirements + match warning, site requirements, documents, the
 * apply card with the Annex A.4 lead disclaimer, withdraw, and Send Message.
 * No contact reveal — the website portal job page has none (the RPC is dead).
 */
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter, type Href } from 'expo-router';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import * as WebBrowser from 'expo-web-browser';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

import { ApplicationStatusBadge } from '@/components/jobs/application-status-badge';
import { ConfirmModal } from '@/components/jobs/confirm-modal';
import { MatchWarning } from '@/components/jobs/match-warning';
import { RequirementsBlock } from '@/components/jobs/requirements-block';
import { UrgencyPill } from '@/components/jobs/urgency-pill';
import { WhenAndHowBlock } from '@/components/jobs/when-and-how-block';
import { SendMessageButton } from '@/components/messages/send-message-button';
import { ReportButton } from '@/components/report-button';
import { PortalPage } from '@/components/portal/portal-page';
import { Skeleton, useToast } from '@/components/ui';
import { Colors, FontFamily, Radius, Shadows, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useUser } from '@/lib/auth-context';
import { applyToJob, withdrawApplication } from '@/lib/data/applications';
import { readOwnCapabilitiesRow } from '@/lib/data/capabilities';
import {
  getJobById,
  getPosterCompanyProfile,
  getPosterPublicProfile,
  recordJobView,
  type PosterCompanyProfile,
} from '@/lib/data/jobs';
import { getTradieMatchForJob, type Job } from '@/lib/data/tradie-jobs';
import { relativeTime } from '@/lib/format';
import { ROUTES } from '@/lib/routes';
import { db } from '@/lib/supabase';
import { isValidUrl } from '@/lib/validation';
import type { TradieCapabilities } from '@/lib/web/capabilities';
import { formatTradeName } from '@/lib/web/trades';
import type { ApplicationStatus } from '@/types/database';

/** Tailwind amber-50 / amber-300 / amber-900 — the Annex A.4 disclaimer box. */
const AMBER = {
  light: { bg: '#fffbeb', border: '#fcd34d99', text: '#78350fE6' },
  dark: { bg: '#f59e0b1A', border: '#f59e0b4D', text: '#fef3c7E6' },
} as const;

function formatLongDate(value: string): string {
  return new Date(value).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatShortDate(value: string): string {
  return new Date(value).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' });
}

function formatBudget(budget: string): string {
  const n = Number(budget);
  return Number.isFinite(n) ? `$${n.toLocaleString('en-AU')}` : budget;
}

export default function JobDetailScreen() {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];
  const amber = AMBER[scheme];
  const router = useRouter();
  const toast = useToast();
  const { id: jobId } = useLocalSearchParams<{ id: string }>();
  const { user, loading: authLoading } = useUser();
  const uid = user?.id ?? null;

  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);
  const [existingApp, setExistingApp] = useState<{ id: string; status: ApplicationStatus } | null>(null);
  const [message, setMessage] = useState('');
  const [applying, setApplying] = useState(false);
  const [applied, setApplied] = useState(false);
  const [withdrawing, setWithdrawing] = useState(false);
  const [showWithdrawConfirm, setShowWithdrawConfirm] = useState(false);
  const [company, setCompany] = useState<PosterCompanyProfile | null>(null);
  const [posterName, setPosterName] = useState<string | null>(null);
  const [posterAvatar, setPosterAvatar] = useState<string | null>(null);
  const [viewerCapabilities, setViewerCapabilities] = useState<TradieCapabilities | null>(null);

  useEffect(() => {
    if (!uid || !jobId) return;
    let active = true;
    (async () => {
      try {
        const [jobData, appRes, caps] = await Promise.all([
          getJobById(jobId),
          db.from('applications').select('id, status').eq('job_id', jobId).eq('builder_id', uid).maybeSingle(),
          // The viewing user's own capabilities — null is fine (they haven't
          // filled them in yet). Fetched regardless of whether the job has
          // requirements so the match block always has up-to-date data.
          readOwnCapabilitiesRow().catch(() => null),
        ]);
        if (!active) return;
        setJob(jobData);
        if (jobData) {
          if (jobData.poster_type === 'enterprise') {
            setCompany(await getPosterCompanyProfile(jobData.customer_id).catch(() => null));
          } else {
            const profile = await getPosterPublicProfile(jobData.customer_id).catch(() => null);
            if (profile) {
              setPosterName(profile.name);
              setPosterAvatar(profile.avatar_url);
            }
          }
        }
        if (appRes.data) setExistingApp(appRes.data as { id: string; status: ApplicationStatus });
        setViewerCapabilities(caps);
        if (jobData) void recordJobView(jobId, uid);
      } catch {
        /* the "Job not found" card covers a failed read */
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [uid, jobId]);

  async function handleApply() {
    if (!uid || !job || applying) return;
    setApplying(true);
    try {
      const data = await applyToJob(job.id, uid, message, job);
      setExistingApp(data);
      setApplied(true);
    } catch (e) {
      // "Only approved tradies can apply for jobs." / "Couldn't submit your application. Please try again."
      toast.show(e instanceof Error ? e.message : String(e), { variant: 'error' });
    } finally {
      setApplying(false);
    }
  }

  async function handleWithdraw() {
    if (!existingApp || !uid) return;
    setWithdrawing(true);
    try {
      await withdrawApplication(existingApp.id);
      setExistingApp(null);
      setApplied(false);
      setShowWithdrawConfirm(false);
    } catch (e) {
      toast.show(e instanceof Error ? e.message : String(e), { variant: 'error' });
    } finally {
      setWithdrawing(false);
    }
  }

  function openUrl(url: string) {
    void WebBrowser.openBrowserAsync(url);
  }

  if (!authLoading && !user) {
    return (
      <PortalPage title="Job" hideHeading>
        <View style={[styles.card, styles.centerCard, Shadows.sm, { backgroundColor: c.surface, borderColor: c.border }]}>
          <MaterialIcons name="lock-outline" size={48} color={c.textSecondary + '66'} style={styles.centerIcon} />
          <Text style={[styles.centerTitle, { color: c.textPrimary }]}>Sign in to view this job</Text>
          <Text style={[styles.centerBody, { color: c.textSecondary }]}>
            You need to be logged in as a builder to view job details and apply.
          </Text>
          <Pressable
            onPress={() => router.push(ROUTES.login as Href)}
            style={[styles.primaryPill, { backgroundColor: c.primary }]}
            accessibilityRole="button"
          >
            <Text style={styles.primaryPillText}>Sign In</Text>
          </Pressable>
        </View>
      </PortalPage>
    );
  }

  if (loading || authLoading) {
    return (
      <PortalPage title="Job" hideHeading>
        <Skeleton style={{ width: 128, height: 16 }} />
        <Skeleton style={{ width: '66%', height: 32 }} />
        <Skeleton variant="card" />
        <Skeleton style={{ height: 128, borderRadius: Radius.xl }} />
      </PortalPage>
    );
  }

  if (!job) {
    return (
      <PortalPage title="Job" hideHeading>
        <View style={[styles.card, styles.centerCard, Shadows.sm, { backgroundColor: c.surface, borderColor: c.border }]}>
          <Text style={[styles.centerTitle, { color: c.textPrimary }]}>Job not found</Text>
          <Text style={[styles.centerBody, { color: c.textSecondary }]}>This job may have been removed.</Text>
          <Pressable
            onPress={() => router.replace(ROUTES.portalJobsCommercial)}
            style={[styles.primaryPill, { backgroundColor: c.primary }]}
            accessibilityRole="button"
          >
            <Text style={styles.primaryPillText}>Back to Jobs</Text>
          </Pressable>
        </View>
      </PortalPage>
    );
  }

  const isEnterprise = job.poster_type === 'enterprise';
  const isContract = job.posting_kind === 'contract';
  const j = job;
  const accent = isEnterprise ? c.indigo : c.primary;

  // Match the viewing tradie's capabilities against the job's requirements.
  const { match } = getTradieMatchForJob(j, viewerCapabilities);

  // Where the breadcrumb + back-link land. Contracts have their own portal
  // tab; jobs split by poster_type.
  const backHref: Href = isContract
    ? ROUTES.portalJobsContracts
    : isEnterprise
      ? ROUTES.portalJobsCommercial
      : ROUTES.portalJobsResidential;
  const backLabel = isContract ? 'Contracts' : isEnterprise ? 'Project Jobs' : 'Home Jobs';
  const goBack = () => (router.canGoBack() ? router.back() : router.replace(backHref));

  const photos = (j.photo_urls ?? []).filter(isValidUrl);
  const documents = (j.document_urls ?? []).filter(isValidUrl);
  const companyName = company?.company_name ?? null;

  const messageButton = (
    <SendMessageButton recipientId={j.customer_id} basePath="/portal/messages">
      <View style={[styles.bannerBtn, { borderColor: c.border }]}>
        <MaterialIcons name="mail-outline" size={14} color={c.textPrimary} />
        <Text style={[styles.bannerBtnText, { color: c.textPrimary }]}>Message</Text>
      </View>
    </SendMessageButton>
  );

  return (
    <PortalPage title={backLabel} hideHeading>
      {/* Breadcrumb */}
      <View style={styles.breadcrumb}>
        <Pressable onPress={goBack} accessibilityRole="link">
          <Text style={[styles.breadcrumbLink, { color: c.textSecondary }]}>{backLabel}</Text>
        </Pressable>
        <MaterialIcons name="chevron-right" size={16} color={c.textSecondary} />
        <Text style={[styles.breadcrumbCurrent, { color: c.textPrimary }]} numberOfLines={1}>
          {j.title}
        </Text>
      </View>

      {/* Poster banner */}
      {isEnterprise && companyName ? (
        <View style={[styles.card, styles.bannerCard, Shadows.sm, { backgroundColor: c.surface, borderColor: c.border }]}>
          <LinearGradient
            colors={[c.indigoDark, c.indigo, c.indigoLight]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.bannerStrip}
          />
          <View style={styles.bannerBody}>
            <View style={[styles.bannerLogo, Shadows.lg, { backgroundColor: c.surface, borderColor: c.surface }]}>
              {company?.logo_url ? (
                <Image source={{ uri: company.logo_url }} accessibilityLabel={companyName} contentFit="cover" style={styles.bannerLogoImage} />
              ) : (
                <Text style={[styles.bannerInitial, { color: c.indigo }]}>{companyName.charAt(0)}</Text>
              )}
            </View>
            <Text style={[styles.bannerName, { color: c.textPrimary }]}>{companyName}</Text>
            {company?.industry_focus ? (
              <Text style={[styles.bannerSub, { color: c.textSecondary }]}>{company.industry_focus}</Text>
            ) : null}
            <View style={styles.bannerActions}>
              <Pressable
                onPress={() => router.push(ROUTES.companyProfile(j.customer_id) as Href)}
                style={[styles.bannerBtn, { borderColor: c.border }]}
                accessibilityRole="button"
              >
                <MaterialIcons name="person-outline" size={14} color={c.textPrimary} />
                <Text style={[styles.bannerBtnText, { color: c.textPrimary }]}>Visit Profile</Text>
              </Pressable>
              {company?.website && isValidUrl(company.website) ? (
                <Pressable
                  onPress={() => openUrl(company.website!)}
                  style={[styles.bannerBtn, { borderColor: c.border }]}
                  accessibilityRole="link"
                >
                  <MaterialIcons name="open-in-new" size={14} color={c.textPrimary} />
                  <Text style={[styles.bannerBtnText, { color: c.textPrimary }]}>Website</Text>
                </Pressable>
              ) : null}
              {messageButton}
            </View>
          </View>
        </View>
      ) : null}
      {!isEnterprise ? (
        <View style={[styles.card, styles.bannerCard, Shadows.sm, { backgroundColor: c.surface, borderColor: c.border }]}>
          <LinearGradient
            colors={[c.primary, c.primaryDark]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.bannerStrip}
          />
          <View style={styles.bannerBody}>
            <View style={[styles.bannerLogo, Shadows.lg, { backgroundColor: c.surface, borderColor: c.surface }]}>
              {posterAvatar ? (
                <Image source={{ uri: posterAvatar }} accessibilityLabel={posterName || 'Homeowner'} contentFit="cover" style={styles.bannerLogoImage} />
              ) : (
                <Text style={[styles.bannerInitial, { color: c.primary }]}>{(posterName || 'H').charAt(0)}</Text>
              )}
            </View>
            <Text style={[styles.bannerName, { color: c.textPrimary }]}>{posterName || 'Homeowner'}</Text>
            <Text style={[styles.bannerSub, { color: c.textSecondary }]}>Homeowner</Text>
            <View style={styles.bannerActions}>{messageButton}</View>
          </View>
        </View>
      ) : null}

      {/* Photos */}
      {photos.length > 0 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.photoRow}>
          {photos.map((url, i) => (
            <Pressable key={`${url}-${i}`} onPress={() => openUrl(url)} accessibilityRole="imagebutton" accessibilityLabel={`Site photo ${i + 1}`}>
              <Image source={{ uri: url }} contentFit="cover" cachePolicy="disk" style={[styles.photo, { borderColor: c.border }]} />
            </Pressable>
          ))}
        </ScrollView>
      ) : null}

      {/* Job header */}
      <View>
        <View style={styles.pillRow}>
          <View style={[styles.pill, { backgroundColor: accent + '1A' }]}>
            <Text style={[styles.pillTextBold, { color: accent }]}>
              {isEnterprise ? (isContract ? 'Contract' : 'Project') : 'Home'}
            </Text>
          </View>
          <View style={[styles.pill, { backgroundColor: c.primary + '1A' }]}>
            <Text style={[styles.pillText, { color: c.primary }]}>{formatTradeName(j.trade_category)}</Text>
          </View>
          <UrgencyPill urgency={j.urgency} size="md" />
          <Text style={[styles.posted, { color: c.textSecondary }]}>Posted {relativeTime(j.created_at)}</Text>
          <View style={styles.reportSlot}>
            <ReportButton contentType="job" contentId={j.id} reportedUserId={j.customer_id} size={18} />
          </View>
        </View>
        <Text style={[styles.title, { color: c.textPrimary }]} accessibilityRole="header">
          {j.title}
        </Text>
        {isEnterprise && companyName ? (
          <Pressable
            onPress={() => router.push(ROUTES.companyProfile(j.customer_id) as Href)}
            style={styles.postedByRow}
            accessibilityRole="link"
          >
            <MaterialIcons name="apartment" size={16} color={c.indigo} />
            <Text style={[styles.postedBy, { color: c.indigo }]}>Posted by {companyName}</Text>
          </Pressable>
        ) : null}
        {!isEnterprise && posterName ? (
          <View style={styles.postedByRow}>
            <MaterialIcons name="person-outline" size={16} color={c.primary} />
            <Text style={[styles.postedBy, { color: c.primary }]}>Posted by {posterName}</Text>
          </View>
        ) : null}
      </View>

      {/* When and how — enterprise employment terms (renders nothing if unset) */}
      {isEnterprise ? (
        <WhenAndHowBlock
          employment_type={j.employment_type}
          start_date={j.start_date}
          end_date={j.end_date}
          is_ongoing={j.is_ongoing}
          daily_start_time={j.daily_start_time}
          daily_finish_time={j.daily_finish_time}
          work_days={j.work_days}
          pay_type={j.pay_type}
          pay_rate_min={j.pay_rate_min}
          pay_rate_max={j.pay_rate_max}
        />
      ) : null}

      {/* Key details card */}
      <View style={[styles.card, Shadows.sm, { backgroundColor: c.surface, borderColor: c.border }]}>
        <View style={styles.detailGrid}>
          <Detail label="Location" value={`${j.suburb}, ${j.postcode}`} c={c} />
          {j.budget ? <Detail label="Budget" value={formatBudget(j.budget)} c={c} /> : null}
          {j.workers_needed > 1 ? <Detail label="Workers Needed" value={String(j.workers_needed)} c={c} /> : null}
          {j.day_rate ? <Detail label="Day Rate" value={j.day_rate} c={c} /> : null}
          {j.contract_duration ? <Detail label="Duration" value={j.contract_duration} c={c} /> : null}
          {j.start_date ? <Detail label="Start Date" value={formatLongDate(j.start_date)} c={c} /> : null}
        </View>
      </View>

      {/* Contract roles — per-role breakdown ("multiple jobs") or the trades being onboarded. */}
      {j.posting_kind === 'contract' && j.contract_roles && j.contract_roles.length > 0 ? (
        <View style={[styles.card, Shadows.sm, { backgroundColor: c.surface, borderColor: c.border }]}>
          <Text style={[styles.cardHeading, { color: c.textPrimary }]}>
            {j.contract_type === 'onboarding' ? 'Trades being onboarded' : 'Roles on this contract'}
          </Text>
          <View style={styles.roleList}>
            {j.contract_roles.map((role, i) => (
              <View key={i} style={styles.roleRow}>
                <View style={[styles.pill, { backgroundColor: c.primary + '1A' }]}>
                  <Text style={[styles.pillText, { color: c.primary }]}>{formatTradeName(role.trade)}</Text>
                </View>
                {j.contract_type !== 'onboarding' && role.workers > 0 ? (
                  <Text style={[styles.roleMeta, { color: c.textSecondary }]}>× {role.workers}</Text>
                ) : null}
                {j.contract_type !== 'onboarding' && role.rate ? (
                  <Text style={[styles.roleRate, { color: c.textPrimary }]}>{role.rate}</Text>
                ) : null}
                {j.contract_type !== 'onboarding' && role.startDate ? (
                  <Text style={[styles.roleMeta, { color: c.textSecondary }]}>· from {formatShortDate(role.startDate)}</Text>
                ) : null}
                {j.contract_type !== 'onboarding' && role.duration ? (
                  <Text style={[styles.roleMeta, { color: c.textSecondary }]}>· {role.duration}</Text>
                ) : null}
                {role.notes ? <Text style={[styles.roleMeta, { color: c.textSecondary }]}>— {role.notes}</Text> : null}
              </View>
            ))}
          </View>
        </View>
      ) : null}

      {/* Description */}
      <View style={[styles.card, Shadows.sm, { backgroundColor: c.surface, borderColor: c.border }]}>
        <Text style={[styles.cardHeading, { color: c.textPrimary }]}>Job Description</Text>
        <Text style={[styles.bodyText, { color: c.textSecondary }]}>{j.description}</Text>
      </View>

      {/* Capability requirements (renders nothing if none set) */}
      {isEnterprise ? <RequirementsBlock match={match} /> : null}

      {/* Site requirements */}
      {j.site_requirements ? (
        <View style={[styles.card, Shadows.sm, { backgroundColor: c.surface, borderColor: c.border }]}>
          <Text style={[styles.cardHeading, { color: c.textPrimary }]}>Site Requirements</Text>
          <Text style={[styles.bodyText, { color: c.textSecondary }]}>{j.site_requirements}</Text>
        </View>
      ) : null}

      {/* Documents */}
      {documents.length > 0 ? (
        <View style={[styles.card, Shadows.sm, { backgroundColor: c.surface, borderColor: c.border }]}>
          <Text style={[styles.cardHeading, { color: c.textPrimary }]}>Documents & Plans ({documents.length})</Text>
          <View style={styles.docList}>
            {documents.map((url, i) => (
              <Pressable
                key={`${url}-${i}`}
                onPress={() => openUrl(url)}
                style={[styles.docRow, { backgroundColor: c.canvas, borderColor: c.border }]}
                accessibilityRole="link"
              >
                <MaterialIcons name="description" size={20} color={accent} />
                <Text style={[styles.docText, { color: accent }]}>Document {i + 1}</Text>
                <MaterialIcons name="open-in-new" size={16} color={c.textSecondary + '66'} style={styles.docTrail} />
              </Pressable>
            ))}
          </View>
        </View>
      ) : null}

      {/* Apply card */}
      <View style={[styles.card, Shadows.sm, { backgroundColor: c.surface, borderColor: c.border }]}>
        {existingApp ? (
          <View style={styles.appliedWrap}>
            <View style={styles.appliedRow}>
              <MaterialIcons name="check-circle-outline" size={24} color={c.success} />
              <Text style={[styles.appliedTitle, { color: c.textPrimary }]}>
                {applied ? 'Applied!' : 'Already applied'}
              </Text>
            </View>
            <View style={styles.appliedRow}>
              <Text style={[styles.statusLabel, { color: c.textSecondary }]}>Status:</Text>
              <ApplicationStatusBadge status={existingApp.status} size="md" />
            </View>
            {existingApp.status !== 'rejected' ? (
              <Pressable
                onPress={() => setShowWithdrawConfirm(true)}
                style={styles.withdrawBtn}
                hitSlop={6}
                accessibilityRole="button"
                accessibilityLabel="Withdraw application"
              >
                <MaterialIcons name="delete-outline" size={20} color={c.error + '99'} />
              </Pressable>
            ) : null}
          </View>
        ) : (
          <View>
            <Text style={[styles.applyHeading, { color: c.textPrimary }]}>Apply for this job</Text>
            <Text style={[styles.label, { color: c.textSecondary }]}>Message (optional)</Text>
            <TextInput
              value={message}
              onChangeText={setMessage}
              placeholder="Introduce yourself, describe relevant experience, and provide a rough quote if possible..."
              placeholderTextColor={c.textSecondary + '80'}
              multiline
              numberOfLines={5}
              textAlignVertical="top"
              style={[styles.textarea, { backgroundColor: c.surface, borderColor: c.border, color: c.textPrimary }]}
              accessibilityLabel="Message (optional)"
            />

            {/* Annex A.4 — Builder lead-accept disclaimer */}
            <View style={[styles.disclaimer, { backgroundColor: amber.bg, borderColor: amber.border }]}>
              <Text style={[styles.disclaimerText, { color: amber.text }]}>
                You&apos;re accepting a lead, not a job. Any work, contract, and payment are between you
                and the customer. You&apos;re responsible for your own licensing, contracts, and
                compliance with the <Text style={styles.italic}>Home Building Act</Text> and all
                applicable laws. By tapping Submit, you confirm you can lawfully do this work.
              </Text>
            </View>

            {/* Capability match warning — renders nothing on jobs without requirements. */}
            {isEnterprise && !match.hasNoRequirements ? (
              <View style={styles.matchRow}>
                <MatchWarning match={match} />
              </View>
            ) : null}

            <Pressable
              onPress={handleApply}
              disabled={applying}
              style={[styles.submitBtn, { backgroundColor: accent, opacity: applying ? 0.5 : 1 }]}
              accessibilityRole="button"
              accessibilityState={{ disabled: applying, busy: applying }}
            >
              {applying ? (
                <View style={styles.busyRow}>
                  <ActivityIndicator size="small" color="#fff" />
                  <Text style={styles.submitText}>Submitting...</Text>
                </View>
              ) : (
                <Text style={styles.submitText}>Submit Application</Text>
              )}
            </Pressable>
          </View>
        )}
      </View>

      {/* Back link */}
      <Pressable onPress={goBack} style={styles.backLink} accessibilityRole="link">
        <MaterialIcons name="arrow-back" size={16} color={c.primary} />
        <Text style={[styles.backLinkText, { color: c.primary }]}>Back to jobs</Text>
      </Pressable>

      <ConfirmModal
        visible={showWithdrawConfirm}
        icon={<MaterialIcons name="warning-amber" size={24} color={c.error} />}
        iconBg={c.error + '1A'}
        title="Withdraw application?"
        body={`This will remove your application from “${j.title}”. You can re-apply later.`}
        confirmLabel="Withdraw"
        confirmBusyLabel="Withdrawing..."
        busy={withdrawing}
        destructive
        onCancel={() => {
          if (!withdrawing) setShowWithdrawConfirm(false);
        }}
        onConfirm={handleWithdraw}
      />
    </PortalPage>
  );
}

function Detail({ label, value, c }: { label: string; value: string; c: (typeof Colors)['light'] }) {
  return (
    <View style={styles.detailCell}>
      <Text style={[styles.detailLabel, { color: c.textSecondary }]}>{label}</Text>
      <Text style={[styles.detailValue, { color: c.textPrimary }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: Radius.xl, borderWidth: 1, padding: Spacing['2xl'] },
  centerCard: { alignItems: 'center', paddingVertical: Spacing['5xl'] },
  centerIcon: { marginBottom: Spacing.lg },
  centerTitle: { fontSize: 18, lineHeight: 28, fontFamily: FontFamily.bodySemiBold, fontWeight: '600', textAlign: 'center', marginBottom: Spacing.sm },
  centerBody: { fontSize: 16, lineHeight: 24, fontFamily: FontFamily.body, textAlign: 'center', marginBottom: Spacing.lg },
  primaryPill: { borderRadius: Radius.full, paddingHorizontal: Spacing['2xl'], paddingVertical: 10, minHeight: 44, justifyContent: 'center' },
  primaryPillText: { color: '#fff', fontSize: 14, fontFamily: FontFamily.bodySemiBold, fontWeight: '600' },
  breadcrumb: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  breadcrumbLink: { fontSize: 14, fontFamily: FontFamily.body },
  breadcrumbCurrent: { flex: 1, fontSize: 14, fontFamily: FontFamily.bodyMedium, fontWeight: '500' },
  bannerCard: { padding: 0, overflow: 'hidden' },
  bannerStrip: { height: 56 },
  bannerBody: { paddingHorizontal: Spacing.xl, paddingBottom: Spacing.xl, marginTop: -24 },
  bannerLogo: { width: 64, height: 64, borderRadius: Radius.lg, borderWidth: 4, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  bannerLogoImage: { width: 56, height: 56 },
  bannerInitial: { fontSize: 20, fontFamily: FontFamily.bodyBold, fontWeight: '700' },
  bannerName: { marginTop: Spacing.sm, fontSize: 18, lineHeight: 28, fontFamily: FontFamily.bodyBold, fontWeight: '700' },
  bannerSub: { fontSize: 12, lineHeight: 16, fontFamily: FontFamily.body },
  bannerActions: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginTop: Spacing.md },
  bannerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.lg,
    paddingVertical: 6,
    minHeight: 36,
  },
  bannerBtnText: { fontSize: 12, fontFamily: FontFamily.bodyBold, fontWeight: '700' },
  photoRow: { gap: Spacing.md, paddingBottom: 4 },
  photo: { width: 224, height: 160, borderRadius: Radius.xl, borderWidth: 1 },
  pillRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.sm },
  pill: { borderRadius: Radius.full, paddingHorizontal: 10, paddingVertical: 2 },
  pillText: { fontSize: 12, lineHeight: 16, fontFamily: FontFamily.bodySemiBold, fontWeight: '600' },
  pillTextBold: { fontSize: 12, lineHeight: 16, fontFamily: FontFamily.bodyBold, fontWeight: '700' },
  posted: { fontSize: 14, fontFamily: FontFamily.body },
  reportSlot: { marginLeft: 'auto' },
  title: { fontSize: 24, lineHeight: 32, fontFamily: FontFamily.bodyBold, fontWeight: '700' },
  postedByRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: Spacing.sm },
  postedBy: { fontSize: 14, fontFamily: FontFamily.body },
  detailGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.lg },
  detailCell: { width: '45%', flexGrow: 1 },
  detailLabel: { fontSize: 12, fontFamily: FontFamily.body, marginBottom: 2 },
  detailValue: { fontSize: 14, fontFamily: FontFamily.bodySemiBold, fontWeight: '600' },
  cardHeading: { fontSize: 14, fontFamily: FontFamily.bodyBold, fontWeight: '700', marginBottom: Spacing.md },
  roleList: { gap: Spacing.sm },
  roleRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: Spacing.sm },
  roleMeta: { fontSize: 14, fontFamily: FontFamily.body },
  roleRate: { fontSize: 14, fontFamily: FontFamily.bodyMedium, fontWeight: '500' },
  bodyText: { fontSize: 14, lineHeight: 22, fontFamily: FontFamily.body },
  docList: { gap: Spacing.sm },
  docRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    borderRadius: Radius.lg,
    borderWidth: 1,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  docText: { fontSize: 14, fontFamily: FontFamily.bodyMedium, fontWeight: '500' },
  docTrail: { marginLeft: 'auto' },
  appliedWrap: { alignItems: 'center', paddingVertical: Spacing.lg, gap: Spacing.sm, position: 'relative' },
  appliedRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  appliedTitle: { fontSize: 18, lineHeight: 28, fontFamily: FontFamily.bodySemiBold, fontWeight: '600' },
  statusLabel: { fontSize: 14, fontFamily: FontFamily.body },
  withdrawBtn: { position: 'absolute', top: -8, right: -8, width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  applyHeading: { fontSize: 18, lineHeight: 28, fontFamily: FontFamily.bodyBold, fontWeight: '700', marginBottom: Spacing.lg },
  label: { fontSize: 14, fontFamily: FontFamily.bodyMedium, fontWeight: '500', marginBottom: 6 },
  textarea: {
    minHeight: 140,
    borderWidth: 1,
    borderRadius: Radius.xl,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    fontSize: 14,
    lineHeight: 20,
    fontFamily: FontFamily.body,
  },
  disclaimer: { marginTop: Spacing.lg, borderRadius: Radius.lg, borderWidth: 1, padding: Spacing.md },
  disclaimerText: { fontSize: 12, lineHeight: 18, fontFamily: FontFamily.body },
  italic: { fontStyle: 'italic' },
  matchRow: { marginTop: Spacing.md },
  submitBtn: { marginTop: Spacing.lg, borderRadius: Radius.full, paddingVertical: 12, minHeight: 48, alignItems: 'center', justifyContent: 'center' },
  submitText: { color: '#fff', fontSize: 14, fontFamily: FontFamily.bodyBold, fontWeight: '700' },
  busyRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  backLink: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, alignSelf: 'flex-start' },
  backLinkText: { fontSize: 14, fontFamily: FontFamily.bodyMedium, fontWeight: '500' },
});
