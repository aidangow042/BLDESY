/**
 * BuilderCard — the result card, anatomy verbatim from
 * ~/bldesy-web/components/search/builder-card.tsx: hero image carousel with
 * the match badge, avatar ring + save heart, photo count; then name, trade,
 * stars + count, the view-gated BLDESY Score pill, "{n}x Verified",
 * "Licensed in NSW · QLD", the NSW threshold line, location + distance,
 * availability dot, declared response time, specialties count, bio, match
 * chips, sub-trade chips (4 + "+N more"), project chips (3), and the
 * View Profile / Message CTAs.
 *
 * `position` is only passed by search results — its presence arms the
 * search_result_clicked funnel event, so saved/trade-page cards never emit it.
 */
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, type Href } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';

import { MessageButton } from '@/components/builder/message-button';
import { getAllImages, str } from '@/components/builder/profile-helpers';
import { availabilityTone } from '@/components/search/availability-tone';
import { matchTone, specialtiesCountLabel, thresholdBadgeLabel } from '@/components/search/search-params';
import { Colors, FontFamily, Radius, Shadows, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { trackFunnelEvent } from '@/lib/data/tracking';
import { ROUTES } from '@/lib/routes';
import { avatarFallbackUrl } from '@/lib/web/avatar';
import { verifiedCredentialFlags } from '@/lib/web/credentials';
import { NSW_THRESHOLD_AMOUNT, unlicensedThresholdTrades } from '@/lib/web/licensed-trades';
import { formatDeclaredResponseTime } from '@/lib/web/response-time';
import { getSpecialisationName } from '@/lib/web/trade-specialisations';
import { getTradeBySlug } from '@/lib/web/trades';
import type { BuilderSearchResult } from '@/types';

interface BuilderCardProps {
  builder: BuilderSearchResult;
  /** 0-based position within the current results page — arms search_result_clicked. */
  position?: number;
  saved?: boolean;
  onToggleSave?: (builderUserId: string) => void;
  style?: StyleProp<ViewStyle>;
}

const MATCH_BG = { high: 'rgba(5,150,105,0.8)', mid: 'rgba(245,158,11,0.8)', low: 'rgba(0,0,0,0.6)' } as const;

export function BuilderCard({ builder, position, saved = false, onToggleSave, style }: BuilderCardProps) {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];
  const router = useRouter();
  const [heroIdx, setHeroIdx] = useState(0);

  const trade = getTradeBySlug(builder.trade_category);
  const availability = availabilityTone(builder.availability, c);
  const matchScore = builder._match?.percent ?? 0;
  // The score contributes ranking points, but its breakdown chip would repeat
  // the dedicated BLDESY Score pill in the badge row — show it once, up top.
  const matchDetails = (builder._match?.details ?? []).filter((d) => !d.label.startsWith('BLDESY Score'));

  const images = useMemo(() => getAllImages(builder), [builder]);
  const verifiedCount = verifiedCredentialFlags(builder).count;

  // NSW $5,000 minor-works threshold trades with no verified licence — the
  // card collapses this to one line; the profile shows the per-trade rows.
  const unlicensedThreshold = useMemo(() => {
    const trades = builder.trade_categories?.length ? builder.trade_categories : [builder.trade_category];
    const cv = builder.credentials_verified as { licences?: { verified?: boolean; type?: string }[] } | null;
    const verifiedTradeSlugs = new Set(
      (cv?.licences ?? []).filter((l) => l.verified && l.type).map((l) => l.type as string),
    );
    return unlicensedThresholdTrades(trades, verifiedTradeSlugs);
  }, [builder]);

  const specialties = useMemo(
    () => (builder.projects ?? []).map((p) => str(p.title)).filter(Boolean),
    [builder.projects],
  );
  const shownSpecialties = specialties.slice(0, 3);
  const moreCount = specialties.length - 3;

  const tradeSpecChips = useMemo(() => {
    const map = (builder as { specialisations?: Record<string, string[]> | null }).specialisations;
    if (!map) return [] as string[];
    const out: string[] = [];
    for (const [t, slugs] of Object.entries(map)) {
      for (const slug of slugs) {
        const name = getSpecialisationName(t, slug);
        if (name) out.push(name);
      }
    }
    return out;
  }, [builder]);
  const shownTradeSpecs = tradeSpecChips.slice(0, 4);
  const moreTradeSpecs = tradeSpecChips.length - shownTradeSpecs.length;

  const avatarUrl = builder.profile_photo_url ?? avatarFallbackUrl(builder.business_name, 120);
  const responseTime = formatDeclaredResponseTime(builder.response_time);

  function trackResultClick() {
    if (position == null) return;
    trackFunnelEvent('search_result_clicked', {
      builder_id: builder.user_id,
      position,
      percent: builder._match?.percent ?? null,
    });
  }

  function openProfile() {
    trackResultClick();
    router.push(ROUTES.builderProfile(builder.user_id) as Href);
  }

  return (
    <View style={[styles.card, Shadows.sm, { backgroundColor: c.surface, borderColor: c.border }, style]}>
      {/* ── Hero image ────────────────────────────────────────── */}
      <View style={[styles.hero, { backgroundColor: c.border + '33' }]}>
        {images.length > 0 ? (
          <Image
            source={{ uri: images[heroIdx] }}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
            cachePolicy="memory-disk"
            transition={150}
            accessibilityLabel={`${builder.business_name} work`}
          />
        ) : (
          <LinearGradient
            colors={[c.primary, c.primaryDark]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
        )}

        {builder._match ? (
          <View style={[styles.matchBadge, { backgroundColor: MATCH_BG[matchTone(matchScore)] }]}>
            <Text style={styles.matchText}>{matchScore}% match</Text>
          </View>
        ) : null}

        <View style={styles.heroTopRight}>
          <Image
            source={{ uri: avatarUrl }}
            style={styles.avatar}
            contentFit="cover"
            cachePolicy="memory-disk"
            accessibilityLabel={builder.business_name}
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={saved ? 'Unsave' : 'Save'}
            accessibilityState={{ selected: saved }}
            onPress={() => onToggleSave?.(builder.user_id)}
            hitSlop={4}
            style={[styles.saveBtn, { backgroundColor: saved ? c.primary : 'rgba(255,255,255,0.9)' }]}
          >
            <Ionicons name={saved ? 'bookmark' : 'bookmark-outline'} size={20} color={saved ? '#fff' : c.textSecondary} />
          </Pressable>
        </View>

        {images.length > 1 ? (
          <>
            <View style={styles.photoCount}>
              <Ionicons name="images-outline" size={13} color="#fff" />
              <Text style={styles.photoCountText}>{images.length}</Text>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Previous"
              onPress={() => setHeroIdx((heroIdx - 1 + images.length) % images.length)}
              style={({ pressed }) => [styles.arrow, styles.arrowLeft, pressed && styles.arrowPressed]}
            >
              <Ionicons name="chevron-back" size={18} color={c.textPrimary} />
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Next"
              onPress={() => setHeroIdx((heroIdx + 1) % images.length)}
              style={({ pressed }) => [styles.arrow, styles.arrowRight, pressed && styles.arrowPressed]}
            >
              <Ionicons name="chevron-forward" size={18} color={c.textPrimary} />
            </Pressable>
          </>
        ) : null}
      </View>

      {/* ── Profile info — tap anywhere to open the profile ──── */}
      <Pressable accessibilityRole="link" onPress={openProfile} style={({ pressed }) => [styles.body, pressed && { opacity: 0.92 }]}>
        <View style={{ marginBottom: Spacing.md }}>
          <Text style={[styles.name, { color: c.textPrimary }]}>{builder.business_name}</Text>
          <View style={styles.badgeRow}>
            <Text style={[styles.tradeText, { color: c.primary }]}>{str(trade?.name ?? builder.trade_category)}</Text>
            {builder._rating && builder._rating.count > 0 ? (
              <View style={styles.inline}>
                <Ionicons name="star" size={13} color="#f59e0b" />
                <Text style={[styles.metaStrong, { color: c.textPrimary }]}>{builder._rating.average.toFixed(1)}</Text>
                <Text style={[styles.metaText, { color: c.textSecondary }]}>({builder._rating.count})</Text>
              </View>
            ) : null}
            {/* View-gated: public_builder_profiles NULLs the score unless the builder opted in. */}
            {builder.bldesy_score != null ? (
              <View style={[styles.scorePill, { backgroundColor: c.primary + '1A' }]}>
                <Ionicons name="shield-checkmark-outline" size={13} color={c.primary} />
                <Text style={[styles.scoreText, { color: c.primary }]}>{builder.bldesy_score}</Text>
                <Text style={[styles.scoreLabel, { color: c.primary + 'CC' }]}>BLDESY Score</Text>
              </View>
            ) : null}
            {verifiedCount > 0 ? (
              <View style={styles.inline}>
                <Ionicons name="checkmark-circle" size={13} color={c.success} />
                <Text style={[styles.metaStrong, { color: c.success }]}>{verifiedCount}x Verified</Text>
              </View>
            ) : null}
            {builder.licensed_states && builder.licensed_states.length > 0 ? (
              <Text style={[styles.metaStrong, { color: c.primary }]}>
                Licensed in {builder.licensed_states.join(' · ')}
              </Text>
            ) : null}
            {unlicensedThreshold.length > 0 ? (
              <View style={[styles.thresholdPill, { borderColor: c.border, backgroundColor: c.canvas }]}>
                <Text style={[styles.thresholdText, { color: c.textSecondary }]}>
                  {thresholdBadgeLabel(NSW_THRESHOLD_AMOUNT)}
                </Text>
              </View>
            ) : null}
          </View>
          <View style={[styles.inline, { marginTop: 4 }]}>
            <Ionicons name="location-outline" size={12} color={c.textSecondary} />
            <Text style={[styles.metaText, { color: c.textSecondary }]}>
              {/* Join, don't interpolate: a profile with no postcode rendered "Newtown, " otherwise. */}
              {[builder.suburb, builder.postcode].filter(Boolean).join(', ')}
            </Text>
            {builder._distanceKm != null ? (
              <Text style={[styles.metaStrong, { color: c.primary }]}>· {Math.round(builder._distanceKm)}km away</Text>
            ) : null}
          </View>
        </View>

        {/* Availability + response + specialties count */}
        <View style={styles.statusRow}>
          <View style={styles.inline}>
            <View style={[styles.dot, { backgroundColor: availability.dot }]} />
            <Text style={[styles.statusText, { color: c.textPrimary }]}>{availability.label}</Text>
          </View>
          {responseTime ? (
            <>
              <Text style={[styles.metaText, { color: c.textSecondary }]}>·</Text>
              <View style={styles.inline}>
                <Ionicons name="time-outline" size={13} color={c.textSecondary} />
                <Text style={[styles.metaText, { color: c.textSecondary }]}>{responseTime}</Text>
              </View>
            </>
          ) : null}
          {specialties.length > 0 ? (
            <>
              <Text style={[styles.metaText, { color: c.textSecondary }]}>·</Text>
              <View style={styles.inline}>
                <Ionicons name="star" size={13} color="#f59e0b" />
                <Text style={[styles.metaText, { color: c.textSecondary }]}>{specialtiesCountLabel(specialties.length)}</Text>
              </View>
            </>
          ) : null}
        </View>

        {builder.bio ? <Text style={[styles.bio, { color: c.textSecondary }]}>{builder.bio}</Text> : null}

        {matchDetails.length > 0 ? (
          <View style={styles.chipRow}>
            {matchDetails.map((d) => (
              <View key={d.label} style={[styles.matchChip, { backgroundColor: c.successBg }]}>
                <Ionicons name="checkmark" size={10} color={c.success} />
                <Text style={[styles.matchChipText, { color: c.success }]}>{d.label}</Text>
              </View>
            ))}
          </View>
        ) : null}

        {shownTradeSpecs.length > 0 ? (
          <View style={styles.chipRow}>
            {shownTradeSpecs.map((s) => (
              <View key={s} style={[styles.specChip, { backgroundColor: c.primary + '1A' }]}>
                <Text style={[styles.specChipText, { color: c.primary }]}>{s}</Text>
              </View>
            ))}
            {moreTradeSpecs > 0 ? (
              <Text style={[styles.moreText, { color: c.textSecondary }]}>+{moreTradeSpecs} more</Text>
            ) : null}
          </View>
        ) : null}

        {shownSpecialties.length > 0 ? (
          <View style={styles.chipRow}>
            {shownSpecialties.map((s) => (
              <View key={s} style={[styles.projectChip, { borderColor: c.border, backgroundColor: c.canvas }]}>
                <Text style={[styles.projectChipText, { color: c.textSecondary }]}>{s}</Text>
              </View>
            ))}
            {moreCount > 0 ? <Text style={[styles.moreText, { color: c.textSecondary }]}>+{moreCount} more</Text> : null}
          </View>
        ) : null}
      </Pressable>

      {/* ── CTA buttons — outside the link ─────────────────────── */}
      <View style={styles.ctaRow}>
        <Pressable
          accessibilityRole="link"
          onPress={openProfile}
          style={({ pressed }) => [styles.viewBtn, { backgroundColor: pressed ? c.primaryDark : c.primary }]}
        >
          <Ionicons name="person-outline" size={16} color="#fff" />
          <Text style={styles.viewBtnText}>View Profile</Text>
        </Pressable>
        <MessageButton recipientId={builder.user_id} variant="outline" label="Message" style={styles.flex1} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Radius.xl,
    borderWidth: 1,
    overflow: 'hidden',
  },
  hero: {
    aspectRatio: 16 / 9,
    width: '100%',
    overflow: 'hidden',
  },
  matchBadge: {
    position: 'absolute',
    top: Spacing.md,
    left: Spacing.md,
    borderRadius: Radius.md,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  matchText: {
    color: '#fff',
    fontFamily: FontFamily.bodyBold,
    fontWeight: '700',
    fontSize: 12,
  },
  heroTopRight: {
    position: 'absolute',
    top: Spacing.md,
    right: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: '#fff',
    backgroundColor: '#fff',
  },
  saveBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoCount: {
    position: 'absolute',
    bottom: Spacing.md,
    right: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: Radius.md,
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
  },
  photoCountText: {
    color: '#fff',
    fontFamily: FontFamily.bodySemiBold,
    fontWeight: '600',
    fontSize: 11,
  },
  arrow: {
    position: 'absolute',
    top: '50%',
    marginTop: -22,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.85)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  arrowLeft: { left: Spacing.sm },
  arrowRight: { right: Spacing.sm },
  arrowPressed: { backgroundColor: '#fff', transform: [{ scale: 0.95 }] },
  body: {
    padding: Spacing.lg,
  },
  name: {
    fontFamily: FontFamily.bodyBold,
    fontWeight: '700',
    fontSize: 16,
    lineHeight: 22,
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: Spacing.sm,
    marginTop: 4,
  },
  inline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  tradeText: {
    fontFamily: FontFamily.bodySemiBold,
    fontWeight: '600',
    fontSize: 12,
  },
  metaStrong: {
    fontFamily: FontFamily.bodySemiBold,
    fontWeight: '600',
    fontSize: 12,
  },
  metaText: {
    fontFamily: FontFamily.body,
    fontSize: 12,
  },
  scorePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
  },
  scoreText: {
    fontFamily: FontFamily.bodyBold,
    fontWeight: '700',
    fontSize: 12,
    fontVariant: ['tabular-nums'],
  },
  scoreLabel: {
    fontFamily: FontFamily.bodySemiBold,
    fontWeight: '600',
    fontSize: 12,
  },
  thresholdPill: {
    borderWidth: 1,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
  },
  thresholdText: {
    fontFamily: FontFamily.bodySemiBold,
    fontWeight: '600',
    fontSize: 11,
  },
  statusRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    columnGap: Spacing.md,
    rowGap: 4,
    marginBottom: Spacing.md,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  statusText: {
    fontFamily: FontFamily.bodyMedium,
    fontWeight: '500',
    fontSize: 12,
  },
  bio: {
    fontFamily: FontFamily.body,
    fontSize: 14,
    lineHeight: 22,
    marginBottom: Spacing.md,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 6,
    marginBottom: Spacing.md,
  },
  matchChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
  },
  matchChipText: {
    fontFamily: FontFamily.bodySemiBold,
    fontWeight: '600',
    fontSize: 10,
  },
  specChip: {
    borderRadius: Radius.full,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  specChipText: {
    fontFamily: FontFamily.bodySemiBold,
    fontWeight: '600',
    fontSize: 11,
  },
  projectChip: {
    borderWidth: 1,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: 4,
  },
  projectChipText: {
    fontFamily: FontFamily.bodyMedium,
    fontWeight: '500',
    fontSize: 12,
  },
  moreText: {
    fontFamily: FontFamily.body,
    fontSize: 11,
  },
  ctaRow: {
    flexDirection: 'row',
    gap: Spacing.md,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.lg,
  },
  viewBtn: {
    flex: 1,
    height: 44,
    borderRadius: Radius.xl,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
  },
  viewBtnText: {
    color: '#fff',
    fontFamily: FontFamily.bodyBold,
    fontWeight: '700',
    fontSize: 14,
  },
  flex1: {
    flex: 1,
  },
});
