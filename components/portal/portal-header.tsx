/**
 * PortalHeader — the portal shell's dark bar: the "Tradie Portal" wordmark
 * (the sidebar heading in `~/bldesy-web/app/portal/portal-shell.tsx`) with the
 * NotificationBell on the right, on the web's `#111318` sidebar colour.
 */
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';

import { Colors, FontFamily, Radius, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

import { NotificationBell } from './notification-bell';

/** Web sidebar / mobile bar background. */
export const PORTAL_CHROME_BG = '#111318';
export const PORTAL_HEADER_HEIGHT = 56;

export function PortalHeader() {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.bar, { paddingTop: insets.top, backgroundColor: PORTAL_CHROME_BG }]}>
      <View style={styles.inner}>
        <View style={styles.brand}>
          <View style={[styles.brandIcon, { backgroundColor: c.primary + '26' }]}>
            <Ionicons name="construct-outline" size={18} color={c.primary} />
          </View>
          <Text style={styles.wordmark} accessibilityRole="header">
            Tradie <Text style={{ color: c.primary }}>Portal</Text>
          </Text>
        </View>
        <NotificationBell context="tradie" anchorTop={insets.top + PORTAL_HEADER_HEIGHT + Spacing.sm} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  inner: {
    height: PORTAL_HEADER_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
  },
  brand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
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
    fontSize: 17,
    lineHeight: 22,
    fontFamily: FontFamily.display,
  },
});
