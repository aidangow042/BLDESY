/**
 * EnterpriseHeader — the hub's top bar: the website sidebar's brand row
 * (building glyph in `bg-indigo/15`, "Enterprise Hub" with Hub in indigo) and
 * the NotificationBell, on the `#111318` shell (enterprise-shell.tsx).
 */
import { StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FontFamily, Radius, Spacing } from '@/constants/theme';

import { useHubTheme } from './hub-primitives';
import { HUB_SHELL_BG, HUB_SHELL_BORDER, indigoTint } from './hub-theme';
import { NotificationBell } from './notification-bell';

export const ENTERPRISE_HEADER_HEIGHT = 56;

export function EnterpriseHeader() {
  const c = useHubTheme();
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.header, { paddingTop: insets.top }]}>
      <View style={styles.row}>
        <View style={[styles.brandIcon, { backgroundColor: indigoTint(c.indigo, '15') }]}>
          <Ionicons name="business-outline" size={18} color={c.indigo} />
        </View>
        <Text accessibilityRole="header" style={styles.wordmark}>
          Enterprise <Text style={{ color: c.indigo }}>Hub</Text>
        </Text>
        <View style={{ flex: 1 }} />
        <NotificationBell context="enterprise" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: HUB_SHELL_BG,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: HUB_SHELL_BORDER,
  },
  row: {
    height: ENTERPRISE_HEADER_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingHorizontal: Spacing.lg,
  },
  brandIcon: {
    width: 32,
    height: 32,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  wordmark: {
    color: '#ffffff',
    fontSize: 15,
    fontFamily: FontFamily.bodyBold,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
});
