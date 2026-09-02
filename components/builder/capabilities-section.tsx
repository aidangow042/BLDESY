/**
 * CapabilitiesSection — ~/bldesy-web/components/builder/capabilities-section.tsx
 * (+ capability-pill-reveal.tsx): the tradie's self-declared site-ready
 * capabilities as pills, verified-first, four visible with a "Show all N more"
 * toggle. Items the tradie does NOT have are hidden. Nothing when empty.
 */
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import { ProfileSection } from '@/components/builder/profile-section';
import { Colors, FontFamily, Radius, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import {
  CAPABILITY_GROUPS,
  formatPublicLiability,
  hasCapability,
  isCapabilityVerified,
  type CapabilityItem,
  type CapabilityKey,
  type TradieCapabilities,
} from '@/lib/web/capabilities';

type RenderablePill = {
  key: CapabilityKey | 'public_liability';
  label: string;
  verified: boolean;
};

const INITIAL_VISIBLE = 4;

/** The pills the public view renders, verified-first (stable within group order). */
export function capabilityPills(capabilities: TradieCapabilities | null): RenderablePill[] {
  if (!capabilities) return [];
  const pills: RenderablePill[] = [];
  const pushItems = (items: readonly CapabilityItem[]) => {
    for (const item of items) {
      if (hasCapability(capabilities, item.key)) {
        pills.push({ key: item.key, label: item.label, verified: isCapabilityVerified(capabilities, item.key) });
      }
    }
  };
  pushItems(CAPABILITY_GROUPS.gear.items);
  pushItems(CAPABILITY_GROUPS.tickets.items);
  pushItems(CAPABILITY_GROUPS.business.items);
  const liabilityLabel = formatPublicLiability(capabilities.public_liability_amount);
  if (liabilityLabel) pills.push({ key: 'public_liability', label: liabilityLabel, verified: false });
  pills.sort((a, b) => Number(b.verified) - Number(a.verified));
  return pills;
}

export function CapabilitiesSection({ capabilities }: { capabilities: TradieCapabilities | null }) {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];
  const [expanded, setExpanded] = useState(false);
  const pills = capabilityPills(capabilities);
  if (pills.length === 0) return null;

  const visible = expanded || pills.length <= INITIAL_VISIBLE ? pills : pills.slice(0, INITIAL_VISIBLE);
  const hiddenCount = pills.length - INITIAL_VISIBLE;

  return (
    <ProfileSection title="Site-Ready Capabilities" size="sm">
      <View style={styles.pills}>
        {visible.map((pill) => (
          <View key={pill.key} style={[styles.pill, { backgroundColor: c.primaryLight }]}>
            <Ionicons name="checkmark" size={14} color={c.primary} />
            <Text style={[styles.pillText, { color: c.primary }]}>{pill.label}</Text>
            {pill.verified ? (
              <View style={[styles.verified, { backgroundColor: c.success + 'E6' }]}>
                <Text style={styles.verifiedText}>Verified</Text>
              </View>
            ) : null}
          </View>
        ))}
      </View>
      {pills.length > INITIAL_VISIBLE ? (
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ expanded }}
          onPress={() => setExpanded((v) => !v)}
          hitSlop={6}
          style={styles.toggle}
        >
          <Text style={[styles.toggleText, { color: c.primary }]}>{expanded ? 'SHOW LESS' : `SHOW ALL ${hiddenCount} MORE`}</Text>
          <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={14} color={c.primary} />
        </Pressable>
      ) : null}
    </ProfileSection>
  );
}

const styles = StyleSheet.create({
  pills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
  },
  pillText: {
    fontFamily: FontFamily.bodyBold,
    fontWeight: '700',
    fontSize: 11,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  verified: {
    borderRadius: Radius.full,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  verifiedText: {
    color: '#ffffff',
    fontFamily: FontFamily.bodyBold,
    fontWeight: '700',
    fontSize: 9,
  },
  toggle: {
    marginTop: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
  },
  toggleText: {
    fontFamily: FontFamily.bodyBold,
    fontWeight: '700',
    fontSize: 12,
    letterSpacing: 0.6,
  },
});
