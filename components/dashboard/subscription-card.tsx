import { Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Ionicons from '@expo/vector-icons/Ionicons';

import { DashboardColors, DashboardFonts, DashboardShadows } from '@/constants/dashboard-theme';
import { mockSubscription } from '@/lib/dashboard-mock-data';

type Props = {
  onManage?: () => void;
  onUpgrade?: () => void;
};

export function SubscriptionCard({ onManage, onUpgrade }: Props) {
  const sub = mockSubscription;
  const isFree = sub.plan === 'Free';

  if (isFree) {
    return (
      <View style={styles.container}>
        <View style={[styles.card, styles.freeCard, DashboardShadows.subtle]}>
          <View style={styles.freeContent}>
            <Ionicons name="diamond-outline" size={20} color={DashboardColors.accent} />
            <View style={styles.freeText}>
              <Text style={styles.freeTitle}>Unlock premium features</Text>
              <Text style={styles.freeDesc}>
                Featured placement, priority support, and full analytics
              </Text>
            </View>
          </View>
          <Pressable
            onPress={onUpgrade}
            style={({ pressed }) => [pressed && { opacity: 0.8 }]}
          >
            <LinearGradient
              colors={[DashboardColors.accent, DashboardColors.accentLight]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.upgradeBtn}
            >
              <Text style={styles.upgradeBtnText}>Upgrade</Text>
              <Ionicons name="arrow-forward" size={14} color={DashboardColors.base} />
            </LinearGradient>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={[styles.card, DashboardShadows.subtle]}>
        <View style={styles.topRow}>
          <View style={styles.planInfo}>
            <Text style={styles.planName}>{sub.plan} Plan</Text>
            <Text style={styles.planPrice}>{sub.price}</Text>
          </View>
          <View style={styles.statusBadge}>
            <Text style={styles.statusText}>Active</Text>
          </View>
        </View>
        <View style={styles.bottomRow}>
          <Text style={styles.renewalText}>Renews {sub.renewalDate}</Text>
          <Pressable onPress={onManage} hitSlop={8} style={({ pressed }) => pressed && { opacity: 0.6 }}>
            <Text style={styles.manageLink}>Manage</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    marginTop: 20,
  },
  card: {
    backgroundColor: DashboardColors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: DashboardColors.border,
    borderLeftWidth: 3,
    borderLeftColor: DashboardColors.accent,
    padding: 16,
    gap: 10,
  },
  freeCard: {
    borderLeftColor: DashboardColors.warning,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  planInfo: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
  },
  planName: {
    fontFamily: DashboardFonts.bold,
    fontSize: 16,
    color: DashboardColors.textPrimary,
  },
  planPrice: {
    fontFamily: DashboardFonts.regular,
    fontSize: 13,
    color: DashboardColors.textMuted,
  },
  statusBadge: {
    backgroundColor: 'rgba(52,211,153,0.15)',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
  },
  statusText: {
    fontFamily: DashboardFonts.semiBold,
    fontSize: 12,
    color: DashboardColors.positive,
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  renewalText: {
    fontFamily: DashboardFonts.regular,
    fontSize: 13,
    color: DashboardColors.textMuted,
  },
  manageLink: {
    fontFamily: DashboardFonts.medium,
    fontSize: 13,
    color: DashboardColors.accent,
  },
  // Free plan variant
  freeContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  freeText: {
    flex: 1,
    gap: 2,
  },
  freeTitle: {
    fontFamily: DashboardFonts.semiBold,
    fontSize: 15,
    color: DashboardColors.textPrimary,
  },
  freeDesc: {
    fontFamily: DashboardFonts.regular,
    fontSize: 12,
    color: DashboardColors.textSecondary,
    lineHeight: 17,
  },
  upgradeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  upgradeBtnText: {
    fontFamily: DashboardFonts.semiBold,
    fontSize: 14,
    color: DashboardColors.base,
  },
});
