/**
 * SavedTradieCard — one saved tradie in the dashboard grid. Port of the card
 * in ~/bldesy-web/components/dashboard/saved-tradies-grid.tsx: avatar
 * (amber→orange fallback), name, suburb, unsave bookmark, trade badge,
 * "4.8 (12)" rating when reviews exist, and "View profile".
 */
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter, type Href } from 'expo-router';

import { Badge, Card } from '@/components/ui';
import { Colors, FontFamily, Radius, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { ROUTES } from '@/lib/routes';
import { formatTradeName } from '@/lib/web/trades';
import type { BuilderSearchResult } from '@/types';

export interface SavedTradie {
  user_id: string;
  slug: string | null;
  business_name: string;
  trade_category: string;
  suburb: string;
  profile_photo_url: string | null;
  average_rating: number | null;
  review_count: number;
}

/** A search-result row (with `_rating`) → the grid's card shape. */
export function toSavedTradie(b: BuilderSearchResult): SavedTradie {
  return {
    user_id: b.user_id,
    slug: b.slug ?? null,
    business_name: b.business_name,
    trade_category: b.trade_category,
    suburb: b.suburb,
    profile_photo_url: b.profile_photo_url ?? null,
    average_rating: b._rating ? b._rating.average : null,
    review_count: b._rating?.count ?? 0,
  };
}

interface SavedTradieCardProps {
  tradie: SavedTradie;
  onUnsave: () => void;
  /** Bookmark / hover accent — amber inside the customer dashboard, primary on /saved. */
  accent?: 'cta' | 'primary';
}

export function SavedTradieCard({ tradie: t, onUnsave, accent = 'cta' }: SavedTradieCardProps) {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];
  const router = useRouter();
  const amber = accent === 'primary' ? c.primary : scheme === 'dark' ? c.cta : c.ctaDark;

  return (
    <Card padding={Spacing.xl}>
      <View style={styles.top}>
        {t.profile_photo_url ? (
          <Image source={{ uri: t.profile_photo_url }} style={styles.avatar} contentFit="cover" accessibilityLabel={t.business_name} />
        ) : (
          <LinearGradient colors={['#F59E0B', '#F97316']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.avatar, styles.center]}>
            <Text style={styles.avatarInitial}>{t.business_name[0]?.toUpperCase() ?? '?'}</Text>
          </LinearGradient>
        )}
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text numberOfLines={1} style={[styles.name, { color: c.textPrimary }]}>
            {t.business_name}
          </Text>
          <Text style={[styles.suburb, { color: c.textSecondary }]}>{t.suburb}</Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Remove ${t.business_name} from saved`}
          onPress={onUnsave}
          hitSlop={6}
          style={({ pressed }) => [styles.bookmark, pressed && { backgroundColor: amber + '1A' }]}
        >
          <Ionicons name="bookmark" size={20} color={amber} />
        </Pressable>
      </View>

      <View style={styles.meta}>
        <Badge variant="trade">{formatTradeName(t.trade_category)}</Badge>
        {t.average_rating !== null ? (
          <View style={styles.rating}>
            <Ionicons name="star" size={14} color={c.cta} />
            <Text style={[styles.ratingText, { color: c.textPrimary }]}>
              {t.average_rating.toFixed(1)}{' '}
              <Text style={[styles.ratingCount, { color: c.textSecondary }]}>({t.review_count})</Text>
            </Text>
          </View>
        ) : null}
      </View>

      <Pressable
        accessibilityRole="link"
        onPress={() => router.push(ROUTES.builderProfile(t.user_id) as Href)}
        style={({ pressed }) => [styles.viewBtn, { borderColor: pressed ? amber : c.border }]}
      >
        {({ pressed }) => (
          <Text style={[styles.viewText, { color: pressed ? amber : c.textSecondary }]}>View profile</Text>
        )}
      </Pressable>
    </Card>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center' },
  top: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.md },
  avatar: { width: 48, height: 48, borderRadius: 24 },
  avatarInitial: { color: '#ffffff', fontSize: 16, fontFamily: FontFamily.bodyBold, fontWeight: '700' },
  name: { fontSize: 14, fontFamily: FontFamily.bodyBold, fontWeight: '700' },
  suburb: { fontSize: 12, fontFamily: FontFamily.body },
  bookmark: { padding: 6, borderRadius: Radius.full },
  meta: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: Spacing.sm, marginTop: Spacing.md },
  rating: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  ratingText: { fontSize: 12, fontFamily: FontFamily.bodySemiBold, fontWeight: '600' },
  ratingCount: { fontFamily: FontFamily.body, fontWeight: '400' },
  viewBtn: { marginTop: Spacing.lg, borderWidth: 1, borderRadius: Radius.xl, paddingVertical: 8, alignItems: 'center' },
  viewText: { fontSize: 12, fontFamily: FontFamily.bodyBold, fontWeight: '700' },
});
