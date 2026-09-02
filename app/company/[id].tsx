/**
 * /company/[id] — ~/bldesy-web/app/company/[id]/page.tsx: the public company
 * (enterprise) profile against `public_enterprise_profiles`. Header card
 * (cover, logo, name + Verified / Enterprise pills, licensed states, industry
 * focus, quick stats, Message / Website / Contact / Report), certifications,
 * About, Specialities, Past Projects, Open Positions, Service Regions, Trades
 * They Hire, Credentials (+ disclaimer), Safety Record, and the sticky "View N
 * Open Positions" CTA. Contact PII is nulled for signed-out visitors.
 */
import { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter, type Href } from 'expo-router';
import { VideoView, useVideoPlayer } from 'expo-video';
import * as WebBrowser from 'expo-web-browser';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';

import { ContactPopover } from '@/components/builder/contact-popover';
import { CredentialBadges } from '@/components/builder/credential-badges';
import { CredentialsDisclaimer } from '@/components/builder/credentials-disclaimer';
import { MessageButton } from '@/components/builder/message-button';
import { isAllowedStorageMediaUrl, safeWebsiteUrl } from '@/components/builder/profile-helpers';
import { AppShell } from '@/components/layout';
import { ReportButton } from '@/components/report-button';
import { Button, Skeleton } from '@/components/ui';
import { Colors, FontFamily, Radius, Shadows, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { establishedLabel, getCompanyById, getCompanyOpenJobs, openPositionsCta, type CompanyJob, type CompanyProfile } from '@/lib/data/discovery-company';
import { ROUTES } from '@/lib/routes';
import { formatTradeName } from '@/lib/web/trades';
import type { CredentialsVerified, EnterprisePastProject } from '@/types/database';

type ScreenState = { status: 'loading' } | { status: 'not_found' } | { status: 'ready'; company: CompanyProfile; jobs: CompanyJob[] };

/** A past-project video — poster (or a dark tile) until the visitor presses play. */
function PastProjectVideo({ url, poster }: { url: string; poster: string | null }) {
  const [playing, setPlaying] = useState(false);
  if (!playing) {
    return (
      <Pressable accessibilityRole="button" accessibilityLabel="Play video" onPress={() => setPlaying(true)} style={styles.mediaTile}>
        {poster ? <Image source={{ uri: poster }} style={StyleSheet.absoluteFill} contentFit="cover" cachePolicy="memory-disk" /> : <View style={[StyleSheet.absoluteFill, styles.videoDark]} />}
        <View style={styles.playBadge}>
          <Ionicons name="play" size={18} color="#fff" style={{ marginLeft: 2 }} />
        </View>
      </Pressable>
    );
  }
  return <InlineVideo url={url} />;
}

function InlineVideo({ url }: { url: string }) {
  const player = useVideoPlayer(url, (p) => {
    p.play();
  });
  return <VideoView player={player} style={styles.mediaTile} contentFit="cover" nativeControls allowsFullscreen />;
}

export default function CompanyProfileScreen() {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [state, setState] = useState<ScreenState>({ status: 'loading' });
  const scrollRef = useRef<ScrollView>(null);
  const jobsY = useRef(0);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    setState({ status: 'loading' });
    (async () => {
      const company = await getCompanyById(id);
      if (cancelled) return;
      if (!company) {
        setState({ status: 'not_found' });
        return;
      }
      const jobs = await getCompanyOpenJobs(id);
      if (cancelled) return;
      setState({ status: 'ready', company, jobs });
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (state.status === 'loading') {
    return (
      <AppShell showBack>
        <View style={styles.skeleton}>
          <Skeleton variant="image" style={{ height: 120 }} />
          <Skeleton variant="text" style={{ width: '60%', height: 24 }} />
          <Skeleton variant="text" style={{ width: '40%' }} />
          <Skeleton variant="card" />
        </View>
      </AppShell>
    );
  }

  if (state.status === 'not_found') {
    return (
      <AppShell showBack>
        <View style={styles.notFound}>
          <Text accessibilityRole="header" style={[styles.notFoundTitle, { color: c.textPrimary }]}>
            Company Not Found
          </Text>
          <Button variant="primary" onPress={() => router.back()}>
            Go back
          </Button>
        </View>
      </AppShell>
    );
  }

  const { company: p, jobs: activeJobs } = state;
  const pastProjects = (p.past_projects ?? []) as EnterprisePastProject[];
  const certifications = (p.certifications ?? []) as string[];
  const specialties = (p.specialties ?? []) as string[];
  const serviceRegions = (p.service_regions ?? []) as string[];
  const tradesNeeded = (p.trades_needed ?? []) as string[];
  const website = safeWebsiteUrl(p.website);
  const established = establishedLabel(p.years_established);

  const check = (ok: boolean | null) =>
    ok ? <Ionicons name="checkmark-circle-outline" size={20} color={c.success} /> : <View style={[styles.emptyCircle, { borderColor: c.border }]} />;

  const section = (title: string, children: React.ReactNode, key?: string) => (
    <View key={key ?? title} style={[styles.section, Shadows.sm, { backgroundColor: c.surface, borderColor: c.border }]}>
      <Text accessibilityRole="header" style={[styles.sectionTitle, { color: c.textPrimary }]}>
        {title}
      </Text>
      {children}
    </View>
  );

  return (
    <AppShell showBack>
      <ScrollView
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scroll, { paddingBottom: (activeJobs.length > 0 ? 88 : 0) + insets.bottom + Spacing['3xl'] }]}
      >
        {/* ── Header card ──────────────────────────────────────────── */}
        <View style={[styles.headerCard, Shadows.sm, { backgroundColor: c.surface, borderColor: c.border }]}>
          <View style={styles.cover}>
            {p.cover_photo_url ? (
              <>
                <Image source={{ uri: p.cover_photo_url }} style={StyleSheet.absoluteFill} contentFit="cover" cachePolicy="memory-disk" />
                <LinearGradient colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.3)']} style={StyleSheet.absoluteFill} />
              </>
            ) : (
              <LinearGradient colors={[c.indigoDark + 'CC', c.indigoDark, c.indigo]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
            )}
          </View>

          <View style={styles.headerBody}>
            <View style={[styles.logo, Shadows.lg, { backgroundColor: c.surface, borderColor: c.surface }]}>
              {p.logo_url ? (
                <Image source={{ uri: p.logo_url }} style={StyleSheet.absoluteFill} contentFit="cover" cachePolicy="memory-disk" accessibilityLabel={p.company_name} />
              ) : (
                <Text style={[styles.logoLetter, { color: c.indigo }]}>{p.company_name.charAt(0)}</Text>
              )}
            </View>

            <View style={styles.titleRow}>
              <Text accessibilityRole="header" style={[styles.h1, { color: c.textPrimary }]}>
                {p.company_name}
              </Text>
              {p.verified ? (
                <View style={[styles.indigoPill, { backgroundColor: c.indigo + '1A' }]}>
                  <Ionicons name="checkmark-circle-outline" size={14} color={c.indigo} />
                  <Text style={[styles.indigoPillText, { color: c.indigo }]}>Verified</Text>
                </View>
              ) : null}
              <View style={[styles.indigoPill, { backgroundColor: c.indigo + '1A' }]}>
                <Text style={[styles.indigoPillText, { color: c.indigo }]}>Enterprise</Text>
              </View>
              {p.licensed_states && p.licensed_states.length > 0 ? (
                <Text style={[styles.licensedIn, { color: c.indigo }]}>Licensed in {p.licensed_states.join(' · ')}</Text>
              ) : null}
            </View>
            {p.industry_focus ? <Text style={[styles.focus, { color: c.textSecondary }]}>{p.industry_focus}</Text> : null}

            {/* Quick stats bar */}
            <View style={styles.stats}>
              {p.suburb ? (
                <View style={styles.inline}>
                  <Ionicons name="location-outline" size={16} color={c.textSecondary + '99'} />
                  <Text style={[styles.stat, { color: c.textSecondary }]}>
                    {p.suburb}
                    {p.postcode ? `, ${p.postcode}` : ''}
                  </Text>
                </View>
              ) : null}
              {established ? <Text style={[styles.stat, { color: c.textSecondary }]}>{established}</Text> : null}
              {p.team_size ? <Text style={[styles.stat, { color: c.textSecondary }]}>{p.team_size} team members</Text> : null}
              {p.active_projects_count != null && p.active_projects_count > 0 ? (
                <Text style={[styles.stat, { color: c.textSecondary }]}>{p.active_projects_count} active projects</Text>
              ) : null}
            </View>

            {/* Action buttons */}
            <View style={styles.actions}>
              <MessageButton recipientId={p.user_id} variant="ghost" label="Message" style={styles.actionChip} />
              {website ? (
                <Pressable
                  accessibilityRole="link"
                  onPress={() => WebBrowser.openBrowserAsync(website).catch(() => {})}
                  style={({ pressed }) => [styles.chip, { borderColor: pressed ? c.indigo + '4D' : c.border, backgroundColor: c.surface }]}
                >
                  <Ionicons name="open-outline" size={16} color={c.textPrimary} />
                  <Text style={[styles.chipText, { color: c.textPrimary }]}>Website</Text>
                </Pressable>
              ) : null}
              <ContactPopover contactName={p.contact_name} contactPhone={p.contact_phone} contactEmail={p.contact_email} />
              <View style={[styles.chip, { borderColor: c.border, backgroundColor: c.surface }]}>
                <ReportButton variant="label" contentType="enterprise_profile" contentId={p.user_id} reportedUserId={p.user_id} size={16} />
              </View>
            </View>
          </View>
        </View>

        {/* ── Certifications pills ─────────────────────────────────── */}
        {certifications.length > 0 ? (
          <View style={styles.certs}>
            {certifications.map((cert) => (
              <View key={cert} style={[styles.certPill, { borderColor: c.indigo + '33', backgroundColor: c.indigo + '0D' }]}>
                <Ionicons name="checkmark" size={12} color={c.indigo} />
                <Text style={[styles.certText, { color: c.indigo }]}>{cert}</Text>
              </View>
            ))}
          </View>
        ) : null}

        <View style={styles.sections}>
          {p.bio ? section(`About ${p.company_name}`, <Text style={[styles.body, { color: c.textSecondary }]}>{p.bio}</Text>) : null}

          {specialties.length > 0
            ? section(
                'Specialities',
                <View style={styles.chipWrap}>
                  {specialties.map((s) => (
                    <View key={s} style={[styles.specPill, { backgroundColor: c.primary + '1A' }]}>
                      <Text style={[styles.specPillText, { color: c.primary }]}>{s}</Text>
                    </View>
                  ))}
                </View>,
              )
            : null}

          {pastProjects.length > 0
            ? section(
                'Past Projects',
                <View style={styles.projects}>
                  {pastProjects.map((proj, i) => {
                    // Owner-writable JSONB — only our storage hosts may reach a video source.
                    const videos = (proj.videos ?? []).filter((v) => v && isAllowedStorageMediaUrl(v.url));
                    const photos = proj.photo_urls ?? [];
                    return (
                      <View key={`${proj.title}-${i}`} style={[styles.project, { borderColor: c.border, backgroundColor: c.canvas }]}>
                        {videos.length > 0 || photos.length > 0 ? (
                          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.mediaRow}>
                            {videos.map((video, j) => (
                              <PastProjectVideo key={`v-${j}`} url={video.url} poster={isAllowedStorageMediaUrl(video.poster) ? video.poster : null} />
                            ))}
                            {photos.map((url, j) => (
                              <Image key={`p-${j}`} source={{ uri: url }} style={styles.mediaTile} contentFit="cover" cachePolicy="memory-disk" accessibilityLabel={proj.title} />
                            ))}
                          </ScrollView>
                        ) : null}
                        <Text style={[styles.projectTitle, { color: c.textPrimary }]}>{proj.title}</Text>
                        {proj.description ? <Text style={[styles.projectDesc, { color: c.textSecondary }]}>{proj.description}</Text> : null}
                        <View style={styles.projectMeta}>
                          {proj.location ? <Text style={[styles.metaText, { color: c.textSecondary }]}>{proj.location}</Text> : null}
                          {proj.value_range ? <Text style={[styles.metaText, { color: c.textSecondary }]}>{proj.value_range}</Text> : null}
                          {proj.year_completed ? <Text style={[styles.metaText, { color: c.textSecondary }]}>{proj.year_completed}</Text> : null}
                        </View>
                        {proj.trades_involved?.length > 0 ? (
                          <View style={styles.chipWrap}>
                            {proj.trades_involved.map((t) => (
                              <View key={t} style={[styles.tradePill, { backgroundColor: c.indigo + '0D' }]}>
                                <Text style={[styles.tradePillText, { color: c.indigo }]}>{formatTradeName(t)}</Text>
                              </View>
                            ))}
                          </View>
                        ) : null}
                      </View>
                    );
                  })}
                </View>,
              )
            : null}

          {/* Open Jobs */}
          <View
            onLayout={(e) => {
              jobsY.current = e.nativeEvent.layout.y;
            }}
            style={[styles.section, Shadows.sm, { backgroundColor: c.surface, borderColor: c.border, padding: 0 }]}
          >
            <View style={[styles.jobsHead, { borderBottomColor: c.border }]}>
              <Text accessibilityRole="header" style={[styles.sectionTitle, { color: c.textPrimary, marginBottom: 0 }]}>
                Open Positions ({activeJobs.length})
              </Text>
            </View>
            {activeJobs.length === 0 ? (
              <Text style={[styles.noJobs, { color: c.textSecondary }]}>No open positions right now.</Text>
            ) : (
              activeJobs.map((job, i) => (
                <View key={job.id} style={[styles.job, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.border }]}>
                  <View style={styles.flex1}>
                    <Text style={[styles.jobTitle, { color: c.textPrimary }]}>{job.title}</Text>
                    <View style={styles.jobMeta}>
                      <View style={[styles.tradePill, { backgroundColor: c.indigo + '1A' }]}>
                        <Text style={[styles.tradePillText, styles.tradePillStrong, { color: c.indigo }]}>{formatTradeName(job.trade_category)}</Text>
                      </View>
                      <Text style={[styles.metaText, { color: c.textSecondary }]}>
                        {job.suburb}, {job.postcode}
                      </Text>
                      {job.workers_needed > 1 ? <Text style={[styles.metaText, { color: c.textSecondary }]}>{job.workers_needed} workers</Text> : null}
                      {job.day_rate ? <Text style={[styles.metaText, { color: c.textSecondary }]}>{job.day_rate}</Text> : null}
                      {job.contract_duration ? <Text style={[styles.metaText, { color: c.textSecondary }]}>{job.contract_duration}</Text> : null}
                    </View>
                  </View>
                  <Pressable
                    accessibilityRole="link"
                    onPress={() => router.push(ROUTES.portalJob(job.id) as Href)}
                    style={({ pressed }) => [styles.applyBtn, { backgroundColor: c.indigo, opacity: pressed ? 0.9 : 1 }]}
                  >
                    <Text style={styles.applyText}>Apply</Text>
                  </Pressable>
                </View>
              ))
            )}
          </View>

          {serviceRegions.length > 0
            ? section(
                'Service Regions',
                <View style={styles.chipWrap}>
                  {serviceRegions.map((r) => (
                    <View key={r} style={[styles.regionPill, { backgroundColor: c.canvas }]}>
                      <Ionicons name="location-outline" size={12} color={c.textSecondary} />
                      <Text style={[styles.regionText, { color: c.textSecondary }]}>{r}</Text>
                    </View>
                  ))}
                </View>,
              )
            : null}

          {tradesNeeded.length > 0
            ? section(
                'Trades They Hire',
                <View style={styles.chipWrap}>
                  {tradesNeeded.map((slug) => (
                    <View key={slug} style={[styles.tradePill, { backgroundColor: c.indigo + '1A' }]}>
                      <Text style={[styles.tradePillText, styles.tradePillStrong, { color: c.indigo }]}>{formatTradeName(slug)}</Text>
                    </View>
                  ))}
                </View>,
              )
            : null}

          {section(
            'Credentials',
            <View style={styles.credentials}>
              <CredentialBadges credentialsVerified={p.credentials_verified as CredentialsVerified | null} variant="list" />
              {!p.credentials_verified ? (
                <View style={styles.checks}>
                  <View style={styles.checkRow}>
                    {check(p.has_abn)}
                    <Text style={[styles.checkText, { color: c.textSecondary }]}>ABN Verified</Text>
                  </View>
                  <View style={styles.checkRow}>
                    {check(p.has_licence)}
                    <Text style={[styles.checkText, { color: c.textSecondary }]}>Builder&apos;s Licence</Text>
                  </View>
                  <View style={styles.checkRow}>
                    {check(p.has_insurance)}
                    <Text style={[styles.checkText, { color: c.textSecondary }]}>Insurance</Text>
                  </View>
                </View>
              ) : null}
              <View style={styles.checkRow}>
                {check(p.verified)}
                <Text style={[styles.checkText, { color: c.textSecondary }]}>BLDESY Verified</Text>
              </View>
              <View style={[styles.disclaimer, { borderTopColor: c.border }]}>
                <CredentialsDisclaimer />
              </View>
            </View>,
          )}

          {p.safety_record ? section('Safety Record', <Text style={[styles.body, { color: c.textSecondary }]}>{p.safety_record}</Text>) : null}
        </View>
      </ScrollView>

      {/* ── Sticky bottom CTA ────────────────────────────────────── */}
      {activeJobs.length > 0 ? (
        <View style={[styles.sticky, { backgroundColor: c.surface + 'F2', borderTopColor: c.border, paddingBottom: Math.max(Spacing.md, insets.bottom) }]}>
          <Pressable
            accessibilityRole="button"
            onPress={() => scrollRef.current?.scrollTo({ y: Math.max(0, jobsY.current - Spacing.lg), animated: true })}
            style={({ pressed }) => [styles.stickyBtn, { backgroundColor: c.indigo, opacity: pressed ? 0.9 : 1 }]}
          >
            <Text style={styles.stickyText}>{openPositionsCta(activeJobs.length)}</Text>
          </Pressable>
        </View>
      ) : null}
    </AppShell>
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing['3xl'],
  },
  skeleton: {
    padding: Spacing.lg,
    gap: Spacing.lg,
  },
  notFound: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.lg,
    padding: Spacing['2xl'],
  },
  notFoundTitle: {
    fontFamily: FontFamily.display,
    fontSize: 24,
  },
  headerCard: {
    borderRadius: Radius.xl,
    borderWidth: 1,
    overflow: 'hidden',
  },
  cover: {
    aspectRatio: 3,
    width: '100%',
  },
  headerBody: {
    paddingHorizontal: Spacing['2xl'],
    paddingBottom: Spacing['2xl'],
    marginTop: -48,
  },
  logo: {
    width: 96,
    height: 96,
    borderRadius: Radius.xl,
    borderWidth: 4,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  logoLetter: {
    fontFamily: FontFamily.bodyBold,
    fontWeight: '700',
    fontSize: 30,
  },
  titleRow: {
    marginTop: Spacing.lg,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  h1: {
    fontFamily: FontFamily.bodyBold,
    fontWeight: '700',
    fontSize: 24,
    lineHeight: 30,
  },
  indigoPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: Radius.full,
    paddingHorizontal: 10,
    paddingVertical: 2,
  },
  indigoPillText: {
    fontFamily: FontFamily.bodyBold,
    fontWeight: '700',
    fontSize: 12,
  },
  licensedIn: {
    fontFamily: FontFamily.bodySemiBold,
    fontWeight: '600',
    fontSize: 12,
  },
  focus: {
    marginTop: 4,
    fontFamily: FontFamily.body,
    fontSize: 14,
  },
  stats: {
    marginTop: Spacing.lg,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.lg,
  },
  inline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  stat: {
    fontFamily: FontFamily.body,
    fontSize: 14,
  },
  actions: {
    marginTop: Spacing.lg,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  actionChip: {
    height: 40,
    borderRadius: Radius.full,
  },
  chip: {
    height: 40,
    borderWidth: 1,
    borderRadius: Radius.full,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: Spacing.lg,
  },
  chipText: {
    fontFamily: FontFamily.bodySemiBold,
    fontWeight: '600',
    fontSize: 14,
  },
  certs: {
    marginTop: Spacing.lg,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  certPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: 4,
  },
  certText: {
    fontFamily: FontFamily.bodySemiBold,
    fontWeight: '600',
    fontSize: 12,
  },
  sections: {
    marginTop: Spacing['2xl'],
    gap: Spacing['2xl'],
  },
  section: {
    borderRadius: Radius.xl,
    borderWidth: 1,
    padding: Spacing['2xl'],
  },
  sectionTitle: {
    fontFamily: FontFamily.bodyBold,
    fontWeight: '700',
    fontSize: 16,
    marginBottom: Spacing.md,
  },
  body: {
    fontFamily: FontFamily.body,
    fontSize: 14,
    lineHeight: 22,
  },
  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  specPill: {
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
  },
  specPillText: {
    fontFamily: FontFamily.bodySemiBold,
    fontWeight: '600',
    fontSize: 12,
  },
  projects: {
    gap: Spacing.xl,
  },
  project: {
    borderWidth: 1,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    gap: Spacing.sm,
  },
  mediaRow: {
    gap: Spacing.sm,
    paddingBottom: Spacing.xs,
  },
  mediaTile: {
    width: 192,
    height: 128,
    borderRadius: Radius.md,
    overflow: 'hidden',
    backgroundColor: '#000',
  },
  videoDark: {
    backgroundColor: '#000',
  },
  playBadge: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginTop: -20,
    marginLeft: -20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  projectTitle: {
    fontFamily: FontFamily.bodyBold,
    fontWeight: '700',
    fontSize: 14,
  },
  projectDesc: {
    fontFamily: FontFamily.body,
    fontSize: 12,
    lineHeight: 18,
  },
  projectMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  metaText: {
    fontFamily: FontFamily.body,
    fontSize: 12,
  },
  tradePill: {
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
  },
  tradePillText: {
    fontFamily: FontFamily.bodyMedium,
    fontWeight: '500',
    fontSize: 10,
  },
  tradePillStrong: {
    fontFamily: FontFamily.bodySemiBold,
    fontWeight: '600',
    fontSize: 12,
  },
  jobsHead: {
    paddingHorizontal: Spacing['2xl'],
    paddingVertical: Spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  noJobs: {
    padding: Spacing['3xl'],
    textAlign: 'center',
    fontFamily: FontFamily.body,
    fontSize: 14,
  },
  job: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: Spacing.md,
    paddingHorizontal: Spacing['2xl'],
    paddingVertical: Spacing.lg,
  },
  flex1: {
    flex: 1,
    minWidth: 0,
  },
  jobTitle: {
    fontFamily: FontFamily.bodyBold,
    fontWeight: '700',
    fontSize: 14,
  },
  jobMeta: {
    marginTop: 6,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  applyBtn: {
    minHeight: 36,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  applyText: {
    color: '#fff',
    fontFamily: FontFamily.bodyBold,
    fontWeight: '700',
    fontSize: 12,
  },
  regionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: Radius.full,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  regionText: {
    fontFamily: FontFamily.bodyMedium,
    fontWeight: '500',
    fontSize: 12,
  },
  credentials: {
    gap: 10,
  },
  checks: {
    gap: 10,
  },
  checkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  emptyCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
  },
  checkText: {
    fontFamily: FontFamily.body,
    fontSize: 14,
  },
  disclaimer: {
    marginTop: Spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: Spacing.md,
  },
  sticky: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    padding: Spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  stickyBtn: {
    height: 48,
    borderRadius: Radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stickyText: {
    color: '#fff',
    fontFamily: FontFamily.bodyBold,
    fontWeight: '700',
    fontSize: 14,
  },
});
