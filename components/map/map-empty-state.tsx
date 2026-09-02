/**
 * MapEmptyState — ~/bldesy-web/components/map/map-empty-state.tsx: shown in
 * the results sheet when the current filter matches nobody. Copy verbatim.
 */
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter, type Href } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';

import { emptyStateHeadline } from '@/components/map/map-logic';
import { Colors, FontFamily, Radius, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { LAUNCH_DATE } from '@/lib/web/launch';
import { ROUTES } from '@/lib/routes';

interface MapEmptyStateProps {
  trade: string;
  specialty: string | null;
}

export function MapEmptyState({ trade, specialty }: MapEmptyStateProps) {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];
  const router = useRouter();

  return (
    <View style={styles.wrap}>
      <View style={[styles.bubble, { backgroundColor: c.primaryBg }]}>
        <Ionicons name="location-outline" size={24} color={c.primary} />
      </View>
      <Text style={[styles.headline, { color: c.textPrimary }]}>{emptyStateHeadline(trade, specialty)}</Text>
      <Text style={[styles.copy, { color: c.textSecondary }]}>
        BLDESY launches in {LAUNCH_DATE} — tradies are joining every week.
      </Text>
      <Pressable
        accessibilityRole="link"
        onPress={() => router.push(ROUTES.waitlist as Href)}
        style={({ pressed }) => [styles.btn, { backgroundColor: pressed ? c.primaryDark : c.primary }]}
      >
        <Text style={styles.btnText}>Join the waitlist</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    paddingHorizontal: Spacing['2xl'],
    paddingVertical: Spacing['4xl'],
  },
  bubble: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  headline: {
    fontFamily: FontFamily.bodySemiBold,
    fontWeight: '600',
    fontSize: 14,
    textAlign: 'center',
  },
  copy: {
    marginTop: 4,
    fontFamily: FontFamily.body,
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
  },
  btn: {
    marginTop: Spacing.lg,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.sm,
  },
  btnText: {
    color: '#ffffff',
    fontFamily: FontFamily.bodySemiBold,
    fontWeight: '600',
    fontSize: 12,
  },
});
