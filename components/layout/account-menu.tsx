/**
 * AccountMenu — the header's signed-in account control. Mirrors the web
 * header's avatar button + `role="menu"` dropdown
 * (`~/bldesy-web/components/layout/header.tsx`, "Profile avatar dropdown"):
 *
 *   36px avatar (photo, or initial on primary) → dropdown anchored under the
 *   header's right edge: name/email · Dashboard · My Jobs · Saved Tradies ·
 *   Settings · ─ · Log Out
 *
 * The dropdown is a transparent Modal so it overlays any screen content and the
 * tap-outside backdrop also works on Android (touches outside a parent's bounds
 * are dropped there).
 */
import { useState, type ComponentProps } from 'react';
import { Modal, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { Image } from 'expo-image';
import { useRouter, type Href } from 'expo-router';
import Animated, { FadeIn } from 'react-native-reanimated';
import Ionicons from '@expo/vector-icons/Ionicons';
import type { User } from '@supabase/supabase-js';

import { Colors, FontFamily, Radius, Shadows, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { ROUTES } from '@/lib/routes';
import { supabase } from '@/lib/supabase';

type IoniconName = ComponentProps<typeof Ionicons>['name'];

interface MenuItem {
  label: string;
  icon: IoniconName;
  route: Href;
}

/* Web dropdown items, in order (LIVE branch). */
const MENU_ITEMS: MenuItem[] = [
  { label: 'Dashboard', icon: 'grid-outline', route: ROUTES.dashboard },
  { label: 'My Jobs', icon: 'briefcase-outline', route: ROUTES.myJobs },
  { label: 'Saved Tradies', icon: 'bookmark-outline', route: ROUTES.saved },
  { label: 'Settings', icon: 'settings-outline', route: ROUTES.settings },
];

interface AccountMenuProps {
  user: User;
  avatarUrl: string | null;
  /** Window-relative y of the dropdown's top edge (header bottom + web `mt-1.5`). */
  anchorTop: number;
}

export function AccountMenu({ user, avatarUrl, anchorTop }: AccountMenuProps) {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];
  const router = useRouter();
  const { width: windowWidth } = useWindowDimensions();
  const [open, setOpen] = useState(false);

  // Phone-only accounts have email "" (not null) — fall through with ||, not ??.
  const name = (user.user_metadata?.name as string | undefined) || undefined;
  const initial = (name?.[0] ?? user.email?.[0] ?? 'U').toUpperCase();
  const heading = name || user.email || 'User';

  function go(route: Href) {
    setOpen(false);
    router.navigate(route);
  }

  async function logOut() {
    setOpen(false);
    await supabase.auth.signOut();
    router.replace(ROUTES.home);
  }

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Account menu"
        accessibilityState={{ expanded: open }}
        onPress={() => setOpen(true)}
        hitSlop={6}
        style={({ pressed }) => [
          styles.avatar,
          { borderColor: pressed || open ? c.primary : c.border },
        ]}
      >
        {avatarUrl ? (
          <Image
            source={{ uri: avatarUrl }}
            style={styles.avatarImage}
            contentFit="cover"
            accessibilityLabel="Your avatar"
          />
        ) : (
          <View style={[styles.avatarImage, styles.avatarFallback, { backgroundColor: c.primary }]}>
            <Text style={styles.avatarInitial}>{initial}</Text>
          </View>
        )}
      </Pressable>

      <Modal
        visible={open}
        transparent
        animationType="none"
        statusBarTranslucent
        navigationBarTranslucent
        onRequestClose={() => setOpen(false)}
      >
        <Pressable
          accessibilityLabel="Close account menu"
          onPress={() => setOpen(false)}
          style={StyleSheet.absoluteFill}
        />
        <Animated.View
          entering={FadeIn.duration(120)}
          accessibilityRole="menu"
          accessibilityLabel="Account options"
          style={[
            styles.menu,
            Shadows.lg,
            {
              top: anchorTop,
              backgroundColor: c.surface,
              borderColor: c.border,
              maxWidth: windowWidth - Spacing.lg,
            },
          ]}
        >
          <Text
            numberOfLines={1}
            style={[styles.heading, { color: c.textPrimary, borderBottomColor: c.border }]}
          >
            {heading}
          </Text>

          {MENU_ITEMS.map((item) => (
            <Pressable
              key={item.label}
              accessibilityRole="menuitem"
              onPress={() => go(item.route)}
              style={({ pressed }) => [styles.item, pressed && { backgroundColor: c.canvas }]}
            >
              {({ pressed }) => (
                <>
                  <Ionicons
                    name={item.icon}
                    size={16}
                    color={pressed ? c.textPrimary : c.textSecondary}
                  />
                  <Text
                    style={[styles.itemText, { color: pressed ? c.textPrimary : c.textSecondary }]}
                  >
                    {item.label}
                  </Text>
                </>
              )}
            </Pressable>
          ))}

          <View style={[styles.divider, { borderTopColor: c.border }]}>
            <Pressable
              accessibilityRole="menuitem"
              onPress={logOut}
              style={({ pressed }) => [styles.item, pressed && { backgroundColor: c.error + '0D' }]}
            >
              <Ionicons name="log-out-outline" size={16} color={c.error} />
              <Text style={[styles.itemText, { color: c.error }]}>Log Out</Text>
            </Pressable>
          </View>
        </Animated.View>
      </Modal>
    </>
  );
}

const AVATAR_SIZE = 36;

const styles = StyleSheet.create({
  avatar: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
    borderWidth: 2, // web ring-2 ring-border
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    color: '#ffffff',
    fontFamily: FontFamily.bodyBold,
    fontWeight: '700',
    fontSize: 12,
  },
  menu: {
    position: 'absolute',
    right: Spacing.lg,
    width: 192, // web w-48
    borderRadius: Radius.xl,
    borderWidth: 1,
    paddingVertical: 6,
  },
  heading: {
    paddingHorizontal: 14,
    paddingVertical: Spacing.sm,
    marginBottom: Spacing.xs,
    borderBottomWidth: StyleSheet.hairlineWidth,
    fontFamily: FontFamily.bodySemiBold,
    fontWeight: '600',
    fontSize: 12,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  itemText: {
    fontFamily: FontFamily.body,
    fontSize: 12,
  },
  divider: {
    borderTopWidth: StyleSheet.hairlineWidth,
    marginTop: Spacing.xs,
    paddingTop: Spacing.xs,
  },
});
