/**
 * Launch-area coverage picker — port of
 * ~/bldesy-web/components/profile/founding-zone-picker.tsx. Each founding zone
 * is a three-state choice — off, Primary, or Can cover — as a pair of toggles
 * on one card. Storage (lib/web/service-areas.ts): Primary → `region:<zone>`,
 * Can cover → `cover:<zone>`. Legacy entries saved before the restriction
 * (metro regions, whole states) are removable chips and never silently dropped.
 */
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Colors, FontFamily, Radius, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { FOUNDING_ZONES } from '@/lib/web/service-areas';

interface FoundingZonePickerProps {
  /** Zone names the tradie wants most of their work in. */
  primaryZones: string[];
  onPrimaryZonesChange: (zones: string[]) => void;
  /** Zone names the tradie will also take work in. */
  coverZones: string[];
  onCoverZonesChange: (zones: string[]) => void;
  /** Pre-existing region entries that aren't founding zones — removable only. */
  legacyRegions?: string[];
  onLegacyRegionsChange?: (regions: string[]) => void;
  /** Pre-existing `state:` entries — removable only. */
  states?: string[];
  onStatesChange?: (states: string[]) => void;
}

const eq = (a: string, b: string) => a.toLowerCase() === b.toLowerCase();
const has = (list: string[], name: string) => list.some((z) => eq(z, name));
const without = (list: string[], name: string) => list.filter((z) => !eq(z, name));

export function FoundingZonePicker({
  primaryZones,
  onPrimaryZonesChange,
  coverZones,
  onCoverZonesChange,
  legacyRegions = [],
  onLegacyRegionsChange,
  states = [],
  onStatesChange,
}: FoundingZonePickerProps) {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];
  const [expanded, setExpanded] = useState<string | null>(null);

  /* Selecting one kind always clears the other, so a zone can never be both. */
  function setKind(name: string, kind: 'primary' | 'cover') {
    const isPrimary = has(primaryZones, name);
    const isCover = has(coverZones, name);
    if (kind === 'primary') {
      onPrimaryZonesChange(isPrimary ? without(primaryZones, name) : [...primaryZones, name]);
      if (isCover) onCoverZonesChange(without(coverZones, name));
    } else {
      onCoverZonesChange(isCover ? without(coverZones, name) : [...coverZones, name]);
      if (isPrimary) onPrimaryZonesChange(without(primaryZones, name));
    }
  }

  return (
    <View style={styles.wrap}>
      <View>
        <Text style={[styles.intro, { color: c.textSecondary }]}>
          BLDESY is launching across inner Sydney. For each zone you work in, pick one:
        </Text>
        <View style={styles.legend}>
          <Text style={[styles.legendItem, { color: c.textSecondary }]}>
            <Text style={[styles.legendStrong, { color: c.textPrimary }]}>Primary areas</Text> — where
            you want most of your work. You&apos;ll be shown first here.
          </Text>
          <Text style={[styles.legendItem, { color: c.textSecondary }]}>
            <Text style={[styles.legendStrong, { color: c.textPrimary }]}>Can cover</Text> — you&apos;ll
            take jobs here too, just not your main focus.
          </Text>
        </View>

        <View style={styles.grid}>
          {FOUNDING_ZONES.map((zone) => {
            const isPrimary = has(primaryZones, zone.name);
            const isCover = has(coverZones, zone.name);
            const selected = isPrimary || isCover;
            const showSuburbs = expanded === zone.slug;
            return (
              <View
                key={zone.slug}
                style={[
                  styles.zoneCard,
                  isPrimary
                    ? { borderColor: c.primary, backgroundColor: c.primary + '1A' }
                    : isCover
                      ? { borderColor: c.primary + '66', backgroundColor: c.primary + '0D' }
                      : { borderColor: c.border, backgroundColor: c.surface },
                ]}
              >
                <View style={styles.zoneHeader}>
                  <Text style={[styles.zoneName, { color: selected ? c.primary : c.textPrimary }]}>{zone.name}</Text>
                  <Text style={[styles.zoneCount, { color: selected ? c.primary + 'B3' : c.textSecondary }]}>
                    {zone.suburbs.length} suburbs
                  </Text>
                </View>

                <View style={styles.zoneButtons}>
                  <Pressable
                    onPress={() => setKind(zone.name, 'primary')}
                    accessibilityRole="button"
                    accessibilityState={{ selected: isPrimary }}
                    accessibilityLabel={`${zone.name} — primary area`}
                    style={[
                      styles.zoneBtn,
                      isPrimary
                        ? { borderColor: c.primary, backgroundColor: c.primary }
                        : { borderColor: c.border, backgroundColor: c.surface },
                    ]}
                  >
                    <Text style={[styles.zoneBtnText, { color: isPrimary ? '#fff' : c.textSecondary }]}>
                      {isPrimary ? '✓ Primary' : 'Primary'}
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={() => setKind(zone.name, 'cover')}
                    accessibilityRole="button"
                    accessibilityState={{ selected: isCover }}
                    accessibilityLabel={`${zone.name} — can cover`}
                    style={[
                      styles.zoneBtn,
                      isCover
                        ? { borderColor: c.primary, backgroundColor: c.primary + '33' }
                        : { borderColor: c.border, backgroundColor: c.surface },
                    ]}
                  >
                    <Text style={[styles.zoneBtnText, { color: isCover ? c.primary : c.textSecondary }]}>
                      {isCover ? '✓ Can cover' : 'Can cover'}
                    </Text>
                  </Pressable>
                </View>

                <Pressable
                  onPress={() => setExpanded(showSuburbs ? null : zone.slug)}
                  accessibilityRole="button"
                  accessibilityState={{ expanded: showSuburbs }}
                  style={styles.suburbToggle}
                >
                  <Text style={[styles.suburbToggleText, { color: c.textSecondary }]}>
                    {showSuburbs ? 'Hide suburbs' : 'Show suburbs'}
                  </Text>
                </Pressable>
                {showSuburbs ? (
                  <Text style={[styles.suburbs, { color: c.textSecondary }]}>{zone.suburbs.join(', ')}</Text>
                ) : null}
              </View>
            );
          })}
        </View>
      </View>

      {legacyRegions.length > 0 || states.length > 0 ? (
        <View>
          <Text style={[styles.legacyLabel, { color: c.textSecondary }]}>Existing wider coverage</Text>
          <Text style={[styles.intro, { color: c.textSecondary }]}>
            Saved before we focused on the launch zones — still active on your profile until you
            remove it.
          </Text>
          <View style={styles.chips}>
            {legacyRegions.map((r) => (
              <Pressable
                key={`r-${r}`}
                onPress={() => onLegacyRegionsChange?.(legacyRegions.filter((x) => x !== r))}
                accessibilityRole="button"
                accessibilityLabel={`Remove ${r}`}
                style={[styles.chip, { borderColor: c.primary, backgroundColor: c.primary + '1A' }]}
              >
                <Text style={[styles.chipText, { color: c.primary }]}>
                  {r}
                  <Text> ×</Text>
                </Text>
              </Pressable>
            ))}
            {states.map((s) => (
              <Pressable
                key={`s-${s}`}
                onPress={() => onStatesChange?.(states.filter((x) => x !== s))}
                accessibilityRole="button"
                accessibilityLabel={`Remove all of ${s}`}
                style={[styles.chip, { borderColor: c.primary, backgroundColor: c.primary }]}
              >
                <Text style={[styles.chipText, styles.chipTextStrong, { color: '#fff' }]}>
                  All of {s}
                  <Text> ×</Text>
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: Spacing.lg },
  intro: { marginBottom: Spacing.sm, fontSize: 12, lineHeight: 18, fontFamily: FontFamily.body },
  legend: { gap: 4, marginBottom: Spacing.md },
  legendItem: { fontSize: 12, lineHeight: 18, fontFamily: FontFamily.body },
  legendStrong: { fontFamily: FontFamily.bodySemiBold, fontWeight: '600' },
  grid: { gap: 6 },
  zoneCard: { borderWidth: 1, borderRadius: Radius.lg },
  zoneHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.sm, paddingHorizontal: 12, paddingTop: 10 },
  zoneName: { fontSize: 12, fontFamily: FontFamily.bodySemiBold, fontWeight: '600' },
  zoneCount: { fontSize: 10, fontFamily: FontFamily.bodyMedium, fontWeight: '500' },
  zoneButtons: { flexDirection: 'row', gap: 6, paddingHorizontal: 12, paddingTop: 8 },
  zoneBtn: { flex: 1, borderWidth: 1, borderRadius: Radius.md, paddingHorizontal: 8, paddingVertical: 8, minHeight: 36, alignItems: 'center', justifyContent: 'center' },
  zoneBtnText: { fontSize: 11, fontFamily: FontFamily.bodyBold, fontWeight: '700' },
  suburbToggle: { paddingHorizontal: 12, paddingTop: 6, paddingBottom: 8 },
  suburbToggleText: { fontSize: 10, fontFamily: FontFamily.bodyMedium, fontWeight: '500', textDecorationLine: 'underline' },
  suburbs: { paddingHorizontal: 12, paddingBottom: 10, fontSize: 11, lineHeight: 17, fontFamily: FontFamily.body },
  legacyLabel: { marginBottom: 6, fontSize: 14, fontFamily: FontFamily.bodyMedium, fontWeight: '500' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { borderWidth: 1, borderRadius: Radius.full, paddingHorizontal: 12, paddingVertical: 6 },
  chipText: { fontSize: 12, fontFamily: FontFamily.bodyMedium, fontWeight: '500' },
  chipTextStrong: { fontFamily: FontFamily.bodySemiBold, fontWeight: '600' },
});
