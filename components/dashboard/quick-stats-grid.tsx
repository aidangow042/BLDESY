/**
 * QuickStatsGrid — the builder dashboard's animated headline metrics.
 * A 2×2 grid of accent-barred cards with count-up numbers that overlaps up
 * onto the teal header (marginTop negative), mirroring the enterprise hub.
 * Presentational: the screen owns the queries and passes the values in.
 */
import { useEffect, useRef, useState } from 'react';
import { Animated, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import { Colors, Radius, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export type QuickStat = {
  key: string;
  label: string;
  value: number;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  accent: string;
  tint: string;
  onPress?: () => void;
};

function CountUp({ to, color }: { to: number; color: string }) {
  const anim = useRef(new Animated.Value(0)).current;
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    anim.setValue(0);
    Animated.timing(anim, { toValue: to, duration: 800, useNativeDriver: false }).start();
    const id = anim.addListener(({ value }) => setDisplay(Math.round(value)));
    return () => anim.removeListener(id);
  }, [to]);

  return <Text style={[styles.metricValue, { color }]}>{display}</Text>;
}

export function QuickStatsGrid({ stats }: { stats: QuickStat[] }) {
  const scheme = useColorScheme() ?? 'light';
  const isDark = scheme === 'dark';
  const colors = Colors[scheme];

  return (
    <View style={styles.row}>
      {stats.map((s) => (
        <Pressable
          key={s.key}
          onPress={s.onPress}
          disabled={!s.onPress}
          style={({ pressed }) => [
            styles.card,
            {
              backgroundColor: isDark ? colors.surface : '#fff',
              borderColor: isDark ? colors.border : '#e2e8f0',
            },
            pressed && s.onPress ? { transform: [{ scale: 0.98 }] } : null,
          ]}
          accessibilityRole={s.onPress ? 'button' : undefined}
          accessibilityLabel={`${s.label}: ${s.value}`}
        >
          {/* Accent top border */}
          <View style={[styles.accent, { backgroundColor: s.accent }]} />
          <View style={[styles.iconWrap, { backgroundColor: s.tint }]}>
            <Ionicons name={s.icon} size={18} color={s.accent} />
          </View>
          <CountUp to={s.value} color={isDark ? colors.text : '#0f172a'} />
          <Text style={[styles.label, { color: colors.textSecondary }]} numberOfLines={1}>
            {s.label}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.xl,
    marginTop: -Spacing.xl,
  },
  card: {
    width: '47.5%',
    borderWidth: 1,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    gap: 6,
    overflow: 'hidden',
    ...Platform.select({
      ios: { shadowColor: '#0f172a', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8 },
      android: { elevation: 3 },
      default: {},
    }),
  },
  accent: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 3,
  },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metricValue: {
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.8,
    lineHeight: 32,
  },
  label: {
    fontSize: 12,
    fontWeight: '500',
    letterSpacing: 0.2,
  },
});
