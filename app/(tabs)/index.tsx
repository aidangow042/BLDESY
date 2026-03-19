import { useCallback, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import Ionicons from '@expo/vector-icons/Ionicons';

import { ThemedText } from '@/components/themed-text';
import { Colors, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

import auLocations from '@/lib/au-locations.json';

/* ───────────────────────── Data ───────────────────────── */

const POPULAR_TRADES = [
  'Builder', 'Electrician', 'Plumber', 'Carpenter',
  'Painter', 'Landscaper', 'Roofer', 'Tiler',
];

const URGENCY_OPTIONS = ['Any', 'ASAP', 'This Week', 'Flexible'];

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

/* ───────────────────────── Location suggestions ───────────────────────── */

const localities: Record<string, [number, number]> = (auLocations as any).l;
const allSuburbs = Object.keys(localities).map((s) => s.replace(/\b\w/g, (c) => c.toUpperCase()));

function getLocationSuggestions(query: string): string[] {
  if (!query || query.length < 2) return [];
  const lower = query.toLowerCase();
  const results: string[] = [];
  for (const suburb of allSuburbs) {
    if (suburb.toLowerCase().startsWith(lower)) {
      results.push(suburb);
      if (results.length >= 6) break;
    }
  }
  return results;
}

/* ───────────────────────── Trade Category Config ───────────────────────── */

const TRADE_CONFIG: Record<string, { icon: string; iconSet: 'material' | 'ionicon'; bg: string; fg: string }> = {
  Builder:     { icon: 'construction',       iconSet: 'material',  bg: '#E8F5F3', fg: '#0D7C66' },
  Electrician: { icon: 'flash',              iconSet: 'ionicon',   bg: '#FFF7ED', fg: '#EA580C' },
  Plumber:     { icon: 'water',              iconSet: 'ionicon',   bg: '#EFF6FF', fg: '#2563EB' },
  Carpenter:   { icon: 'hammer',             iconSet: 'ionicon',   bg: '#ECFDF5', fg: '#059669' },
  Painter:     { icon: 'format-paint',       iconSet: 'material',  bg: '#FFF1F2', fg: '#E11D48' },
  Landscaper:  { icon: 'leaf',               iconSet: 'ionicon',   bg: '#F0FDF4', fg: '#16A34A' },
  Roofer:      { icon: 'home-outline',       iconSet: 'ionicon',   bg: '#FFFBEB', fg: '#D97706' },
  Tiler:       { icon: 'grid-outline',        iconSet: 'ionicon',   bg: '#F5F5F4', fg: '#57534E' },
};

/* ───────────────────────── Hero image ───────────────────────── */

const HERO_HEIGHT = 220;

let heroImage: any = null;
try {
  heroImage = require('@/assets/images/new.jpg');
} catch {
  heroImage = null;
}

/* ───────────────────────── Component ───────────────────────── */

export default function HomeScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme === 'dark' ? 'dark' : 'light'];
  const isDark = colorScheme === 'dark';
  const router = useRouter();
  const insets = useSafeAreaInsets();

  /* ── Scroll tracking for overscroll zoom ── */
  const scrollY = useRef(new Animated.Value(0)).current;

  /* ── Search overlay state ── */
  const [overlayVisible, setOverlayVisible] = useState(false);
  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const [selectedTrade, setSelectedTrade] = useState<string | null>(null);
  const [keywordInput, setKeywordInput] = useState('');
  const [keywords, setKeywords] = useState<string[]>([]);
  const [locationText, setLocationText] = useState('');
  const [locationSuggestions, setLocationSuggestions] = useState<string[]>([]);
  const [selectedUrgency, setSelectedUrgency] = useState('Any');
  const locationInputRef = useRef<TextInput>(null);
  const keywordInputRef = useRef<TextInput>(null);

  /* ── Listen for trade selected from all-trades page ── */
  useFocusEffect(
    useCallback(() => {
      // Check global param (set by all-trades page)
      if ((global as any).__selectedTrade) {
        setSelectedTrade((global as any).__selectedTrade);
        delete (global as any).__selectedTrade;
        // Ensure overlay is open
        if (!overlayVisible) {
          setOverlayVisible(true);
          Animated.parallel([
            Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, tension: 65, friction: 11 }),
            Animated.timing(fadeAnim, { toValue: 1, duration: 250, useNativeDriver: true }),
          ]).start();
        }
      }
    }, [overlayVisible]),
  );

  /* ── Overlay open / close ── */

  function openOverlay() {
    setOverlayVisible(true);
    Animated.parallel([
      Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, tension: 65, friction: 11 }),
      Animated.timing(fadeAnim, { toValue: 1, duration: 250, useNativeDriver: true }),
    ]).start();
  }

  function closeOverlay() {
    Animated.parallel([
      Animated.timing(slideAnim, { toValue: SCREEN_HEIGHT, duration: 280, useNativeDriver: true }),
      Animated.timing(fadeAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]).start(() => {
      setOverlayVisible(false);
      setSelectedTrade(null);
      setKeywords([]);
      setKeywordInput('');
      setLocationText('');
      setLocationSuggestions([]);
      setSelectedUrgency('Any');
    });
  }

  /* ── Toggle helpers ── */

  function selectTrade(trade: string) {
    setSelectedTrade((prev) => (prev === trade ? null : trade));
  }

  function addKeyword() {
    const trimmed = keywordInput.trim();
    if (trimmed && !keywords.includes(trimmed)) {
      setKeywords((prev) => [...prev, trimmed]);
    }
    setKeywordInput('');
  }

  function removeKeyword(kw: string) {
    setKeywords((prev) => prev.filter((k) => k !== kw));
  }

  function handleLocationChange(text: string) {
    setLocationText(text);
    setLocationSuggestions(getLocationSuggestions(text));
  }

  function selectLocationSuggestion(suggestion: string) {
    setLocationText(suggestion);
    setLocationSuggestions([]);
  }

  /* ── Search submission ── */

  function handleSearch() {
    const params: Record<string, string> = {};
    if (locationText.trim()) params.suburb = locationText.trim();
    if (selectedTrade)
      params.trade_category = selectedTrade.toLowerCase();
    if (selectedUrgency !== 'Any')
      params.urgency = selectedUrgency.toLowerCase().replace(' ', '_');
    if (keywords.length > 0)
      params.keywords = keywords.join(',');

    Animated.parallel([
      Animated.timing(slideAnim, { toValue: SCREEN_HEIGHT, duration: 250, useNativeDriver: true }),
      Animated.timing(fadeAnim, { toValue: 0, duration: 180, useNativeDriver: true }),
    ]).start(() => {
      setOverlayVisible(false);
      setSelectedTrade(null);
      setKeywords([]);
      setKeywordInput('');
      setLocationText('');
      setLocationSuggestions([]);
      setSelectedUrgency('Any');
    });

    router.push({ pathname: '/(tabs)/results', params });
  }

  function handlePostJob() {
    router.push('/(tabs)/post-job');
  }

  function handleCategoryPress(trade: string) {
    router.push({ pathname: '/(tabs)/results', params: { trade_category: trade.toLowerCase() } });
  }

  /* ── Trade icon renderer ── */

  function renderTradeIcon(trade: string, size = 24) {
    const cfg = TRADE_CONFIG[trade];
    if (!cfg) return null;
    if (cfg.iconSet === 'ionicon') {
      return <Ionicons name={cfg.icon as any} size={size} color={isDark ? colors.tint : cfg.fg} />;
    }
    return <MaterialIcons name={cfg.icon as any} size={size} color={isDark ? colors.tint : cfg.fg} />;
  }

  /* ───────────────────────── Hero Section ───────────────────────── */

  const heroScale = scrollY.interpolate({
    inputRange: [-300, 0],
    outputRange: [2.5, 1],
    extrapolate: 'clamp',
  });
  const heroTranslateY = scrollY.interpolate({
    inputRange: [-300, 0],
    outputRange: [-150, 0],
    extrapolate: 'clamp',
  });

  /* ───────────────────────── Render ───────────────────────── */

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {/* ─── HERO IMAGE — fixed behind scroll view ─── */}
      <View style={styles.heroImageClip}>
        {heroImage ? (
          <Animated.Image
            source={heroImage}
            style={[
              styles.heroImageInner,
              { transform: [{ scale: heroScale }, { translateY: heroTranslateY }] },
            ]}
            resizeMode="cover"
          />
        ) : (
          <Animated.View
            style={[
              styles.heroImageInner,
              { transform: [{ scale: heroScale }, { translateY: heroTranslateY }] },
            ]}
          >
            <LinearGradient
              colors={isDark ? ['#1e1b4b', '#312e81', '#164e63'] : ['#4338CA', '#3B82F6', '#06B6D4']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
          </Animated.View>
        )}
      </View>

      {/* ─── Brand text — fixed on hero image, scrolls away with hero ─── */}
      {!overlayVisible && (
        <Animated.View
          style={[
            styles.heroBrandBlock,
            { transform: [{ translateY: Animated.multiply(scrollY, -1) }] },
          ]}
          pointerEvents="none"
        >
          <ThemedText style={styles.heroBrandName}>BLDESY!</ThemedText>
          <ThemedText style={styles.heroBrandTagline}>Your local trade connector</ThemedText>
        </Animated.View>
      )}

      <Animated.ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={16}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true },
        )}
      >
        {/* ─── 1. HERO SPACER ─── */}
        <View style={styles.heroSpacer}>
          <View style={[styles.curveContainer, { backgroundColor: isDark ? colors.background : '#FFFFFF' }]}>
            <View style={[styles.curveShape, { backgroundColor: isDark ? colors.background : '#FFFFFF' }]} />
          </View>
        </View>

        {/* ─── CONTENT AREA — solid background so image doesn't bleed through ─── */}
        <View style={[styles.contentArea, { backgroundColor: colors.background }]}>
          {/* ─── 2. QUICK ACTION PILLS ─── */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.pillRow}
            style={styles.pillScroll}
          >
            <Pressable
              style={({ pressed }) => [styles.actionPill, styles.pillAI, pressed && { opacity: 0.7 }]}
              onPress={() => router.push('/(tabs)/ai')}
            >
              <MaterialIcons name="auto-awesome" size={14} color="#5B4CDB" />
              <ThemedText style={[styles.pillText, { color: '#5B4CDB' }]}>Not sure? Ask AI</ThemedText>
            </Pressable>
            <Pressable
              style={({ pressed }) => [styles.actionPill, styles.pillJob, pressed && { opacity: 0.7 }]}
              onPress={handlePostJob}
            >
              <MaterialIcons name="add" size={14} color="#3B82F6" />
              <ThemedText style={[styles.pillText, { color: '#3B82F6' }]}>Post a job</ThemedText>
            </Pressable>
            <Pressable
              style={({ pressed }) => [styles.actionPill, styles.pillEmergency, pressed && { opacity: 0.7 }]}
              onPress={() => router.push({ pathname: '/(tabs)/results', params: { urgency: 'asap' } })}
            >
              <MaterialIcons name="schedule" size={14} color="#059669" />
              <ThemedText style={[styles.pillText, { color: '#059669' }]}>Emergency</ThemedText>
            </Pressable>
          </ScrollView>

          {/* ─── 3. POPULAR TRADES (4x2 grid) ─── */}
          <View style={styles.section}>
            <View style={styles.sectionHeaderRow}>
              <ThemedText style={[styles.sectionTitle, { color: isDark ? colors.text : '#1A1A2E' }]}>
                Popular trades
              </ThemedText>
              <Pressable onPress={openOverlay} style={({ pressed }) => [pressed && { opacity: 0.7 }]}>
                <ThemedText style={styles.seeAllText}>See all</ThemedText>
              </Pressable>
            </View>
            <View style={styles.tradeGrid}>
              {POPULAR_TRADES.map((trade) => {
                const cfg = TRADE_CONFIG[trade];
                return (
                  <Pressable
                    key={trade}
                    style={({ pressed }) => [
                      styles.tradeGridItem,
                      pressed && { transform: [{ scale: 0.95 }], opacity: 0.8 },
                    ]}
                    onPress={() => handleCategoryPress(trade)}
                  >
                    <View style={[styles.tradeIconBox, { backgroundColor: isDark ? colors.surface : cfg.bg }]}>
                      {renderTradeIcon(trade)}
                    </View>
                    <ThemedText style={[styles.tradeGridLabel, { color: isDark ? colors.text : '#444444' }]} numberOfLines={1}>
                      {trade}
                    </ThemedText>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* ─── 4. HOW IT WORKS ─── */}
          <View style={styles.section}>
            <ThemedText style={[styles.sectionTitle, { color: isDark ? colors.text : '#1A1A2E', marginBottom: 14 }]}>
              How it works
            </ThemedText>
            <View style={styles.stepsRow}>
              {([
                { icon: 'search', title: 'Search', desc: 'Tell us what you need' },
                { icon: 'people', title: 'Match', desc: 'We find the right tradies' },
                { icon: 'phone-in-talk', title: 'Connect', desc: 'Contact them directly' },
              ] as const).map((step) => (
                <View key={step.title} style={[styles.stepCard, { backgroundColor: isDark ? colors.surface : '#F8F9FC' }]}>
                  <View style={[styles.stepIconBox, { backgroundColor: isDark ? colors.tintLight : '#EEF2FF' }]}>
                    <MaterialIcons name={step.icon} size={18} color={isDark ? colors.tint : '#4338CA'} />
                  </View>
                  <ThemedText style={[styles.stepTitle, { color: isDark ? colors.text : '#1A1A2E' }]}>
                    {step.title}
                  </ThemedText>
                  <ThemedText style={styles.stepDesc}>{step.desc}</ThemedText>
                </View>
              ))}
            </View>
          </View>

          {/* ─── 5. POST A JOB CTA ─── */}
          <View style={styles.ctaSection}>
            <Pressable onPress={handlePostJob} style={({ pressed }) => [pressed && { opacity: 0.92 }]}>
              <LinearGradient
                colors={['#0D7C66', '#14A38B']}
                start={{ x: 0, y: 0.5 }}
                end={{ x: 1, y: 0.5 }}
                style={styles.ctaCard}
              >
                <View style={styles.ctaGeoAccent} />
                <View style={styles.ctaRow}>
                  <View style={styles.ctaTextBlock}>
                    <ThemedText style={styles.ctaTitle}>Got a job?</ThemedText>
                    <ThemedText style={styles.ctaSubtitle}>Post it and let tradies come to you</ThemedText>
                  </View>
                  <View style={styles.ctaButton}>
                    <ThemedText style={styles.ctaButtonText}>Post a job</ThemedText>
                  </View>
                </View>
              </LinearGradient>
            </Pressable>
          </View>

          <View style={styles.bottomPad} />
        </View>
      </Animated.ScrollView>

      {/* ─── STICKY SEARCH BAR — hidden when overlay is open ─── */}
      {!overlayVisible && (
        <Animated.View
          style={[
            styles.stickySearchWrapper,
            {
              paddingTop: insets.top + 8,
              backgroundColor: scrollY.interpolate({
                inputRange: [0, 80],
                outputRange: ['transparent', isDark ? colors.background : '#FFFFFF'],
                extrapolate: 'clamp',
              }),
            },
          ]}
          pointerEvents="box-none"
        >
          <Animated.View
            style={{
              opacity: scrollY.interpolate({
                inputRange: [0, 80],
                outputRange: [0, 1],
                extrapolate: 'clamp',
              }),
            }}
          >
            <View style={[styles.stickySearchShadow, { backgroundColor: isDark ? colors.background : '#FFFFFF' }]} />
          </Animated.View>
          <Pressable
            style={({ pressed }) => [styles.searchBar, pressed && { opacity: 0.9 }, { marginHorizontal: 16, marginBottom: 10 }]}
            onPress={openOverlay}
          >
            <View style={styles.searchBrandIcon}>
              <Ionicons name="home" size={16} color="#ffffff" />
            </View>
            <ThemedText style={styles.searchPlaceholder}>What do you need done?</ThemedText>
            <MaterialIcons name="search" size={20} color="#9CA3AF" />
          </Pressable>
        </Animated.View>
      )}

      {/* ─────────── Search Overlay ─────────── */}
      {overlayVisible && (
        <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
          <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.4)', opacity: fadeAnim }]}>
            <Pressable style={StyleSheet.absoluteFill} onPress={closeOverlay} />
          </Animated.View>

          <Animated.View
            style={[
              styles.overlayPanel,
              { backgroundColor: isDark ? colors.background : '#F5F5F0', transform: [{ translateY: slideAnim }] },
            ]}
          >
            {/* ── Compact pinned header bar ── */}
            <LinearGradient
              colors={isDark ? ['#134E4A', '#0D3B3B'] : ['#0D7C66', '#0A6B58']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[styles.overlayHeaderBar, { paddingTop: insets.top }]}
            >
              <View style={styles.overlayHeaderRow}>
                <Pressable
                  style={({ pressed }) => [styles.backButtonHero, pressed && { opacity: 0.7 }]}
                  onPress={closeOverlay}
                >
                  <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
                </Pressable>
                <View style={styles.overlayHeaderTextBlock}>
                  <ThemedText style={styles.overlayHeaderTitle}>Find a Trusted Tradie</ThemedText>
                  <ThemedText style={styles.overlayHeaderSubtitle}>Connect with verified local professionals</ThemedText>
                </View>
                <View style={{ width: 40 }} />
              </View>
            </LinearGradient>

            <View style={styles.flex1}>
              <ScrollView
                style={styles.overlayScroll}
                contentContainerStyle={[styles.overlayContent, { paddingBottom: insets.bottom + 100 }]}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
              >
                {/* ── 1. LOCATION (top priority) ── */}
                <View style={styles.overlaySection}>
                  <ThemedText style={[styles.overlayLabel, { color: isDark ? colors.textSecondary : '#6B7280' }]}>LOCATION</ThemedText>
                  <View style={[
                    styles.locationInputContainer,
                    { backgroundColor: isDark ? colors.surface : '#FFFFFF', borderColor: isDark ? colors.border : '#E5E7EB' },
                  ]}>
                    <MaterialIcons name="location-on" size={22} color="#0D7C66" />
                    <TextInput
                      ref={locationInputRef}
                      style={[styles.locationTextInput, { color: isDark ? colors.text : '#1A1A2E' }]}
                      placeholder="Enter suburb or postcode"
                      placeholderTextColor={isDark ? colors.icon : '#9CA3AF'}
                      value={locationText}
                      onChangeText={handleLocationChange}
                      returnKeyType="done"
                      onSubmitEditing={() => setLocationSuggestions([])}
                    />
                    {locationText.length > 0 && (
                      <Pressable onPress={() => { setLocationText(''); setLocationSuggestions([]); }}>
                        <MaterialIcons name="close" size={18} color={isDark ? colors.icon : '#9CA3AF'} />
                      </Pressable>
                    )}
                  </View>
                  {locationSuggestions.length > 0 && (
                    <View style={[styles.suggestionsContainer, { backgroundColor: isDark ? colors.surface : '#FFFFFF', borderColor: isDark ? colors.border : '#E5E7EB' }]}>
                      {locationSuggestions.map((s) => (
                        <Pressable
                          key={s}
                          style={({ pressed }) => [styles.suggestionRow, pressed && { backgroundColor: isDark ? colors.borderLight : '#F3F4F6' }]}
                          onPress={() => selectLocationSuggestion(s)}
                        >
                          <MaterialIcons name="location-on" size={16} color={isDark ? colors.icon : '#9CA3AF'} />
                          <ThemedText style={[styles.suggestionText, { color: isDark ? colors.text : '#374151' }]}>{s}</ThemedText>
                        </Pressable>
                      ))}
                    </View>
                  )}
                </View>

                {/* ── 2. TRADES (grid of 8 + All Trades card) ── */}
                <View style={styles.overlaySection}>
                  <ThemedText style={[styles.overlayLabel, { color: isDark ? colors.textSecondary : '#6B7280' }]}>SELECT A TRADE</ThemedText>

                  {/* Selected trade chip */}
                  {selectedTrade && (
                    <View style={styles.selectedTradeChipRow}>
                      <View style={[styles.selectedTradeChip, { backgroundColor: isDark ? '#134E4A' : '#E8F5F3' }]}>
                        {renderTradeIcon(selectedTrade, 16)}
                        <ThemedText style={[styles.selectedTradeChipText, { color: isDark ? '#5EEAD4' : '#0D7C66' }]}>
                          {selectedTrade}
                        </ThemedText>
                        <Pressable onPress={() => setSelectedTrade(null)} hitSlop={8}>
                          <MaterialIcons name="close" size={16} color={isDark ? '#5EEAD4' : '#0D7C66'} />
                        </Pressable>
                      </View>
                    </View>
                  )}

                  <View style={styles.overlayTradeGrid}>
                    {POPULAR_TRADES.map((trade) => {
                      const cfg = TRADE_CONFIG[trade];
                      const isSelected = selectedTrade === trade;
                      return (
                        <Pressable
                          key={trade}
                          style={({ pressed }) => [
                            styles.overlayTradeCard,
                            {
                              backgroundColor: isDark ? colors.surface : '#FFFFFF',
                              borderColor: isSelected ? '#0D7C66' : (isDark ? colors.border : '#E5E7EB'),
                              borderWidth: isSelected ? 2 : 1,
                            },
                            pressed && { transform: [{ scale: 0.96 }] },
                          ]}
                          onPress={() => selectTrade(trade)}
                        >
                          {isSelected && (
                            <View style={styles.tradeCheckmark}>
                              <Ionicons name="checkmark-circle" size={18} color="#0D7C66" />
                            </View>
                          )}
                          <View style={[styles.overlayTradeIconBox, { backgroundColor: isDark ? colors.borderLight : cfg.bg }]}>
                            {renderTradeIcon(trade, 22)}
                          </View>
                          <ThemedText style={[styles.overlayTradeLabel, { color: isDark ? colors.text : '#374151' }]} numberOfLines={1}>
                            {trade}
                          </ThemedText>
                        </Pressable>
                      );
                    })}

                    {/* All Trades card */}
                    <Pressable
                      style={({ pressed }) => [
                        styles.overlayTradeCard,
                        styles.allTradesCard,
                        pressed && { transform: [{ scale: 0.96 }] },
                      ]}
                      onPress={() => router.push('/(tabs)/all-trades' as any)}
                    >
                      <View style={[styles.overlayTradeIconBox, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
                        <MaterialIcons name="add" size={24} color="#FFFFFF" />
                      </View>
                      <ThemedText style={styles.allTradesLabel} numberOfLines={1}>
                        All Trades
                      </ThemedText>
                    </Pressable>
                  </View>
                </View>

                {/* ── 3. KEYWORDS (free-text input with tags) ── */}
                <View style={styles.overlaySection}>
                  <ThemedText style={[styles.overlayLabel, { color: isDark ? colors.textSecondary : '#6B7280' }]}>KEYWORDS</ThemedText>

                  {keywords.length > 0 && (
                    <View style={styles.keywordChipsRow}>
                      {keywords.map((kw) => (
                        <View key={kw} style={[styles.keywordChip, { backgroundColor: isDark ? '#134E4A' : '#E8F5F3' }]}>
                          <ThemedText style={[styles.keywordChipText, { color: isDark ? '#5EEAD4' : '#0D7C66' }]}>{kw}</ThemedText>
                          <Pressable onPress={() => removeKeyword(kw)} hitSlop={6}>
                            <MaterialIcons name="close" size={14} color={isDark ? '#5EEAD4' : '#0D7C66'} />
                          </Pressable>
                        </View>
                      ))}
                    </View>
                  )}

                  <View style={[
                    styles.keywordInputContainer,
                    { backgroundColor: isDark ? colors.surface : '#FFFFFF', borderColor: isDark ? colors.border : '#E5E7EB' },
                  ]}>
                    <MaterialIcons name="search" size={20} color={isDark ? colors.icon : '#9CA3AF'} />
                    <TextInput
                      ref={keywordInputRef}
                      style={[styles.keywordTextInput, { color: isDark ? colors.text : '#1A1A2E' }]}
                      placeholder="Type what you need — e.g. granny flat, second storey, waterproofing"
                      placeholderTextColor={isDark ? colors.icon : '#9CA3AF'}
                      value={keywordInput}
                      onChangeText={setKeywordInput}
                      returnKeyType="done"
                      onSubmitEditing={addKeyword}
                    />
                  </View>
                </View>

                {/* ── 4. URGENCY ── */}
                <View style={styles.overlaySection}>
                  <ThemedText style={[styles.overlayLabel, { color: isDark ? colors.textSecondary : '#6B7280' }]}>URGENCY</ThemedText>
                  <View style={styles.urgencyRow}>
                    {URGENCY_OPTIONS.map((option) => {
                      const sel = selectedUrgency === option;
                      return (
                        <Pressable
                          key={option}
                          style={({ pressed }) => [
                            styles.urgencyChip,
                            {
                              backgroundColor: sel ? '#0D7C66' : (isDark ? colors.surface : '#FFFFFF'),
                              borderColor: sel ? '#0D7C66' : (isDark ? colors.border : '#E5E7EB'),
                            },
                            pressed && { opacity: 0.7 },
                          ]}
                          onPress={() => setSelectedUrgency(option)}
                        >
                          <ThemedText style={[styles.urgencyChipText, { color: sel ? '#fff' : (isDark ? colors.text : '#374151') }]}>{option}</ThemedText>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
              </ScrollView>

              {/* ── CTA Button ── */}
              <View
                style={[
                  styles.stickyButtonContainer,
                  {
                    backgroundColor: isDark ? colors.background : '#F5F5F0',
                    borderTopColor: isDark ? colors.border : '#E5E7EB',
                    paddingBottom: insets.bottom + Spacing.md,
                  },
                ]}
              >
                <Pressable
                  style={({ pressed }) => [styles.searchBtn, pressed && { opacity: 0.9, transform: [{ scale: 0.99 }] }]}
                  onPress={handleSearch}
                >
                  <LinearGradient
                    colors={['#0D7C66', '#0A6B58']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.searchBtnGradient}
                  >
                    <ThemedText style={styles.searchBtnText}>Search Tradies</ThemedText>
                    <MaterialIcons name="arrow-forward" size={20} color="#FFFFFF" />
                  </LinearGradient>
                </Pressable>
              </View>
            </View>
          </Animated.View>
        </View>
      )}
    </View>
  );
}

/* ───────────────────────── Styles ───────────────────────── */

const TRADE_CARD_WIDTH = (SCREEN_WIDTH - 48 - 24) / 3; // 24px padding + 2 gaps of 12

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex1: { flex: 1 },
  container: { flex: 1 },
  contentContainer: { paddingBottom: 0 },

  /* ─── Hero ─── */
  heroImageClip: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: HERO_HEIGHT + 100,
    overflow: 'hidden',
  },
  heroImageInner: {
    width: SCREEN_WIDTH,
    height: HERO_HEIGHT + 100,
  },
  heroSpacer: {
    width: '100%',
    height: HERO_HEIGHT,
  },
  heroBrandBlock: {
    position: 'absolute',
    top: 140,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 5,
  },
  heroBrandName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
    letterSpacing: 2,
    textShadowColor: 'rgba(0,0,0,0.25)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  heroBrandTagline: {
    fontSize: 10,
    fontWeight: '400',
    color: 'rgba(255,255,255,0.65)',
    marginTop: 2,
    textShadowColor: 'rgba(0,0,0,0.15)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  contentArea: {
    marginTop: -1,
  },
  curveContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 20,
    overflow: 'hidden',
  },
  curveShape: {
    position: 'absolute',
    bottom: 0,
    left: -10,
    right: -10,
    height: 40,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
  },

  /* ─── Search Bar (sticky) ─── */
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 10,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.12, shadowRadius: 16 },
      android: { elevation: 8 },
      default: {},
    }),
  },
  searchBrandIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#0D7C66',
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchPlaceholder: {
    flex: 1,
    fontSize: 15,
    fontWeight: '400',
    color: '#6B7280',
  },

  /* ─── Sticky Search Bar ─── */
  stickySearchWrapper: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 20,
  },
  stickySearchShadow: {
    ...StyleSheet.absoluteFillObject,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 4,
  },

  /* ─── Quick Action Pills ─── */
  pillScroll: { marginTop: 0 },
  pillRow: { paddingHorizontal: 16, gap: 8, paddingTop: 2 },
  actionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 7,
    gap: 5,
  },
  pillAI: { backgroundColor: '#F0EFFF' },
  pillJob: { backgroundColor: '#F0F9FF' },
  pillEmergency: { backgroundColor: '#ECFDF5' },
  pillText: { fontSize: 12, fontWeight: '500' },

  /* ─── Sections ─── */
  section: { paddingHorizontal: 16, marginTop: 20 },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  sectionTitle: { fontSize: 16, fontWeight: '600' },
  seeAllText: { fontSize: 13, fontWeight: '500', color: '#0D7C66' },

  /* ─── Trade Grid (4x2) ─── */
  tradeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  tradeGridItem: {
    width: (SCREEN_WIDTH - 32 - 36) / 4,
    alignItems: 'center',
    gap: 6,
  },
  tradeIconBox: {
    width: 54,
    height: 54,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tradeGridLabel: {
    fontSize: 11,
    fontWeight: '500',
    textAlign: 'center',
  },

  /* ─── How It Works ─── */
  stepsRow: { flexDirection: 'row', gap: 10 },
  stepCard: {
    flex: 1,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingTop: 14,
    paddingBottom: 12,
    alignItems: 'center',
  },
  stepIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  stepTitle: { fontSize: 13, fontWeight: '600' },
  stepDesc: {
    fontSize: 11,
    fontWeight: '400',
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 15,
    marginTop: 2,
  },

  /* ─── CTA Card ─── */
  ctaSection: { paddingHorizontal: 16, marginTop: 20, marginBottom: 20 },
  ctaCard: { borderRadius: 16, padding: 20, overflow: 'hidden' },
  ctaGeoAccent: {
    position: 'absolute',
    top: -15,
    right: -8,
    width: 70,
    height: 70,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 14,
    transform: [{ rotate: '20deg' }],
  },
  ctaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  ctaTextBlock: { flex: 1, marginRight: 12 },
  ctaTitle: { fontSize: 15, fontWeight: '600', color: '#ffffff' },
  ctaSubtitle: { fontSize: 12, fontWeight: '400', color: 'rgba(255,255,255,0.7)', marginTop: 4 },
  ctaButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  ctaButtonText: { fontSize: 13, fontWeight: '600', color: '#ffffff' },

  /* Bottom pad */
  bottomPad: { height: 20 },

  /* ─── Overlay ─── */
  overlayPanel: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },

  /* Compact pinned header bar */
  overlayHeaderBar: {
    paddingBottom: 14,
  },
  overlayHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  backButtonHero: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  overlayHeaderTextBlock: {
    flex: 1,
    alignItems: 'center',
  },
  overlayHeaderTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  overlayHeaderSubtitle: {
    fontSize: 12,
    fontWeight: '400',
    color: 'rgba(255,255,255,0.7)',
    marginTop: 2,
  },

  overlayScroll: { flex: 1 },
  overlayContent: { paddingHorizontal: 20, paddingTop: 24, gap: 28 },
  overlaySection: { gap: 12 },
  overlayLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },

  /* Location input */
  locationInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 14,
    height: 56,
    paddingHorizontal: 16,
    gap: 12,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4 },
      android: { elevation: 1 },
      default: {},
    }),
  },
  locationTextInput: { flex: 1, fontSize: 16, height: '100%' },
  suggestionsContainer: {
    borderWidth: 1,
    borderRadius: 12,
    overflow: 'hidden',
    marginTop: -4,
  },
  suggestionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#F3F4F6',
  },
  suggestionText: { fontSize: 15 },

  /* Trade cards in overlay */
  overlayTradeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  overlayTradeCard: {
    width: TRADE_CARD_WIDTH,
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 8,
    borderRadius: 14,
    borderWidth: 1,
    gap: 8,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4 },
      android: { elevation: 1 },
      default: {},
    }),
  },
  overlayTradeIconBox: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  overlayTradeLabel: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  tradeCheckmark: {
    position: 'absolute',
    top: 6,
    right: 6,
  },
  allTradesCard: {
    backgroundColor: '#0D7C66',
    borderColor: '#0D7C66',
  },
  allTradesLabel: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
    color: '#FFFFFF',
  },
  selectedTradeChipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 4,
  },
  selectedTradeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  selectedTradeChipText: {
    fontSize: 14,
    fontWeight: '600',
  },

  /* Keyword input */
  keywordChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  keywordChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  keywordChipText: {
    fontSize: 13,
    fontWeight: '500',
  },
  keywordInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 14,
    height: 52,
    paddingHorizontal: 16,
    gap: 10,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4 },
      android: { elevation: 1 },
      default: {},
    }),
  },
  keywordTextInput: { flex: 1, fontSize: 14, height: '100%' },

  /* Urgency */
  urgencyRow: { flexDirection: 'row', gap: 8 },
  urgencyChip: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  urgencyChipText: { fontSize: 13, fontWeight: '600' },

  /* CTA */
  stickyButtonContainer: { paddingHorizontal: 20, paddingTop: Spacing.md, borderTopWidth: 1 },
  searchBtn: { borderRadius: 14, overflow: 'hidden' },
  searchBtnGradient: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  searchBtnText: { color: '#fff', fontSize: 17, fontWeight: '700' },
});
