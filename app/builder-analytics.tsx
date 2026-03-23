import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { LineChart, BarChart } from 'react-native-gifted-charts';

import { DashboardColors, DashboardFonts, DashboardShadows } from '@/constants/dashboard-theme';

// ── Mock chart data (30 days) ────────────────────────────────────────

function generateLineData(base: number, variance: number) {
  return Array.from({ length: 30 }, (_, i) => ({
    value: Math.max(0, base + Math.round((Math.random() - 0.4) * variance)),
    label: i % 7 === 0 ? `${i + 1}` : '',
  }));
}

const viewsData = generateLineData(5, 8);
const quotesData = generateLineData(1, 3);
const searchData = generateLineData(30, 20);

const topKeywords = [
  { keyword: 'bathroom reno surry hills', count: 34 },
  { keyword: 'knock down rebuild sydney', count: 28 },
  { keyword: 'kitchen renovation newtown', count: 21 },
  { keyword: 'home builder inner west', count: 18 },
  { keyword: 'extension marrickville', count: 12 },
];

const trafficSources = [
  { source: 'Search Results', percent: 52, icon: 'search-outline' as const },
  { source: 'Map View', percent: 24, icon: 'map-outline' as const },
  { source: 'AI Assist', percent: 15, icon: 'sparkles-outline' as const },
  { source: 'Direct Link', percent: 9, icon: 'link-outline' as const },
];

const competitorData = {
  yourViews: 147,
  avgViews: 89,
  yourQuotes: 23,
  avgQuotes: 14,
};

// ── Component ────────────────────────────────────────────────────────

export default function BuilderAnalyticsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const chartConfig = {
    color: DashboardColors.accent,
    thickness: 2,
    hideDataPoints: false,
    dataPointsColor: DashboardColors.accent,
    dataPointsRadius: 3,
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          hitSlop={12}
          style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.6 }]}
        >
          <Ionicons name="chevron-back" size={24} color={DashboardColors.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle}>Analytics</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Views Chart */}
        <View style={[styles.card, DashboardShadows.subtle]}>
          <Text style={styles.cardTitle}>Profile Views</Text>
          <Text style={styles.cardSubtitle}>Last 30 days</Text>
          <View style={styles.chartWrap}>
            <LineChart
              data={viewsData}
              width={280}
              height={150}
              spacing={9}
              color={DashboardColors.accent}
              thickness={2}
              hideDataPoints={false}
              dataPointsColor={DashboardColors.accent}
              dataPointsRadius={3}
              startFillColor={DashboardColors.accent}
              endFillColor={DashboardColors.base}
              startOpacity={0.3}
              endOpacity={0.05}
              areaChart
              yAxisColor="transparent"
              xAxisColor={DashboardColors.border}
              yAxisTextStyle={styles.axisText}
              xAxisLabelTextStyle={styles.axisText}
              noOfSections={4}
              rulesColor={DashboardColors.border}
              rulesType="dashed"
            />
          </View>
        </View>

        {/* Quote Requests Chart */}
        <View style={[styles.card, DashboardShadows.subtle]}>
          <Text style={styles.cardTitle}>Quote Requests</Text>
          <Text style={styles.cardSubtitle}>Last 30 days</Text>
          <View style={styles.chartWrap}>
            <LineChart
              data={quotesData}
              width={280}
              height={150}
              spacing={9}
              color={DashboardColors.positive}
              thickness={2}
              hideDataPoints={false}
              dataPointsColor={DashboardColors.positive}
              dataPointsRadius={3}
              startFillColor={DashboardColors.positive}
              endFillColor={DashboardColors.base}
              startOpacity={0.3}
              endOpacity={0.05}
              areaChart
              yAxisColor="transparent"
              xAxisColor={DashboardColors.border}
              yAxisTextStyle={styles.axisText}
              xAxisLabelTextStyle={styles.axisText}
              noOfSections={4}
              rulesColor={DashboardColors.border}
              rulesType="dashed"
            />
          </View>
        </View>

        {/* Search Appearances Bar Chart */}
        <View style={[styles.card, DashboardShadows.subtle]}>
          <Text style={styles.cardTitle}>Search Appearances</Text>
          <Text style={styles.cardSubtitle}>Last 30 days</Text>
          <View style={styles.chartWrap}>
            <BarChart
              data={searchData.filter((_, i) => i % 3 === 0).map(d => ({
                value: d.value,
                frontColor: DashboardColors.accent,
              }))}
              width={280}
              height={150}
              barWidth={16}
              spacing={12}
              yAxisColor="transparent"
              xAxisColor={DashboardColors.border}
              yAxisTextStyle={styles.axisText}
              noOfSections={4}
              rulesColor={DashboardColors.border}
              rulesType="dashed"
              barBorderRadius={4}
            />
          </View>
        </View>

        {/* Top Search Keywords */}
        <View style={[styles.card, DashboardShadows.subtle]}>
          <Text style={styles.cardTitle}>Top Search Keywords</Text>
          <Text style={styles.cardSubtitle}>What customers searched to find you</Text>
          <View style={styles.keywordList}>
            {topKeywords.map((kw, i) => {
              const maxCount = topKeywords[0].count;
              const widthPercent = (kw.count / maxCount) * 100;
              return (
                <View key={kw.keyword} style={styles.keywordRow}>
                  <Text style={styles.keywordRank}>#{i + 1}</Text>
                  <View style={styles.keywordBarWrap}>
                    <View style={[styles.keywordBar, { width: `${widthPercent}%` }]} />
                    <Text style={styles.keywordText} numberOfLines={1}>{kw.keyword}</Text>
                  </View>
                  <Text style={styles.keywordCount}>{kw.count}</Text>
                </View>
              );
            })}
          </View>
        </View>

        {/* Traffic Sources */}
        <View style={[styles.card, DashboardShadows.subtle]}>
          <Text style={styles.cardTitle}>Traffic Sources</Text>
          <Text style={styles.cardSubtitle}>Where your views come from</Text>
          <View style={styles.sourcesList}>
            {trafficSources.map(src => (
              <View key={src.source} style={styles.sourceRow}>
                <View style={styles.sourceIcon}>
                  <Ionicons name={src.icon} size={16} color={DashboardColors.accent} />
                </View>
                <Text style={styles.sourceName}>{src.source}</Text>
                <View style={styles.sourceBarWrap}>
                  <View style={[styles.sourceBar, { width: `${src.percent}%` }]} />
                </View>
                <Text style={styles.sourcePercent}>{src.percent}%</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Competitor Comparison */}
        <View style={[styles.card, DashboardShadows.subtle]}>
          <Text style={styles.cardTitle}>vs. Area Average</Text>
          <Text style={styles.cardSubtitle}>How you compare to similar builders nearby</Text>
          <View style={styles.compGrid}>
            <View style={styles.compItem}>
              <Text style={styles.compLabel}>Your Views</Text>
              <Text style={styles.compValue}>{competitorData.yourViews}</Text>
            </View>
            <View style={styles.compItem}>
              <Text style={styles.compLabel}>Avg Views</Text>
              <Text style={[styles.compValue, styles.compValueMuted]}>{competitorData.avgViews}</Text>
            </View>
            <View style={styles.compItem}>
              <Text style={styles.compLabel}>Your Quotes</Text>
              <Text style={styles.compValue}>{competitorData.yourQuotes}</Text>
            </View>
            <View style={styles.compItem}>
              <Text style={styles.compLabel}>Avg Quotes</Text>
              <Text style={[styles.compValue, styles.compValueMuted]}>{competitorData.avgQuotes}</Text>
            </View>
          </View>
          <View style={styles.compBanner}>
            <Ionicons name="trending-up" size={16} color={DashboardColors.positive} />
            <Text style={styles.compBannerText}>
              You're outperforming {Math.round(((competitorData.yourViews - competitorData.avgViews) / competitorData.avgViews) * 100)}% above average
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: DashboardColors.base,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: DashboardColors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontFamily: DashboardFonts.bold,
    fontSize: 20,
    color: DashboardColors.textPrimary,
  },
  scroll: {
    paddingHorizontal: 20,
    paddingBottom: 100,
    gap: 16,
  },
  card: {
    backgroundColor: DashboardColors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: DashboardColors.border,
    padding: 16,
  },
  cardTitle: {
    fontFamily: DashboardFonts.semiBold,
    fontSize: 16,
    color: DashboardColors.textPrimary,
  },
  cardSubtitle: {
    fontFamily: DashboardFonts.regular,
    fontSize: 12,
    color: DashboardColors.textMuted,
    marginTop: 2,
    marginBottom: 12,
  },
  chartWrap: {
    marginLeft: -10,
    overflow: 'hidden',
  },
  axisText: {
    fontFamily: DashboardFonts.regular,
    fontSize: 10,
    color: DashboardColors.textMuted,
  },

  // Keywords
  keywordList: {
    gap: 8,
  },
  keywordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  keywordRank: {
    fontFamily: DashboardFonts.semiBold,
    fontSize: 12,
    color: DashboardColors.textMuted,
    width: 22,
  },
  keywordBarWrap: {
    flex: 1,
    height: 28,
    backgroundColor: DashboardColors.accentDim,
    borderRadius: 6,
    justifyContent: 'center',
    overflow: 'hidden',
  },
  keywordBar: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: DashboardColors.accentDim,
    borderRadius: 6,
  },
  keywordText: {
    fontFamily: DashboardFonts.regular,
    fontSize: 12,
    color: DashboardColors.textPrimary,
    paddingHorizontal: 8,
  },
  keywordCount: {
    fontFamily: DashboardFonts.semiBold,
    fontSize: 13,
    color: DashboardColors.accent,
    width: 28,
    textAlign: 'right',
  },

  // Traffic Sources
  sourcesList: {
    gap: 10,
  },
  sourceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sourceIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: DashboardColors.accentDim,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sourceName: {
    fontFamily: DashboardFonts.regular,
    fontSize: 13,
    color: DashboardColors.textPrimary,
    width: 100,
  },
  sourceBarWrap: {
    flex: 1,
    height: 6,
    backgroundColor: DashboardColors.border,
    borderRadius: 3,
    overflow: 'hidden',
  },
  sourceBar: {
    height: '100%',
    backgroundColor: DashboardColors.accent,
    borderRadius: 3,
  },
  sourcePercent: {
    fontFamily: DashboardFonts.semiBold,
    fontSize: 13,
    color: DashboardColors.textSecondary,
    width: 36,
    textAlign: 'right',
  },

  // Competitor
  compGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  compItem: {
    width: '46%',
    backgroundColor: DashboardColors.surfaceLight,
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    gap: 4,
  },
  compLabel: {
    fontFamily: DashboardFonts.regular,
    fontSize: 12,
    color: DashboardColors.textMuted,
  },
  compValue: {
    fontFamily: DashboardFonts.bold,
    fontSize: 24,
    color: DashboardColors.textPrimary,
  },
  compValueMuted: {
    color: DashboardColors.textSecondary,
  },
  compBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
    backgroundColor: 'rgba(52,211,153,0.1)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  compBannerText: {
    fontFamily: DashboardFonts.medium,
    fontSize: 13,
    color: DashboardColors.positive,
  },
});
