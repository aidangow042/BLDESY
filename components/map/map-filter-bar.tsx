/**
 * MapFilterBar — ~/bldesy-web/components/map/map-filter-bar.tsx (phone
 * branch): the search row (SmartSearch + SuburbSearch + a filter button with
 * the active-filter badge) and the trade-chip sheet with per-chip counts.
 */
import { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';

import { FILTER_TRADES, type SpecialtyToken } from '@/components/map/map-logic';
import { SmartSearch } from '@/components/map/smart-search';
import { SuburbSearch } from '@/components/map/suburb-search';
import { Colors, FontFamily, Radius, Shadows, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

interface MapFilterBarProps {
  filter: string;
  counts: Record<string, number>;
  onSelectTrade: (trade: string) => void;
  onClearTrade: () => void;
  specialty: SpecialtyToken | null;
  onPickSpecialty: (token: SpecialtyToken) => void;
  onClearSpecialty: () => void;
  onLocate: (coords: { latitude: number; longitude: number }, label: string) => void;
  /** Either typeahead dropdown is open. */
  onDropdownChange?: (open: boolean) => void;
}

export function MapFilterBar({
  filter,
  counts,
  onSelectTrade,
  onClearTrade,
  specialty,
  onPickSpecialty,
  onClearSpecialty,
  onLocate,
  onDropdownChange,
}: MapFilterBarProps) {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];
  const insets = useSafeAreaInsets();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [smartOpen, setSmartOpen] = useState(false);
  const [suburbOpen, setSuburbOpen] = useState(false);

  const activeFilterCount = (filter !== 'All' ? 1 : 0) + (specialty ? 1 : 0);

  function reportOpen(smart: boolean, suburb: boolean) {
    onDropdownChange?.(smart || suburb);
  }

  return (
    <>
      <View style={[styles.bar, { backgroundColor: c.surface + 'E6', borderBottomColor: c.border }]}>
        <View style={styles.row}>
          <SmartSearch
            tradeFilter={filter}
            specialty={specialty}
            onPickTrade={onSelectTrade}
            onPickSpecialty={onPickSpecialty}
            onClearSpecialty={onClearSpecialty}
            onClearTrade={onClearTrade}
            onOpenChange={(open) => {
              setSmartOpen(open);
              reportOpen(open, suburbOpen);
            }}
          />
          <SuburbSearch
            onLocate={onLocate}
            onOpenChange={(open) => {
              setSuburbOpen(open);
              reportOpen(smartOpen, open);
            }}
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Filter by trade or specialty"
            onPress={() => setSheetOpen(true)}
            style={[styles.filterBtn, { borderColor: c.border, backgroundColor: c.surface }]}
          >
            <Ionicons name="funnel-outline" size={16} color={c.textPrimary} />
            {activeFilterCount > 0 ? (
              <View style={[styles.badge, { backgroundColor: c.primary }]}>
                <Text style={styles.badgeText}>{activeFilterCount}</Text>
              </View>
            ) : null}
          </Pressable>
        </View>
      </View>

      {/* Filter sheet — trade chips with counts */}
      <Modal visible={sheetOpen} transparent animationType="fade" statusBarTranslucent onRequestClose={() => setSheetOpen(false)}>
        <View style={styles.modalRoot}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setSheetOpen(false)} accessibilityLabel="Close filters" />
          <View style={[styles.sheet, Shadows['2xl'], { backgroundColor: c.surface, paddingBottom: insets.bottom + Spacing.lg }]}>
            <View style={styles.sheetHeader}>
              <Text style={[styles.sheetTitle, { color: c.textPrimary }]}>Filters</Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Close"
                onPress={() => setSheetOpen(false)}
                style={[styles.closeBtn, { backgroundColor: c.canvas, borderColor: c.border + '99' }]}
              >
                <Ionicons name="close" size={16} color={c.textPrimary} />
              </Pressable>
            </View>
            <View style={styles.chips}>
              {FILTER_TRADES.map((t) => {
                const active = filter === t;
                const count = counts[t] ?? 0;
                return (
                  <Pressable
                    key={t}
                    accessibilityRole="button"
                    accessibilityState={{ selected: active }}
                    onPress={() => {
                      onSelectTrade(t);
                      setSheetOpen(false);
                    }}
                    style={[
                      styles.chip,
                      active
                        ? [{ backgroundColor: c.primary, borderColor: c.primary }, Shadows.sm]
                        : { backgroundColor: c.surface, borderColor: c.border },
                    ]}
                  >
                    <Text style={[styles.chipText, { color: active ? '#fff' : c.textPrimary }]}>{t}</Text>
                    <View style={[styles.count, { backgroundColor: active ? 'rgba(255,255,255,0.25)' : c.canvas }]}>
                      <Text style={[styles.countText, { color: active ? '#fff' : c.textSecondary }]}>{count}</Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  bar: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  filterBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    color: '#fff',
    fontFamily: FontFamily.bodyBold,
    fontWeight: '700',
    fontSize: 9,
  },
  modalRoot: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  sheet: {
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    padding: Spacing.lg,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  sheetTitle: {
    fontFamily: FontFamily.bodyBold,
    fontWeight: '700',
    fontSize: 14,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderRadius: Radius.full,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  chipText: {
    fontFamily: FontFamily.bodySemiBold,
    fontWeight: '600',
    fontSize: 12,
  },
  count: {
    minWidth: 18,
    borderRadius: Radius.full,
    paddingHorizontal: 4,
    paddingVertical: 1,
    alignItems: 'center',
  },
  countText: {
    fontFamily: FontFamily.bodyBold,
    fontWeight: '700',
    fontSize: 10,
    fontVariant: ['tabular-nums'],
  },
});
