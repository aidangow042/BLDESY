/**
 * Full-page "Find a tradie" search — the app's main search page, mirroring the
 * website's /search form. Same fields as the home search bar opens to, but a
 * full screen. Submits to /results with the params the results screen reads
 * (suburb, trade_category, urgency, keywords, specialisations).
 */
import { useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

import { AppShell } from '@/components/layout';
import { Colors, FontFamily, Radius, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { getSuburbSuggestions } from '@/lib/geo';
import { TRADE_CATALOGUE } from '@/components/builder/trade-catalogue';
import { hasSpecialisations, getSpecialisationsForTrade } from '@/lib/trade-specialisations';

// Urgency values match what app/results.tsx scores against.
const URGENCY_OPTIONS = [
  { label: 'Any', value: '' },
  { label: 'ASAP', value: 'asap' },
  { label: 'This week', value: 'this_week' },
  { label: 'Flexible', value: 'flexible' },
];

function tradeNameFor(slug: string): string {
  for (const g of TRADE_CATALOGUE) {
    const t = g.trades.find((x) => x.slug === slug);
    if (t) return t.name;
  }
  return 'Any trade';
}

export default function SearchScreen() {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [location, setLocation] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [tradeSlug, setTradeSlug] = useState('');
  const [tradeOpen, setTradeOpen] = useState(false);
  const [specs, setSpecs] = useState<string[]>([]);
  const [urgency, setUrgency] = useState('');
  const [keywords, setKeywords] = useState<string[]>([]);
  const [keywordInput, setKeywordInput] = useState('');

  function onLocationChange(text: string) {
    setLocation(text);
    setSuggestions(text.trim().length >= 2 ? getSuburbSuggestions(text) : []);
    setShowSuggestions(true);
  }

  function pickSuburb(s: string) {
    setLocation(s);
    setSuggestions([]);
    setShowSuggestions(false);
  }

  function addKeyword(raw: string) {
    const kw = raw.trim().toLowerCase();
    if (kw && !keywords.includes(kw)) setKeywords((p) => [...p, kw]);
    setKeywordInput('');
  }

  function selectTrade(slug: string) {
    setTradeSlug(slug);
    setTradeOpen(false);
    setSpecs([]); // specialities are trade-scoped — reset when the trade changes
  }

  function submit() {
    const params: Record<string, string> = {};
    if (location.trim()) params.suburb = location.trim();
    if (tradeSlug) params.trade_category = tradeSlug;
    if (tradeSlug && specs.length) params.specialisations = specs.join(',');
    if (urgency) params.urgency = urgency;
    const pending = keywordInput.trim().toLowerCase();
    const allKw = Array.from(new Set([...keywords, ...(pending ? [pending] : [])]));
    if (allKw.length) params.keywords = allKw.join(',');
    router.push({ pathname: '/results', params } as any);
  }

  const inputBg = scheme === 'dark' ? 'rgba(255,255,255,0.06)' : '#F8FAFC';
  const inputBorder = c.border;

  return (
    <AppShell title="Find a tradie" showBack>
      <View style={{ flex: 1, backgroundColor: c.canvas }}>
        <ScrollView
          contentContainerStyle={styles.body}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Location */}
          <Text style={[styles.label, { color: c.textSecondary }]}>LOCATION</Text>
          <View style={[styles.inputRow, { backgroundColor: inputBg, borderColor: inputBorder }]}>
            <MaterialIcons name="location-on" size={18} color={c.textSecondary} />
            <TextInput
              value={location}
              onChangeText={onLocationChange}
              onFocus={() => { setShowSuggestions(true); setTradeOpen(false); }}
              placeholder="Suburb or postcode"
              placeholderTextColor={c.textSecondary}
              style={[styles.input, { color: c.textPrimary }]}
              autoCorrect={false}
              autoCapitalize="words"
            />
            {location.length > 0 ? (
              <Pressable onPress={() => { setLocation(''); setSuggestions([]); }} hitSlop={8}>
                <MaterialIcons name="close" size={18} color={c.textSecondary} />
              </Pressable>
            ) : null}
          </View>
          {showSuggestions && suggestions.length > 0 ? (
            <View style={[styles.suggestions, { backgroundColor: c.surface, borderColor: inputBorder }]}>
              {suggestions.map((s) => (
                <Pressable key={s} onPress={() => pickSuburb(s)} style={styles.suggestionItem}>
                  <MaterialIcons name="location-on" size={14} color={c.textSecondary} />
                  <Text style={[styles.suggestionText, { color: c.textPrimary }]}>{s}</Text>
                </Pressable>
              ))}
            </View>
          ) : null}

          {/* Trade — dropdown select */}
          <Text style={[styles.label, { color: c.textSecondary, marginTop: Spacing.lg }]}>TRADE</Text>
          <Pressable
            onPress={() => { setTradeOpen((o) => !o); setShowSuggestions(false); }}
            style={[styles.inputRow, { backgroundColor: inputBg, borderColor: tradeOpen ? c.primary : inputBorder }]}
          >
            <MaterialIcons name="construction" size={18} color={c.textSecondary} />
            <Text style={[styles.input, { color: tradeSlug ? c.textPrimary : c.textSecondary }]} numberOfLines={1}>
              {tradeSlug ? tradeNameFor(tradeSlug) : 'Any trade'}
            </Text>
            <MaterialIcons name={tradeOpen ? 'expand-less' : 'expand-more'} size={22} color={c.textSecondary} />
          </Pressable>
          {tradeOpen ? (
            <View style={[styles.dropdown, { backgroundColor: c.surface, borderColor: inputBorder }]}>
              <ScrollView style={{ maxHeight: 280 }} nestedScrollEnabled keyboardShouldPersistTaps="handled">
                <Pressable onPress={() => selectTrade('')} style={styles.tradeRow}>
                  <Text style={[styles.tradeName, { color: !tradeSlug ? c.primary : c.textPrimary }]}>Any trade</Text>
                  {!tradeSlug ? <MaterialIcons name="check" size={16} color={c.primary} /> : null}
                </Pressable>
                {TRADE_CATALOGUE.map((group) => (
                  <View key={group.title}>
                    <Text style={[styles.groupLabel, { color: c.textSecondary }]}>{group.title}</Text>
                    {group.trades.map((t) => {
                      const active = tradeSlug === t.slug;
                      return (
                        <Pressable key={t.slug} onPress={() => selectTrade(t.slug)} style={styles.tradeRow}>
                          <Text style={[styles.tradeName, { color: active ? c.primary : c.textPrimary }]}>{t.name}</Text>
                          {active ? <MaterialIcons name="check" size={16} color={c.primary} /> : null}
                        </Pressable>
                      );
                    })}
                  </View>
                ))}
              </ScrollView>
            </View>
          ) : null}

          {/* Specialities — only when the chosen trade has sub-trades */}
          {tradeSlug && hasSpecialisations(tradeSlug) ? (
            <>
              <Text style={[styles.label, { color: c.textSecondary, marginTop: Spacing.lg }]}>SPECIALITY</Text>
              <View style={styles.chipRow}>
                {getSpecialisationsForTrade(tradeSlug).map((sp) => {
                  const active = specs.includes(sp.slug);
                  return (
                    <Pressable
                      key={sp.slug}
                      onPress={() => setSpecs((p) => (active ? p.filter((x) => x !== sp.slug) : [...p, sp.slug]))}
                      style={[
                        styles.chip,
                        { borderColor: active ? c.primary : inputBorder, backgroundColor: active ? c.primary : 'transparent' },
                      ]}
                    >
                      <Text style={[styles.chipText, { color: active ? '#fff' : c.textPrimary }]}>{sp.name}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </>
          ) : null}

          {/* Urgency */}
          <Text style={[styles.label, { color: c.textSecondary, marginTop: Spacing.lg }]}>URGENCY</Text>
          <View style={styles.chipRow}>
            {URGENCY_OPTIONS.map((opt) => {
              const active = urgency === opt.value;
              return (
                <Pressable
                  key={opt.label}
                  onPress={() => setUrgency(opt.value)}
                  style={[
                    styles.chip,
                    { borderColor: active ? c.primary : inputBorder, backgroundColor: active ? c.primary : 'transparent' },
                  ]}
                >
                  <Text style={[styles.chipText, { color: active ? '#fff' : c.textPrimary }]}>{opt.label}</Text>
                </Pressable>
              );
            })}
          </View>

          {/* Keywords */}
          <Text style={[styles.label, { color: c.textSecondary, marginTop: Spacing.lg }]}>KEYWORDS</Text>
          <View style={[styles.keywordWrap, { backgroundColor: inputBg, borderColor: inputBorder }]}>
            {keywords.map((kw) => (
              <Pressable key={kw} onPress={() => setKeywords((p) => p.filter((k) => k !== kw))} style={[styles.kwChip, { backgroundColor: c.primary }]}>
                <Text style={styles.kwChipText}>{kw}</Text>
                <MaterialIcons name="close" size={12} color="#fff" />
              </Pressable>
            ))}
            <TextInput
              value={keywordInput}
              onChangeText={setKeywordInput}
              onFocus={() => setTradeOpen(false)}
              onSubmitEditing={() => addKeyword(keywordInput)}
              onBlur={() => { if (keywordInput.trim()) addKeyword(keywordInput); }}
              placeholder={keywords.length === 0 ? 'e.g. deck, bathroom' : 'Add another…'}
              placeholderTextColor={c.textSecondary}
              style={[styles.kwInput, { color: c.textPrimary }]}
              submitBehavior="submit"
              returnKeyType="done"
            />
          </View>

          <View style={{ height: Spacing.lg }} />
        </ScrollView>

        {/* Search button */}
        <View style={[styles.footer, { backgroundColor: c.canvas, borderTopColor: inputBorder, paddingBottom: Math.max(insets.bottom, Spacing.md) }]}>
          <Pressable onPress={submit} style={[styles.searchBtn, { backgroundColor: c.primary }]}>
            <MaterialIcons name="search" size={20} color="#fff" />
            <Text style={styles.searchBtnText}>Search tradies</Text>
          </Pressable>
        </View>
      </View>
    </AppShell>
  );
}

const styles = StyleSheet.create({
  body: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.lg, paddingBottom: Spacing.md },
  label: {
    fontSize: 11,
    fontFamily: FontFamily.bodyBold,
    fontWeight: '700',
    letterSpacing: 0.6,
    marginBottom: 8,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    height: 52,
    borderRadius: Radius.lg,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
  },
  input: { flex: 1, fontSize: 15, fontFamily: FontFamily.body },
  suggestions: { marginTop: 6, borderRadius: Radius.md, borderWidth: 1, overflow: 'hidden' },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: 12,
  },
  suggestionText: { fontSize: 14, fontFamily: FontFamily.body },
  dropdown: { marginTop: 6, borderRadius: Radius.md, borderWidth: 1, overflow: 'hidden' },
  tradeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: 12,
  },
  tradeName: { fontSize: 15, fontFamily: FontFamily.body },
  groupLabel: {
    fontSize: 10,
    fontFamily: FontFamily.bodySemiBold,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    opacity: 0.6,
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
    paddingBottom: 2,
  },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  chip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 9,
    borderRadius: Radius.full,
    borderWidth: 1,
  },
  chipText: { fontSize: 13, fontFamily: FontFamily.bodySemiBold, fontWeight: '600' },
  keywordWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: Spacing.sm,
    minHeight: 52,
    borderRadius: Radius.lg,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  kwChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: Radius.full,
  },
  kwChipText: { color: '#fff', fontSize: 12, fontFamily: FontFamily.bodySemiBold, fontWeight: '600' },
  kwInput: { flex: 1, minWidth: 100, fontSize: 14, fontFamily: FontFamily.body, paddingVertical: 4 },
  footer: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
  },
  searchBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    height: 52,
    borderRadius: Radius.lg,
  },
  searchBtnText: { color: '#fff', fontSize: 16, fontFamily: FontFamily.bodyBold, fontWeight: '700' },
});
