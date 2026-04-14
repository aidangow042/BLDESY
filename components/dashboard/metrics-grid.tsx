import { Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import { DashboardColors, DashboardFonts } from '@/constants/dashboard-theme';
import { MetricCard } from './metric-card';
import { useDashboardMetrics } from '@/lib/dashboard-data';

type Props = {
  userId: string | null;
  onViewAnalytics?: () => void;
  onCardPress?: (metric: string) => void;
};

export function MetricsGrid({ userId, onViewAnalytics, onCardPress }: Props) {
  const { metrics: m } = useDashboardMetrics(userId);

  return (
    <View style={styles.container}>
      {/* Row 1 */}
      <View style={styles.row}>
        <MetricCard
          icon="bookmark-outline"
          value={m.saves.value.toLocaleString()}
          label="Profile Saves"
          change={m.saves.change}
          onPress={() => onCardPress?.('saves')}
        />
        <MetricCard
          icon="mail-outline"
          value={m.applications.value.toLocaleString()}
          label="Applications"
          change={m.applications.change}
          onPress={() => onCardPress?.('applications')}
        />
      </View>

      {/* View full analytics link */}
      <Pressable
        onPress={onViewAnalytics}
        hitSlop={8}
        style={({ pressed }) => [styles.analyticsLink, pressed && { opacity: 0.6 }]}
      >
        <Text style={styles.analyticsText}>View full analytics</Text>
        <Ionicons name="arrow-forward" size={14} color={DashboardColors.accent} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingTop: 20,
    gap: 12,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  analyticsLink: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-end',
    gap: 4,
    paddingVertical: 4,
  },
  analyticsText: {
    fontFamily: DashboardFonts.medium,
    fontSize: 13,
    color: DashboardColors.accent,
  },
});
