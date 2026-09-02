/**
 * EnterpriseTabBar — the website's mobile bottom tab bar for the hub
 * (enterprise-shell.tsx "Mobile bottom tab bar"): Dashboard · Jobs · Analytics
 * · Billing + More, `h-16` + safe area on `#111318/95` with a hairline top
 * border, 10px semibold captions, indigo when active, `white/40` otherwise.
 */
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useGlobalSearchParams, usePathname } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FontFamily, Spacing } from '@/constants/theme';
import { TAB_BAR_HEIGHT } from '@/hooks/use-global-tab-bar';
import { isNavItemActive, MOBILE_TAB_ITEMS, mobileTabLabel, toHref } from '@/lib/enterprise-hub/nav';

import { useHubTheme } from './hub-primitives';
import { HUB_SHELL_BG_TRANSLUCENT, HUB_SHELL_BORDER, HUB_SHELL_TEXT_MUTED } from './hub-theme';

/** The `?kind=` of the focused route, normalised to one string. */
export function useJobsKindParam(): string | null {
  const params = useGlobalSearchParams<{ kind?: string | string[] }>();
  const raw = params.kind;
  if (Array.isArray(raw)) return raw[0] ?? null;
  return raw ?? null;
}

export function EnterpriseTabBar({ moreOpen, onMorePress }: { moreOpen: boolean; onMorePress: () => void }) {
  const c = useHubTheme();
  const insets = useSafeAreaInsets();
  const pathname = usePathname();
  const kind = useJobsKindParam();

  return (
    <View
      accessibilityRole="tablist"
      accessibilityLabel="Enterprise tabs"
      style={[styles.bar, { height: TAB_BAR_HEIGHT + insets.bottom, paddingBottom: insets.bottom }]}
    >
      {MOBILE_TAB_ITEMS.map((item) => {
        const active = isNavItemActive(item.href, pathname, kind, item.exact);
        const tint = active ? c.indigo : HUB_SHELL_TEXT_MUTED;
        return (
          <Pressable
            key={item.label}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            accessibilityLabel={`${item.label} tab`}
            onPress={() => {
              if (!active) router.navigate(toHref(item.href));
            }}
            style={styles.tab}
          >
            <Ionicons name={item.icon} size={20} color={tint} />
            <Text style={[styles.label, { color: tint }]}>{mobileTabLabel(item.label)}</Text>
          </Pressable>
        );
      })}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="More"
        accessibilityState={{ expanded: moreOpen }}
        onPress={onMorePress}
        style={styles.tab}
      >
        <Ionicons name="menu-outline" size={20} color={moreOpen ? c.indigo : HUB_SHELL_TEXT_MUTED} />
        <Text style={[styles.label, { color: moreOpen ? c.indigo : HUB_SHELL_TEXT_MUTED }]}>More</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: HUB_SHELL_BG_TRANSLUCENT,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: HUB_SHELL_BORDER,
    paddingHorizontal: Spacing.sm,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  label: {
    fontSize: 10,
    fontFamily: FontFamily.bodySemiBold,
    fontWeight: '600',
  },
});
