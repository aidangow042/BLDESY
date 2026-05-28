import React, { useState, useCallback } from 'react';
import { View, Pressable, StyleSheet, Text } from 'react-native';
import { withLayoutContext, useRouter } from 'expo-router';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import type { MaterialTopTabBarProps } from '@react-navigation/material-top-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';

import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors, FontFamily, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

const { Navigator } = createMaterialTopTabNavigator();
const TopTabs = withLayoutContext(Navigator);

/* Shared flag so BottomTabBar can tell TabLayout to skip the slide animation
   when the user taps (instead of swipes) between tabs. Keeps the press feel
   snappy while leaving swipes smooth. */
let disableAnimation: (() => void) | null = null;

type SlotKind = 'tab' | 'push';

interface TabSlot {
  kind: SlotKind;
  /** Route name (for `tab`) or path to push (for `push`). */
  target: string;
  label: string;
  icon: string; // IconSymbol name
  /** Larger, primary-coloured icon (used for the Post Job accent slot). */
  accent?: boolean;
}

/* 5 slots — matches the website's mobile bottom bar:
   Home / Search / Post Job (accent) / AI / Map
   "Saved" moves to the hamburger menu (web parity). */
const SLOTS: TabSlot[] = [
  { kind: 'tab',  target: 'index',     label: 'Home',     icon: 'house' },
  { kind: 'push', target: '/all-trades', label: 'Search', icon: 'magnifyingglass' },
  { kind: 'push', target: '/post-job', label: 'Post Job', icon: 'plus.circle.fill', accent: true },
  { kind: 'tab',  target: 'ai',        label: 'AI',       icon: 'sparkles' },
  { kind: 'tab',  target: 'map',       label: 'Map',      icon: 'map' },
];

function BottomTabBar({ state, navigation }: MaterialTopTabBarProps) {
  const colorScheme = useColorScheme();
  const theme = colorScheme === 'dark' ? 'dark' : 'light';
  const colors = Colors[theme];
  const insets = useSafeAreaInsets();
  const router = useRouter();

  // Builder portal keeps its dark-themed dashboard chrome until Phase 5
  // restyles it; render its own tab bar.
  const currentRoute = state.routes[state.index];
  // Portal used to render its own dark-teal tab bar with a single icon — the
  // web doesn't do this, and the portal is now styled to match the rest of
  // the app, so we fall through to the standard tab bar everywhere.
  void currentRoute;

  return (
    <View
      style={[
        styles.tabBar,
        {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          paddingBottom: insets.bottom,
          height: 64 + insets.bottom,
        },
      ]}
    >
      {SLOTS.map((slot) => {
        const isActive =
          slot.kind === 'tab' && state.routes[state.index]?.name === slot.target;
        const tint = slot.accent
          ? colors.primary
          : isActive
            ? colors.primary
            : colors.textSecondary;

        function handlePress() {
          if (process.env.EXPO_OS === 'ios') {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          }
          if (slot.kind === 'tab') {
            const route = state.routes.find((r) => r.name === slot.target);
            if (!route) return;
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });
            if (!isActive && !event.defaultPrevented) {
              disableAnimation?.();
              navigation.navigate(slot.target);
            }
          } else {
            router.push(slot.target as any);
          }
        }

        return (
          <Pressable
            key={slot.label}
            onPress={handlePress}
            style={styles.tabItem}
            accessibilityRole="tab"
            accessibilityState={{ selected: isActive }}
            accessibilityLabel={`${slot.label} tab`}
          >
            <IconSymbol size={slot.accent ? 30 : 24} name={slot.icon as any} color={tint} />
            <Text
              style={[
                styles.tabLabel,
                { color: tint, fontWeight: isActive || slot.accent ? '700' : '600' },
              ]}
            >
              {slot.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export default function TabLayout() {
  const [animationEnabled, setAnimationEnabled] = useState(true);

  disableAnimation = useCallback(() => {
    setAnimationEnabled(false);
    // Re-enable after the navigation completes so swipes still animate.
    setTimeout(() => setAnimationEnabled(true), 50);
  }, []);

  return (
    <TopTabs
      tabBarPosition="bottom"
      tabBar={(props) => <BottomTabBar {...props} />}
      screenOptions={{
        swipeEnabled: true,
        lazy: true,
        animationEnabled,
      }}
    >
      <TopTabs.Screen name="index" options={{ title: 'Home' }} />
      <TopTabs.Screen name="ai" options={{ title: 'AI Assist' }} />
      <TopTabs.Screen name="map" options={{ title: 'Map', swipeEnabled: false }} />
      {/* Saved moved to hamburger menu — keep the screen registered so deep
          links to /saved still work, but hidden from the bar. */}
      <TopTabs.Screen name="saved" options={{ swipeEnabled: false }} />
      {/* Portal is role-gated. Hidden from default rendering. */}
      <TopTabs.Screen name="portal" options={{ swipeEnabled: false }} />
    </TopTabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    flexDirection: 'row',
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: Spacing.sm,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  tabLabel: {
    fontSize: 10,
    fontFamily: FontFamily.bodyBold,
  },
  portalTabIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
