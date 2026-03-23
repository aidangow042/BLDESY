import { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import Animated, {
  useSharedValue,
  useAnimatedProps,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import Ionicons from '@expo/vector-icons/Ionicons';

import { DashboardColors, DashboardFonts, DashboardShadows } from '@/constants/dashboard-theme';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const SIZE = 120;
const STROKE = 10;
const RADIUS = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

type Tip = {
  text: string;
  points: number;
  onPress?: () => void;
};

type Props = {
  score: number; // 0-100
  tips: Tip[];
};

function getGaugeColor(score: number): string {
  if (score >= 75) return DashboardColors.positive;
  if (score >= 50) return DashboardColors.warning;
  return DashboardColors.negative;
}

export function HealthGauge({ score, tips }: Props) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withTiming(score / 100, {
      duration: 800,
      easing: Easing.out(Easing.cubic),
    });
  }, [score]);

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: CIRCUMFERENCE * (1 - progress.value),
  }));

  const gaugeColor = getGaugeColor(score);

  return (
    <View style={[styles.card, DashboardShadows.subtle]}>
      <View style={styles.topRow}>
        {/* Gauge */}
        <View style={styles.gaugeWrap}>
          <Svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}>
            {/* Track */}
            <Circle
              cx={SIZE / 2}
              cy={SIZE / 2}
              r={RADIUS}
              stroke={DashboardColors.border}
              strokeWidth={STROKE}
              fill="none"
            />
            {/* Fill */}
            <AnimatedCircle
              cx={SIZE / 2}
              cy={SIZE / 2}
              r={RADIUS}
              stroke={gaugeColor}
              strokeWidth={STROKE}
              fill="none"
              strokeDasharray={CIRCUMFERENCE}
              animatedProps={animatedProps}
              strokeLinecap="round"
              rotation="-90"
              origin={`${SIZE / 2}, ${SIZE / 2}`}
            />
          </Svg>
          {/* Centre label */}
          <View style={styles.gaugeCenter}>
            <Text style={styles.gaugeScore}>{score}</Text>
            <Text style={styles.gaugeMax}>/100</Text>
          </View>
        </View>

        {/* Right side — label + tips */}
        <View style={styles.tipsColumn}>
          <Text style={styles.healthLabel}>Profile Health</Text>
          {tips.slice(0, 3).map((tip) => (
            <Pressable
              key={tip.text}
              onPress={tip.onPress}
              style={({ pressed }) => [styles.tipRow, pressed && { opacity: 0.6 }]}
            >
              <Ionicons name="add-circle-outline" size={14} color={DashboardColors.accent} />
              <Text style={styles.tipText} numberOfLines={2}>
                {tip.text}
                <Text style={styles.tipPoints}> +{tip.points} pts</Text>
              </Text>
            </Pressable>
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 20,
    marginTop: 16,
    backgroundColor: DashboardColors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: DashboardColors.border,
    padding: 16,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  gaugeWrap: {
    width: SIZE,
    height: SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gaugeCenter: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gaugeScore: {
    fontFamily: DashboardFonts.bold,
    fontSize: 32,
    color: DashboardColors.textPrimary,
    lineHeight: 36,
  },
  gaugeMax: {
    fontFamily: DashboardFonts.regular,
    fontSize: 13,
    color: DashboardColors.textMuted,
    marginTop: -2,
  },
  tipsColumn: {
    flex: 1,
    gap: 8,
  },
  healthLabel: {
    fontFamily: DashboardFonts.semiBold,
    fontSize: 15,
    color: DashboardColors.textPrimary,
    marginBottom: 2,
  },
  tipRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
  },
  tipText: {
    fontFamily: DashboardFonts.regular,
    fontSize: 12,
    color: DashboardColors.textSecondary,
    flex: 1,
    lineHeight: 16,
  },
  tipPoints: {
    fontFamily: DashboardFonts.semiBold,
    color: DashboardColors.accent,
  },
});
