/**
 * SmartSearch — ~/bldesy-web/components/map/smart-search.tsx: one input that
 * finds trades AND specialties. Picking a trade with sub-trades switches the
 * dropdown to step two ("{Trade} specialties": "All {trade}s" + each
 * specialty). One removable token at a time — a specialty implies its trade.
 */
import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import {
  searchIndex,
  specialtiesForTrade,
  type SearchEntry,
  type SpecialtyToken,
  type TradeEntry,
} from '@/components/map/map-logic';
import { Colors, FontFamily, Radius, Shadows, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { getTradeColour } from '@/lib/web/trade-colours';

interface SmartSearchProps {
  /** Active trade filter ("All" = none) — shown as a removable token. */
  tradeFilter: string;
  specialty: SpecialtyToken | null;
  onPickTrade: (tradeName: string) => void;
  onPickSpecialty: (token: SpecialtyToken) => void;
  onClearSpecialty: () => void;
  onClearTrade: () => void;
  /** The dropdown is open — the bar stretches so taps on it land (Android bounds). */
  onOpenChange?: (open: boolean) => void;
}

export function SmartSearch({
  tradeFilter,
  specialty,
  onPickTrade,
  onPickSpecialty,
  onClearSpecialty,
  onClearTrade,
  onOpenChange,
}: SmartSearchProps) {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  // Set after picking a trade that has specialties: step two lists them.
  const [pendingTrade, setPendingTrade] = useState<TradeEntry | null>(null);

  const results = useMemo(
    () => (query.trim().length >= 2 ? searchIndex(query.trim()) : { trades: [], specialties: [] }),
    [query],
  );
  const pendingSpecialties = useMemo(() => (pendingTrade ? specialtiesForTrade(pendingTrade) : []), [pendingTrade]);
  const flat: SearchEntry[] = pendingTrade ? pendingSpecialties : [...results.trades, ...results.specialties];
  const hasResults = flat.length > 0;
  const showList = open && hasResults;

  useEffect(() => {
    onOpenChange?.(showList);
  }, [showList, onOpenChange]);

  function close() {
    setOpen(false);
    setPendingTrade(null);
  }

  function pick(entry: SearchEntry) {
    if (entry.kind === 'trade') {
      onPickTrade(entry.name);
      setQuery('');
      const specs = specialtiesForTrade(entry);
      if (specs.length > 0) {
        setPendingTrade(entry);
        setOpen(true);
        return;
      }
      close();
      return;
    }
    onPickSpecialty({ tradeSlug: entry.tradeSlug, tradeName: entry.tradeName, slug: entry.slug, name: entry.name });
    setQuery('');
    close();
  }

  // One token at a time: the specialty implies its parent trade
  const token = specialty
    ? { label: specialty.name, clear: onClearSpecialty }
    : tradeFilter !== 'All'
      ? { label: tradeFilter, clear: onClearTrade }
      : null;

  const renderRow = (entry: SearchEntry) => (
    <Pressable
      key={`${entry.kind}-${entry.kind === 'specialty' ? `${entry.tradeSlug}-` : ''}${entry.slug}`}
      accessibilityRole="button"
      onPress={() => pick(entry)}
      style={({ pressed }) => [styles.row, pressed && { backgroundColor: c.primaryBg }]}
    >
      <View style={[styles.rowDot, { backgroundColor: getTradeColour(entry.kind === 'trade' ? entry.slug : entry.tradeSlug) }]} />
      <View style={styles.flex1}>
        <Text style={[styles.rowName, { color: c.textPrimary }]} numberOfLines={1}>
          {entry.name}
        </Text>
        {entry.kind === 'specialty' && !pendingTrade ? (
          <Text style={[styles.rowSub, { color: c.textSecondary }]}>in {entry.tradeName}</Text>
        ) : null}
      </View>
    </Pressable>
  );

  return (
    <View style={styles.wrap}>
      <View style={[styles.pill, { borderColor: open ? c.primary : c.border, backgroundColor: c.surface }]}>
        <Ionicons name="search-outline" size={16} color={c.textSecondary + 'B3'} />
        {token ? (
          <View style={[styles.token, { backgroundColor: c.primary }]}>
            <Text style={styles.tokenText} numberOfLines={1}>
              {token.label}
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Remove ${token.label} filter`}
              onPress={token.clear}
              hitSlop={6}
              style={styles.tokenClear}
            >
              <Ionicons name="close" size={12} color="#fff" />
            </Pressable>
          </View>
        ) : null}
        <TextInput
          value={query}
          onChangeText={(t) => {
            setQuery(t);
            setPendingTrade(null);
            setOpen(t.trim().length >= 2);
          }}
          onFocus={() => {
            if (query.trim().length >= 2 || pendingTrade) setOpen(true);
          }}
          onBlur={() => setTimeout(close, 150)}
          onKeyPress={(e) => {
            if (e.nativeEvent.key === 'Backspace' && !query) {
              if (specialty) onClearSpecialty();
              else if (tradeFilter !== 'All') onClearTrade();
            }
          }}
          placeholder={token ? '' : 'Trade or specialty'}
          placeholderTextColor={c.textSecondary + '99'}
          accessibilityLabel="Search trades or specialties"
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="search"
          onSubmitEditing={() => {
            if (hasResults) pick(flat[0]);
          }}
          style={[styles.input, { color: c.textPrimary }]}
        />
      </View>

      {showList ? (
        <View style={[styles.dropdown, Shadows.lg, { backgroundColor: c.surface, borderColor: c.border }]}>
          <ScrollView keyboardShouldPersistTaps="always" style={styles.dropdownScroll} nestedScrollEnabled>
            {pendingTrade ? (
              <>
                <Text style={[styles.groupLabel, { color: c.textSecondary }]}>
                  {pendingTrade.name.toUpperCase()} SPECIALTIES
                </Text>
                <Pressable
                  accessibilityRole="button"
                  onPress={close}
                  style={({ pressed }) => [styles.row, pressed && { backgroundColor: c.primaryBg }]}
                >
                  <Text style={[styles.allRow, { color: c.primary }]}>All {pendingTrade.name.toLowerCase()}s</Text>
                </Pressable>
                {pendingSpecialties.map(renderRow)}
              </>
            ) : (
              <>
                {results.trades.length > 0 ? (
                  <Text style={[styles.groupLabel, { color: c.textSecondary }]}>TRADES</Text>
                ) : null}
                {results.trades.map(renderRow)}
                {results.specialties.length > 0 ? (
                  <Text style={[styles.groupLabel, { color: c.textSecondary }]}>SPECIALTIES</Text>
                ) : null}
                {results.specialties.map(renderRow)}
              </>
            )}
          </ScrollView>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    minWidth: 0,
  },
  pill: {
    height: 36,
    borderWidth: 1,
    borderRadius: Radius.full,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingLeft: Spacing.md,
    paddingRight: Spacing.sm,
  },
  token: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: Radius.full,
    paddingLeft: 10,
    paddingRight: 6,
    paddingVertical: 2,
    maxWidth: '65%',
  },
  tokenText: {
    flexShrink: 1,
    color: '#fff',
    fontFamily: FontFamily.bodySemiBold,
    fontWeight: '600',
    fontSize: 11,
  },
  tokenClear: {
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  input: {
    flex: 1,
    minWidth: 0,
    fontFamily: FontFamily.body,
    fontSize: 14,
    paddingVertical: 0,
  },
  dropdown: {
    position: 'absolute',
    top: 40,
    left: 0,
    right: 0,
    minWidth: 260,
    borderWidth: 1,
    borderRadius: Radius.xl,
    paddingVertical: 4,
    zIndex: 30,
    elevation: 30,
  },
  dropdownScroll: {
    maxHeight: 288,
  },
  groupLabel: {
    fontFamily: FontFamily.bodyBold,
    fontWeight: '700',
    fontSize: 10,
    letterSpacing: 0.6,
    paddingHorizontal: Spacing.md,
    paddingTop: 6,
    paddingBottom: 2,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  rowDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  flex1: {
    flex: 1,
    minWidth: 0,
  },
  rowName: {
    fontFamily: FontFamily.bodyMedium,
    fontWeight: '500',
    fontSize: 14,
  },
  rowSub: {
    fontFamily: FontFamily.body,
    fontSize: 11,
  },
  allRow: {
    fontFamily: FontFamily.bodyMedium,
    fontWeight: '500',
    fontSize: 14,
  },
});
