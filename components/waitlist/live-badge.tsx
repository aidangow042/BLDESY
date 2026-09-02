/**
 * LiveBadge — port of ~/bldesy-web/components/waitlist/live-badge.tsx: the
 * "BLDESY is live in {zone}" pill, the post-open twin of LaunchBadge (same
 * geometry, same pinging dot). Names the ZONE, not the suburb — the zone is
 * the unit of supply.
 */
import { Text, View } from 'react-native';

import { PingDot } from '@/components/marketing/ping-dot';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

import { badgeStyles } from './launch-badge';

const GREEN_300 = '#86efac';

interface LiveBadgeProps {
  zoneName: string;
  tone?: 'onDark' | 'onLight';
}

export function LiveBadge({ zoneName, tone = 'onLight' }: LiveBadgeProps) {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];
  const dark = tone === 'onDark';
  return (
    <View
      style={[badgeStyles.pill, { backgroundColor: dark ? 'rgba(255,255,255,0.15)' : c.primaryLight }]}
      accessibilityRole="text"
    >
      <PingDot color={dark ? GREEN_300 : c.primary} />
      <Text style={[badgeStyles.label, { color: dark ? '#ffffff' : c.primary }]}>BLDESY is live in {zoneName}</Text>
    </View>
  );
}
