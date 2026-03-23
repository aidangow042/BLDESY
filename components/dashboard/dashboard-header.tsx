import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Ionicons from '@expo/vector-icons/Ionicons';

import { DashboardColors, DashboardFonts } from '@/constants/dashboard-theme';

type Props = {
  businessName: string;
  profilePhotoUrl: string | null;
  notificationCount: number;
  isAvailable?: boolean;
  onBellPress?: () => void;
  onHamburgerPress?: () => void;
};

export function DashboardHeader({
  businessName,
  profilePhotoUrl,
  notificationCount,
  isAvailable = false,
  onBellPress,
  onHamburgerPress,
}: Props) {
  const insets = useSafeAreaInsets();

  return (
    <LinearGradient
      colors={[DashboardColors.base, DashboardColors.surface]}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
      style={[styles.container, { paddingTop: insets.top + 12 }]}
    >
      {/* Subtle grain texture */}
      <View style={styles.grainLayer} pointerEvents="none">
        {Array.from({ length: 6 }).map((_, row) => (
          <View key={row} style={styles.grainRow}>
            {Array.from({ length: 10 }).map((_, col) => (
              <View key={col} style={styles.grainDot} />
            ))}
          </View>
        ))}
      </View>

      <View style={styles.content}>
        {/* Left — hamburger + titles */}
        {onHamburgerPress && (
          <Pressable
            onPress={onHamburgerPress}
            hitSlop={10}
            style={({ pressed }) => [styles.hamburgerBtn, pressed && { opacity: 0.6 }]}
            accessibilityRole="button"
            accessibilityLabel="Open menu"
          >
            <Ionicons name="menu" size={24} color={DashboardColors.textPrimary} />
          </Pressable>
        )}
        <View style={styles.titleGroup}>
          <Text style={styles.title}>Dashboard</Text>
          <Text style={styles.subtitle}>
            Welcome back, {businessName || 'Builder'}
          </Text>
        </View>

        {/* Right — bell + avatar */}
        <View style={styles.rightGroup}>
          {/* Notification bell */}
          <Pressable
            onPress={onBellPress}
            hitSlop={12}
            style={({ pressed }) => [styles.bellWrap, pressed && { opacity: 0.6 }]}
            accessibilityRole="button"
            accessibilityLabel={`Notifications, ${notificationCount} unread`}
          >
            <Ionicons name="notifications-outline" size={24} color={DashboardColors.textPrimary} />
            {notificationCount > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>
                  {notificationCount > 99 ? '99+' : notificationCount}
                </Text>
              </View>
            )}
          </Pressable>

          {/* Profile photo */}
          <View style={styles.avatarWrap}>
            {profilePhotoUrl ? (
              <Image source={{ uri: profilePhotoUrl }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, styles.avatarFallback]}>
                <Ionicons name="person" size={22} color={DashboardColors.textSecondary} />
              </View>
            )}
            {isAvailable && <View style={styles.onlineDot} />}
          </View>
        </View>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingBottom: 20,
    paddingHorizontal: 20,
    overflow: 'hidden',
  },
  grainLayer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'space-evenly',
    opacity: 0.35,
  },
  grainRow: {
    flexDirection: 'row',
    justifyContent: 'space-evenly',
  },
  grainDot: {
    width: 1.5,
    height: 1.5,
    borderRadius: 0.75,
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  content: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  hamburgerBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  titleGroup: {
    flex: 1,
    marginRight: 16,
  },
  title: {
    fontFamily: DashboardFonts.bold,
    fontSize: 28,
    color: DashboardColors.textPrimary,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontFamily: DashboardFonts.regular,
    fontSize: 14,
    color: DashboardColors.textSecondary,
    marginTop: 2,
  },
  rightGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  bellWrap: {
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: -5,
    right: -7,
    backgroundColor: DashboardColors.badgeRed,
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: DashboardColors.base,
  },
  badgeText: {
    fontFamily: DashboardFonts.bold,
    fontSize: 10,
    color: '#fff',
  },
  avatarWrap: {
    position: 'relative',
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: DashboardColors.accent,
  },
  avatarFallback: {
    backgroundColor: DashboardColors.surfaceLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  onlineDot: {
    position: 'absolute',
    bottom: 1,
    right: 1,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: DashboardColors.onlineDot,
    borderWidth: 2,
    borderColor: DashboardColors.base,
  },
});
