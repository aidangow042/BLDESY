/**
 * Bottom tab bar — the website's mobile bar
 * (`~/bldesy-web/components/layout/header.tsx`, "Mobile bottom tab bar", LIVE
 * branch): Home · Search · Post Job (accent) · AI · Map. h-16 + safe area on
 * `surface/95` with a hairline top border, 10px semibold labels, the accent slot's
 * icon larger and always primary. Search and Post Job are pushes (CLAUDE.md §5).
 * Hidden on portal / enterprise / dashboard routes — those shells render their own.
 */
import { useCallback, useState, type ComponentProps } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter, withLayoutContext, type Href } from 'expo-router';
import {
  createMaterialTopTabNavigator,
  type MaterialTopTabBarProps,
} from '@react-navigation/material-top-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import Ionicons from '@expo/vector-icons/Ionicons';

import { Colors, FontFamily, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { TAB_BAR_HEIGHT, useHideGlobalTabBar } from '@/hooks/use-global-tab-bar';
import { ROUTES } from '@/lib/routes';

const { Navigator } = createMaterialTopTabNavigator();
const TopTabs = withLayoutContext(Navigator);

/* Shared flag so BottomTabBar can tell TabLayout to skip the slide animation
   when the user taps (instead of swipes) between tabs. Keeps the press feel
   snappy while leaving swipes smooth. */
let disableAnimation: (() => void) | null = null;

type IoniconName = ComponentProps<typeof Ionicons>['name'];

type TabSlot =
  | { kind: 'tab'; target: string; label: string; icon: IoniconName; accent?: boolean }
  | { kind: 'push'; target: Href; label: string; icon: IoniconName; accent?: boolean };

/* 5 slots — the website's mobile bottom bar. Web icons are heroicons outline;
   Ionicons outline is the closest native set. */
const SLOTS: TabSlot[] = [
  { kind: 'tab', target: 'index', label: 'Home', icon: 'home-outline' },
  { kind: 'push', target: ROUTES.search, label: 'Search', icon: 'search-outline' },
  { kind: 'push', target: ROUTES.postJob, label: 'Post Job', icon: 'add-circle-outline', accent: true },
  { kind: 'tab', target: 'ai', label: 'AI', icon: 'sparkles-outline' },
  { kind: 'tab', target: 'map', label: 'Map', icon: 'map-outline' },
];

function BottomTabBar({ state, navigation }: MaterialTopTabBarProps) {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const hidden = useHideGlobalTabBar();

  if (hidden) return null;

  const currentName = state.routes[state.index]?.name;

  return (
    <View
      accessibilityRole="tablist"
      style={[
        styles.tabBar,
        {
          backgroundColor: c.surface + 'F2', // web bg-surface/95
          borderTopColor: c.border,
          height: TAB_BAR_HEIGHT + insets.bottom,
          paddingBottom: insets.bottom,
        },
      ]}
    >
      {SLOTS.map((slot) => {
        const isActive = slot.kind === 'tab' && currentName === slot.target;
        const tint = slot.accent || isActive ? c.primary : c.textSecondary;

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
            router.push(slot.target);
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
            <Ionicons name={slot.icon} size={slot.accent ? 28 : 24} color={tint} />
            <Text style={[styles.tabLabel, { color: tint }]}>{slot.label}</Text>
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
      {/* Saved lives in the drawer / account menu — keep the screen registered so
          deep links to /saved still work, but hidden from the bar. */}
      <TopTabs.Screen name="saved" options={{ swipeEnabled: false }} />
      {/* Portal is role-gated and renders its own shell — the bar hides itself there. */}
      <TopTabs.Screen name="portal" options={{ swipeEnabled: false }} />
    </TopTabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: Spacing.sm,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs, // web gap-1
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  tabLabel: {
    fontSize: 10,
    fontFamily: FontFamily.bodySemiBold,
    fontWeight: '600',
  },
});
