import { Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import { DashboardColors, DashboardFonts } from '@/constants/dashboard-theme';
import { MetricCard } from './metric-card';
import { mockMetrics, mockCompetitorRank } from '@/lib/dashboard-mock-data';

type Props = {
  onViewAnalytics?: () => void;
  onCardPress?: (metric: string) => void;
};

export function MetricsGrid({ onViewAnalytics, onCardPress }: Props) {
  const m = mockMetrics;
  const rank = mockCompetitorRank;

  return (
    <View style={styles.container}>
      {/* Row 1 */}
      <View style={styles.row}>
        <MetricCard
          icon="eye-outline"
          value={m.profileViews.value.toLocaleString()}
          label="Profile Views"
          change={m.profileViews.change}
          onPress={() => onCardPress?.('profileViews')}
        />
        <MetricCard
          icon="mail-outline"
          value={m.quoteRequests.value.toLocaleString()}
          label="Quote Requests"
          change={m.quoteRequests.change}
          onPress={() => onCardPress?.('quoteRequests')}
        />
      </View>

      {/* Row 2 */}
      <View style={styles.row}>
        <MetricCard
          icon="search-outline"
          value={m.searchAppearances.value.toLocaleString()}
          label="Search Hits"
          change={m.searchAppearances.change}
          onPress={() => onCardPress?.('searchAppearances')}
        />
        <MetricCard
          icon="podium-outline"
          value={`#${rank.rank}`}
          label="Area Rank"
          subtitle={`of ${rank.total} in ${rank.area}`}
          onPress={() => onCardPress?.('competitorRank')}
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
