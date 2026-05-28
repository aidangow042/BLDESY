/**
 * Tier chip — small pill showing the user's current subscription tier
 * (or "Free") in the side drawer profile section. Tap to open billing.
 */
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';

import { Colors, Radius } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import {
  isSubscriptionActive,
  useEnterpriseSubscription,
  useTradieSubscription,
} from '@/lib/subscription';
import {
  enterpriseTier,
  tradieTier,
  type EnterpriseTierKey,
  type TradieTierKey,
} from '@/lib/pricing-tiers-client';

function daysUntil(unix: number | null): number | null {
  if (!unix) return null;
  return Math.floor((unix * 1000 - Date.now()) / 86_400_000);
}

interface Props {
  /** Which side to surface. Defaults to whichever has an active sub. */
  side?: 'tradie' | 'enterprise';
  onPress?: () => void;
}

export function TierChip({ side: forcedSide, onPress }: Props) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const colors = Colors[isDark ? 'dark' : 'light'];
  const router = useRouter();
  const tradie = useTradieSubscription();
  const enterprise = useEnterpriseSubscription();

  const side: 'tradie' | 'enterprise' =
    forcedSide ?? (isSubscriptionActive(tradie.status)
      ? 'tradie'
      : isSubscriptionActive(enterprise.status)
        ? 'enterprise'
        : 'tradie');
  const state = side === 'tradie' ? tradie : enterprise;

  let label = 'Free';
  let dotColor = colors.icon;
  let cancelHint: string | null = null;

  if (isSubscriptionActive(state.status) && state.tier) {
    try {
      const tierMeta =
        side === 'tradie'
          ? tradieTier(state.tier as TradieTierKey)
          : enterpriseTier(state.tier as EnterpriseTierKey);
      label = `${tierMeta.name} · ${state.interval === 'annual' ? 'Annual' : 'Monthly'}`;
    } catch {
      label = 'Subscribed';
    }
    dotColor = colors.teal;
  }

  if (isSubscriptionActive(state.status) && state.cancelAtPeriodEnd) {
    const d = daysUntil(state.currentPeriodEnd);
    cancelHint = d !== null && d > 0 ? `Cancels in ${d}d` : 'Cancels soon';
    dotColor = colors.warning ?? '#d97706';
  }

  function handlePress() {
    if (onPress) onPress();
    else router.push('/billing' as any);
  }

  return (
    <Pressable
      onPress={handlePress}
      style={[
        styles.chip,
        {
          backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.18)',
          borderColor: 'rgba(255,255,255,0.18)',
        },
      ]}
    >
      <View style={[styles.dot, { backgroundColor: dotColor }]} />
      <Text style={styles.label} numberOfLines={1}>
        {label}
        {cancelHint ? ` · ${cancelHint}` : ''}
      </Text>
      <Ionicons name="chevron-forward" size={14} color="#fff" style={{ opacity: 0.75 }} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: Radius.full,
    borderWidth: 1,
    alignSelf: 'flex-start',
    maxWidth: '100%',
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  label: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: -0.2,
    flexShrink: 1,
  },
});
