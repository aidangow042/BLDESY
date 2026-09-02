/**
 * StickyCTA — ~/bldesy-web/components/builder/sticky-cta.tsx: the "Send
 * Message" bar pinned to the bottom of the public profile (above the tab bar
 * on the web; here the profile is a stack screen so it sits on the safe area).
 */
import { StyleSheet, View } from 'react-native';

import { MessageButton } from '@/components/builder/message-button';
import { Colors, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useGlobalTabBar } from '@/hooks/use-global-tab-bar';

/** Bar height without the safe-area inset — screens pad their scroll content by this. */
export const STICKY_CTA_HEIGHT = 56 + Spacing.md * 2;

export function StickyCTA({ builderId }: { builderId: string }) {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];
  const { contentBottomInset } = useGlobalTabBar();

  return (
    <View
      style={[
        styles.bar,
        { backgroundColor: c.surface + 'F2', borderTopColor: c.border, paddingBottom: Math.max(Spacing.md, contentBottomInset) },
      ]}
    >
      <MessageButton recipientId={builderId} variant="sticky" label="Send Message" />
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});
