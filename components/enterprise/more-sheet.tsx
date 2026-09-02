/**
 * EnterpriseMoreSheet — the website's mobile "More" sheet
 * (enterprise-shell.tsx): a bottom sheet on the `#111318` shell with the
 * drag handle, the company identity block (initial avatar, name,
 * "{size} employees") and the remaining nav rows in web order.
 */
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { router, usePathname } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FontFamily, Radius, Spacing } from '@/constants/theme';
import type { EnterpriseProfile } from '@/lib/data/enterprise';
import {
  isNavItemActive,
  MOBILE_MORE_ITEMS,
  resolveNavHref,
  toHref,
  type EnterpriseNavItem,
} from '@/lib/enterprise-hub/nav';
import { ROUTES } from '@/lib/routes';

import { useJobsKindParam } from './enterprise-tab-bar';
import { InitialAvatar, useHubTheme } from './hub-primitives';
import {
  HUB_SHELL_BG,
  HUB_SHELL_BORDER,
  HUB_SHELL_HANDLE,
  HUB_SHELL_ROW_BG,
  HUB_SHELL_TEXT,
  HUB_SHELL_TEXT_MUTED,
  HUB_SHELL_TEXT_STRONG,
  indigoTint,
} from './hub-theme';

/** Hub-internal destinations re-use the existing stack entry; the rest push. */
const IN_HUB_PREFIX = ROUTES.enterprise;

export function EnterpriseMoreSheet({
  visible,
  onClose,
  profile,
  userId,
}: {
  visible: boolean;
  onClose: () => void;
  profile: EnterpriseProfile;
  userId: string;
}) {
  const c = useHubTheme();
  const insets = useSafeAreaInsets();
  const pathname = usePathname();
  const kind = useJobsKindParam();

  function go(item: EnterpriseNavItem) {
    const href = resolveNavHref(item.href, userId);
    onClose();
    if (href === ROUTES.home) {
      router.navigate(toHref(href));
    } else if (href.startsWith(IN_HUB_PREFIX)) {
      router.navigate(toHref(href));
    } else {
      router.push(toHref(href));
    }
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose} accessibilityLabel="Close menu">
        <Pressable
          accessibilityViewIsModal
          accessibilityLabel="More enterprise options"
          onPress={() => {}}
          style={[styles.sheet, { paddingBottom: insets.bottom + Spacing.sm }]}
        >
          <View style={styles.handleWrap}>
            <View style={styles.handle} />
          </View>

          <View style={styles.body}>
            <View style={styles.identity}>
              <InitialAvatar name={profile.company_name} size={40} tone="shell" />
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text numberOfLines={1} style={styles.identityName}>
                  {profile.company_name}
                </Text>
                <Text numberOfLines={1} style={styles.identityMeta}>
                  {profile.company_size} employees
                </Text>
              </View>
            </View>

            <ScrollView style={styles.list} bounces={false} showsVerticalScrollIndicator={false}>
              {MOBILE_MORE_ITEMS.map((item) => {
                const href = resolveNavHref(item.href, userId);
                const active = isNavItemActive(href, pathname, kind, item.exact);
                const colour = active ? c.indigo : item.accent ? c.indigo + 'CC' : HUB_SHELL_TEXT;
                return (
                  <View key={item.label}>
                    {item.dividerBefore ? <View style={styles.divider} /> : null}
                    <Pressable
                      accessibilityRole="menuitem"
                      accessibilityState={{ selected: active }}
                      onPress={() => go(item)}
                      style={({ pressed }) => [
                        styles.row,
                        active && { backgroundColor: indigoTint(c.indigo, '08') },
                        pressed && { backgroundColor: HUB_SHELL_ROW_BG },
                      ]}
                    >
                      <Ionicons name={item.icon} size={18} color={colour} />
                      <Text style={[styles.rowLabel, { color: colour }]}>{item.label}</Text>
                    </Pressable>
                  </View>
                );
              })}
            </ScrollView>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: HUB_SHELL_BG,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: HUB_SHELL_BORDER,
    maxHeight: '80%',
  },
  handleWrap: {
    alignItems: 'center',
    paddingTop: Spacing.md,
    paddingBottom: Spacing.xs,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: HUB_SHELL_HANDLE,
  },
  body: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  identity: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    borderRadius: Radius.lg,
    backgroundColor: HUB_SHELL_ROW_BG,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    marginBottom: Spacing.sm,
  },
  identityName: {
    color: HUB_SHELL_TEXT_STRONG,
    fontSize: 14,
    fontFamily: FontFamily.bodySemiBold,
    fontWeight: '600',
  },
  identityMeta: {
    color: HUB_SHELL_TEXT_MUTED,
    fontSize: 11,
    fontFamily: FontFamily.body,
  },
  list: {
    maxHeight: 420,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: HUB_SHELL_BORDER,
    marginVertical: Spacing.sm,
    marginHorizontal: Spacing.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    marginBottom: 2,
  },
  rowLabel: {
    flex: 1,
    fontSize: 14,
    fontFamily: FontFamily.bodyMedium,
    fontWeight: '500',
  },
});
