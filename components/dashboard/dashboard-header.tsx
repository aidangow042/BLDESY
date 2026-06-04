import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Ionicons from '@expo/vector-icons/Ionicons';

import { Colors, FontFamily, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

type Props = {
  businessName: string;
  profilePhotoUrl: string | null;
  notificationCount: number;
  isAvailable?: boolean;
  onBellPress?: () => void;
  onHamburgerPress?: () => void;
};

// Bold, branded teal header (mirrors the enterprise dashboard's coloured
// header, in the builder's teal identity). Deep enough that white foreground
// stays legible in both schemes.
const TEAL_GRADIENT = {
  light: ['#0D9B7A', '#0A8268', '#0F766E'] as const,
  dark: ['#0F3D38', '#115E59', '#0F766E'] as const,
};
const HEADER_BASE = { light: '#0D9B7A', dark: '#0F3D38' };

export function DashboardHeader({
  businessName,
  profilePhotoUrl,
  notificationCount,
  isAvailable = false,
  onBellPress,
  onHamburgerPress,
}: Props) {
  const insets = useSafeAreaInsets();
  const scheme = useColorScheme() ?? 'light';
  const colors = Colors[scheme];

  return (
    <LinearGradient
      colors={TEAL_GRADIENT[scheme]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
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
            style={({ pressed }) => [styles.iconBtn, pressed && { opacity: 0.6 }]}
            accessibilityRole="button"
            accessibilityLabel="Open menu"
          >
            <Ionicons name="menu" size={24} color="#fff" />
          </Pressable>
        )}
        <View style={styles.titleGroup}>
          <Text style={styles.title}>Dashboard</Text>
          <Text style={styles.subtitle} numberOfLines={1}>
            Welcome back, {businessName || 'Builder'}
          </Text>
        </View>

        {/* Right — bell + avatar */}
        <View style={styles.rightGroup}>
          {/* Notification bell */}
          <Pressable
            onPress={onBellPress}
            hitSlop={12}
            style={({ pressed }) => [styles.iconBtn, styles.bellWrap, pressed && { opacity: 0.6 }]}
            accessibilityRole="button"
            accessibilityLabel={`Notifications, ${notificationCount} unread`}
          >
            <Ionicons name="notifications-outline" size={22} color="#fff" />
            {notificationCount > 0 && (
              <View style={[styles.badge, { borderColor: HEADER_BASE[scheme] }]}>
                <Text style={styles.badgeText}>
                  {notificationCount > 99 ? '99+' : notificationCount}
                </Text>
              </View>
            )}
          </Pressable>

          {/* Profile photo */}
          <View style={styles.avatarWrap}>
            {profilePhotoUrl ? (
              <Image source={{ uri: profilePhotoUrl }} style={styles.avatar} cachePolicy="disk" placeholder={{ blurhash: 'L6PZfSi_.AyE_3t7t7R**0o#DgR4' }} />
            ) : (
              <View style={[styles.avatar, styles.avatarFallback]}>
                <Ionicons name="person" size={22} color="rgba(255,255,255,0.9)" />
              </View>
            )}
            {isAvailable && (
              <View style={[styles.onlineDot, { borderColor: HEADER_BASE[scheme], backgroundColor: colors.success }]} />
            )}
          </View>
        </View>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingBottom: Spacing['3xl'],
    paddingHorizontal: 20,
    overflow: 'hidden',
  },
  grainLayer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'space-evenly',
    opacity: 0.5,
  },
  grainRow: {
    flexDirection: 'row',
    justifyContent: 'space-evenly',
  },
  grainDot: {
    width: 1.5,
    height: 1.5,
    borderRadius: 0.75,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  content: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleGroup: {
    flex: 1,
    marginLeft: 12,
    marginRight: 16,
  },
  title: {
    fontFamily: FontFamily.display,
    fontSize: 24,
    color: '#fff',
    letterSpacing: -0.3,
  },
  subtitle: {
    fontFamily: FontFamily.body,
    fontSize: 14,
    color: 'rgba(255,255,255,0.75)',
    marginTop: 3,
  },
  rightGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  bellWrap: {
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#ef4444',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  badgeText: {
    fontFamily: FontFamily.bodyBold,
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
    borderColor: 'rgba(255,255,255,0.5)',
  },
  avatarFallback: {
    backgroundColor: 'rgba(255,255,255,0.18)',
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
    borderWidth: 2,
  },
});
