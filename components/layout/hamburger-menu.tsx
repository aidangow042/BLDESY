/**
 * HamburgerMenu — top-right anchored dropdown card. Mirrors the web's
 * mobile nav pattern (`~/bldesy-web/components/layout/header.tsx` lines
 * 451-590). Replaces the legacy left side-drawer.
 *
 * Visual: rounded card anchored just below the header, top-right, with a
 * soft shadow + 1px border. Backdrop covers the rest of the screen and
 * dismisses on tap. Fades + slightly scales in.
 */

import { useEffect, useState } from 'react';
import {
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import Animated, {
  FadeIn,
  FadeOut,
  ZoomIn,
  ZoomOut,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Colors, FontFamily, Radius, Shadows, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useUser } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';

interface HamburgerMenuProps {
  open: boolean;
  onClose: () => void;
}

type RoleStatus = 'none' | 'pending' | 'approved' | null;

interface NavLink {
  href: string;
  label: string;
  emoji: string;
}

/* Always-on links shown to everyone. Role-conditional marketing links
   ("For Tradies", "For Builders") and the standalone /pricing page are
   filtered out for users who already have that role — they upgrade from
   inside the portal, not via the general-pricing page. */
const PUBLIC_LINKS: NavLink[] = [
  { href: '/(tabs)',       label: 'Home',          emoji: '🏠' },
  { href: '/results',      label: 'Search Tradies', emoji: '🔍' },
  { href: '/all-trades',   label: 'All Trades',    emoji: '🔧' },
  { href: '/post-job',     label: 'Post a Job',    emoji: '➕' },
  { href: '/(tabs)/ai',    label: 'AI Assist',     emoji: '✨' },
  { href: '/(tabs)/map',   label: 'Map',           emoji: '🗺️' },
  { href: '/about',        label: 'About',         emoji: 'ℹ️' },
];

/* Shown only to users who DON'T already have the matching role. The
   /for-builders page sells the enterprise/hirer side, so the menu label
   reads "For Enterprise" — a tradie viewing the menu shouldn't be told to
   "join as a builder", they should be told to "join as an enterprise". */
const TRADIE_MARKETING: NavLink     = { href: '/for-tradies',  label: 'For Tradies',    emoji: '👷' };
const ENTERPRISE_MARKETING: NavLink = { href: '/for-builders', label: 'For Enterprise', emoji: '🏗️' };

const MY_STUFF_LINKS: NavLink[] = [
  { href: '/my-jobs',  label: 'My Jobs',       emoji: '📋' },
  { href: '/messages', label: 'Messages',      emoji: '💬' },
  { href: '/(tabs)/saved', label: 'Saved Tradies', emoji: '🔖' },
  { href: '/settings', label: 'Settings',      emoji: '⚙️' },
];

export function HamburgerMenu({ open, onClose }: HamburgerMenuProps) {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, loading } = useUser();

  const [builderStatus, setBuilderStatus] = useState<RoleStatus>(null);
  const [enterpriseStatus, setEnterpriseStatus] = useState<RoleStatus>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  /* Fetch role membership when user changes (same shape as the web header). */
  useEffect(() => {
    if (!user) {
      setBuilderStatus(null);
      setEnterpriseStatus(null);
      setAvatarUrl(null);
      return;
    }
    let mounted = true;
    (async () => {
      const [{ data: profile }, { data: builder }, { data: enterprise }] = await Promise.all([
        supabase.from('profiles').select('avatar_url').eq('id', user.id).maybeSingle(),
        supabase.from('builder_profiles').select('approved, status').eq('user_id', user.id).maybeSingle(),
        supabase.from('enterprise_profiles').select('status').eq('user_id', user.id).maybeSingle(),
      ]);
      if (!mounted) return;
      setAvatarUrl((profile as any)?.avatar_url ?? null);
      const b: any = builder;
      if (!b) setBuilderStatus('none');
      else if (b.approved === true || b.status === 'active' || b.status === 'approved') setBuilderStatus('approved');
      else setBuilderStatus('pending');
      const e: any = enterprise;
      if (!e) setEnterpriseStatus('none');
      else if (e.status === 'active' || e.status === 'approved') setEnterpriseStatus('approved');
      else setEnterpriseStatus('pending');
    })();
    return () => { mounted = false; };
  }, [user]);

  function go(href: string) {
    onClose();
    // small delay to let the close animation kick off before the route push
    requestAnimationFrame(() => router.push(href as any));
  }

  async function handleLogout() {
    onClose();
    await supabase.auth.signOut();
    // Replace to the explicit Home tab — `/(tabs)` alone keeps the
    // MaterialTopTabNavigator's current tab (e.g. portal) active.
    router.replace('/(tabs)/index' as any);
  }

  const headerOffset = insets.top + 56 + 4; // safe-area + header height + 4px gap

  return (
    <Modal
      visible={open}
      transparent
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      {/* Backdrop */}
      <Animated.View
        entering={FadeIn.duration(160)}
        exiting={FadeOut.duration(140)}
        style={styles.backdrop}
      >
        <Pressable
          accessibilityLabel="Close menu"
          onPress={onClose}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>

      {/* Anchored card */}
      <Animated.View
        entering={ZoomIn.duration(180)}
        exiting={ZoomOut.duration(140)}
        style={[
          styles.card,
          Shadows['2xl'],
          {
            top: headerOffset,
            right: Spacing.sm,
            backgroundColor: c.surface,
            borderColor: c.border,
            maxHeight: 600,
          },
        ]}
      >
        <ScrollView contentContainerStyle={{ paddingVertical: 4 }} bounces={false}>
          {/* Auth header */}
          {loading ? null : !user ? (
            <View style={[styles.section, { borderColor: c.border }]}>
              <Text style={[styles.muted, { color: c.textSecondary }]}>Not signed in</Text>
              <View style={styles.authRow}>
                <Pressable
                  onPress={() => go('/(auth)/login')}
                  accessibilityRole="link"
                  accessibilityLabel="Log in"
                  style={[styles.outlineBtn, { borderColor: c.border }]}
                >
                  <Text style={[styles.outlineBtnText, { color: c.textPrimary }]}>Login</Text>
                </Pressable>
                <Pressable
                  onPress={() => go('/(auth)/signup')}
                  accessibilityRole="link"
                  accessibilityLabel="Sign up for a new account"
                  style={[styles.fillBtn, { backgroundColor: c.primary }]}
                >
                  <Text style={styles.fillBtnText}>Sign Up</Text>
                </Pressable>
              </View>
            </View>
          ) : (
            <View style={[styles.section, { borderColor: c.border, flexDirection: 'row', alignItems: 'center', gap: Spacing.md }]}>
              {avatarUrl ? (
                <Image source={{ uri: avatarUrl }} style={styles.avatar} />
              ) : (
                <View style={[styles.avatar, { backgroundColor: c.primary, alignItems: 'center', justifyContent: 'center' }]}>
                  <Text style={styles.avatarFallback}>
                    {(user.user_metadata?.name?.[0] ?? user.email?.[0] ?? 'U').toUpperCase()}
                  </Text>
                </View>
              )}
              <View style={{ flex: 1 }}>
                <Text style={[styles.name, { color: c.textPrimary }]} numberOfLines={1}>
                  {user.user_metadata?.name ?? 'User'}
                </Text>
                <Text style={[styles.email, { color: c.textSecondary }]} numberOfLines={1}>
                  {user.email}
                </Text>
              </View>
            </View>
          )}

          {/* Builder Portal pin */}
          {builderStatus === 'approved' ? (
            <View style={[styles.section, { borderColor: c.border }]}>
              <Pressable
                onPress={() => go('/(tabs)/portal')}
                accessibilityRole="link"
                accessibilityLabel="Open Builder Portal"
                style={[styles.pinnedCta, { backgroundColor: c.primary }]}
              >
                <Text style={styles.pinnedCtaText}>Builder Portal</Text>
                <Text style={styles.pinnedCtaChevron}>›</Text>
              </Pressable>
            </View>
          ) : null}

          {/* Enterprise Hub pin */}
          {enterpriseStatus === 'approved' ? (
            <View style={[styles.section, { borderColor: c.border }]}>
              <Pressable
                onPress={() => go('/enterprise-dashboard')}
                accessibilityRole="link"
                accessibilityLabel="Open Enterprise Hub"
                style={[styles.pinnedCta, { backgroundColor: c.indigo }]}
              >
                <Text style={styles.pinnedCtaText}>Enterprise Hub</Text>
                <Text style={styles.pinnedCtaChevron}>›</Text>
              </Pressable>
            </View>
          ) : null}

          {/* Main nav — role-aware: marketing pages are filtered out for
              users who already have that role (they upgrade from inside the
              portal instead). */}
          <View style={{ paddingVertical: 4 }}>
            {[
              ...PUBLIC_LINKS,
              ...(builderStatus !== 'approved' ? [TRADIE_MARKETING] : []),
              ...(enterpriseStatus !== 'approved' ? [ENTERPRISE_MARKETING] : []),
            ].map((link) => (
              <Pressable
                key={link.href + link.label}
                onPress={() => go(link.href)}
                accessibilityRole="link"
                accessibilityLabel={link.label}
                style={({ pressed }) => [
                  styles.navItem,
                  pressed && { backgroundColor: c.primaryBg },
                ]}
              >
                <Text style={styles.navEmoji}>{link.emoji}</Text>
                <Text style={[styles.navLabel, { color: c.textPrimary }]}>{link.label}</Text>
              </Pressable>
            ))}
          </View>

          {/* My stuff group */}
          {user ? (
            <View style={[styles.group, { borderColor: c.border }]}>
              <Text style={[styles.groupLabel, { color: c.textSecondary }]}>My stuff</Text>
              {MY_STUFF_LINKS.map((link) => (
                <Pressable
                  key={link.href + link.label}
                  onPress={() => go(link.href)}
                  accessibilityRole="link"
                  accessibilityLabel={link.label}
                  style={({ pressed }) => [
                    styles.navItem,
                    pressed && { backgroundColor: c.primaryBg },
                  ]}
                >
                  <Text style={styles.navEmoji}>{link.emoji}</Text>
                  <Text style={[styles.navLabel, { color: c.textPrimary }]}>{link.label}</Text>
                </Pressable>
              ))}
            </View>
          ) : null}

          {/* Guest CTA */}
          {!user ? (
            <View style={[styles.section, { borderColor: c.border }]}>
              <Pressable
                onPress={() => go('/welcome?prefill=builder')}
                accessibilityRole="link"
                accessibilityLabel="Join as a tradie"
                style={[styles.outlineBtn, { borderColor: c.primary, alignSelf: 'stretch' }]}
              >
                <Text style={[styles.outlineBtnText, { color: c.primary }]}>Join as a Tradie</Text>
              </Pressable>
            </View>
          ) : null}

          {/* Logout */}
          {user ? (
            <View style={[styles.section, { borderColor: c.border }]}>
              <Pressable
                onPress={handleLogout}
                accessibilityRole="button"
                accessibilityLabel="Log out"
                accessibilityHint="Signs you out of BLDESY"
                style={[styles.outlineBtn, { borderColor: c.error + '4D', alignSelf: 'stretch' }]}
              >
                <Text style={[styles.outlineBtnText, { color: c.error }]}>Log Out</Text>
              </Pressable>
            </View>
          ) : null}
        </ScrollView>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.0)', // invisible — captures taps only
  },
  card: {
    position: 'absolute',
    width: 288,
    maxWidth: '95%',
    borderRadius: Radius.xl,
    borderWidth: 1,
    overflow: 'hidden',
  },
  section: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  muted: {
    fontSize: 13,
    fontFamily: FontFamily.bodyMedium,
    fontWeight: '500',
    marginBottom: Spacing.sm,
  },
  authRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  outlineBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: Radius.lg,
    borderWidth: 1,
    alignItems: 'center',
  },
  outlineBtnText: {
    fontSize: 13,
    fontFamily: FontFamily.bodySemiBold,
    fontWeight: '600',
  },
  fillBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: Radius.lg,
    alignItems: 'center',
  },
  fillBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontFamily: FontFamily.bodyBold,
    fontWeight: '700',
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  avatarFallback: {
    color: '#ffffff',
    fontFamily: FontFamily.bodyBold,
    fontWeight: '700',
    fontSize: 13,
  },
  name: {
    fontSize: 14,
    fontFamily: FontFamily.bodySemiBold,
    fontWeight: '600',
  },
  email: {
    fontSize: 11,
    marginTop: 1,
    fontFamily: FontFamily.body,
  },
  pinnedCta: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: 12,
    borderRadius: Radius.lg,
    gap: Spacing.md,
  },
  pinnedCtaText: {
    flex: 1,
    color: '#ffffff',
    fontSize: 14,
    fontFamily: FontFamily.bodyBold,
    fontWeight: '700',
  },
  pinnedCtaChevron: {
    color: '#ffffff',
    fontSize: 20,
    opacity: 0.85,
    lineHeight: 20,
  },
  group: {
    paddingVertical: 4,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  groupLabel: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: 4,
    fontSize: 10,
    fontFamily: FontFamily.bodyBold,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.7,
  },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: 10,
    gap: Spacing.md,
  },
  navEmoji: {
    fontSize: 14,
  },
  navLabel: {
    fontSize: 14,
    fontFamily: FontFamily.bodyMedium,
    fontWeight: '500',
  },
});
