/**
 * LaunchBadge — port of ~/bldesy-web/components/waitlist/launch-badge.tsx: the
 * "Launching {LAUNCH_DATE}" pill (rounded-full, uppercase, a pinging dot).
 *
 *  - tone="onDark":  sits on a green hero (translucent white + green dot).
 *  - tone="onLight": sits on a light card (teal tint).
 *
 * `forceLight` pins the light theme tokens for hosts that are forced-light
 * regardless of the device theme (the waitlist form card).
 */
import { StyleSheet, Text, View } from 'react-native';

import { PingDot } from '@/components/marketing/ping-dot';
import { Colors, FontFamily, Radius } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { LAUNCH_DATE } from '@/lib/web/launch';

const GREEN_300 = '#86efac';

interface LaunchBadgeProps {
  tone?: 'onDark' | 'onLight';
  /** Brand accent — teal (homeowner) or indigo (enterprise/business). */
  accent?: 'primary' | 'indigo';
  forceLight?: boolean;
}

export function LaunchBadge({ tone = 'onDark', accent = 'primary', forceLight = false }: LaunchBadgeProps) {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[forceLight ? 'light' : scheme];
  const dark = tone === 'onDark';
  const indigo = accent === 'indigo';
  const dot = dark ? (indigo ? c.indigoLight : GREEN_300) : indigo ? c.indigo : c.primary;
  const bg = dark ? 'rgba(255,255,255,0.15)' : indigo ? c.indigo + '1A' : c.primaryLight;
  const fg = dark ? '#ffffff' : indigo ? c.indigo : c.primary;

  return (
    <View style={[styles.pill, { backgroundColor: bg }]} accessibilityRole="text">
      <PingDot color={dot} />
      <Text style={[styles.label, { color: fg }]}>Launching {LAUNCH_DATE}</Text>
    </View>
  );
}

export const badgeStyles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    alignSelf: 'center',
    borderRadius: Radius.full,
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
  label: {
    fontFamily: FontFamily.bodyBold,
    fontWeight: '700',
    fontSize: 12,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
});

const styles = badgeStyles;
