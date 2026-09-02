/**
 * SearchForm — ~/bldesy-web/components/search/search-form.tsx, the bespoke
 * warm-palette "Find a trusted tradie" form: flat brand-green hero band with the
 * trust pills + ACL disclaimer, the overlapping white card (location combobox,
 * trade select, keyword chips + trade hint, speciality picker, Popular chips,
 * Urgency segmented control, "Free · no lead fees"), then — on the full page
 * only — the Browse-by-trade grid and the launch banner.
 *
 * `embedded` = rendered inside the homepage search overlay: skip the grid and
 * banner. Submit navigates to `/search?show=results&…` (search-params.ts).
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useRouter, type Href } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';

import { CredentialsDisclaimer } from '@/components/search/credentials-disclaimer';
import {
  FEATURED_TRADES,
  FORM_URGENCY_OPTIONS,
  addKeyword,
  buildSearchParams,
  keywordHintFor,
  searchHref,
} from '@/components/search/search-params';
import { SEARCH_HERO_GREEN } from '@/components/search/tradie-signup-band';
import { SpecialityPicker } from '@/components/trades/speciality-picker';
import { FontFamily, Radius, Spacing } from '@/constants/theme';
import { suggestSuburbs } from '@/lib/data/public-forms';
import { getSuburbSuggestions } from '@/lib/geo';
import { LAUNCH_DATE } from '@/lib/web/launch';
import { hasSpecialisations, type BuilderSpecialisations } from '@/lib/web/trade-specialisations';
import { TRADE_CATEGORIES, getTradeBySlug } from '@/lib/web/trades';
import { ROUTES } from '@/lib/routes';

/* ── The form's own palette (search-form.tsx hex values) ─────────── */
export const SEARCH_PALETTE = {
  hero: SEARCH_HERO_GREEN,
  canvas: '#FBF1E9',
  fieldBorder: '#DCCFC2',
  green: '#1D8A63',
  greenDark: '#17724F',
  textDark: '#14231D',
  textMuted: '#8A8378',
  textSoft: '#3E4A44',
  pillBg: '#124732',
  pillText: '#C9EDDC',
  subText: '#9FD9BE',
  hintBg: '#E7F3EC',
  hintBorder: '#C9E4D5',
  hintText: '#0F5138',
  urgencyTrack: '#F4E9DE',
  urgencyMuted: '#6B7A72',
  gridBorder: '#E8DCD0',
} as const;

const P = SEARCH_PALETTE;

interface SearchFormProps {
  defaultTrades?: string[];
  defaultLocation?: string;
  defaultUrgency?: string;
  defaultKeywords?: string[];
  onBeforeSubmit?: () => void;
  /** Inside the homepage search overlay: skip the browse grid and launch banner. */
  embedded?: boolean;
}

export function SearchForm({
  defaultTrades = [],
  defaultLocation = '',
  defaultUrgency = '',
  defaultKeywords = [],
  onBeforeSubmit,
  embedded = false,
}: SearchFormProps) {
  const router = useRouter();
  const [selectedTrades, setSelectedTrades] = useState<string[]>(defaultTrades);
  const [location, setLocation] = useState(defaultLocation);
  const [locationFocused, setLocationFocused] = useState(false);
  const [locationSuggestions, setLocationSuggestions] = useState<string[]>([]);
  const [urgency, setUrgency] = useState(defaultUrgency);
  const [keywords, setKeywords] = useState<string[]>(defaultKeywords);
  const [keywordInput, setKeywordInput] = useState('');
  // Per-trade specialities the searcher wants (e.g. { roofer: ["colorbond-metal-roofing"] }).
  const [specialisations, setSpecialisations] = useState<BuilderSpecialisations>({});
  const [tradeModalOpen, setTradeModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const submitTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Suburb typeahead — the website's /api/suburbs lookup, with the bundled
  // dataset as the offline fallback. Debounced; stale responses are dropped.
  useEffect(() => {
    let active = true;
    const q = location.trim();
    if (q.length < 2) {
      setLocationSuggestions([]);
      return;
    }
    const t = setTimeout(() => {
      suggestSuburbs(q).then((remote) => {
        if (!active) return;
        const list = remote.length > 0 ? remote : getSuburbSuggestions(q);
        setLocationSuggestions(Array.from(new Set(list)));
      });
    }, 250);
    return () => {
      active = false;
      clearTimeout(t);
    };
  }, [location]);

  useEffect(
    () => () => {
      if (submitTimer.current) clearTimeout(submitTimer.current);
    },
    [],
  );

  const keywordHint = useMemo(() => keywordHintFor(keywordInput), [keywordInput]);
  const showSpecialities = selectedTrades.some((t) => hasSpecialisations(t));

  function commitKeyword(raw: string) {
    setKeywords((prev) => addKeyword(prev, raw));
    setKeywordInput('');
  }

  function handleKeywordChange(text: string) {
    if (text.endsWith(',')) {
      commitKeyword(text.slice(0, -1));
      return;
    }
    setKeywordInput(text);
  }

  function toggleTrade(slug: string) {
    setSelectedTrades((prev) => (prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug]));
  }

  function handleSubmit() {
    if (submitting) return;
    const params = buildSearchParams({
      trades: selectedTrades,
      location,
      urgency,
      keywords,
      pendingKeyword: keywordInput,
      specialisations,
    });
    onBeforeSubmit?.();
    setSubmitting(true);
    router.push(searchHref(params) as Href);
    submitTimer.current = setTimeout(() => setSubmitting(false), 600);
  }

  const tradeLabel =
    selectedTrades.length > 1
      ? `${selectedTrades.length} trades selected`
      : selectedTrades[0]
        ? getTradeBySlug(selectedTrades[0])?.name ?? selectedTrades[0]
        : 'Any trade';

  return (
    <View style={[styles.root, { paddingBottom: embedded ? Spacing['3xl'] : 0 }]}>
      {/* ── Hero: flat brand-green band ─────────────────────── */}
      <View style={styles.hero}>
        <Text accessibilityRole="header" style={styles.h1}>
          Find a trusted tradie
        </Text>
        <Text style={styles.sub}>Verified Australian tradies, ready when you are</Text>
        <View style={styles.pillRow}>
          {['Licensed', 'ABN verified', 'Insured'].map((label) => (
            <View key={label} style={styles.pill}>
              <Ionicons name="checkmark" size={14} color={P.pillText} />
              <Text style={styles.pillText}>{label}</Text>
            </View>
          ))}
        </View>
        {/* ACL standing rule: trust signals carry their inline disclaimer */}
        <CredentialsDisclaimer color="rgba(159,217,190,0.8)" style={styles.heroDisclaimer} />
      </View>

      {/* ── Search card — overlaps the hero ─────────────────── */}
      <View style={styles.cardWrap}>
        <View style={styles.card}>
          {/* Location */}
          <View style={styles.fieldWrap}>
            <View style={[styles.field, locationFocused && styles.fieldFocused]}>
              <Ionicons name="location-outline" size={18} color={P.green} />
              <TextInput
                value={location}
                onChangeText={setLocation}
                onFocus={() => setLocationFocused(true)}
                onBlur={() => setTimeout(() => setLocationFocused(false), 150)}
                placeholder="Suburb or postcode"
                placeholderTextColor={P.textMuted}
                accessibilityLabel="Location"
                autoCapitalize="words"
                autoCorrect={false}
                returnKeyType="search"
                onSubmitEditing={handleSubmit}
                style={styles.input}
              />
              {location ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Clear location"
                  onPress={() => {
                    setLocation('');
                    setLocationSuggestions([]);
                  }}
                  hitSlop={8}
                >
                  <Ionicons name="close" size={16} color={P.textMuted} />
                </Pressable>
              ) : null}
            </View>
            {locationFocused && locationSuggestions.length > 0 ? (
              <View style={styles.suggestions}>
                {locationSuggestions.map((s) => (
                  <Pressable
                    key={s}
                    accessibilityRole="button"
                    onPress={() => {
                      setLocation(s);
                      setLocationSuggestions([]);
                      setLocationFocused(false);
                    }}
                    style={({ pressed }) => [styles.suggestion, pressed && { backgroundColor: P.hintBg }]}
                  >
                    <Ionicons name="location-outline" size={14} color={P.textMuted} />
                    <Text style={styles.suggestionText}>{s}</Text>
                  </Pressable>
                ))}
              </View>
            ) : null}
          </View>

          {/* Trade — the web's native select, as a picker sheet */}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Trade"
            accessibilityValue={{ text: tradeLabel }}
            onPress={() => setTradeModalOpen(true)}
            style={styles.field}
          >
            <Ionicons name="construct-outline" size={18} color={P.green} />
            <Text style={[styles.input, { color: selectedTrades.length > 0 ? P.textDark : P.textMuted }]} numberOfLines={1}>
              {tradeLabel}
            </Text>
            <Ionicons name="chevron-down" size={16} color={P.textMuted} />
          </Pressable>

          {/* Keywords — chips inside the input */}
          <View style={styles.fieldWrap}>
            <View style={[styles.field, styles.keywordField]}>
              <Ionicons name="search-outline" size={18} color={P.green} style={styles.keywordIcon} />
              <View style={styles.keywordInner}>
                {keywords.map((kw) => (
                  <View key={kw} style={styles.kwChip}>
                    <Text style={styles.kwChipText}>{kw}</Text>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Remove ${kw}`}
                      onPress={() => setKeywords((p) => p.filter((k) => k !== kw))}
                      hitSlop={6}
                    >
                      <Ionicons name="close" size={12} color="#fff" />
                    </Pressable>
                  </View>
                ))}
                <TextInput
                  value={keywordInput}
                  onChangeText={handleKeywordChange}
                  onSubmitEditing={() => commitKeyword(keywordInput)}
                  onBlur={() => {
                    if (keywordInput.trim()) commitKeyword(keywordInput);
                  }}
                  onKeyPress={(e) => {
                    if (e.nativeEvent.key === 'Backspace' && !keywordInput && keywords.length > 0) {
                      setKeywords((prev) => prev.slice(0, -1));
                    }
                  }}
                  placeholder={keywords.length === 0 ? 'deck, bathroom…' : ''}
                  placeholderTextColor={P.textMuted}
                  accessibilityLabel="Keywords"
                  autoCapitalize="none"
                  autoCorrect={false}
                  blurOnSubmit={false}
                  returnKeyType="done"
                  style={styles.keywordInput}
                />
              </View>
            </View>
            {/* Hint chip: keyword → likely trade */}
            {keywordHint ? (
              <Pressable
                accessibilityRole="button"
                onPress={() =>
                  setSelectedTrades(Array.from(new Set([...selectedTrades, ...keywordHint.trades.map((t) => t.slug)])))
                }
                style={styles.hintChip}
              >
                <Ionicons name="sparkles-outline" size={14} color={P.hintText} />
                <Text style={styles.hintText}>
                  {keywordHint.keyword} → {keywordHint.trades.map((t) => t.name).join(' / ')}
                </Text>
              </Pressable>
            ) : null}
          </View>

          {/* Search button */}
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ disabled: submitting, busy: submitting }}
            disabled={submitting}
            onPress={handleSubmit}
            style={({ pressed }) => [
              styles.searchBtn,
              { backgroundColor: pressed ? P.greenDark : P.green },
              submitting && { opacity: 0.7 },
            ]}
          >
            {submitting ? (
              <>
                <ActivityIndicator size="small" color="#fff" />
                <Text style={styles.searchBtnText}>Searching…</Text>
              </>
            ) : (
              <>
                <Ionicons name="search-outline" size={16} color="#fff" />
                <Text style={styles.searchBtnText}>Search</Text>
              </>
            )}
          </Pressable>

          {/* Specialities — appears once a trade with sub-trades is chosen */}
          {showSpecialities ? (
            <View style={styles.block}>
              <Text style={styles.blockLabel}>
                Specialities <Text style={styles.blockLabelLight}>(optional — narrows your match)</Text>
              </Text>
              <SpecialityPicker
                selectedTrades={selectedTrades}
                value={specialisations}
                onChange={setSpecialisations}
                tradeName={(slug) => getTradeBySlug(slug)?.name ?? slug}
                triggerLabel="Pick a speciality"
                title="What kind of work?"
              />
            </View>
          ) : null}

          {/* Row 2: Popular trade chips */}
          <View style={styles.popularRow}>
            <Text style={styles.rowLabel}>Popular</Text>
            {FEATURED_TRADES.map((t) => {
              const selected = selectedTrades.includes(t.slug);
              return (
                <Pressable
                  key={t.slug}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  onPress={() => toggleTrade(t.slug)}
                  style={[
                    styles.popularChip,
                    selected ? { backgroundColor: P.green, borderColor: P.green } : { backgroundColor: '#fff', borderColor: P.fieldBorder },
                  ]}
                >
                  <Ionicons name={t.icon} size={14} color={selected ? '#fff' : P.textSoft} />
                  <Text style={[styles.popularChipText, { color: selected ? '#fff' : P.textSoft }]}>{t.name}</Text>
                </Pressable>
              );
            })}
          </View>

          {/* Row 3: Urgency segmented control + microcopy */}
          <View style={styles.urgencyRow}>
            <Text style={styles.rowLabel}>Urgency</Text>
            <View accessibilityRole="radiogroup" accessibilityLabel="Urgency" style={styles.segmented}>
              {FORM_URGENCY_OPTIONS.map((opt) => {
                const active = urgency === opt.value;
                return (
                  <Pressable
                    key={opt.value}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: active }}
                    onPress={() => setUrgency(opt.value)}
                    style={[styles.segment, active && styles.segmentActive]}
                  >
                    <Text style={[styles.segmentText, active ? styles.segmentTextActive : { color: P.urgencyMuted }]}>
                      {opt.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            <Text style={[styles.rowLabel, styles.freeNote]}>Free · no lead fees</Text>
          </View>
        </View>

        {/* ── Browse by trade + launch banner (search page only) ── */}
        {!embedded ? (
          <View style={styles.browse}>
            <Text accessibilityRole="header" style={styles.browseHeading}>
              Browse by trade
            </Text>
            <View style={styles.browseGrid}>
              {FEATURED_TRADES.map((t) => (
                <Pressable
                  key={t.slug}
                  accessibilityRole="link"
                  onPress={() => router.push(searchHref({ show: 'results', trade: t.slug }) as Href)}
                  style={({ pressed }) => [styles.browseTile, pressed && { borderColor: P.green + '66' }]}
                >
                  <Ionicons name={t.icon} size={24} color={P.green} />
                  <Text style={styles.browseTileText}>{t.plural}</Text>
                </Pressable>
              ))}
            </View>

            <View style={styles.launchBanner}>
              <View style={styles.launchCopyRow}>
                <Ionicons name="sparkles-outline" size={16} color={P.hintText} />
                <Text style={styles.launchCopy}>Launching {LAUNCH_DATE} — join now and you&apos;re first in line</Text>
              </View>
              <Pressable
                accessibilityRole="link"
                onPress={() => router.push(ROUTES.waitlist as Href)}
                style={({ pressed }) => [styles.launchBtn, { backgroundColor: pressed ? P.greenDark : P.green }]}
              >
                <Text style={styles.launchBtnText}>Join waitlist</Text>
              </Pressable>
            </View>
          </View>
        ) : null}
      </View>

      <TradeSelectModal
        visible={tradeModalOpen}
        selected={selectedTrades}
        onClose={() => setTradeModalOpen(false)}
        onSelect={(slug) => {
          setSelectedTrades(slug ? [slug] : []);
          setTradeModalOpen(false);
        }}
      />
    </View>
  );
}

/* ── Trade picker sheet — the web's grouped <select> ────────────── */

export function TradeSelectModal({
  visible,
  selected,
  onClose,
  onSelect,
}: {
  visible: boolean;
  selected: readonly string[];
  onClose: () => void;
  onSelect: (slug: string | null) => void;
}) {
  const insets = useSafeAreaInsets();
  const single = selected.length === 1 ? selected[0] : null;

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent onRequestClose={onClose}>
      <View style={styles.modalRoot}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Close" />
        <View style={[styles.sheet, { paddingBottom: insets.bottom + Spacing.md }]}>
          <View style={styles.grabber} />
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>Trade</Text>
            <Pressable onPress={onClose} hitSlop={10} accessibilityRole="button" accessibilityLabel="Close">
              <Ionicons name="close" size={22} color={P.textMuted} />
            </Pressable>
          </View>
          <ScrollView style={styles.sheetScroll} contentContainerStyle={styles.sheetBody} showsVerticalScrollIndicator={false}>
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ selected: selected.length === 0 }}
              onPress={() => onSelect(null)}
              style={[styles.option, selected.length === 0 && styles.optionActive]}
            >
              <Text style={[styles.optionText, selected.length === 0 && styles.optionTextActive]}>Any trade</Text>
              {selected.length === 0 ? <Ionicons name="checkmark" size={18} color={P.green} /> : null}
            </Pressable>
            {selected.length > 1 ? (
              <View style={[styles.option, styles.optionActive]}>
                <Text style={[styles.optionText, styles.optionTextActive]}>{selected.length} trades selected</Text>
              </View>
            ) : null}
            {TRADE_CATEGORIES.map((cat) => (
              <View key={cat.slug}>
                <Text style={styles.groupLabel}>{cat.name.toUpperCase()}</Text>
                {cat.trades.map((t) => {
                  const active = single === t.slug;
                  return (
                    <Pressable
                      key={t.slug}
                      accessibilityRole="button"
                      accessibilityState={{ selected: active }}
                      onPress={() => onSelect(t.slug)}
                      style={[styles.option, active && styles.optionActive]}
                    >
                      <Text style={[styles.optionText, active && styles.optionTextActive]}>{t.name}</Text>
                      {active ? <Ionicons name="checkmark" size={18} color={P.green} /> : null}
                    </Pressable>
                  );
                })}
              </View>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    backgroundColor: P.canvas,
  },
  hero: {
    backgroundColor: P.hero,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing['5xl'],
    paddingBottom: 80,
    alignItems: 'center',
    minHeight: 240,
  },
  h1: {
    fontFamily: FontFamily.bodySemiBold,
    fontWeight: '600',
    fontSize: 32,
    lineHeight: 38,
    color: '#ffffff',
    textAlign: 'center',
  },
  sub: {
    marginTop: Spacing.sm,
    fontFamily: FontFamily.body,
    fontSize: 16,
    lineHeight: 24,
    color: P.subText,
    textAlign: 'center',
  },
  pillRow: {
    marginTop: Spacing.lg,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: Radius.full,
    backgroundColor: P.pillBg,
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
  },
  pillText: {
    fontFamily: FontFamily.bodySemiBold,
    fontWeight: '600',
    fontSize: 12,
    color: P.pillText,
  },
  heroDisclaimer: {
    marginTop: Spacing.md,
    maxWidth: 448,
    textAlign: 'center',
  },
  cardWrap: {
    paddingHorizontal: Spacing.lg,
  },
  card: {
    marginTop: -40,
    borderRadius: Radius.xl,
    backgroundColor: '#ffffff',
    padding: Spacing.lg,
    gap: Spacing.sm,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 30,
    elevation: 6,
  },
  fieldWrap: {
    gap: Spacing.xs,
  },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    minHeight: 52,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: P.fieldBorder,
    backgroundColor: '#ffffff',
    paddingHorizontal: 14,
  },
  fieldFocused: {
    borderColor: P.green,
  },
  input: {
    flex: 1,
    fontFamily: FontFamily.body,
    fontSize: 14,
    color: P.textDark,
    paddingVertical: 12,
  },
  suggestions: {
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: P.fieldBorder,
    backgroundColor: '#ffffff',
    overflow: 'hidden',
  },
  suggestion: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  suggestionText: {
    fontFamily: FontFamily.body,
    fontSize: 14,
    color: P.textDark,
  },
  keywordField: {
    alignItems: 'flex-start',
    paddingVertical: Spacing.sm,
  },
  keywordIcon: {
    marginTop: 9,
  },
  keywordInner: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 6,
  },
  kwChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: Radius.full,
    backgroundColor: P.green,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  kwChipText: {
    fontFamily: FontFamily.bodySemiBold,
    fontWeight: '600',
    fontSize: 12,
    color: '#ffffff',
  },
  keywordInput: {
    minWidth: 70,
    flex: 1,
    fontFamily: FontFamily.body,
    fontSize: 14,
    color: P.textDark,
    paddingVertical: 6,
  },
  hintChip: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: P.hintBorder,
    backgroundColor: P.hintBg,
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
  },
  hintText: {
    fontFamily: FontFamily.body,
    fontSize: 12,
    color: P.hintText,
  },
  searchBtn: {
    height: 52,
    borderRadius: Radius.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing['2xl'],
  },
  searchBtnText: {
    fontFamily: FontFamily.bodySemiBold,
    fontWeight: '600',
    fontSize: 14,
    color: '#ffffff',
  },
  block: {
    marginTop: Spacing.sm,
    gap: 6,
  },
  blockLabel: {
    fontFamily: FontFamily.bodySemiBold,
    fontWeight: '600',
    fontSize: 12,
    color: P.textMuted,
  },
  blockLabelLight: {
    fontFamily: FontFamily.body,
    fontWeight: '400',
  },
  popularRow: {
    marginTop: Spacing.sm,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  rowLabel: {
    fontFamily: FontFamily.body,
    fontSize: 12,
    color: P.textMuted,
  },
  popularChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: Radius.full,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
  },
  popularChipText: {
    fontFamily: FontFamily.bodySemiBold,
    fontWeight: '600',
    fontSize: 12,
  },
  urgencyRow: {
    marginTop: Spacing.sm,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: Spacing.md,
  },
  segmented: {
    flexDirection: 'row',
    borderRadius: Radius.full,
    backgroundColor: P.urgencyTrack,
    padding: 4,
  },
  segment: {
    borderRadius: Radius.full,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  segmentActive: {
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
    elevation: 1,
  },
  segmentText: {
    fontFamily: FontFamily.body,
    fontSize: 12,
  },
  segmentTextActive: {
    fontFamily: FontFamily.bodySemiBold,
    fontWeight: '600',
    color: P.textDark,
  },
  freeNote: {
    marginLeft: 'auto',
  },
  browse: {
    marginTop: Spacing['3xl'],
    paddingBottom: Spacing['3xl'],
  },
  browseHeading: {
    fontFamily: FontFamily.bodySemiBold,
    fontWeight: '600',
    fontSize: 16,
    color: P.textDark,
    marginBottom: Spacing.lg,
  },
  browseGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  browseTile: {
    width: '48%',
    flexGrow: 1,
    alignItems: 'center',
    gap: Spacing.sm,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: P.gridBorder,
    backgroundColor: '#ffffff',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.lg,
  },
  browseTileText: {
    fontFamily: FontFamily.bodySemiBold,
    fontWeight: '600',
    fontSize: 12,
    color: P.textSoft,
  },
  launchBanner: {
    marginTop: Spacing['2xl'],
    gap: Spacing.md,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: P.hintBorder,
    backgroundColor: P.hintBg,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  launchCopyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  launchCopy: {
    flex: 1,
    fontFamily: FontFamily.body,
    fontSize: 14,
    lineHeight: 20,
    color: P.hintText,
  },
  launchBtn: {
    alignSelf: 'flex-start',
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
  },
  launchBtnText: {
    fontFamily: FontFamily.bodySemiBold,
    fontWeight: '600',
    fontSize: 12,
    color: '#ffffff',
  },
  modalRoot: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  sheet: {
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    backgroundColor: '#ffffff',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
    maxHeight: '85%',
  },
  grabber: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: P.fieldBorder,
    marginBottom: Spacing.md,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  sheetTitle: {
    fontFamily: FontFamily.bodyBold,
    fontWeight: '700',
    fontSize: 17,
    color: P.textDark,
  },
  sheetScroll: {
    flexGrow: 0,
  },
  sheetBody: {
    paddingBottom: Spacing.md,
  },
  groupLabel: {
    fontFamily: FontFamily.bodyBold,
    fontWeight: '700',
    fontSize: 11,
    letterSpacing: 0.6,
    color: P.textMuted,
    marginTop: Spacing.lg,
    marginBottom: Spacing.xs,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: 12,
  },
  optionActive: {
    backgroundColor: P.hintBg,
  },
  optionText: {
    fontFamily: FontFamily.body,
    fontSize: 15,
    color: P.textDark,
  },
  optionTextActive: {
    fontFamily: FontFamily.bodySemiBold,
    fontWeight: '600',
    color: P.hintText,
  },
});
