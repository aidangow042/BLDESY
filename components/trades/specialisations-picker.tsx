/**
 * Multi-trade specialisation picker — port of
 * ~/bldesy-web/components/trades/specialisations-picker.tsx. One chip group per
 * selected trade that has sub-trades defined; trades without specialisations
 * are skipped so the section silently collapses for builders who don't need it.
 */
import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Colors, FontFamily, Radius, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import {
  getSpecialisationsForTrade,
  hasSpecialisations,
  type BuilderSpecialisations,
} from '@/lib/web/trade-specialisations';
import { TRADE_CATEGORIES } from '@/lib/web/trades';

interface SpecialisationsPickerProps {
  /** The trades the builder selected — drives which sub-trade groups appear. */
  selectedTrades: readonly string[];
  /** Current value, keyed by trade slug → array of chosen specialisation slugs. */
  value: BuilderSpecialisations;
  onChange: (next: BuilderSpecialisations) => void;
}

export function tradeDisplayName(slug: string): string {
  for (const cat of TRADE_CATEGORIES) {
    const t = cat.trades.find((x) => x.slug === slug);
    if (t) return t.name;
  }
  return slug.replace(/-/g, ' ').replace(/\b\w/g, (ch) => ch.toUpperCase());
}

export function SpecialisationsPicker({ selectedTrades, value, onChange }: SpecialisationsPickerProps) {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];
  const visibleTrades = useMemo(() => selectedTrades.filter((slug) => hasSpecialisations(slug)), [selectedTrades]);

  if (visibleTrades.length === 0) return null;

  function toggle(trade: string, spec: string) {
    const current = value[trade] ?? [];
    const next = current.includes(spec) ? current.filter((s) => s !== spec) : [...current, spec];
    const merged = { ...value };
    if (next.length === 0) {
      delete merged[trade];
    } else {
      merged[trade] = next;
    }
    onChange(merged);
  }

  return (
    <View style={styles.wrap}>
      <View>
        <Text style={[styles.title, { color: c.textPrimary }]}>
          Specialisations <Text style={[styles.titleMuted, { color: c.textSecondary }]}>(optional)</Text>
        </Text>
        <Text style={[styles.helper, { color: c.textSecondary }]}>
          Pick the sub-trades you actually do. Customers searching for a specific job (e.g. metal
          roofing) will see you first.
        </Text>
      </View>

      <View style={[styles.panel, { borderColor: c.border }]}>
        {visibleTrades.map((trade) => {
          const options = getSpecialisationsForTrade(trade);
          const selected = value[trade] ?? [];
          return (
            <View key={trade}>
              <View style={styles.groupHeader}>
                <Text style={[styles.groupTitle, { color: c.textSecondary }]}>
                  {tradeDisplayName(trade).toUpperCase()}
                </Text>
                {selected.length > 0 ? (
                  <Text style={[styles.count, { color: c.textSecondary }]}>{selected.length} selected</Text>
                ) : null}
              </View>
              <View style={styles.chips}>
                {options.map((opt) => {
                  const on = selected.includes(opt.slug);
                  return (
                    <Pressable
                      key={opt.slug}
                      onPress={() => toggle(trade, opt.slug)}
                      accessibilityRole="button"
                      accessibilityState={{ selected: on }}
                      style={[
                        styles.chip,
                        on
                          ? { borderColor: c.primary, backgroundColor: c.primary + '1A' }
                          : { borderColor: c.border, backgroundColor: c.surface },
                      ]}
                    >
                      <Text style={[styles.chipText, { color: on ? c.primary : c.textPrimary }]}>{opt.name}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: Spacing.lg },
  title: { fontSize: 14, fontFamily: FontFamily.bodySemiBold, fontWeight: '600' },
  titleMuted: { fontFamily: FontFamily.body, fontWeight: '400' },
  helper: { marginTop: 4, fontSize: 12, lineHeight: 18, fontFamily: FontFamily.body },
  panel: { borderWidth: 1, borderRadius: Radius.xl, padding: Spacing.lg, gap: Spacing.lg },
  groupHeader: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: Spacing.sm, marginBottom: Spacing.sm },
  groupTitle: { fontSize: 12, fontFamily: FontFamily.bodyBold, fontWeight: '700', letterSpacing: 1 },
  count: { fontSize: 11, fontFamily: FontFamily.body },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { borderWidth: 1, borderRadius: Radius.full, paddingHorizontal: 12, paddingVertical: 6, minHeight: 32, justifyContent: 'center' },
  chipText: { fontSize: 12, fontFamily: FontFamily.bodyMedium, fontWeight: '500' },
});
