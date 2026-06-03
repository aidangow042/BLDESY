/**
 * SearchOverlay — structured "find a tradie" search, opened by tapping the
 * home hero search bar. Mirrors the website's slide-up SearchForm: location
 * (suburb autocomplete) + urgency + keywords + trade → pushes /results with
 * the params the results screen already reads (suburb, trade_category,
 * urgency, keywords).
 */
import { useState } from 'react';
import {
  Modal,
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

import { Colors, FontFamily, Radius, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { getSuburbSuggestions } from '@/lib/geo';
import { TRADE_CATALOGUE } from '@/components/builder/trade-catalogue';

// Urgency values match what app/results.tsx scores against.
const URGENCY_OPTIONS = [
  { label: 'Any', value: '' },
  { label: 'ASAP', value: 'asap' },
  { label: 'This week', value: 'this_week' },
  { label: 'Flexible', value: 'flexible' },
];

interface Props {
  visible: boolean;
  onClose: () => void;
}

export function SearchOverlay({ visible, onClose }: Props) {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [location, setLocation] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [tradeSlug, setTradeSlug] = useState('');
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

  function submit() {
    const params: Record<string, string> = {};
    if (location.trim()) params.suburb = location.trim();
    if (tradeSlug) params.trade_category = tradeSlug;
    if (urgency) params.urgency = urgency;
    const pending = keywordInput.trim().toLowerCase();
    const allKw = Array.from(new Set([...keywords, ...(pending ? [pending] : [])]));
    if (allKw.length) params.keywords = allKw.join(',');
    onClose();
    router.push({ pathname: '/results', params } as any);
  }

  const inputBg = scheme === 'dark' ? 'rgba(255,255,255,0.06)' : '#F8FAFC';
  const inputBorder = c.border;

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={[styles.screen, { backgroundColor: c.canvas, paddingTop: insets.top || Spacing.md }]}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.title, { color: c.textPrimary }]}>Find a tradie</Text>
          <Pressable onPress={onClose} hitSlop={10} style={styles.closeBtn} accessibilityLabel="Close search">
            <MaterialIcons name="close" size={24} color={c.textSecondary} />
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
          {/* Location */}
          <Text style={[styles.label, { color: c.textSecondary }]}>LOCATION</Text>
          <View style={[styles.inputRow, { backgroundColor: inputBg, borderColor: inputBorder }]}>
            <MaterialIcons name="location-on" size={18} color={c.textSecondary} />
            <TextInput
              value={location}
              onChangeText={onLocationChange}
              onFocus={() => setShowSuggestions(true)}
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
              onSubmitEditing={() => addKeyword(keywordInput)}
              onBlur={() => { if (keywordInput.trim()) addKeyword(keywordInput); }}
              placeholder={keywords.length === 0 ? 'e.g. deck, bathroom' : 'Add another…'}
              placeholderTextColor={c.textSecondary}
              style={[styles.kwInput, { color: c.textPrimary }]}
              blurOnSubmit={false}
              returnKeyType="done"
            />
          </View>

          {/* Trade */}
          <Text style={[styles.label, { color: c.textSecondary, marginTop: Spacing.lg }]}>TRADE</Text>
          <Pressable
            onPress={() => setTradeSlug('')}
            style={[styles.tradeRow, { borderColor: inputBorder, backgroundColor: !tradeSlug ? c.primaryBg : 'transparent' }]}
          >
            <Text style={[styles.tradeName, { color: !tradeSlug ? c.primary : c.textPrimary }]}>Any trade</Text>
            {!tradeSlug ? <MaterialIcons name="check" size={18} color={c.primary} /> : null}
          </Pressable>
          {TRADE_CATALOGUE.map((group) => (
            <View key={group.title}>
              <Text style={[styles.groupLabel, { color: c.textSecondary }]}>{group.title}</Text>
              {group.trades.map((t) => {
                const active = tradeSlug === t.slug;
                return (
                  <Pressable
                    key={t.slug}
                    onPress={() => setTradeSlug(active ? '' : t.slug)}
                    style={[styles.tradeRow, { borderColor: inputBorder, backgroundColor: active ? c.primaryBg : 'transparent' }]}
                  >
                    <Text style={[styles.tradeName, { color: active ? c.primary : c.textPrimary }]}>{t.name}</Text>
                    {active ? <MaterialIcons name="check" size={18} color={c.primary} /> : null}
                  </Pressable>
                );
              })}
            </View>
          ))}
        </ScrollView>

        {/* Footer */}
        <View style={[styles.footer, { backgroundColor: c.canvas, borderTopColor: inputBorder, paddingBottom: Math.max(insets.bottom, Spacing.md) }]}>
          <Pressable onPress={submit} style={[styles.searchBtn, { backgroundColor: c.primary }]}>
            <MaterialIcons name="search" size={20} color="#fff" />
            <Text style={styles.searchBtnText}>Search tradies</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  title: { fontSize: 22, fontFamily: FontFamily.bodyBold, fontWeight: '800' },
  closeBtn: { padding: 4 },
  body: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing['3xl'] },
  label: {
    fontSize: 11,
    fontFamily: FontFamily.bodyBold,
    fontWeight: '700',
    letterSpacing: 0.6,
    marginBottom: Spacing.sm,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    height: 50,
    borderRadius: Radius.lg,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
  },
  input: { flex: 1, fontSize: 15, fontFamily: FontFamily.body },
  suggestions: {
    marginTop: 6,
    borderRadius: Radius.md,
    borderWidth: 1,
    overflow: 'hidden',
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: 12,
  },
  suggestionText: { fontSize: 14, fontFamily: FontFamily.body },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  chip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 8,
    borderRadius: Radius.full,
    borderWidth: 1,
  },
  chipText: { fontSize: 13, fontFamily: FontFamily.bodySemiBold, fontWeight: '600' },
  keywordWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: Spacing.sm,
    minHeight: 50,
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
  groupLabel: {
    fontSize: 11,
    fontFamily: FontFamily.bodySemiBold,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginTop: Spacing.md,
    marginBottom: 4,
    opacity: 0.7,
  },
  tradeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: Radius.md,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    paddingVertical: 12,
    marginBottom: 6,
  },
  tradeName: { fontSize: 15, fontFamily: FontFamily.body },
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
