import { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Ionicons from '@expo/vector-icons/Ionicons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { DashboardColors, DashboardFonts, DashboardShadows } from '@/constants/dashboard-theme';
import { mockAICoachTip } from '@/lib/dashboard-mock-data';

type Props = {
  onGetCoaching?: () => void;
};

export function AICoachCard({ onGetCoaching }: Props) {
  const sparkleOpacity = useSharedValue(1);

  useEffect(() => {
    sparkleOpacity.value = withRepeat(
      withSequence(
        withTiming(0.4, { duration: 1200 }),
        withTiming(1, { duration: 1200 }),
      ),
      -1,
      true,
    );
  }, []);

  const sparkleStyle = useAnimatedStyle(() => ({
    opacity: sparkleOpacity.value,
  }));

  return (
    <View style={styles.wrapper}>
      {/* Gradient border */}
      <LinearGradient
        colors={[DashboardColors.accent, DashboardColors.surfaceLight]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradientBorder}
      >
        <View style={[styles.card, DashboardShadows.card]}>
          {/* Header row */}
          <View style={styles.headerRow}>
            <Animated.View style={sparkleStyle}>
              <Ionicons name="sparkles" size={22} color={DashboardColors.accent} />
            </Animated.View>
            <View style={styles.titleGroup}>
              <Text style={styles.title}>AI Coach</Text>
              <Text style={styles.poweredBy}>Powered by Claude</Text>
            </View>
          </View>

          {/* Suggestion */}
          <Text style={styles.suggestion}>{mockAICoachTip}</Text>

          {/* CTA */}
          <Pressable
            onPress={onGetCoaching}
            style={({ pressed }) => [styles.ctaBtn, pressed && { opacity: 0.7 }]}
            accessibilityRole="button"
            accessibilityLabel="Get AI coaching"
          >
            <Text style={styles.ctaText}>Get coaching</Text>
            <Ionicons name="arrow-forward" size={14} color={DashboardColors.base} />
          </Pressable>
        </View>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    paddingHorizontal: 20,
    marginTop: 16,
  },
  gradientBorder: {
    borderRadius: 17,
    padding: 1.5,
  },
  card: {
    backgroundColor: DashboardColors.surface,
    borderRadius: 16,
    padding: 16,
    gap: 12,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  titleGroup: {
    flex: 1,
  },
  title: {
    fontFamily: DashboardFonts.semiBold,
    fontSize: 16,
    color: DashboardColors.accent,
  },
  poweredBy: {
    fontFamily: DashboardFonts.regular,
    fontSize: 11,
    color: DashboardColors.textMuted,
    fontStyle: 'italic',
  },
  suggestion: {
    fontFamily: DashboardFonts.regular,
    fontSize: 13,
    color: DashboardColors.textSecondary,
    lineHeight: 19,
  },
  ctaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    backgroundColor: DashboardColors.accent,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  ctaText: {
    fontFamily: DashboardFonts.semiBold,
    fontSize: 13,
    color: DashboardColors.base,
  },
});
