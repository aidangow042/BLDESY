/**
 * DashboardTabBar — the customer dashboard's mobile bottom bar from
 * ~/bldesy-web/components/dashboard/dashboard-shell.tsx: dark `#111318`/95
 * bar, h-16 + safe area, `Profile · My Jobs · Saved · Messages · Exit`, active
 * tab in the customer amber accent, others white/40.
 */
import type { ComponentProps } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useRouter, type Href } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import Ionicons from '@expo/vector-icons/Ionicons';

import { Colors, FontFamily, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { ROUTES } from '@/lib/routes';

type IoniconName = ComponentProps<typeof Ionicons>['name'];

/** Web sidebar bg-[#111318]. */
export const DASHBOARD_BAR_BG = '#111318';
export const DASHBOARD_BAR_HEIGHT = 64;

interface TabItem {
  name: 'profile' | 'jobs' | 'saved' | 'messages';
  /** Mobile bar label (the web shortens "Saved Tradies" → "Saved"). */
  label: string;
  icon: IoniconName;
}

export const DASHBOARD_TABS: readonly TabItem[] = [
  { name: 'profile', label: 'Profile', icon: 'person-outline' },
  { name: 'jobs', label: 'My Jobs', icon: 'briefcase-outline' },
  { name: 'saved', label: 'Saved', icon: 'bookmark-outline' },
  { name: 'messages', label: 'Messages', icon: 'chatbubble-ellipses-outline' },
];

export function DashboardTabBar({ state, navigation }: BottomTabBarProps) {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const currentName = state.routes[state.index]?.name;

  return (
    <View
      accessibilityRole="tablist"
      style={[styles.bar, { height: DASHBOARD_BAR_HEIGHT + insets.bottom, paddingBottom: insets.bottom }]}
    >
      {DASHBOARD_TABS.map((tab) => {
        const active = currentName === tab.name;
        const tint = active ? c.cta : 'rgba(255,255,255,0.4)';
        return (
          <Pressable
            key={tab.name}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            accessibilityLabel={tab.label}
            onPress={() => {
              if (process.env.EXPO_OS === 'ios') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              const route = state.routes.find((r) => r.name === tab.name);
              if (!route) return;
              const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
              if (!active && !event.defaultPrevented) navigation.navigate(tab.name);
            }}
            style={styles.item}
          >
            <Ionicons name={tab.icon} size={18} color={tint} />
            <Text style={[styles.label, { color: tint }]}>{tab.label}</Text>
          </Pressable>
        );
      })}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Exit Dashboard"
        onPress={() => router.replace(ROUTES.home as Href)}
        style={styles.item}
      >
        <Ionicons name="log-out-outline" size={18} color={c.cta + 'CC'} />
        <Text style={[styles.label, { color: c.cta + 'CC' }]}>Exit</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: DASHBOARD_BAR_BG + 'F2',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255,255,255,0.06)',
    paddingHorizontal: Spacing.sm,
  },
  item: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  label: {
    fontSize: 10,
    fontFamily: FontFamily.bodySemiBold,
    fontWeight: '600',
  },
});
