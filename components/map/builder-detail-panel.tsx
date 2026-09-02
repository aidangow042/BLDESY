/**
 * BuilderDetailPanel — ~/bldesy-web/components/map/builder-detail-panel.tsx
 * inside the results sheet: header (back + name), avatar + trade pill +
 * availability, the stats row (BLDESY score / responds), verification badges,
 * location + "Show service area on map", specialty pills, About, Projects
 * (grouped, before/after, "View all N photos"), Team, FAQ, the copy-to-
 * clipboard Call / Email row, and the sticky "Visit Full Profile" bar. The
 * extra profile fields load from the public view via `getBuilderById`.
 */
import { useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { Image } from 'expo-image';
import { useRouter, type Href } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';

import { MessageButton } from '@/components/builder/message-button';
import { initials, str } from '@/components/builder/profile-helpers';
import { specialtyPills } from '@/components/map/map-logic';
import { availabilityTone } from '@/components/search/availability-tone';
import { Skeleton } from '@/components/ui';
import { Colors, FontFamily, Radius, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { getBuilderById } from '@/lib/data/builders';
import type { MapBuilder } from '@/lib/data/map';
import { ROUTES } from '@/lib/routes';
import { avatarFallbackUrl } from '@/lib/web/avatar';
import { formatDeclaredResponseTime } from '@/lib/web/response-time';
import { getTradeColour } from '@/lib/web/trade-colours';
import type { BuilderWithProfile, FaqItem, ProjectItem, TeamMember } from '@/types';

interface BuilderDetailPanelProps {
  builder: MapBuilder;
  onClose: () => void;
  showRadius: boolean;
  onToggleRadius: (show: boolean) => void;
  activeSpecialtySlug: string | null;
}

interface Photo {
  url: string;
  title: string;
}

function collectPhotos(projects: ProjectItem[]): Photo[] {
  const all: Photo[] = [];
  for (const p of projects) {
    const title = str(p.title);
    for (const img of p.images ?? []) if (img) all.push({ url: img, title });
    if (p.before_image) all.push({ url: p.before_image, title: `${title} (before)` });
    if (p.after_image) all.push({ url: p.after_image, title: `${title} (after)` });
  }
  return all;
}

export function BuilderDetailPanel({ builder: b, onClose, showRadius, onToggleRadius, activeSpecialtySlug }: BuilderDetailPanelProps) {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];
  const router = useRouter();
  const [extra, setExtra] = useState<BuilderWithProfile | null>(null);
  const [loadingExtra, setLoadingExtra] = useState(true);
  const [copied, setCopied] = useState<'phone' | 'email' | null>(null);
  const [showAllPhotos, setShowAllPhotos] = useState(false);
  const [lightbox, setLightbox] = useState<number | null>(null);
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);

  const colour = getTradeColour(b.trade_category);
  const avail = availabilityTone(b.availability, c);
  const avatarUrl = b.profile_photo_url ?? avatarFallbackUrl(b.business_name, 200);

  // Fetch full profile data for bio, projects, credentials, team, FAQs.
  useEffect(() => {
    let cancelled = false;
    setLoadingExtra(true);
    setExtra(null);
    getBuilderById(b.id)
      .then((row) => {
        if (!cancelled) setExtra(row);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoadingExtra(false);
      });
    return () => {
      cancelled = true;
    };
  }, [b.id]);

  const bio = extra?.bio ?? '';
  const projects: ProjectItem[] = Array.isArray(extra?.projects) ? extra.projects : [];
  const team: TeamMember[] = Array.isArray(extra?.team_members) ? extra.team_members : [];
  const faqs: FaqItem[] = Array.isArray(extra?.faqs) ? extra.faqs : [];
  const creds = extra?.credentials;
  const allPhotos = collectPhotos(projects);

  const verifications: string[] = [];
  if (creds?.license_verified) verifications.push('Licensed');
  if (creds?.abn_verified) verifications.push('ABN Verified');
  if (creds?.insurance_verified) verifications.push('Insured');

  const score = b.display_bldesy_score ? b.bldesy_score : null;
  // Declared, not measured — "Typically …" until real message data exists.
  const responseTime = formatDeclaredResponseTime(b.response_time) ?? avail.response;
  const pills = specialtyPills(b.specialisations);

  async function copy(kind: 'phone' | 'email', text: string) {
    try {
      await Clipboard.setStringAsync(text);
      setCopied(kind);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      // Clipboard unavailable — nothing to show.
    }
  }

  const label = (text: string) => (
    <Text style={[styles.sectionLabel, { color: c.textSecondary }]}>{text.toUpperCase()}</Text>
  );

  return (
    <View style={styles.root}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: c.border }]}>
        <Pressable accessibilityRole="button" accessibilityLabel="Back to list" onPress={onClose} hitSlop={8} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={22} color={c.textSecondary} />
        </Pressable>
        <Text style={[styles.headerName, { color: c.textPrimary }]} numberOfLines={1}>
          {b.business_name}
        </Text>
      </View>

      {/* Avatar + name + trade */}
      <View style={styles.identity}>
        <Image source={{ uri: avatarUrl }} style={[styles.avatar, { borderColor: c.surface }]} contentFit="cover" cachePolicy="memory-disk" />
        <Text style={[styles.name, { color: c.textPrimary }]}>{b.business_name}</Text>
        <View style={styles.identityMeta}>
          <View style={[styles.tradePill, { backgroundColor: colour }]}>
            <Text style={styles.tradePillText}>{b.trade_category}</Text>
          </View>
          <View style={styles.inline}>
            <View style={[styles.availDot, { backgroundColor: avail.dot }]} />
            <Text style={[styles.metaText, { color: c.textSecondary }]}>{avail.label}</Text>
          </View>
        </View>
      </View>

      <View style={styles.content}>
        {/* Stats row — only fields with data */}
        {score != null || responseTime ? (
          <View style={styles.statsRow}>
            {score != null ? (
              <View style={[styles.stat, { backgroundColor: c.canvas }]}>
                <Text style={[styles.statValue, { color: c.primary }]}>
                  {score}
                  <Text style={[styles.statUnit, { color: c.textSecondary }]}>/100</Text>
                </Text>
                <Text style={[styles.statLabel, { color: c.textSecondary }]}>BLDESY SCORE</Text>
              </View>
            ) : null}
            {responseTime ? (
              <View style={[styles.stat, { backgroundColor: c.canvas }]}>
                <Text style={[styles.statValue, { color: c.textPrimary }]}>{responseTime}</Text>
                <Text style={[styles.statLabel, { color: c.textSecondary }]}>RESPONDS</Text>
              </View>
            ) : null}
          </View>
        ) : null}

        {/* Verification badges */}
        {verifications.length > 0 ? (
          <View style={styles.badgeRow}>
            {verifications.map((v) => (
              <View key={v} style={[styles.verifiedPill, { backgroundColor: c.successBg, borderColor: c.successBorder }]}>
                <Ionicons name="checkmark-circle" size={12} color={c.success} />
                <Text style={[styles.verifiedText, { color: c.success }]}>{v}</Text>
              </View>
            ))}
          </View>
        ) : null}

        {/* Location + radius */}
        <View style={[styles.box, { backgroundColor: c.canvas }]}>
          <View style={styles.inline}>
            <Ionicons name="location-outline" size={16} color={c.textSecondary} />
            <View>
              <Text style={[styles.boxText, { color: c.textPrimary }]}>
                {b.suburb} {b.postcode}
              </Text>
              {b.radius_km ? (
                <Text style={[styles.metaSmall, { color: c.textSecondary }]}>Services within {b.radius_km}km</Text>
              ) : null}
            </View>
          </View>
          {b.radius_km != null && b.radius_km > 0 ? (
            <View style={[styles.radiusRow, { borderTopColor: c.border + '99' }]}>
              <Text style={[styles.radiusLabel, { color: c.textSecondary }]}>Show service area on map</Text>
              <Switch
                value={showRadius}
                onValueChange={onToggleRadius}
                trackColor={{ true: c.primary, false: c.border }}
                thumbColor="#ffffff"
                accessibilityLabel="Show service area on map"
              />
            </View>
          ) : null}
        </View>

        {/* Specialty pills */}
        {pills.length > 0 ? (
          <View>
            {label('Specialties')}
            <View style={styles.badgeRow}>
              {pills.map((sp) => {
                const active = sp.slug === activeSpecialtySlug;
                return (
                  <View
                    key={sp.slug}
                    style={[
                      styles.specPill,
                      active ? { backgroundColor: c.primary, borderColor: c.primary } : { backgroundColor: c.canvas, borderColor: c.border },
                    ]}
                  >
                    <Text style={[styles.specPillText, { color: active ? '#fff' : c.textPrimary }]}>{sp.name}</Text>
                  </View>
                );
              })}
            </View>
          </View>
        ) : null}

        {/* Bio */}
        {bio ? (
          <View style={[styles.box, { backgroundColor: c.canvas }]}>
            {label('About')}
            <Text style={[styles.bio, { color: c.textPrimary }]} numberOfLines={4}>
              {bio}
            </Text>
          </View>
        ) : null}

        {/* Projects — grouped by project with titles */}
        {projects.length > 0 ? (
          <View>
            <View style={styles.sectionHead}>
              {label(`Projects (${projects.length})`)}
              {allPhotos.length > 6 ? (
                <Pressable accessibilityRole="button" onPress={() => setShowAllPhotos((v) => !v)} hitSlop={6}>
                  <Text style={[styles.link, { color: c.primary }]}>
                    {showAllPhotos ? 'Show less' : `View all ${allPhotos.length} photos`}
                  </Text>
                </Pressable>
              ) : null}
            </View>
            <View style={styles.projects}>
              {projects.map((p, pi) => {
                const title = str(p.title);
                const desc = str(p.description);
                const imgs = (p.images ?? []).filter(Boolean);
                const before = p.before_image ?? null;
                const after = p.after_image ?? null;
                const displayImgs = showAllPhotos ? imgs : imgs.slice(0, 3);
                return (
                  <View key={`${title}-${pi}`} style={[styles.project, { borderColor: c.border, backgroundColor: c.canvas }]}>
                    {before && after ? (
                      <View style={styles.beforeAfter}>
                        {[
                          { src: before, tag: 'Before' },
                          { src: after, tag: 'After' },
                        ].map((side) => (
                          <View key={side.tag} style={styles.baTile}>
                            <Image source={{ uri: side.src }} style={StyleSheet.absoluteFill} contentFit="cover" cachePolicy="memory-disk" />
                            <View style={styles.baTag}>
                              <Text style={styles.baTagText}>{side.tag.toUpperCase()}</Text>
                            </View>
                          </View>
                        ))}
                      </View>
                    ) : null}
                    {displayImgs.length > 0 ? (
                      <View style={styles.photoGrid}>
                        {displayImgs.map((img, i) => {
                          const globalIdx = allPhotos.findIndex((ap) => ap.url === img);
                          const single = displayImgs.length === 1;
                          return (
                            <Pressable
                              key={`${img}-${i}`}
                              accessibilityRole="imagebutton"
                              accessibilityLabel={`${title} photo ${i + 1}`}
                              onPress={() => setLightbox(globalIdx >= 0 ? globalIdx : 0)}
                              style={[styles.photo, single ? styles.photoSingle : styles.photoThird]}
                            >
                              <Image source={{ uri: img }} style={StyleSheet.absoluteFill} contentFit="cover" cachePolicy="memory-disk" />
                              {!showAllPhotos && i === 2 && imgs.length > 3 ? (
                                <View style={styles.moreOverlay}>
                                  <Text style={styles.moreText}>+{imgs.length - 3}</Text>
                                </View>
                              ) : null}
                            </Pressable>
                          );
                        })}
                      </View>
                    ) : null}
                    <View style={styles.projectText}>
                      {title ? <Text style={[styles.projectTitle, { color: c.textPrimary }]}>{title}</Text> : null}
                      {desc ? (
                        <Text style={[styles.projectDesc, { color: c.textSecondary }]} numberOfLines={2}>
                          {desc}
                        </Text>
                      ) : null}
                    </View>
                  </View>
                );
              })}
            </View>
          </View>
        ) : null}

        {/* Team */}
        {team.length > 0 ? (
          <View>
            {label(`Team (${team.length})`)}
            <View style={styles.teamList}>
              {team.map((m, i) => {
                const name = str(m.name);
                const role = str(m.role);
                return (
                  <View key={`${name}-${i}`} style={[styles.teamRow, { backgroundColor: c.canvas }]}>
                    {m.photo_url ? (
                      <Image source={{ uri: m.photo_url }} style={[styles.teamAvatar, { borderColor: c.border }]} contentFit="cover" cachePolicy="memory-disk" />
                    ) : (
                      <View style={[styles.teamAvatar, styles.teamInitials, { backgroundColor: c.primaryBg, borderColor: c.border }]}>
                        <Text style={[styles.teamInitialsText, { color: c.primary }]}>{initials(name)}</Text>
                      </View>
                    )}
                    <View style={styles.flex1}>
                      <Text style={[styles.teamName, { color: c.textPrimary }]} numberOfLines={1}>
                        {name}
                      </Text>
                      {role ? <Text style={[styles.metaSmall, { color: c.textSecondary }]}>{role}</Text> : null}
                    </View>
                  </View>
                );
              })}
            </View>
          </View>
        ) : null}

        {/* FAQ */}
        {faqs.length > 0 ? (
          <View>
            {label('FAQ')}
            <View style={[styles.faqBox, { borderColor: c.border }]}>
              {faqs.map((faq, i) => {
                const isOpen = expandedFaq === i;
                return (
                  <View key={i} style={[styles.faqItem, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.border }, { backgroundColor: c.surface }]}>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityState={{ expanded: isOpen }}
                      onPress={() => setExpandedFaq(isOpen ? null : i)}
                      style={styles.faqQuestion}
                    >
                      <Text style={[styles.faqQuestionText, { color: c.textPrimary }]} numberOfLines={2}>
                        {str(faq.question)}
                      </Text>
                      <Ionicons name={isOpen ? 'chevron-up' : 'chevron-down'} size={16} color={c.textSecondary} />
                    </Pressable>
                    {isOpen ? <Text style={[styles.faqAnswer, { color: c.textSecondary }]}>{str(faq.answer)}</Text> : null}
                  </View>
                );
              })}
            </View>
          </View>
        ) : null}

        {/* Contact row — copies to the clipboard */}
        {b.phone || b.email ? (
          <View style={styles.contactRow}>
            {b.phone ? (
              <Pressable
                accessibilityRole="button"
                onPress={() => copy('phone', b.phone!)}
                style={[
                  styles.contactBtn,
                  copied === 'phone'
                    ? { backgroundColor: c.success, borderColor: c.success }
                    : { backgroundColor: c.successBg, borderColor: c.successBorder },
                ]}
              >
                <Ionicons name={copied === 'phone' ? 'checkmark' : 'call-outline'} size={16} color={copied === 'phone' ? '#fff' : c.success} />
                <Text style={[styles.contactText, { color: copied === 'phone' ? '#fff' : c.success }]}>
                  {copied === 'phone' ? 'Number copied!' : 'Call'}
                </Text>
              </Pressable>
            ) : null}
            {b.email ? (
              <Pressable
                accessibilityRole="button"
                onPress={() => copy('email', b.email!)}
                style={[
                  styles.contactBtn,
                  copied === 'email'
                    ? { backgroundColor: c.primary, borderColor: c.primary }
                    : { backgroundColor: c.canvas, borderColor: c.border },
                ]}
              >
                <Ionicons name={copied === 'email' ? 'checkmark' : 'mail-outline'} size={16} color={copied === 'email' ? '#fff' : c.textPrimary} />
                <Text style={[styles.contactText, { color: copied === 'email' ? '#fff' : c.textPrimary }]}>
                  {copied === 'email' ? 'Email copied!' : 'Email'}
                </Text>
              </Pressable>
            ) : null}
          </View>
        ) : null}

        {/* Loading shimmer */}
        {loadingExtra ? (
          <View style={styles.shimmer}>
            <Skeleton variant="card" style={{ height: 64 }} />
            <Skeleton variant="card" style={{ height: 80 }} />
          </View>
        ) : null}
      </View>

      {/* Sticky visit profile bar */}
      <View style={[styles.footer, { borderTopColor: c.border, backgroundColor: c.surface }]}>
        <Pressable
          accessibilityRole="link"
          onPress={() => router.push(ROUTES.builderProfile(b.id) as Href)}
          style={({ pressed }) => [styles.visitBtn, { backgroundColor: pressed ? c.primaryDark : c.primary }]}
        >
          <Text style={styles.visitText}>Visit Full Profile</Text>
          <Ionicons name="arrow-forward" size={16} color="#fff" />
        </Pressable>
        <MessageButton recipientId={b.id} variant="ghost" label="Message" icon="chatbubble-ellipses-outline" />
      </View>

      {/* Photo lightbox */}
      <Modal visible={lightbox !== null} transparent animationType="fade" statusBarTranslucent onRequestClose={() => setLightbox(null)}>
        {lightbox !== null && allPhotos[lightbox] ? (
          <View style={styles.lightbox}>
            <Pressable style={StyleSheet.absoluteFill} onPress={() => setLightbox(null)} accessibilityLabel="Close" />
            <Image source={{ uri: allPhotos[lightbox].url }} style={styles.lightboxImage} contentFit="contain" cachePolicy="memory-disk" />
            <Pressable accessibilityRole="button" accessibilityLabel="Close" onPress={() => setLightbox(null)} style={[styles.lightboxBtn, styles.lightboxClose]}>
              <Ionicons name="close" size={22} color="#fff" />
            </Pressable>
            {allPhotos.length > 1 ? (
              <>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Previous"
                  onPress={() => setLightbox((lightbox - 1 + allPhotos.length) % allPhotos.length)}
                  style={[styles.lightboxBtn, styles.lightboxPrev]}
                >
                  <Ionicons name="chevron-back" size={22} color="#fff" />
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Next"
                  onPress={() => setLightbox((lightbox + 1) % allPhotos.length)}
                  style={[styles.lightboxBtn, styles.lightboxNext]}
                >
                  <Ionicons name="chevron-forward" size={22} color="#fff" />
                </Pressable>
              </>
            ) : null}
            <View style={styles.lightboxCaption}>
              <View style={styles.lightboxCount}>
                <Text style={styles.lightboxCountText}>
                  {lightbox + 1} / {allPhotos.length}
                </Text>
              </View>
              <Text style={styles.lightboxTitle}>{allPhotos[lightbox].title}</Text>
            </View>
          </View>
        ) : null}
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backBtn: {
    width: 32,
    height: 32,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerName: {
    flex: 1,
    fontFamily: FontFamily.bodyBold,
    fontWeight: '700',
    fontSize: 14,
  },
  identity: {
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 4,
    marginBottom: Spacing.md,
  },
  name: {
    fontFamily: FontFamily.bodyBold,
    fontWeight: '700',
    fontSize: 18,
    textAlign: 'center',
  },
  identityMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginTop: 6,
  },
  tradePill: {
    borderRadius: Radius.full,
    paddingHorizontal: 10,
    paddingVertical: 2,
  },
  tradePillText: {
    color: '#fff',
    fontFamily: FontFamily.bodyBold,
    fontWeight: '700',
    fontSize: 11,
    textTransform: 'capitalize',
  },
  inline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  availDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  metaText: {
    fontFamily: FontFamily.body,
    fontSize: 12,
  },
  metaSmall: {
    fontFamily: FontFamily.body,
    fontSize: 11,
  },
  content: {
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  statsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  stat: {
    flex: 1,
    borderRadius: Radius.lg,
    padding: 10,
    alignItems: 'center',
  },
  statValue: {
    fontFamily: FontFamily.bodyBold,
    fontWeight: '700',
    fontSize: 16,
    fontVariant: ['tabular-nums'],
  },
  statUnit: {
    fontFamily: FontFamily.bodySemiBold,
    fontWeight: '600',
    fontSize: 11,
  },
  statLabel: {
    marginTop: 2,
    fontFamily: FontFamily.bodySemiBold,
    fontWeight: '600',
    fontSize: 10,
    letterSpacing: 0.6,
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  verifiedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderRadius: Radius.full,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  verifiedText: {
    fontFamily: FontFamily.bodySemiBold,
    fontWeight: '600',
    fontSize: 11,
  },
  box: {
    borderRadius: Radius.lg,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  boxText: {
    fontFamily: FontFamily.bodyMedium,
    fontWeight: '500',
    fontSize: 14,
  },
  radiusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: Spacing.sm,
  },
  radiusLabel: {
    fontFamily: FontFamily.bodyMedium,
    fontWeight: '500',
    fontSize: 11,
  },
  sectionLabel: {
    fontFamily: FontFamily.bodyBold,
    fontWeight: '700',
    fontSize: 11,
    letterSpacing: 0.6,
    marginBottom: 6,
  },
  specPill: {
    borderWidth: 1,
    borderRadius: Radius.full,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  specPillText: {
    fontFamily: FontFamily.bodySemiBold,
    fontWeight: '600',
    fontSize: 11,
  },
  bio: {
    fontFamily: FontFamily.body,
    fontSize: 14,
    lineHeight: 22,
  },
  sectionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  link: {
    fontFamily: FontFamily.bodySemiBold,
    fontWeight: '600',
    fontSize: 11,
  },
  projects: {
    gap: Spacing.md,
  },
  project: {
    borderWidth: 1,
    borderRadius: Radius.lg,
    overflow: 'hidden',
  },
  beforeAfter: {
    flexDirection: 'row',
    gap: 1,
  },
  baTile: {
    flex: 1,
    aspectRatio: 4 / 3,
    overflow: 'hidden',
  },
  baTag: {
    position: 'absolute',
    bottom: 4,
    left: 4,
    borderRadius: 4,
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  baTagText: {
    color: '#fff',
    fontFamily: FontFamily.bodyBold,
    fontWeight: '700',
    fontSize: 9,
  },
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 1,
  },
  photo: {
    overflow: 'hidden',
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  photoSingle: {
    width: '100%',
    aspectRatio: 16 / 9,
  },
  photoThird: {
    width: '33%',
    flexGrow: 1,
    aspectRatio: 1,
  },
  moreOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  moreText: {
    color: '#fff',
    fontFamily: FontFamily.bodyBold,
    fontWeight: '700',
    fontSize: 12,
  },
  projectText: {
    padding: 10,
  },
  projectTitle: {
    fontFamily: FontFamily.bodySemiBold,
    fontWeight: '600',
    fontSize: 12,
  },
  projectDesc: {
    marginTop: 2,
    fontFamily: FontFamily.body,
    fontSize: 11,
    lineHeight: 16,
  },
  teamList: {
    gap: Spacing.sm,
  },
  teamRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    borderRadius: Radius.lg,
    padding: 10,
  },
  teamAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
  },
  teamInitials: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  teamInitialsText: {
    fontFamily: FontFamily.bodyBold,
    fontWeight: '700',
    fontSize: 10,
  },
  flex1: {
    flex: 1,
    minWidth: 0,
  },
  teamName: {
    fontFamily: FontFamily.bodySemiBold,
    fontWeight: '600',
    fontSize: 14,
  },
  faqBox: {
    borderWidth: 1,
    borderRadius: Radius.lg,
    overflow: 'hidden',
  },
  faqItem: {},
  faqQuestion: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
  },
  faqQuestionText: {
    flex: 1,
    fontFamily: FontFamily.bodyMedium,
    fontWeight: '500',
    fontSize: 12,
  },
  faqAnswer: {
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.md,
    fontFamily: FontFamily.body,
    fontSize: 12,
    lineHeight: 18,
  },
  contactRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  contactBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1,
    borderRadius: Radius.lg,
    paddingVertical: 10,
  },
  contactText: {
    fontFamily: FontFamily.bodySemiBold,
    fontWeight: '600',
    fontSize: 12,
  },
  shimmer: {
    gap: Spacing.sm,
  },
  footer: {
    flexDirection: 'row',
    gap: Spacing.sm,
    padding: Spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  visitBtn: {
    flex: 1,
    height: 48,
    borderRadius: Radius.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  visitText: {
    color: '#fff',
    fontFamily: FontFamily.bodyBold,
    fontWeight: '700',
    fontSize: 14,
  },
  lightbox: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.lg,
  },
  lightboxImage: {
    width: '100%',
    height: '80%',
  },
  lightboxBtn: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  lightboxClose: {
    top: 56,
    right: Spacing.lg,
  },
  lightboxPrev: {
    left: Spacing.lg,
    top: '50%',
  },
  lightboxNext: {
    right: Spacing.lg,
    top: '50%',
  },
  lightboxCaption: {
    position: 'absolute',
    bottom: 40,
    alignItems: 'center',
    gap: 4,
  },
  lightboxCount: {
    borderRadius: Radius.full,
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: Spacing.md,
    paddingVertical: 4,
  },
  lightboxCountText: {
    color: '#fff',
    fontFamily: FontFamily.body,
    fontSize: 14,
  },
  lightboxTitle: {
    color: 'rgba(255,255,255,0.6)',
    fontFamily: FontFamily.body,
    fontSize: 12,
  },
});
