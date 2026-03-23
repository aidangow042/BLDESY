import { Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import { DashboardColors, DashboardFonts, DashboardShadows } from '@/constants/dashboard-theme';

type Props = {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  value: string;
  label: string;
  change?: number; // percentage — positive = green, negative = red
  subtitle?: string; // for competitor rank variant
  onPress?: () => void;
};

export function MetricCard({ icon, value, label, change, subtitle, onPress }: Props) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && { opacity: 0.8 }, DashboardShadows.subtle]}
      accessibilityRole="button"
      accessibilityLabel={`${label}: ${value}`}
    >
      {/* Icon */}
      <View style={styles.iconCircle}>
        <Ionicons name={icon} size={18} color={DashboardColors.accent} />
      </View>

      {/* Value */}
      <Text style={styles.value}>{value}</Text>

      {/* Subtitle (competitor rank area) */}
      {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}

      {/* Label */}
      <Text style={styles.label}>{label}</Text>

      {/* Change indicator */}
      {change !== undefined && (
        <View style={styles.changeRow}>
          <Ionicons
            name={change >= 0 ? 'arrow-up' : 'arrow-down'}
            size={11}
            color={change >= 0 ? DashboardColors.positive : DashboardColors.negative}
          />
          <Text
            style={[
              styles.changeText,
              { color: change >= 0 ? DashboardColors.positive : DashboardColors.negative },
            ]}
          >
            {Math.abs(change).toFixed(1)}%
          </Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: DashboardColors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: DashboardColors.border,
    padding: 14,
    gap: 2,
  },
  iconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: DashboardColors.accentDim,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  value: {
    fontFamily: DashboardFonts.bold,
    fontSize: 28,
    color: DashboardColors.textPrimary,
    letterSpacing: -0.5,
    lineHeight: 32,
  },
  subtitle: {
    fontFamily: DashboardFonts.regular,
    fontSize: 11,
    color: DashboardColors.textMuted,
    marginTop: -1,
  },
  label: {
    fontFamily: DashboardFonts.medium,
    fontSize: 11,
    color: DashboardColors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 2,
  },
  changeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    marginTop: 4,
  },
  changeText: {
    fontFamily: DashboardFonts.semiBold,
    fontSize: 12,
  },
});
