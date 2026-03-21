/**
 * SideDrawer — custom animated side drawer built with Reanimated.
 * Slides in from the left over the screen with a dark backdrop overlay.
 * Does not use @react-navigation/drawer to avoid nested navigator issues with Expo Router.
 */

import React, { useCallback, useEffect } from 'react';
import {
  Dimensions,
  Image,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Animated, {
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';

import { Colors, Radius, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { supabase } from '@/lib/supabase';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const DRAWER_WIDTH = Math.min(SCREEN_WIDTH * 0.82, 320);
const ANIMATION_DURATION = 250;

// ─── Types ────────────────────────────────────────────────────────────────────

type UserInfo = {
  name: string | null;
  email: string | null;
  avatar: string | null;
  isBuilder: boolean;
};

type DrawerItem = {
  key: string;
  label: string;
  icon: React.ReactNode;
  onPress: () => void;
};

type SideDrawerProps = {
  visible: boolean;
  onClose: () => void;
};

// ─── Component ────────────────────────────────────────────────────────────────

export function SideDrawer({ visible, onClose }: SideDrawerProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const colors = Colors[isDark ? 'dark' : 'light'];
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const progress = useSharedValue(0);
  const [userInfo, setUserInfo] = React.useState<UserInfo>({
    name: null,
    email: null,
    avatar: null,
    isBuilder: false,
  });

  // Animate open/close when `visible` changes
  useEffect(() => {
    progress.value = withTiming(visible ? 1 : 0, { duration: ANIMATION_DURATION });
  }, [visible, progress]);

  // Fetch user info when drawer opens
  useEffect(() => {
    if (!visible) return;
    (async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData?.user) return;

      const email = userData.user.email ?? null;

      // Fetch profile for display name
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, avatar_url')
        .eq('id', userData.user.id)
        .maybeSingle();

      // Check if approved builder
      const { data: builderProfile } = await supabase
        .from('builder_profiles')
        .select('approved')
        .eq('user_id', userData.user.id)
        .maybeSingle();

      setUserInfo({
        name: (profile as any)?.full_name ?? email?.split('@')[0] ?? 'User',
        email,
        avatar: (profile as any)?.avatar_url ?? null,
        isBuilder: !!(builderProfile as any)?.approved,
      });
    })();
  }, [visible]);

  // Animated styles
  const drawerAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      {
        translateX: interpolate(progress.value, [0, 1], [-DRAWER_WIDTH, 0]),
      },
    ],
  }));

  const backdropAnimatedStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 1], [0, 1]),
  }));

  const handleClose = useCallback(() => {
    onClose();
  }, [onClose]);

  function navigate(path: string) {
    onClose();
    // Small delay lets drawer close animation start before navigation
    setTimeout(() => router.push(path as any), 120);
  }

  async function handleLogout() {
    onClose();
    await supabase.auth.signOut();
  }

  // ─── Drawer items ─────────────────────────────────────────────────

  const mainItems: DrawerItem[] = [
    {
      key: 'settings',
      label: 'Settings',
      icon: <MaterialIcons name="settings" size={20} color={colors.textSecondary} />,
      onPress: () => navigate('/settings'),
    },
    {
      key: 'help',
      label: 'Help & Support',
      icon: <MaterialIcons name="help-outline" size={20} color={colors.textSecondary} />,
      onPress: () => navigate('/help'),
    },
    {
      key: 'legal',
      label: 'Legal',
      icon: <MaterialIcons name="gavel" size={20} color={colors.textSecondary} />,
      onPress: () => navigate('/legal'),
    },
  ];

  const avatarUri =
    userInfo.avatar ??
    `https://ui-avatars.com/api/?name=${encodeURIComponent(userInfo.name ?? 'U')}&background=0d9488&color=fff&size=128`;

  // Keep component mounted (controls display via animation) so Reanimated
  // can always run the close animation even if visible goes false
  const pointerEvents = visible ? 'box-none' : 'none';

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents={pointerEvents}>
      {/* ─── Backdrop ─── */}
      <Animated.View
        style={[styles.backdrop, backdropAnimatedStyle]}
        pointerEvents={visible ? 'auto' : 'none'}
      >
        <Pressable style={StyleSheet.absoluteFill} onPress={handleClose} />
      </Animated.View>

      {/* ─── Drawer panel ─── */}
      <Animated.View
        style={[
          styles.drawer,
          drawerAnimatedStyle,
          {
            backgroundColor: isDark ? colors.surface : '#ffffff',
            paddingBottom: insets.bottom,
          },
        ]}
      >
        {/* ─── User header with premium gradient ─── */}
        <LinearGradient
          colors={isDark ? ['#042f2e', '#0a3a38', '#134E4A'] : ['#064E3B', '#0F6E56', '#1D9E75']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.userHeader, { paddingTop: insets.top + Spacing.lg }]}
        >
          {/* Subtle radial glow */}
          <View style={styles.glowWrap} pointerEvents="none">
            <View style={[styles.glow, isDark && { opacity: 0.06 }]} />
          </View>

          {/* Diagonal accent lines */}
          <View style={styles.accentLines} pointerEvents="none">
            <View style={[styles.accentLine, { left: '25%', opacity: 0.04 }]} />
            <View style={[styles.accentLine, { left: '55%', opacity: 0.03 }]} />
            <View style={[styles.accentLine, { left: '80%', opacity: 0.025 }]} />
          </View>

          <View style={styles.avatarWrap}>
            <Image source={{ uri: avatarUri }} style={styles.avatar} />
          </View>

          <Text style={styles.userName} numberOfLines={1}>
            {userInfo.name ?? 'Welcome'}
          </Text>
          {userInfo.email ? (
            <Text style={styles.userEmail} numberOfLines={1}>
              {userInfo.email}
            </Text>
          ) : null}

          <Pressable
            style={styles.viewProfileBtn}
            onPress={() => navigate('/settings')}
            accessibilityRole="button"
            accessibilityLabel="View profile settings"
          >
            <Text style={styles.viewProfileText}>View profile</Text>
            <MaterialIcons name="chevron-right" size={16} color="rgba(255,255,255,0.7)" />
          </Pressable>
        </LinearGradient>

        {/* ─── Main menu items ─── */}
        <View style={styles.menuSection}>
          {mainItems.map((item) => (
            <Pressable
              key={item.key}
              style={({ pressed }) => [
                styles.menuItem,
                {
                  backgroundColor: pressed
                    ? isDark
                      ? 'rgba(255,255,255,0.05)'
                      : 'rgba(0,0,0,0.03)'
                    : 'transparent',
                },
              ]}
              onPress={item.onPress}
              accessibilityRole="button"
              accessibilityLabel={item.label}
            >
              <View
                style={[
                  styles.menuIconWrap,
                  { backgroundColor: isDark ? colors.border : '#F8FAFC' },
                ]}
              >
                {item.icon}
              </View>
              <Text style={[styles.menuLabel, { color: colors.text }]}>
                {item.label}
              </Text>
              <MaterialIcons name="chevron-right" size={18} color={colors.icon} />
            </Pressable>
          ))}
        </View>

        {/* ─── Divider ─── */}
        <View style={[styles.divider, { backgroundColor: colors.border }]} />

        {/* ─── Builder mode toggle (approved builders only) ─── */}
        {userInfo.isBuilder ? (
          <View style={styles.menuSection}>
            <Pressable
              style={({ pressed }) => [
                styles.menuItem,
                {
                  backgroundColor: pressed
                    ? isDark
                      ? 'rgba(255,255,255,0.05)'
                      : 'rgba(0,0,0,0.03)'
                    : 'transparent',
                },
              ]}
              onPress={() => navigate('/(tabs)/portal')}
              accessibilityRole="button"
              accessibilityLabel="Switch to Builder Mode"
            >
              <View style={[styles.menuIconWrap, { backgroundColor: colors.tealBg }]}>
                <Ionicons name="swap-horizontal" size={20} color={colors.teal} />
              </View>
              <Text style={[styles.menuLabel, { color: colors.text }]}>
                Switch to Builder Mode
              </Text>
              <MaterialIcons name="chevron-right" size={18} color={colors.icon} />
            </Pressable>
          </View>
        ) : null}

        {/* ─── Spacer pushes logout to the bottom ─── */}
        <View style={{ flex: 1 }} />

        {/* ─── Logout ─── */}
        <View style={[styles.divider, { backgroundColor: colors.border }]} />
        <Pressable
          style={({ pressed }) => [styles.logoutRow, { opacity: pressed ? 0.7 : 1 }]}
          onPress={handleLogout}
          accessibilityRole="button"
          accessibilityLabel="Log out of BLDESY!"
        >
          <MaterialIcons name="logout" size={20} color={colors.error} />
          <Text style={[styles.logoutText, { color: colors.error }]}>Log Out</Text>
        </Pressable>
      </Animated.View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
    zIndex: 100,
  },
  drawer: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    width: DRAWER_WIDTH,
    zIndex: 101,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 4, height: 0 },
        shadowOpacity: 0.18,
        shadowRadius: 16,
      },
      android: { elevation: 16 },
      default: {},
    }),
  },

  // ── User header ──
  userHeader: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing['2xl'],
    gap: 4,
    position: 'relative',
    overflow: 'hidden',
  },
  glowWrap: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'flex-end',
    justifyContent: 'flex-start',
    overflow: 'hidden',
  },
  glow: {
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(255,255,255,0.08)',
    marginTop: -30,
    marginRight: -30,
  },
  accentLines: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  accentLine: {
    position: 'absolute' as const,
    top: -20,
    width: 1,
    height: '150%',
    backgroundColor: '#fff',
    transform: [{ rotate: '15deg' }],
  },
  avatarWrap: {
    width: 68,
    height: 68,
    borderRadius: 34,
    borderWidth: 2.5,
    borderColor: 'rgba(255,255,255,0.5)',
    overflow: 'hidden',
    marginBottom: Spacing.sm,
  },
  avatar: {
    width: '100%',
    height: '100%',
  },
  userName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
    letterSpacing: -0.3,
  },
  userEmail: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.72)',
  },
  viewProfileBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    marginTop: 6,
    alignSelf: 'flex-start',
  },
  viewProfileText: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.72)',
  },

  // ── Menu ──
  menuSection: {
    paddingTop: Spacing.xs,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    gap: Spacing.md,
    minHeight: 52,
  },
  menuIconWrap: {
    width: 36,
    height: 36,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuLabel: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: -0.1,
  },

  // ── Divider ──
  divider: {
    height: 1,
    marginHorizontal: Spacing.xl,
    marginVertical: Spacing.xs,
  },

  // ── Logout ──
  logoutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  logoutText: {
    fontSize: 15,
    fontWeight: '700',
  },
});
