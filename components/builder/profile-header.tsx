/**
 * ProfileHeader — ~/bldesy-web/components/builder/profile-header.tsx: the
 * cover (solid colour → photo → primary gradient, with the Like + Save overlay
 * chips), the overlapping info card (avatar, name + verified badge, "Licensed
 * {Trade} · {suburb, state}", stars, the mode-gated availability pill) and the
 * action row — Express Interest + Contact + Website, or the paused notice when
 * the tradie isn't taking new enquiries.
 */
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import * as WebBrowser from 'expo-web-browser';
import Ionicons from '@expo/vector-icons/Ionicons';

import { ContactPopover } from '@/components/builder/contact-popover';
import { LikeButton } from '@/components/builder/like-button';
import { coverGradient, headerLocation, headerPillFor, reviewCountLabel, safeWebsiteUrl } from '@/components/builder/profile-helpers';
import { SaveButton } from '@/components/builder/save-button';
import { availabilityTone } from '@/components/search/availability-tone';
import { StarRating } from '@/components/ui/star-rating';
import { Colors, FontFamily, Radius, Shadows, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { avatarFallbackUrl } from '@/lib/web/avatar';
import { formatYmdShort } from '@/lib/web/dates';
import { requiresLicense } from '@/lib/web/licensed-trades';
import { formatTradeName } from '@/lib/web/trades';
import type { AvailabilityDisplayMode, BuilderWithProfile } from '@/types';

interface ProfileHeaderProps {
  builder: BuilderWithProfile;
  builderId: string;
  isVerified: boolean;
  averageRating: number;
  totalReviews: number;
  availabilityDisplayMode: AvailabilityDisplayMode;
  nextAvailableDate: string | null;
  todayYmd: string;
  onExpressInterest: () => void;
}

export function ProfileHeader({
  builder,
  builderId,
  isVerified,
  averageRating,
  totalReviews,
  availabilityDisplayMode,
  nextAvailableDate,
  todayYmd,
  onExpressInterest,
}: ProfileHeaderProps) {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];
  const availability = availabilityTone(builder.availability, c);
  const pill = headerPillFor(availabilityDisplayMode, nextAvailableDate, todayYmd);
  const website = safeWebsiteUrl(builder.website);
  const avatarUrl = builder.profile_photo_url ?? avatarFallbackUrl(builder.business_name);
  const location = headerLocation(builder);

  return (
    <View style={styles.header}>
      {/* Cover — solid colour takes precedence over the photo (colour → photo → fallback). */}
      <View style={styles.cover}>
        {builder.cover_color ? (
          <LinearGradient colors={coverGradient(builder.cover_color)} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
        ) : builder.cover_photo_url ? (
          <Image source={{ uri: builder.cover_photo_url }} style={StyleSheet.absoluteFill} contentFit="cover" cachePolicy="memory-disk" accessibilityLabel={`${builder.business_name} cover photo`} />
        ) : (
          <LinearGradient colors={[c.primary, c.primary, c.primaryDark]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
        )}
        <LinearGradient colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.3)']} style={styles.vignette} />
        <View style={styles.coverChips}>
          <LikeButton builderId={builderId} variant="overlay" />
          <SaveButton builderId={builderId} variant="overlay" />
        </View>
      </View>

      {/* Profile info card — overlaps the cover photo */}
      <View style={[styles.card, Shadows.lg, { backgroundColor: c.surface, borderColor: c.border }]}>
        <View style={styles.avatarWrap}>
          <Image
            source={{ uri: avatarUrl }}
            style={[styles.avatar, Shadows.lg, { borderColor: c.surface, backgroundColor: c.primaryBg }]}
            contentFit="cover"
            cachePolicy="memory-disk"
            accessibilityLabel={builder.business_name}
          />
        </View>

        <View style={styles.nameRow}>
          <Text accessibilityRole="header" style={[styles.name, { color: c.textPrimary }]}>
            {builder.business_name}
            {isVerified ? (
              <>
                {' '}
                <Ionicons name="checkmark-circle" size={22} color={c.primary} accessibilityLabel="Verified business" />
              </>
            ) : null}
          </Text>
        </View>
        <View style={styles.subRow}>
          {/* "Licensed" only where the trade actually carries a licence. */}
          <Text style={[styles.subText, { color: c.textSecondary }]}>
            {requiresLicense(builder.trade_category) ? 'Licensed ' : ''}
            {formatTradeName(builder.trade_category)}
          </Text>
          <Text style={[styles.subText, { color: c.textSecondary + '66' }]}>·</Text>
          <View style={styles.inline}>
            <Ionicons name="location-outline" size={14} color={c.textSecondary} />
            <Text style={[styles.subText, { color: c.textSecondary }]}>{location}</Text>
          </View>
        </View>
        {totalReviews > 0 ? (
          <View style={styles.ratingRow}>
            <StarRating rating={averageRating} size={16} />
            <Text style={[styles.ratingValue, { color: c.textPrimary }]}>{averageRating.toFixed(1)}</Text>
            <Text style={[styles.ratingCount, { color: c.textSecondary }]}>{reviewCountLabel(totalReviews)}</Text>
          </View>
        ) : null}

        {/* Availability pill (mode-gated) */}
        {pill === 'next_available' ? (
          <View style={styles.pillRow}>
            <View style={[styles.pill, { borderColor: c.primary + '40', backgroundColor: c.primaryBg }]}>
              <Ionicons name="calendar-outline" size={12} color={c.primary} />
              <Text style={[styles.pillText, { color: c.primary }]}>
                Next available · {nextAvailableDate ? formatYmdShort(nextAvailableDate, todayYmd) : ''}
              </Text>
            </View>
          </View>
        ) : pill === 'status' ? (
          <View style={styles.pillRow}>
            <View style={[styles.pill, { backgroundColor: availability.bg }]}>
              <View style={[styles.pillDot, { backgroundColor: availability.dot }]} />
              <Text style={[styles.pillText, { color: availability.text }]}>{availability.label}</Text>
            </View>
          </View>
        ) : null}

        {/* Action buttons — a paused / card-overdue tradie takes no new enquiries. */}
        {builder.accepting_enquiries === false ? (
          <View style={[styles.notice, { borderColor: c.border, backgroundColor: c.canvas }]}>
            <Text style={[styles.noticeText, { color: c.textSecondary }]}>Not taking new enquiries right now — check back soon.</Text>
          </View>
        ) : (
          <View style={styles.actions}>
            <Pressable
              accessibilityRole="button"
              onPress={onExpressInterest}
              style={({ pressed }) => [styles.cta, Shadows.sm, pressed && { opacity: 0.9, transform: [{ scale: 0.98 }] }]}
            >
              <LinearGradient colors={[c.primary, c.primaryDark]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
              <Ionicons name="flame-outline" size={16} color="#fff" />
              <Text style={styles.ctaText}>Express Interest</Text>
            </Pressable>
            <ContactPopover
              contactName={builder.contact_name}
              contactPhone={builder.phone}
              contactEmail={builder.email}
              recipientId={builderId}
              alwaysShow
              triggerVariant="primary"
            />
            {website ? (
              <Pressable
                accessibilityRole="link"
                onPress={() => WebBrowser.openBrowserAsync(website).catch(() => {})}
                style={({ pressed }) => [styles.cta, styles.ctaOutline, { borderColor: pressed ? c.primary + '66' : c.border, backgroundColor: c.surface }]}
              >
                <Ionicons name="open-outline" size={16} color={c.textPrimary} />
                <Text style={[styles.ctaText, { color: c.textPrimary }]}>Website</Text>
              </Pressable>
            ) : null}
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing['2xl'],
  },
  cover: {
    height: 200,
    borderRadius: Radius.xl,
    overflow: 'hidden',
  },
  vignette: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 96,
  },
  coverChips: {
    position: 'absolute',
    top: Spacing.md,
    right: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  card: {
    marginHorizontal: Spacing.lg,
    marginTop: -48,
    borderRadius: Radius.xl,
    borderWidth: 1,
    padding: Spacing.xl,
    alignItems: 'center',
  },
  avatarWrap: {
    marginTop: -64 - Spacing.xl,
  },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 4,
  },
  nameRow: {
    marginTop: Spacing.lg,
    alignItems: 'center',
  },
  name: {
    fontFamily: FontFamily.bodyBold,
    fontWeight: '700',
    fontSize: 22,
    lineHeight: 28,
    textAlign: 'center',
  },
  subRow: {
    marginTop: 4,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'center',
    columnGap: Spacing.sm,
    rowGap: 4,
  },
  inline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  subText: {
    fontFamily: FontFamily.body,
    fontSize: 14,
  },
  ratingRow: {
    marginTop: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  ratingValue: {
    fontFamily: FontFamily.bodySemiBold,
    fontWeight: '600',
    fontSize: 14,
  },
  ratingCount: {
    fontFamily: FontFamily.body,
    fontSize: 14,
  },
  pillRow: {
    marginTop: Spacing.lg,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: Radius.full,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'transparent',
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  pillDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  pillText: {
    fontFamily: FontFamily.bodySemiBold,
    fontWeight: '600',
    fontSize: 11,
  },
  notice: {
    marginTop: Spacing.lg,
    alignSelf: 'stretch',
    borderWidth: 1,
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  noticeText: {
    fontFamily: FontFamily.bodySemiBold,
    fontWeight: '600',
    fontSize: 14,
    textAlign: 'center',
  },
  actions: {
    marginTop: Spacing.lg,
    alignSelf: 'stretch',
    gap: Spacing.sm,
  },
  cta: {
    height: 44,
    borderRadius: Radius.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: Spacing.xl,
    overflow: 'hidden',
  },
  ctaOutline: {
    borderWidth: 1,
  },
  ctaText: {
    color: '#ffffff',
    fontFamily: FontFamily.bodyBold,
    fontWeight: '700',
    fontSize: 14,
  },
});
