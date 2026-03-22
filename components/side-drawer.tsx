/**
 * SideDrawer — custom animated side drawer built with Reanimated.
 * Slides in from the left over the screen with a dark backdrop overlay.
 * Does not use @react-navigation/drawer to avoid nested navigator issues with Expo Router.
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  Image,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
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
  isGuest: boolean;
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
    isGuest: true,
  });
  const hasFetched = React.useRef(false);

  // Animate open/close when `visible` changes
  useEffect(() => {
    progress.value = withTiming(visible ? 1 : 0, { duration: ANIMATION_DURATION });
  }, [visible, progress]);

  // Fetch user info eagerly on mount, refresh in background on subsequent opens
  useEffect(() => {
    fetchUserInfo();
  }, []);

  useEffect(() => {
    if (visible && hasFetched.current) {
      // Silently refresh in background — UI already has cached data
      fetchUserInfo();
    }
  }, [visible]);

  async function fetchUserInfo() {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData?.user) {
      setUserInfo({ name: 'Guest', email: null, avatar: null, isBuilder: false, isGuest: true });
      hasFetched.current = true;
      return;
    }

    const email = userData.user.email ?? null;

    const [{ data: profile }, { data: builderProfile }] = await Promise.all([
      supabase
        .from('profiles')
        .select('name, avatar_url')
        .eq('id', userData.user.id)
        .maybeSingle(),
      supabase
        .from('builder_profiles')
        .select('approved')
        .eq('user_id', userData.user.id)
        .maybeSingle(),
    ]);

    setUserInfo({
      name: (profile as any)?.name ?? email?.split('@')[0] ?? 'User',
      email,
      avatar: (profile as any)?.avatar_url ?? null,
      isBuilder: !!(builderProfile as any)?.approved,
      isGuest: false,
    });
    hasFetched.current = true;
  }

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
    setTimeout(() => router.replace('/(auth)/login' as any), 120);
  }

  // ─── Builder re-auth modal state ──────────────────────────────────

  const [showReauth, setShowReauth] = useState(false);
  const [reauthEmail, setReauthEmail] = useState('');
  const [reauthPassword, setReauthPassword] = useState('');
  const [reauthError, setReauthError] = useState<string | null>(null);
  const [reauthLoading, setReauthLoading] = useState(false);

  function openReauthModal() {
    setReauthEmail(userInfo.email ?? '');
    setReauthPassword('');
    setReauthError(null);
    setReauthLoading(false);
    setShowReauth(true);
  }

  async function handleReauthSubmit() {
    if (!reauthEmail.trim() || !reauthPassword.trim()) {
      setReauthError('Please enter your email and password.');
      return;
    }
    setReauthLoading(true);
    setReauthError(null);

    const { error } = await supabase.auth.signInWithPassword({
      email: reauthEmail.trim(),
      password: reauthPassword,
    });

    setReauthLoading(false);

    if (error) {
      setReauthError('Incorrect email or password. Please try again.');
      return;
    }

    setShowReauth(false);
    navigate('/(tabs)/portal');
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
          {userInfo.isGuest ? (
            <Text style={styles.userEmail} numberOfLines={1}>
              Sign in to unlock all features
            </Text>
          ) : userInfo.email ? (
            <Text style={styles.userEmail} numberOfLines={1}>
              {userInfo.email}
            </Text>
          ) : null}

          {!userInfo.isGuest && (
            <Pressable
              style={styles.viewProfileBtn}
              onPress={() => navigate('/settings')}
              accessibilityRole="button"
              accessibilityLabel="View profile settings"
            >
              <Text style={styles.viewProfileText}>View profile</Text>
              <MaterialIcons name="chevron-right" size={16} color="rgba(255,255,255,0.7)" />
            </Pressable>
          )}
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
              onPress={openReauthModal}
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

        {/* ─── Sign In / Logout ─── */}
        <View style={[styles.divider, { backgroundColor: colors.border }]} />
        {userInfo.isGuest ? (
          <Pressable
            style={({ pressed }) => [styles.logoutRow, { opacity: pressed ? 0.7 : 1 }]}
            onPress={() => navigate('/(auth)/login')}
            accessibilityRole="button"
            accessibilityLabel="Sign in to BLDESY!"
          >
            <MaterialIcons name="login" size={20} color={colors.teal} />
            <Text style={[styles.logoutText, { color: colors.teal }]}>Sign In</Text>
          </Pressable>
        ) : (
          <Pressable
            style={({ pressed }) => [styles.logoutRow, { opacity: pressed ? 0.7 : 1 }]}
            onPress={handleLogout}
            accessibilityRole="button"
            accessibilityLabel="Log out of BLDESY!"
          >
            <MaterialIcons name="logout" size={20} color={colors.error} />
            <Text style={[styles.logoutText, { color: colors.error }]}>Log Out</Text>
          </Pressable>
        )}
      </Animated.View>

      {/* ─── Re-auth Modal ─── */}
      <Modal
        visible={showReauth}
        transparent
        animationType="fade"
        onRequestClose={() => setShowReauth(false)}
      >
        <View style={modalStyles.overlay}>
          <View
            style={[
              modalStyles.card,
              { backgroundColor: isDark ? colors.surface : '#ffffff' },
            ]}
          >
            {/* Header */}
            <View style={modalStyles.header}>
              <View style={[modalStyles.iconCircle, { backgroundColor: colors.tealBg }]}>
                <Ionicons name="shield-checkmark" size={28} color={colors.teal} />
              </View>
              <Text style={[modalStyles.title, { color: colors.text }]}>
                Verify your identity
              </Text>
              <Text style={[modalStyles.subtitle, { color: colors.textSecondary }]}>
                Enter your credentials to switch to Builder Mode
              </Text>
            </View>

            {/* Form */}
            <View style={modalStyles.form}>
              <Text style={[modalStyles.label, { color: colors.textSecondary }]}>Email</Text>
              <TextInput
                style={[
                  modalStyles.input,
                  {
                    backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#F8FAFC',
                    color: colors.text,
                    borderColor: isDark ? colors.border : '#E2E8F0',
                  },
                ]}
                value={reauthEmail}
                onChangeText={setReauthEmail}
                placeholder="you@email.com"
                placeholderTextColor={colors.textSecondary}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                editable={!reauthLoading}
              />

              <Text style={[modalStyles.label, { color: colors.textSecondary, marginTop: 12 }]}>
                Password
              </Text>
              <TextInput
                style={[
                  modalStyles.input,
                  {
                    backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#F8FAFC',
                    color: colors.text,
                    borderColor: isDark ? colors.border : '#E2E8F0',
                  },
                ]}
                value={reauthPassword}
                onChangeText={setReauthPassword}
                placeholder="Enter your password"
                placeholderTextColor={colors.textSecondary}
                secureTextEntry
                autoCapitalize="none"
                editable={!reauthLoading}
                onSubmitEditing={handleReauthSubmit}
              />

              {reauthError ? (
                <Text style={[modalStyles.errorText, { color: colors.error }]}>
                  {reauthError}
                </Text>
              ) : null}
            </View>

            {/* Actions */}
            <View style={modalStyles.actions}>
              <Pressable
                style={[
                  modalStyles.btn,
                  modalStyles.cancelBtn,
                  { borderColor: isDark ? colors.border : '#E2E8F0' },
                ]}
                onPress={() => setShowReauth(false)}
                disabled={reauthLoading}
              >
                <Text style={[modalStyles.cancelBtnText, { color: colors.textSecondary }]}>
                  Cancel
                </Text>
              </Pressable>

              <Pressable
                style={[
                  modalStyles.btn,
                  modalStyles.confirmBtn,
                  { backgroundColor: colors.teal, opacity: reauthLoading ? 0.7 : 1 },
                ]}
                onPress={handleReauthSubmit}
                disabled={reauthLoading}
              >
                {reauthLoading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={modalStyles.confirmBtnText}>Verify & Continue</Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
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

const modalStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  card: {
    width: '100%',
    maxWidth: 380,
    borderRadius: Radius.xl,
    padding: Spacing.xl,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.15,
        shadowRadius: 24,
      },
      android: { elevation: 12 },
      default: {},
    }),
  },
  header: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: -0.3,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    textAlign: 'center',
  },
  form: {
    marginBottom: Spacing.lg,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 6,
  },
  input: {
    height: 48,
    borderRadius: Radius.md,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    fontSize: 15,
  },
  errorText: {
    fontSize: 13,
    fontWeight: '500',
    marginTop: Spacing.sm,
  },
  actions: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  btn: {
    flex: 1,
    height: 48,
    borderRadius: Radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtn: {
    borderWidth: 1,
  },
  cancelBtnText: {
    fontSize: 15,
    fontWeight: '600',
  },
  confirmBtn: {},
  confirmBtnText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
});
