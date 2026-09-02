/**
 * SearchFilters — ~/bldesy-web/components/search/search-filters.tsx: the sort
 * pills (Closest only with a searched location), the Filters toggle, the
 * active speciality chips (tap to remove) and the expandable panel with
 * Urgency, "Licensed in" state toggles, the "Verified only" switch and Reset.
 *
 * Every change is a param patch (`ParamPatch`) the screen applies with
 * `router.setParams`, mirroring the web's URL-driven filters.
 */
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import {
  FILTER_URGENCY_OPTIONS,
  asString,
  resetFilterParams,
  sortOptionsFor,
  splitList,
  toggleLicensedState,
  withParam,
  withVerifiedToggled,
  withoutSpecialisation,
  type ParamPatch,
  type RawParams,
} from '@/components/search/search-params';
import { Colors, FontFamily, Radius, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { AU_STATES } from '@/lib/web/service-areas';
import { getSpecialisationName } from '@/lib/web/trade-specialisations';

interface SearchFiltersProps {
  params: RawParams;
  /** Sort pills are pointless on 0 results; the panel stays reachable. */
  hideSort?: boolean;
  onPatch: (patch: ParamPatch) => void;
}

export function SearchFilters({ params, hideSort = false, onPatch }: SearchFiltersProps) {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];
  const [filterOpen, setFilterOpen] = useState(false);

  const currentSort = asString(params.sort) ?? 'relevance';
  const currentUrgency = asString(params.urgency) ?? '';
  const verifiedOnly = asString(params.verified) === 'true';
  const licensedStates = splitList(asString(params.licensed_in));
  const sortOptions = sortOptionsFor(Boolean(asString(params.location)));
  const currentTrade = asString(params.trade) ?? '';
  const currentSpecs = splitList(asString(params.specialisations));

  // Resolve a stored slug to its display name via whichever searched trade owns it.
  const specName = (slug: string) =>
    currentTrade
      .split(',')
      .map((t) => getSpecialisationName(t, slug))
      .find(Boolean) ?? slug.replace(/-/g, ' ');

  const filtersActive = filterOpen || verifiedOnly || Boolean(currentUrgency);

  const pillStyle = (active: boolean) => [
    styles.pill,
    active
      ? { backgroundColor: c.primary, borderColor: c.primary }
      : { backgroundColor: c.canvas, borderColor: c.border },
  ];
  const pillText = (active: boolean) => [styles.pillText, { color: active ? '#fff' : c.textSecondary }];

  return (
    <View style={styles.wrap}>
      {/* Sort + Filter bar */}
      <View style={styles.bar}>
        {!hideSort ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.sortRow}
            style={styles.sortScroll}
          >
            {sortOptions.map((opt) => {
              const active = currentSort === opt.value || (opt.value === 'relevance' && !asString(params.sort));
              return (
                <Pressable
                  key={opt.value}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  onPress={() => onPatch(withParam(params, 'sort', opt.value === 'relevance' ? '' : opt.value))}
                  style={[
                    styles.pill,
                    active
                      ? { backgroundColor: c.primary, borderColor: c.primary }
                      : { backgroundColor: c.surface, borderColor: c.border },
                  ]}
                >
                  <Text style={pillText(active)}>{opt.label}</Text>
                </Pressable>
              );
            })}
          </ScrollView>
        ) : (
          <View style={styles.sortScroll} />
        )}

        <Pressable
          accessibilityRole="button"
          accessibilityState={{ expanded: filterOpen }}
          onPress={() => setFilterOpen((v) => !v)}
          style={[
            styles.filterBtn,
            filtersActive
              ? { backgroundColor: c.primary, borderColor: c.primary }
              : { backgroundColor: c.surface, borderColor: c.border },
          ]}
        >
          <Ionicons name="options-outline" size={16} color={filtersActive ? '#fff' : c.textSecondary} />
          <Text style={[styles.pillText, { color: filtersActive ? '#fff' : c.textSecondary }]}>Filters</Text>
        </Pressable>
      </View>

      {/* Active speciality chips — tap to remove */}
      {currentSpecs.length > 0 ? (
        <View style={styles.specRow}>
          <Text style={[styles.specLabel, { color: c.textSecondary + '99' }]}>SPECIALITY:</Text>
          {currentSpecs.map((slug) => (
            <Pressable
              key={slug}
              accessibilityRole="button"
              accessibilityLabel={`Remove ${specName(slug)} speciality`}
              onPress={() => onPatch(withoutSpecialisation(params, slug))}
              style={[styles.specChip, { backgroundColor: c.primary }]}
            >
              <Text style={styles.specChipText}>{specName(slug)}</Text>
              <Ionicons name="close" size={12} color="#fff" />
            </Pressable>
          ))}
        </View>
      ) : null}

      {/* Expandable filter panel */}
      {filterOpen ? (
        <View style={[styles.panel, { backgroundColor: c.surface, borderColor: c.border }]}>
          <View>
            <Text style={[styles.panelLabel, { color: c.textSecondary }]}>URGENCY</Text>
            <View style={styles.chipWrap}>
              {FILTER_URGENCY_OPTIONS.map((opt) => {
                const active = currentUrgency === opt.value;
                return (
                  <Pressable
                    key={opt.value}
                    accessibilityRole="button"
                    accessibilityState={{ selected: active }}
                    onPress={() => onPatch(withParam(params, 'urgency', opt.value))}
                    style={pillStyle(active)}
                  >
                    <Text style={pillText(active)}>{opt.label}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* Licensed in — multi-select; picking several = licensed in ANY of them */}
          <View>
            <Text style={[styles.panelLabel, { color: c.textSecondary }]}>LICENSED IN</Text>
            <View style={styles.chipWrap}>
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ selected: licensedStates.length === 0 }}
                onPress={() => onPatch(withParam(params, 'licensed_in', ''))}
                style={pillStyle(licensedStates.length === 0)}
              >
                <Text style={pillText(licensedStates.length === 0)}>Any</Text>
              </Pressable>
              {AU_STATES.map((state) => {
                const active = licensedStates.includes(state);
                return (
                  <Pressable
                    key={state}
                    accessibilityRole="button"
                    accessibilityState={{ selected: active }}
                    onPress={() =>
                      onPatch(withParam(params, 'licensed_in', toggleLicensedState(licensedStates, state).join(',')))
                    }
                    style={pillStyle(active)}
                  >
                    <Text style={pillText(active)}>{state}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* Verified only */}
          <Pressable
            accessibilityRole="switch"
            accessibilityState={{ checked: verifiedOnly }}
            accessibilityLabel="Show only verified tradies"
            onPress={() => onPatch(withVerifiedToggled(params))}
            style={styles.switchRow}
          >
            <View style={styles.flex1}>
              <Text style={[styles.switchTitle, { color: c.textPrimary }]}>Verified only</Text>
              <Text style={[styles.switchSub, { color: c.textSecondary }]}>Show only tradies with verified credentials</Text>
            </View>
            <Switch
              value={verifiedOnly}
              onValueChange={() => onPatch(withVerifiedToggled(params))}
              trackColor={{ true: c.primary, false: c.border }}
              thumbColor="#ffffff"
            />
          </Pressable>

          <Pressable accessibilityRole="button" onPress={() => onPatch(resetFilterParams(params))} hitSlop={6}>
            <Text style={[styles.reset, { color: c.error }]}>Reset all filters</Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: Spacing.md,
    marginBottom: Spacing['2xl'],
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  sortScroll: {
    flex: 1,
  },
  sortRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    paddingRight: Spacing.sm,
  },
  pill: {
    borderWidth: 1,
    borderRadius: Radius.full,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  pillText: {
    fontFamily: FontFamily.bodySemiBold,
    fontWeight: '600',
    fontSize: 12,
  },
  filterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    borderWidth: 1,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.lg,
    paddingVertical: 6,
  },
  specRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  specLabel: {
    fontFamily: FontFamily.bodyBold,
    fontWeight: '700',
    fontSize: 10,
    letterSpacing: 0.6,
  },
  specChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: 4,
  },
  specChipText: {
    color: '#fff',
    fontFamily: FontFamily.bodySemiBold,
    fontWeight: '600',
    fontSize: 12,
    textTransform: 'capitalize',
  },
  panel: {
    borderWidth: 1,
    borderRadius: Radius.xl,
    padding: Spacing.xl,
    gap: Spacing.xl,
  },
  panelLabel: {
    fontFamily: FontFamily.bodyBold,
    fontWeight: '700',
    fontSize: 11,
    letterSpacing: 1,
    marginBottom: Spacing.sm,
  },
  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  flex1: {
    flex: 1,
  },
  switchTitle: {
    fontFamily: FontFamily.bodySemiBold,
    fontWeight: '600',
    fontSize: 14,
  },
  switchSub: {
    fontFamily: FontFamily.body,
    fontSize: 12,
    marginTop: 2,
  },
  reset: {
    fontFamily: FontFamily.bodySemiBold,
    fontWeight: '600',
    fontSize: 14,
  },
});
