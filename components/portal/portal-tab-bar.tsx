/**
 * PortalTabBar — the web portal shell's own mobile bottom tab bar
 * (`~/bldesy-web/app/portal/portal-shell.tsx`, "Mobile bottom tab bar"):
 * Dashboard · Home Jobs · Applications · Messages + More, h-16 + safe area on
 * `#111318/95` with a white/6 hairline, 10px semibold labels, active → primary,
 * idle → white/40.
 */
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { usePathname, useRouter, type Href } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import Ionicons from '@expo/vector-icons/Ionicons';

import { Colors, FontFamily, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

import { PORTAL_CHROME_BG } from './portal-header';
import { isPortalLinkActive, PORTAL_TAB_ITEMS } from './portal-nav';

export const PORTAL_TAB_BAR_HEIGHT = 64;

const IDLE = 'rgba(255,255,255,0.4)';

export function PortalTabBar({ onMore, moreOpen }: { onMore: () => void; moreOpen: boolean }) {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const pathname = usePathname();

  function haptic() {
    if (process.env.EXPO_OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  }

  return (
    <View
      accessibilityRole="tablist"
      style={[
        styles.bar,
        {
          backgroundColor: PORTAL_CHROME_BG + 'F2', // web bg-[#111318]/95
          height: PORTAL_TAB_BAR_HEIGHT + insets.bottom,
          paddingBottom: insets.bottom,
        },
      ]}
    >
      {PORTAL_TAB_ITEMS.map((item) => {
        const active = isPortalLinkActive(pathname, item);
        const tint = active ? c.primary : IDLE;
        return (
          <Pressable
            key={item.label}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            accessibilityLabel={item.label}
            onPress={() => {
              haptic();
              if (!active) router.navigate(item.href as Href);
            }}
            style={styles.item}
          >
            <Ionicons name={item.icon} size={22} color={tint} />
            <Text style={[styles.label, { color: tint }]}>{item.label}</Text>
          </Pressable>
        );
      })}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="More"
        accessibilityState={{ expanded: moreOpen }}
        onPress={() => {
          haptic();
          onMore();
        }}
        style={styles.item}
      >
        <Ionicons name="menu-outline" size={22} color={IDLE} />
        <Text style={[styles.label, { color: IDLE }]}>More</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255,255,255,0.06)',
    paddingHorizontal: Spacing.sm,
  },
  item: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
  },
  label: {
    fontSize: 10,
    lineHeight: 14,
    fontFamily: FontFamily.bodySemiBold,
    fontWeight: '600',
  },
});
