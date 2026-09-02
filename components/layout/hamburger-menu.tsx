/**
 * HamburgerMenu — the website's mobile nav drawer
 * (`~/bldesy-web/components/layout/header.tsx`, "Mobile nav drawer", LIVE
 * branch): a left-anchored panel 80% of the screen wide (max 384) that slides in
 * from the left edge below the header over a black/45 scrim. Tap the scrim, press
 * hardware back, swipe left, or navigate anywhere to close.
 *
 * Contents, top to bottom:
 *   identity block (signed in) · pinned Tradie Portal / Enterprise Hub CTAs
 *   (approved roles) · Home · Search Tradies · All Trades · Post a Job · AI Assist ·
 *   Map · For Tradies · MY STUFF (signed in) · pinned Sign Up + Login, or Log Out.
 *
 * Rendered inline inside the screen (not a Modal) so the header above it stays
 * live — the ☰ swaps to ✕ in place, exactly as on the web. `topOffset` defaults
 * to safe area + AppHeader height; legacy screens with their own header can pass
 * their own.
 */
import { useEffect, useRef, type ReactNode } from 'react';
import {
  BackHandler,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { usePathname, useRouter, type Href } from 'expo-router';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  Easing,
  FadeIn,
  FadeOut,
  SlideInLeft,
  SlideOutLeft,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

import { Colors, FontFamily, Radius, Shadows, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useGlobalTabBar } from '@/hooks/use-global-tab-bar';
import { useRoles, useUser } from '@/lib/auth-context';
import { ROUTES } from '@/lib/routes';
import { supabase } from '@/lib/supabase';
import { APP_HEADER_HEIGHT } from './app-header';

interface HamburgerMenuProps {
  open: boolean;
  onClose: () => void;
  /** Distance from the top of the screen to the drawer's top edge. Defaults to safe area + header. */
  topOffset?: number;
}

interface NavLink {
  label: string;
  route: Href;
}

/* LIVE-mode link sets — verbatim from the web drawer. */
const NAV_LINKS: NavLink[] = [
  { label: 'Home', route: ROUTES.home },
  { label: 'Search Tradies', route: ROUTES.search },
  { label: 'All Trades', route: ROUTES.trades },
  { label: 'Post a Job', route: ROUTES.postJob },
  { label: 'AI Assist', route: ROUTES.ai },
  { label: 'Map', route: ROUTES.map },
  { label: 'For Tradies', route: ROUTES.forTradies },
];

const MY_STUFF_LINKS: NavLink[] = [
  { label: 'Dashboard', route: ROUTES.dashboard },
  { label: 'My Jobs', route: ROUTES.myJobs },
  { label: 'Messages', route: ROUTES.messages },
  { label: 'Saved Tradies', route: ROUTES.saved },
  { label: 'Settings', route: ROUTES.settings },
];

const DRAWER_MAX_WIDTH = 384; // web max-w-sm
const OPEN_MS = 200; // web .animate-drawer-in
const CLOSE_MS = 160;

export function HamburgerMenu({ open, onClose, topOffset }: HamburgerMenuProps) {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];
  const insets = useSafeAreaInsets();
  const { width: windowWidth } = useWindowDimensions();
  const { contentBottomInset } = useGlobalTabBar();
  const router = useRouter();
  const pathname = usePathname();
  const { authedUser } = useUser();
  const { builderStatus, enterpriseStatus } = useRoles();

  const drawerWidth = Math.min(windowWidth * 0.8, DRAWER_MAX_WIDTH);
  const top = topOffset ?? insets.top + APP_HEADER_HEIGHT;

  /* Hardware back closes the drawer while it is open. */
  useEffect(() => {
    if (!open) return;
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      onClose();
      return true;
    });
    return () => subscription.remove();
  }, [open, onClose]);

  /* Close on any navigation (web: effect on pathname). */
  const lastPathname = useRef(pathname);
  useEffect(() => {
    if (lastPathname.current === pathname) return;
    lastPathname.current = pathname;
    if (open) onClose();
  }, [pathname, open, onClose]);

  /* Swipe left to close. */
  const dragX = useSharedValue(0);
  useEffect(() => {
    if (open) dragX.value = 0;
  }, [open, dragX]);

  const pan = Gesture.Pan()
    .activeOffsetX([-16, 16])
    .failOffsetY([-12, 12])
    .onUpdate((e) => {
      dragX.value = Math.min(0, e.translationX);
    })
    .onEnd((e) => {
      if (e.translationX < -drawerWidth * 0.3 || e.velocityX < -600) {
        dragX.value = withTiming(-drawerWidth, { duration: 150 }, () => {
          runOnJS(onClose)();
        });
      } else {
        dragX.value = withSpring(0, { damping: 22, stiffness: 300 });
      }
    });

  const drawerStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: dragX.value }],
  }));
  const scrimStyle = useAnimatedStyle(() => ({
    opacity: 1 + dragX.value / drawerWidth,
  }));

  function go(route: Href) {
    onClose();
    router.navigate(route);
  }

  async function logOut() {
    onClose();
    await supabase.auth.signOut();
    router.replace(ROUTES.home);
  }

  // Phone-only accounts have email "" (not null) — fall through with ||, not ??.
  const name = (authedUser?.user_metadata?.name as string | undefined) || undefined;
  const initial = (name?.[0] ?? authedUser?.email?.[0] ?? 'U').toUpperCase();

  return (
    <View style={[styles.layer, { top }]} pointerEvents="box-none">
      {open ? (
        <>
          {/* Scrim — tap to close */}
          <Animated.View
            entering={FadeIn.duration(OPEN_MS)}
            exiting={FadeOut.duration(CLOSE_MS)}
            style={[StyleSheet.absoluteFill, styles.scrim, scrimStyle]}
          >
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close menu"
              onPress={onClose}
              style={StyleSheet.absoluteFill}
            />
          </Animated.View>

          {/* Drawer panel */}
          <GestureDetector gesture={pan}>
            <Animated.View
              entering={SlideInLeft.duration(OPEN_MS).easing(Easing.out(Easing.cubic))}
              exiting={SlideOutLeft.duration(CLOSE_MS)}
              accessibilityViewIsModal
              accessibilityLabel="Menu"
              style={[
                styles.drawer,
                Shadows['2xl'],
                { width: drawerWidth, backgroundColor: c.surface },
                drawerStyle,
              ]}
            >
              <ScrollView style={styles.scroll} bounces={false} showsVerticalScrollIndicator={false}>
                {/* Identity block — signed in */}
                {authedUser ? (
                  <View style={[styles.identity, { borderBottomColor: c.border }]}>
                    <View style={[styles.avatar, { backgroundColor: c.primary }]}>
                      <Text style={styles.avatarInitial}>{initial}</Text>
                    </View>
                    <View style={styles.identityText}>
                      <Text numberOfLines={1} style={[styles.name, { color: c.textPrimary }]}>
                        {name ?? 'User'}
                      </Text>
                      <Text numberOfLines={1} style={[styles.email, { color: c.textSecondary }]}>
                        {authedUser.email}
                      </Text>
                    </View>
                  </View>
                ) : null}

                {/* Tradie Portal — pinned at the top for approved builders */}
                {builderStatus === 'approved' ? (
                  <View style={[styles.pinnedWrap, { borderBottomColor: c.border }]}>
                    <PinnedCta
                      label="Tradie Portal"
                      icon={<MaterialIcons name="handyman" size={20} color="#ffffff" />}
                      color={c.primary}
                      pressedColor={c.primaryDark}
                      onPress={() => go(ROUTES.portal)}
                    />
                  </View>
                ) : null}

                {/* Enterprise Hub — pinned at the top for approved enterprises */}
                {enterpriseStatus === 'approved' ? (
                  <View style={[styles.pinnedWrap, { borderBottomColor: c.border }]}>
                    <PinnedCta
                      label="Enterprise Hub"
                      icon={<Ionicons name="business-outline" size={20} color="#ffffff" />}
                      color={c.indigo}
                      pressedColor={c.indigoDark}
                      onPress={() => go(ROUTES.enterprise)}
                    />
                  </View>
                ) : null}

                {/* Nav links — the live product set */}
                <View style={styles.navGroup} accessibilityLabel="Menu links">
                  {NAV_LINKS.map((link) => (
                    <DrawerLink key={link.label} label={link.label} onPress={() => go(link.route)} />
                  ))}
                </View>

                {/* Signed-in links */}
                {authedUser ? (
                  <View style={[styles.myStuff, { borderTopColor: c.border }]}>
                    <Text style={[styles.myStuffLabel, { color: c.textSecondary }]}>My stuff</Text>
                    {MY_STUFF_LINKS.map((link) => (
                      <DrawerLink
                        key={link.label}
                        label={link.label}
                        compact
                        onPress={() => go(link.route)}
                      />
                    ))}
                  </View>
                ) : null}
              </ScrollView>

              {/* Pinned action block — the single CTA hierarchy for the menu */}
              <View
                style={[
                  styles.pinnedBottom,
                  {
                    borderTopColor: c.border,
                    backgroundColor: c.surface,
                    paddingBottom: Spacing.lg + contentBottomInset,
                  },
                ]}
              >
                {!authedUser ? (
                  <>
                    <Pressable
                      accessibilityRole="link"
                      onPress={() => go(ROUTES.signup)}
                      style={({ pressed }) => [
                        styles.blockBtn,
                        { backgroundColor: pressed ? c.ctaDark : c.cta },
                      ]}
                    >
                      <Text style={styles.blockBtnFillText}>Sign Up</Text>
                    </Pressable>
                    <Pressable
                      accessibilityRole="link"
                      onPress={() => go(ROUTES.login)}
                      style={({ pressed }) => [
                        styles.blockBtn,
                        styles.blockBtnOutline,
                        { borderColor: pressed ? c.primary : c.border },
                      ]}
                    >
                      {({ pressed }) => (
                        <Text
                          style={[
                            styles.blockBtnOutlineText,
                            { color: pressed ? c.primary : c.textPrimary },
                          ]}
                        >
                          Login
                        </Text>
                      )}
                    </Pressable>
                  </>
                ) : (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Log out"
                    onPress={logOut}
                    style={({ pressed }) => [
                      styles.logOutBtn,
                      { borderColor: c.error + '4D' },
                      pressed && { backgroundColor: c.error + '0D' },
                    ]}
                  >
                    <Text style={[styles.logOutText, { color: c.error }]}>Log Out</Text>
                  </Pressable>
                )}
              </View>
            </Animated.View>
          </GestureDetector>
        </>
      ) : null}
    </View>
  );
}

/* ── Pieces ───────────────────────────────────────────────────────── */

function DrawerLink({
  label,
  onPress,
  compact = false,
}: {
  label: string;
  onPress: () => void;
  compact?: boolean;
}) {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];
  return (
    <Pressable
      accessibilityRole="link"
      onPress={onPress}
      style={({ pressed }) => [
        styles.link,
        compact && styles.linkCompact,
        pressed && { backgroundColor: c.primaryBg },
      ]}
    >
      {({ pressed }) => (
        <Text style={[styles.linkText, { color: pressed ? c.primary : c.textPrimary }]}>{label}</Text>
      )}
    </Pressable>
  );
}

function PinnedCta({
  label,
  icon,
  color,
  pressedColor,
  onPress,
}: {
  label: string;
  icon: ReactNode;
  color: string;
  pressedColor: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="link"
      onPress={onPress}
      style={({ pressed }) => [
        styles.pinnedCta,
        Shadows.sm,
        { backgroundColor: pressed ? pressedColor : color },
        pressed && { transform: [{ scale: 0.98 }] },
      ]}
    >
      {icon}
      <Text style={styles.pinnedCtaText}>{label}</Text>
      <Ionicons name="chevron-forward" size={16} color="rgba(255,255,255,0.8)" />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  layer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
  },
  scrim: {
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  drawer: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
  },
  scroll: {
    flex: 1,
  },
  identity: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    color: '#ffffff',
    fontFamily: FontFamily.bodyBold,
    fontWeight: '700',
    fontSize: 12,
  },
  identityText: {
    flex: 1,
    minWidth: 0,
  },
  name: {
    fontFamily: FontFamily.bodySemiBold,
    fontWeight: '600',
    fontSize: 14,
  },
  email: {
    fontFamily: FontFamily.body,
    fontSize: 11,
    marginTop: 1,
  },
  pinnedWrap: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  pinnedCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  pinnedCtaText: {
    flex: 1,
    color: '#ffffff',
    fontFamily: FontFamily.bodyBold,
    fontWeight: '700',
    fontSize: 14,
  },
  navGroup: {
    paddingVertical: Spacing.md,
  },
  link: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: 14, // web py-3.5
  },
  linkCompact: {
    paddingVertical: Spacing.md, // web py-3
  },
  linkText: {
    fontFamily: FontFamily.bodyMedium,
    fontWeight: '500',
    fontSize: 16,
  },
  myStuff: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingVertical: Spacing.sm,
  },
  myStuffLabel: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.xs,
    fontFamily: FontFamily.bodyBold,
    fontWeight: '700',
    fontSize: 10,
    letterSpacing: 0.7,
    textTransform: 'uppercase',
  },
  pinnedBottom: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.lg,
    gap: Spacing.sm,
  },
  blockBtn: {
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  blockBtnFillText: {
    color: '#ffffff',
    fontFamily: FontFamily.bodyBold,
    fontWeight: '700',
    fontSize: 14,
  },
  blockBtnOutline: {
    borderWidth: 1,
  },
  blockBtnOutlineText: {
    fontFamily: FontFamily.bodySemiBold,
    fontWeight: '600',
    fontSize: 14,
  },
  logOutBtn: {
    borderRadius: Radius.lg,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    alignItems: 'center',
  },
  logOutText: {
    fontFamily: FontFamily.bodySemiBold,
    fontWeight: '600',
    fontSize: 14,
  },
});
