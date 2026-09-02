/**
 * CoverageSearch — port of ~/bldesy-web/components/coverage/coverage-search.tsx.
 * Local matches (launch-zone suburbs, aliases, the greyed ring) render
 * instantly; the on-device national dataset tops the list up so any Australian
 * suburb resolves (to "not covered") instead of dead-ending. Every resolved
 * search fires `coverage_suburb_searched` — a demand signal, covered or not.
 *
 * The explorer remounts this component (via `key`) on a full clear, so all
 * internal state resets.
 */
import { useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { HeroIcon, SEARCH_PATHS } from '@/components/marketing/hero-icon';
import { Colors, FontFamily, Radius, Shadows, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { trackFunnelEvent } from '@/lib/data/tracking';
import { getPostcodeForSuburb, getSuburbSuggestions } from '@/lib/geo';
import { COVERAGE_ZONES } from '@/lib/web/coverage-map/config';

import { useCoverage, type CoverageResult } from './coverage-context';
import { MAX_MATCHES, localMatches, mergeNationalMatches, type SearchEntry } from './coverage-logic';

export function CoverageSearch() {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];
  const { setResult } = useCoverage();
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  // Choosing an option writes its label back into the input — that state
  // change must not re-open the list over the CTA.
  const chosenRef = useRef<string | null>(null);

  const zoneFill = useMemo(() => Object.fromEntries(COVERAGE_ZONES.map((z) => [z.slug, z.fill])), []);

  const matches = useMemo<SearchEntry[]>(() => {
    const q = query.trim();
    if (q.length < 2 || q === chosenRef.current) return [];
    const local = localMatches(q);
    if (local.length >= MAX_MATCHES) return local;
    return mergeNationalMatches(local, getSuburbSuggestions(q, MAX_MATCHES));
  }, [query]);

  function onChange(value: string) {
    if (value.trim() !== chosenRef.current) chosenRef.current = null;
    setQuery(value);
    setOpen(value.trim().length >= 2);
  }

  function choose(entry: SearchEntry) {
    chosenRef.current = entry.label;
    setQuery(entry.label);
    setOpen(false);
    // Every resolved search is a demand signal, covered or not.
    trackFunnelEvent('coverage_suburb_searched', {
      suburb: entry.label,
      covered: entry.zoneSlug !== null,
      zone: entry.zoneSlug,
    });
    const result: CoverageResult = {
      label: entry.label,
      geoName: entry.geoName,
      zoneSlug: entry.zoneSlug,
      postcode: getPostcodeForSuburb(entry.label) ?? '',
    };
    setResult(result);
  }

  const showList = open && query.trim().length >= 2 && chosenRef.current === null;

  return (
    <View>
      <View style={styles.fieldWrap}>
        <View style={styles.searchIcon}>
          <HeroIcon d={SEARCH_PATHS} size={20} color={c.textSecondary} strokeWidth={2} />
        </View>
        <TextInput
          value={query}
          onChangeText={onChange}
          onFocus={() => setOpen(true)}
          autoCorrect={false}
          autoCapitalize="words"
          placeholder="Type your suburb…"
          placeholderTextColor={c.textSecondary}
          accessibilityLabel="Search your suburb"
          accessibilityRole="search"
          style={[
            styles.input,
            Shadows.sm,
            { backgroundColor: c.surface, borderColor: c.border, color: c.textPrimary },
          ]}
        />
      </View>
      {showList ? (
        <View
          style={[styles.list, Shadows.lg, { backgroundColor: c.surface, borderColor: c.border }]}
          accessibilityRole="menu"
          accessibilityLabel="Suburb matches"
        >
          {matches.length === 0 ? (
            <Text style={[styles.empty, { color: c.textSecondary }]}>
              No matching suburb — try the nearest bigger one
            </Text>
          ) : (
            matches.map((m) => (
              <Pressable
                key={m.label}
                accessibilityRole="menuitem"
                onPress={() => choose(m)}
                style={({ pressed }) => [styles.option, pressed && { backgroundColor: c.primary + '1A' }]}
              >
                <Text style={[styles.optionLabel, { color: c.textPrimary }]}>{m.label}</Text>
                {m.zoneSlug ? (
                  <View style={[styles.zoneChip, { borderColor: c.border }]}>
                    <View style={[styles.zoneDot, { backgroundColor: zoneFill[m.zoneSlug] }]} />
                    <Text style={[styles.zoneChipText, { color: c.textSecondary }]}>{m.zoneName}</Text>
                  </View>
                ) : (
                  <Text style={[styles.notCovered, { color: c.textSecondary }]}>Not yet covered</Text>
                )}
              </Pressable>
            ))
          )}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  fieldWrap: {
    position: 'relative',
  },
  searchIcon: {
    position: 'absolute',
    left: 16,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
    zIndex: 1,
  },
  input: {
    height: 52,
    borderRadius: Radius.lg,
    borderWidth: 1,
    paddingLeft: 44,
    paddingRight: 16,
    fontFamily: FontFamily.body,
    fontSize: 16,
  },
  list: {
    marginTop: 6,
    borderRadius: Radius.lg,
    borderWidth: 1,
    overflow: 'hidden',
  },
  empty: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    fontFamily: FontFamily.body,
    fontSize: 14,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: 10,
  },
  optionLabel: {
    flex: 1,
    fontFamily: FontFamily.body,
    fontSize: 14,
  },
  zoneChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: Radius.full,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  zoneDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  zoneChipText: {
    fontFamily: FontFamily.bodySemiBold,
    fontWeight: '600',
    fontSize: 12,
  },
  notCovered: {
    fontFamily: FontFamily.body,
    fontSize: 12,
  },
});
