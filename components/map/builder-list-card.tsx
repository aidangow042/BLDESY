/**
 * BuilderListCard — ~/bldesy-web/components/map/builder-list.tsx: the compact
 * row in the results sheet (avatar or trade-coloured initials, name, Verified,
 * score, trade pill, availability dot, suburb + distance, "View").
 */
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { useRouter, type Href } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';

import { formatDistanceKm, initials } from '@/components/map/map-logic';
import { availabilityTone } from '@/components/search/availability-tone';
import { Colors, FontFamily, Radius, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import type { MapBuilder } from '@/lib/data/map';
import { ROUTES } from '@/lib/routes';
import { getTradeColour } from '@/lib/web/trade-colours';

interface BuilderListCardProps {
  builder: MapBuilder;
  selected: boolean;
  onSelect: () => void;
  distanceKm?: number | null;
}

export function BuilderListCard({ builder: b, selected, onSelect, distanceKm }: BuilderListCardProps) {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];
  const router = useRouter();
  const colour = getTradeColour(b.trade_category);
  const avail = availabilityTone(b.availability, c);
  const score = b.display_bldesy_score ? b.bldesy_score : null;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onSelect}
      style={[
        styles.card,
        selected
          ? { borderColor: c.primary, backgroundColor: c.primary + '0D' }
          : { borderColor: c.border, backgroundColor: c.surface },
      ]}
    >
      {b.profile_photo_url ? (
        <Image source={{ uri: b.profile_photo_url }} style={styles.avatar} contentFit="cover" cachePolicy="memory-disk" />
      ) : (
        <View style={[styles.avatar, styles.initials, { backgroundColor: colour }]}>
          <Text style={styles.initialsText}>{initials(b.business_name)}</Text>
        </View>
      )}
      <View style={styles.body}>
        <View style={styles.nameRow}>
          <Text style={[styles.name, { color: c.textPrimary }]} numberOfLines={1}>
            {b.business_name}
          </Text>
          {b.credentials_verified ? (
            <View style={styles.verified}>
              <Ionicons name="checkmark-circle" size={12} color={c.success} />
              <Text style={[styles.verifiedText, { color: c.success }]}>Verified</Text>
            </View>
          ) : null}
          {score != null ? (
            <View style={[styles.score, { backgroundColor: c.primaryBg }]}>
              <Text style={[styles.scoreText, { color: c.primary }]}>{score}</Text>
            </View>
          ) : null}
        </View>
        <View style={styles.metaRow}>
          <View style={[styles.tradePill, { backgroundColor: colour }]}>
            <Text style={styles.tradePillText}>{b.trade_category}</Text>
          </View>
          <View style={[styles.dot, { backgroundColor: avail.dot }]} />
          <Text style={[styles.suburb, { color: c.textSecondary }]} numberOfLines={1}>
            {b.suburb}
            {distanceKm != null ? ` · ${formatDistanceKm(distanceKm)} km` : ''}
          </Text>
        </View>
      </View>
      <Pressable
        accessibilityRole="link"
        onPress={() => router.push(ROUTES.builderProfile(b.id) as Href)}
        hitSlop={8}
      >
        <Text style={[styles.view, { color: c.primary }]}>View</Text>
      </Pressable>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    borderWidth: 1,
    borderRadius: Radius.xl,
    padding: Spacing.md,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  initials: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  initialsText: {
    color: '#ffffff',
    fontFamily: FontFamily.bodyBold,
    fontWeight: '700',
    fontSize: 12,
  },
  body: {
    flex: 1,
    minWidth: 0,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  name: {
    flexShrink: 1,
    fontFamily: FontFamily.bodySemiBold,
    fontWeight: '600',
    fontSize: 12,
  },
  verified: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  verifiedText: {
    fontFamily: FontFamily.bodySemiBold,
    fontWeight: '600',
    fontSize: 10,
  },
  score: {
    borderRadius: Radius.full,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  scoreText: {
    fontFamily: FontFamily.bodyBold,
    fontWeight: '700',
    fontSize: 10,
    fontVariant: ['tabular-nums'],
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  tradePill: {
    borderRadius: Radius.sm,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  tradePillText: {
    color: '#ffffff',
    fontFamily: FontFamily.bodyBold,
    fontWeight: '700',
    fontSize: 10,
    textTransform: 'capitalize',
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  suburb: {
    flexShrink: 1,
    fontFamily: FontFamily.body,
    fontSize: 11,
  },
  view: {
    fontFamily: FontFamily.bodySemiBold,
    fontWeight: '600',
    fontSize: 11,
  },
});
