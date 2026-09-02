/**
 * SpotsRemaining — port of ~/bldesy-web/components/supply/spots-remaining.tsx.
 * Live "spots remaining per zone" for one trade — the capped-supply counter.
 * Numbers come from GET /api/supply/spots (cap − live searchable tradies). On
 * any fetch failure the UI degrades to the cap-only copy — never a broken or
 * empty state, and never made-up numbers.
 */
import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { OptionPicker } from '@/components/marketing/option-picker';
import { Colors, FontFamily, Radius, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { fetchSupplySpots } from '@/lib/data/public-forms';
import type { ZoneSpots } from '@/lib/web/supply-caps';
import { getAllTrades } from '@/lib/web/trades';

import { chipTone, type ChipTone } from './supply-logic';

export { chipTone, type ChipTone } from './supply-logic';

interface SpotsRemainingProps {
  defaultTrade?: string;
}

export function SpotsRemaining({ defaultTrade = 'electrician' }: SpotsRemainingProps) {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];
  const trades = useMemo(() => [...getAllTrades()].sort((a, b) => a.name.localeCompare(b.name)), []);
  const options = useMemo(() => trades.map((t) => ({ value: t.slug, label: t.name })), [trades]);
  const [trade, setTrade] = useState(defaultTrade);
  // Keyed by trade so "loading" is derived (result for another trade = still fetching).
  const [result, setResult] = useState<{ trade: string; zones: ZoneSpots[] | null } | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchSupplySpots(trade).then((zones) => {
      if (!cancelled) setResult({ trade, zones });
    });
    return () => {
      cancelled = true;
    };
  }, [trade]);

  const loading = result?.trade !== trade;
  const zones = loading ? null : (result?.zones ?? null);

  const tradeName = trades.find((t) => t.slug === trade)?.name.toLowerCase() ?? 'your trade';
  const totalRemaining = zones?.reduce((sum, z) => sum + z.remaining, 0) ?? null;
  const totalCap = zones?.reduce((sum, z) => sum + z.cap, 0) ?? null;

  const toneStyle = (tone: ChipTone) => {
    switch (tone) {
      case 'full':
        return { border: c.error + '4D', bg: c.error + '0D', fg: c.error };
      case 'low':
        return { border: c.warning + '66', bg: c.warning + '1A', fg: c.warning };
      default:
        return { border: c.primary + '4D', bg: c.primaryBg, fg: c.primary };
    }
  };

  return (
    <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }]}>
      <Text style={[styles.label, { color: c.textPrimary }]}>Spots left for</Text>
      <OptionPicker
        value={trade}
        options={options}
        onChange={setTrade}
        placeholder="Trade"
        accessibilityLabel="Spots left for"
        allowClear={false}
        compact
        palette={{ fieldBg: c.canvas }}
        style={styles.picker}
      />
      <Text style={[styles.status, { color: c.textSecondary }]} accessibilityLiveRegion="polite">
        {loading
          ? 'Checking…'
          : totalRemaining !== null
            ? `${totalRemaining} of ${totalCap} inner-Sydney spots left`
            : 'Capped per area — first in, best dressed'}
      </Text>

      {!loading && zones ? (
        <View style={styles.chips} accessibilityRole="list">
          {zones.map((zone) => {
            const tone = toneStyle(chipTone(zone.remaining));
            return (
              <View
                key={zone.zoneSlug}
                style={[styles.chip, { borderColor: tone.border, backgroundColor: tone.bg }]}
              >
                <Text style={[styles.chipName, { color: tone.fg }]}>{zone.zoneName}</Text>
                <Text style={[styles.chipCount, { color: tone.fg }]}>
                  {zone.remaining === 0 ? 'Full' : `${zone.remaining} of ${zone.cap} left`}
                </Text>
              </View>
            );
          })}
        </View>
      ) : null}

      <Text style={[styles.footer, { color: c.textSecondary }]}>
        We cap {tradeName} spots per area so every member gets real work — when your area&apos;s full, it&apos;s
        full. Full area? Apply anyway and we&apos;ll waitlist you for the next opening.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Radius.xl,
    borderWidth: 2,
    padding: Spacing.xl,
    gap: Spacing.md,
  },
  label: {
    fontFamily: FontFamily.bodyBold,
    fontWeight: '700',
    fontSize: 14,
  },
  picker: {
    alignSelf: 'stretch',
  },
  status: {
    fontFamily: FontFamily.body,
    fontSize: 14,
    lineHeight: 20,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginTop: Spacing.xs,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: Radius.full,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  chipName: {
    fontFamily: FontFamily.bodyBold,
    fontWeight: '700',
    fontSize: 12,
  },
  chipCount: {
    fontFamily: FontFamily.bodySemiBold,
    fontWeight: '600',
    fontSize: 12,
    opacity: 0.8,
  },
  footer: {
    fontFamily: FontFamily.body,
    fontSize: 12,
    lineHeight: 18,
    marginTop: Spacing.xs,
  },
});
