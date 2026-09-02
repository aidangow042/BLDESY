/**
 * ReviewsSection — ~/bldesy-web/components/builder/reviews-section.tsx: the
 * average + star breakdown, then each review (reviewer avatar/initials, name,
 * relative date, a Report flag, stars, comment). Empty state copy verbatim.
 */
import { StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import Ionicons from '@expo/vector-icons/Ionicons';

import { initials, relativeDate, reviewsMeta } from '@/components/builder/profile-helpers';
import { ProfileSection } from '@/components/builder/profile-section';
import { ReportButton } from '@/components/report-button';
import { StarRating } from '@/components/ui/star-rating';
import { Colors, FontFamily, Radius, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import type { ReviewWithReviewer, StarBreakdown } from '@/lib/data/builders';

interface ReviewsSectionProps {
  reviews: ReviewWithReviewer[];
  averageRating: number;
  totalReviews: number;
  starBreakdown: StarBreakdown;
}

export function ReviewsSection({ reviews, averageRating, totalReviews, starBreakdown }: ReviewsSectionProps) {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];

  return (
    <ProfileSection title="Reviews" meta={reviewsMeta(averageRating, totalReviews)}>
      {totalReviews === 0 ? (
        <View style={styles.empty}>
          <View style={[styles.emptyBubble, { backgroundColor: c.primaryBg }]}>
            <Ionicons name="chatbox-ellipses-outline" size={28} color={c.primary} />
          </View>
          <Text style={[styles.emptyTitle, { color: c.textPrimary }]}>No reviews yet</Text>
          <Text style={[styles.emptyCopy, { color: c.textSecondary }]}>Be the first to leave a review for this tradie!</Text>
        </View>
      ) : (
        <>
          {/* Star breakdown */}
          <View style={[styles.breakdown, { backgroundColor: c.canvas }]}>
            <View style={styles.avgRow}>
              <Text style={[styles.avg, { color: c.textPrimary }]}>{averageRating.toFixed(1)}</Text>
              <View>
                <StarRating rating={averageRating} size={20} />
                <Text style={[styles.avgCount, { color: c.textSecondary }]}>
                  {totalReviews} review{totalReviews !== 1 ? 's' : ''}
                </Text>
              </View>
            </View>
            <View style={styles.bars}>
              {([5, 4, 3, 2, 1] as const).map((star) => {
                const count = starBreakdown[star];
                const pct = totalReviews > 0 ? (count / totalReviews) * 100 : 0;
                return (
                  <View key={star} style={styles.barRow}>
                    <Text style={[styles.barStar, { color: c.textSecondary }]}>{star}</Text>
                    <Ionicons name="star" size={14} color={c.warning} />
                    <View style={[styles.barTrack, { backgroundColor: c.border }]}>
                      <View style={[styles.barFill, { width: `${pct}%`, backgroundColor: c.warning }]} />
                    </View>
                    <Text style={[styles.barCount, { color: c.textSecondary }]}>{count}</Text>
                  </View>
                );
              })}
            </View>
          </View>

          {/* Individual reviews */}
          <View>
            {reviews.map((review, i) => (
              <View key={review.id} style={[styles.review, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.border }]}>
                <View style={styles.reviewRow}>
                  {review.profiles?.avatar_url ? (
                    <Image source={{ uri: review.profiles.avatar_url }} style={[styles.avatar, { borderColor: c.border }]} contentFit="cover" cachePolicy="memory-disk" />
                  ) : (
                    <View style={[styles.avatar, styles.avatarFallback, { backgroundColor: c.primaryBg, borderColor: c.border }]}>
                      <Text style={[styles.avatarText, { color: c.primary }]}>{initials(review.profiles?.name ?? null)}</Text>
                    </View>
                  )}
                  <View style={styles.flex1}>
                    <View style={styles.reviewHead}>
                      <Text style={[styles.reviewer, { color: c.textPrimary }]} numberOfLines={1}>
                        {review.profiles?.name ?? 'Anonymous'}
                      </Text>
                      <View style={styles.reviewMeta}>
                        <Text style={[styles.date, { color: c.textSecondary }]}>{relativeDate(review.created_at)}</Text>
                        <ReportButton contentType="review" contentId={review.id} reportedUserId={review.reviewer_id} size={16} />
                      </View>
                    </View>
                    <View style={styles.stars}>
                      <StarRating rating={review.rating} size={14} />
                    </View>
                    {review.comment ? <Text style={[styles.comment, { color: c.textSecondary }]}>{review.comment}</Text> : null}
                  </View>
                </View>
              </View>
            ))}
          </View>
        </>
      )}
    </ProfileSection>
  );
}

const styles = StyleSheet.create({
  empty: {
    alignItems: 'center',
    paddingVertical: Spacing['2xl'],
  },
  emptyBubble: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
  },
  emptyTitle: {
    fontFamily: FontFamily.bodySemiBold,
    fontWeight: '600',
    fontSize: 16,
    marginBottom: 4,
  },
  emptyCopy: {
    fontFamily: FontFamily.body,
    fontSize: 14,
    textAlign: 'center',
  },
  breakdown: {
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  avgRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  avg: {
    fontFamily: FontFamily.bodyBold,
    fontWeight: '700',
    fontSize: 36,
    lineHeight: 40,
  },
  avgCount: {
    marginTop: 4,
    fontFamily: FontFamily.body,
    fontSize: 12,
  },
  bars: {
    gap: 6,
  },
  barRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  barStar: {
    width: 16,
    textAlign: 'right',
    fontFamily: FontFamily.body,
    fontSize: 14,
  },
  barTrack: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 4,
  },
  barCount: {
    width: 24,
    textAlign: 'right',
    fontFamily: FontFamily.body,
    fontSize: 12,
  },
  review: {
    paddingVertical: Spacing.xl,
  },
  reviewRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.md,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
  },
  avatarFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontFamily: FontFamily.bodyBold,
    fontWeight: '700',
    fontSize: 12,
  },
  flex1: {
    flex: 1,
    minWidth: 0,
  },
  reviewHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
  reviewer: {
    flex: 1,
    fontFamily: FontFamily.bodySemiBold,
    fontWeight: '600',
    fontSize: 14,
  },
  reviewMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  date: {
    fontFamily: FontFamily.body,
    fontSize: 12,
  },
  stars: {
    marginTop: 4,
  },
  comment: {
    marginTop: 10,
    fontFamily: FontFamily.body,
    fontSize: 14,
    lineHeight: 22,
  },
});
