import { useCallback, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import Ionicons from '@expo/vector-icons/Ionicons';

import * as Haptics from 'expo-haptics';

import { ThemedText } from '@/components/themed-text';
import { SideDrawer } from '@/components/side-drawer';
import { Colors, Shadows, Spacing, Type } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

import { getSuburbSuggestions } from '@/lib/geo';
import { addSearchEntry } from '@/lib/search-history';
import { getRecentProfiles, type RecentProfile } from '@/lib/recent-profiles';

/* ───────────────────────── Data ───────────────────────── */

const POPULAR_TRADES = [
  'Builder', 'Electrician', 'Plumber', 'Carpenter',
  'Painter', 'Landscaper', 'Roofer', 'Tiler',
];

const URGENCY_OPTIONS = ['Any', 'ASAP', 'This Week', 'Flexible'];

const COMMON_JOBS = [
  { label: 'Bathroom renovation', icon: 'water-outline' as const, trade: 'tiler', urgency: undefined },
  { label: 'Emergency plumber', icon: 'alert-circle-outline' as const, trade: 'plumber', urgency: 'asap' },
  { label: 'Deck building', icon: 'hammer-outline' as const, trade: 'carpenter', urgency: undefined },
  { label: 'Kitchen remodel', icon: 'restaurant-outline' as const, trade: 'builder', urgency: undefined },
  { label: 'Roof repair', icon: 'home-outline' as const, trade: 'roofer', urgency: undefined },
];

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

/* ───────────────────────── Trade Category Config ───────────────────────── */

const TRADE_CONFIG: Record<string, { icon: string; iconSet: 'material' | 'ionicon'; bg: string; fg: string }> = {
  Builder:     { icon: 'construction',       iconSet: 'material',  bg: '#E8F5F3', fg: '#0D7C66' },
  Electrician: { icon: 'flash',              iconSet: 'ionicon',   bg: '#FFF7ED', fg: '#EA580C' },
  Plumber:     { icon: 'water',              iconSet: 'ionicon',   bg: '#EFF6FF', fg: '#2563EB' },
  Carpenter:   { icon: 'hammer',             iconSet: 'ionicon',   bg: '#ECFDF5', fg: '#059669' },
  Painter:     { icon: 'format-paint',       iconSet: 'material',  bg: '#FFF1F2', fg: '#E11D48' },
  Landscaper:  { icon: 'leaf',               iconSet: 'ionicon',   bg: '#F0FDF4', fg: '#16A34A' },
  Roofer:      { icon: 'home-outline',       iconSet: 'ionicon',   bg: '#FFFBEB', fg: '#D97706' },
  Tiler:       { icon: 'grid-outline',        iconSet: 'ionicon',   bg: '#F3E8FF', fg: '#7C3AED' },
};

/* ───────────────────────── Hero image ───────────────────────── */

const HERO_HEIGHT = 280;

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

  /* ── Side drawer state ── */
  const [drawerOpen, setDrawerOpen] = useState(false);

  /* ── FAB menu state ── */
  const [fabOpen, setFabOpen] = useState(false);
  const fabAnim = useRef(new Animated.Value(0)).current;

  function toggleFab() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const toValue = fabOpen ? 0 : 1;
    Animated.spring(fabAnim, { toValue, useNativeDriver: true, friction: 6 }).start();
    setFabOpen(!fabOpen);
  }

  function closeFab() {
    Animated.spring(fabAnim, { toValue: 0, useNativeDriver: true, friction: 6 }).start();
    setFabOpen(false);
  }

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

  /* ── Recent profiles state ── */
  const [recentProfiles, setRecentProfiles] = useState<RecentProfile[]>([]);

  /* ── Load recent profiles on focus ── */
  useFocusEffect(
    useCallback(() => {
      (async () => {
        const profiles = await getRecentProfiles();
        setRecentProfiles(profiles);
      })();
    }, []),
  );

  /* ── Listen for trade selected from all-trades page ── */
  const { selectedTrade: tradeParam } = useLocalSearchParams<{ selectedTrade?: string }>();

  useFocusEffect(
    useCallback(() => {
      if (tradeParam) {
        setSelectedTrade(tradeParam);
        // Clear the param so it doesn't re-trigger
        router.setParams({ selectedTrade: '' });
        // Ensure overlay is open
        if (!overlayVisible) {
          setOverlayVisible(true);
          Animated.parallel([
            Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, tension: 65, friction: 11 }),
            Animated.timing(fadeAnim, { toValue: 1, duration: 250, useNativeDriver: true }),
          ]).start();
        }
      }
    }, [tradeParam, overlayVisible]),
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
    setLocationSuggestions(getSuburbSuggestions(text));
  }

  function selectLocationSuggestion(suggestion: string) {
    setLocationText(suggestion);
    setLocationSuggestions([]);
  }

  /* ── Search submission ── */

  function handleSearch() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
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

    // Save to search history
    if (selectedTrade) {
      addSearchEntry(selectedTrade, locationText.trim() || null);
    }

    router.push({ pathname: '/results', params });
  }

  function handlePostJob() {
    router.push('/post-job');
  }

  function handleCategoryPress(trade: string) {
    router.push({ pathname: '/results', params: { trade_category: trade.toLowerCase() } });
  }

  function handleTrendingPress(item: typeof COMMON_JOBS[0]) {
    const params: Record<string, string> = { trade_category: item.trade };
    if (item.urgency) params.urgency = item.urgency;
    router.push({ pathname: '/results', params });
  }

  /* ── Trade icon renderer ── */

  function renderTradeIcon(trade: string, size = 22) {
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
    <View style={[styles.root, { backgroundColor: colors.canvas }]}>
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
        {/* Dark gradient overlay for text contrast */}
        <LinearGradient
          colors={['rgba(0,0,0,0.45)', 'rgba(0,0,0,0.15)', 'rgba(0,0,0,0.3)']}
          locations={[0, 0.5, 1]}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        />
      </View>

      {/* ─── Brand text + embedded search prompt — scrolls away with hero ─── */}
      {!overlayVisible && (
        <Animated.View
          style={[
            styles.heroBrandBlock,
            {
              paddingTop: insets.top,
              transform: [{ translateY: Animated.multiply(scrollY, -1) }],
            },
          ]}
          pointerEvents="box-none"
        >
          {/* Hamburger button — top-left of hero */}
          <Pressable
            style={[styles.hamburgerBtn, { top: insets.top + 10 }]}
            onPress={() => setDrawerOpen(true)}
            accessibilityRole="button"
            accessibilityLabel="Open menu"
            pointerEvents="auto"
          >
            <MaterialIcons name="menu" size={24} color="#ffffff" />
          </Pressable>

          <ThemedText style={styles.heroBrandName}>BLDESY!</ThemedText>
          <ThemedText style={styles.heroBrandTagline}>Find your tradie</ThemedText>
          {/* ── Embedded search prompt pill ── */}
          <Pressable
            style={({ pressed }) => [styles.heroSearchPill, pressed && { opacity: 0.85 }]}
            onPress={openOverlay}
            accessibilityRole="search"
            accessibilityLabel="What do you need done?"
          >
            <MaterialIcons name="search" size={17} color="rgba(255,255,255,0.9)" />
            <ThemedText style={styles.heroSearchPillText}>What do you need done?</ThemedText>
          </Pressable>
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
          <View style={[styles.curveContainer, { backgroundColor: colors.canvas }]}>
            <View style={[styles.curveShape, { backgroundColor: colors.canvas }]} />
          </View>
        </View>

        {/* ─── CONTENT AREA — solid background so image doesn't bleed through ─── */}
        <View style={[styles.contentArea, { backgroundColor: colors.canvas }]}>

          {/* ─── 2. POPULAR TRADES — 2-column horizontal card grid ─── */}
          <View style={styles.section}>
            <View style={styles.sectionHeaderRow}>
              <ThemedText style={[styles.sectionTitle, { color: isDark ? colors.text : '#1A1A2E' }]}>
                Popular trades
              </ThemedText>
              <Pressable
                onPress={() => router.push('/all-trades' as any)}
                style={({ pressed }) => [pressed && { opacity: 0.7 }]}
                accessibilityRole="button"
                accessibilityLabel="See all trades"
              >
                <ThemedText style={styles.seeAllText}>See all</ThemedText>
              </Pressable>
            </View>
            <View style={styles.tradeListGrid}>
              {POPULAR_TRADES.map((trade) => {
                const cfg = TRADE_CONFIG[trade];
                return (
                  <Pressable
                    key={trade}
                    style={({ pressed }) => [
                      styles.tradeListCard,
                      { backgroundColor: isDark ? colors.surface : (cfg?.bg ?? '#F5F5F4') },
                      pressed && { transform: [{ scale: 0.97 }], opacity: 0.85 },
                    ]}
                    onPress={() => handleCategoryPress(trade)}
                    accessibilityRole="button"
                    accessibilityLabel={`Search ${trade} tradies`}
                  >
                    <View style={[styles.tradeListIconBox, { backgroundColor: isDark ? colors.borderLight : 'rgba(255,255,255,0.7)' }]}>
                      {renderTradeIcon(trade)}
                    </View>
                    <ThemedText
                      style={[styles.tradeListLabel, { color: isDark ? colors.text : (cfg?.fg ?? '#444444') }]}
                      numberOfLines={1}
                    >
                      {trade}
                    </ThemedText>
                    <MaterialIcons name="chevron-right" size={16} color={isDark ? colors.icon : 'rgba(0,0,0,0.25)'} style={styles.tradeListChevron} />
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* ─── RECENTLY VIEWED ─── */}
          {recentProfiles.length > 0 && (
            <View style={styles.section}>
              <ThemedText style={[styles.sectionTitle, { color: isDark ? colors.text : '#1A1A2E' }]}>
                Recently viewed
              </ThemedText>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.recentList}
              >
                {recentProfiles.slice(0, 6).map((profile) => {
                  const photoUri = profile.profile_photo_url
                    || `https://ui-avatars.com/api/?name=${encodeURIComponent(profile.business_name)}&background=0d9488&color=fff`;
                  return (
                    <Pressable
                      key={profile.id}
                      style={[
                        styles.recentCard,
                        {
                          backgroundColor: isDark ? colors.surface : '#FFFFFF',
                          borderColor: isDark ? colors.border : '#EBEBEB',
                        },
                      ]}
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        router.push({ pathname: '/builder-profile', params: { id: profile.id } });
                      }}
                      accessibilityRole="button"
                      accessibilityLabel={`View ${profile.business_name}`}
                    >
                      <Image
                        source={{ uri: photoUri }}
                        style={styles.recentPhoto}
                      />
                      <View style={styles.recentCardBody}>
                        <ThemedText style={[styles.recentName, { color: colors.text }]} numberOfLines={1}>
                          {profile.business_name}
                        </ThemedText>
                        <ThemedText style={[styles.recentTrade, { color: colors.teal }]} numberOfLines={1}>
                          {profile.trade_category}
                        </ThemedText>
                        <ThemedText style={[styles.recentSuburb, { color: colors.textSecondary }]} numberOfLines={1}>
                          {profile.suburb || 'Australia'}
                        </ThemedText>
                      </View>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>
          )}

          {/* ─── 3. COMMON JOBS ─── */}
          <View style={styles.section}>
            <ThemedText style={[styles.sectionTitle, { color: isDark ? colors.text : '#1A1A2E', marginBottom: 4 }]}>
              Common jobs
            </ThemedText>
            <View style={[styles.trendingList, { borderColor: isDark ? colors.border : '#EBEBEB' }]}>
              {COMMON_JOBS.map((item, idx) => (
                <Pressable
                  key={item.label}
                  style={({ pressed }) => [
                    styles.trendingRow,
                    {
                      borderBottomWidth: idx < COMMON_JOBS.length - 1 ? StyleSheet.hairlineWidth : 0,
                      borderBottomColor: isDark ? colors.border : '#E5E7EB',
                    },
                    pressed && { backgroundColor: isDark ? colors.surface : '#F9F9F7' },
                  ]}
                  onPress={() => handleTrendingPress(item)}
                  accessibilityRole="button"
                  accessibilityLabel={`Search for ${item.label}`}
                >
                  <Ionicons name={item.icon} size={16} color={colors.tint} style={styles.trendingIcon} />
                  <ThemedText style={[styles.trendingLabel, { color: isDark ? colors.text : '#1A1A2E' }]}>
                    {item.label}
                  </ThemedText>
                  <MaterialIcons name="arrow-forward" size={15} color={isDark ? colors.icon : '#9CA3AF'} />
                </Pressable>
              ))}
            </View>
          </View>

          {/* ─── 4. AI NUDGE ─── */}
          <View style={styles.section}>
            <View style={[styles.aiCard, { backgroundColor: isDark ? colors.surface : '#FFFFFF', borderColor: isDark ? colors.border : '#EBEBEB' }]}>
              <ThemedText style={[styles.aiCardTitle, { color: isDark ? colors.text : '#1A1A2E' }]}>
                Not sure what you need?
              </ThemedText>
              <ThemedText style={[styles.aiCardSubtitle, { color: colors.textSecondary }]}>
                Our AI can help you figure it out
              </ThemedText>
              <Pressable
                onPress={() => router.push('/(tabs)/ai')}
                style={({ pressed }) => [pressed && { opacity: 0.7 }]}
                accessibilityRole="button"
                accessibilityLabel="Chat with AI"
              >
                <ThemedText style={[styles.aiCardLink, { color: colors.teal }]}>
                  Chat with AI →
                </ThemedText>
              </Pressable>
            </View>
          </View>

          <View style={styles.bottomPad} />
        </View>
      </Animated.ScrollView>

      {/* ─── STICKY SEARCH BAR — fades in only after scrolling past hero ─── */}
      {!overlayVisible && (
        <Animated.View
          style={[
            styles.stickySearchWrapper,
            {
              paddingTop: insets.top + 8,
              opacity: scrollY.interpolate({
                inputRange: [HERO_HEIGHT - 120, HERO_HEIGHT - 60],
                outputRange: [0, 1],
                extrapolate: 'clamp',
              }),
            },
          ]}
        >
          <View style={styles.stickySearchRow}>
            {/* Hamburger button in sticky bar */}
            <Pressable
              style={[styles.stickyHamburger, { backgroundColor: isDark ? colors.surface : '#FFFFFF', borderColor: colors.border }]}
              onPress={() => setDrawerOpen(true)}
              accessibilityRole="button"
              accessibilityLabel="Open menu"
            >
              <MaterialIcons name="menu" size={22} color={colors.text} />
            </Pressable>

            <Pressable
              style={({ pressed }) => [styles.searchBar, { backgroundColor: isDark ? colors.surface : '#FFFFFF', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 6, elevation: 4 }, pressed && { opacity: 0.9 }, { flex: 1, marginBottom: 6 }]}
              onPress={openOverlay}
              accessibilityRole="search"
              accessibilityLabel="Search for tradies"
            >
              <View style={styles.searchBrandIcon}>
                <Ionicons name="home" size={16} color="#ffffff" />
              </View>
              <ThemedText style={[styles.searchPlaceholder, { color: colors.textSecondary }]}>What do you need done?</ThemedText>
              <MaterialIcons name="search" size={20} color="#9CA3AF" />
            </Pressable>
          </View>
        </Animated.View>
      )}

      {/* ─── FAB MENU ─── */}
      {!overlayVisible && (
        <>
          {/* Backdrop to close FAB menu */}
          {fabOpen && (
            <Pressable
              style={[StyleSheet.absoluteFill, { zIndex: 28 }]}
              onPress={closeFab}
            />
          )}

          {/* FAB action: Post a Job */}
          <Animated.View
            style={[
              styles.fabAction,
              {
                bottom: insets.bottom - 10,
                opacity: fabAnim,
                transform: [
                  { translateY: fabAnim.interpolate({ inputRange: [0, 1], outputRange: [0, -68] }) },
                  { scale: fabAnim },
                ],
              },
            ]}
            pointerEvents={fabOpen ? 'auto' : 'none'}
          >
            <Pressable
              style={({ pressed }) => [styles.fabActionBtn, { backgroundColor: colors.teal }, pressed && { opacity: 0.85 }]}
              onPress={() => { closeFab(); handlePostJob(); }}
              accessibilityRole="button"
              accessibilityLabel="Post a job"
            >
              <MaterialIcons name="work-outline" size={18} color="#FFFFFF" />
              <ThemedText style={styles.fabActionLabel}>Post a Job</ThemedText>
            </Pressable>
          </Animated.View>

          {/* FAB action: AI Chat */}
          <Animated.View
            style={[
              styles.fabAction,
              {
                bottom: insets.bottom - 10,
                opacity: fabAnim,
                transform: [
                  { translateY: fabAnim.interpolate({ inputRange: [0, 1], outputRange: [0, -124] }) },
                  { scale: fabAnim },
                ],
              },
            ]}
            pointerEvents={fabOpen ? 'auto' : 'none'}
          >
            <Pressable
              style={({ pressed }) => [styles.fabActionBtn, { backgroundColor: '#6366F1' }, pressed && { opacity: 0.85 }]}
              onPress={() => { closeFab(); router.push('/(tabs)/ai'); }}
              accessibilityRole="button"
              accessibilityLabel="Chat with AI"
            >
              <Ionicons name="sparkles" size={18} color="#FFFFFF" />
              <ThemedText style={styles.fabActionLabel}>AI Chat</ThemedText>
            </Pressable>
          </Animated.View>

          {/* Main FAB toggle */}
          <Pressable
            style={({ pressed }) => [
              styles.fab,
              { backgroundColor: colors.teal, bottom: insets.bottom - 10 },
              pressed && { opacity: 0.9 },
            ]}
            onPress={toggleFab}
            accessibilityRole="button"
            accessibilityLabel={fabOpen ? 'Close menu' : 'Open menu'}
          >
            <Animated.View style={{ transform: [{ rotate: fabAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '45deg'] }) }] }}>
              <MaterialIcons name="add" size={26} color="#FFFFFF" />
            </Animated.View>
          </Pressable>
        </>
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
              { backgroundColor: colors.canvas, transform: [{ translateY: slideAnim }] },
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
                  accessibilityRole="button"
                  accessibilityLabel="Go back"
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
                keyboardDismissMode="on-drag"
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
                      <Pressable onPress={() => { setLocationText(''); setLocationSuggestions([]); }} accessibilityLabel="Clear location" accessibilityRole="button">
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
                          accessibilityRole="button"
                          accessibilityLabel={`${trade}`}
                          accessibilityState={{ selected: isSelected }}
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
                      onPress={() => router.push('/all-trades' as any)}
                      accessibilityRole="button"
                      accessibilityLabel="Browse all trades"
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
                          <Pressable onPress={() => removeKeyword(kw)} hitSlop={6} accessibilityLabel={`Remove keyword ${kw}`} accessibilityRole="button">
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
                          accessibilityRole="button"
                          accessibilityLabel={`${option} urgency`}
                          accessibilityState={{ selected: sel }}
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
                    backgroundColor: colors.canvas,
                    borderTopColor: isDark ? colors.border : '#E5E7EB',
                    paddingBottom: insets.bottom + Spacing.md,
                  },
                ]}
              >
                <Pressable
                  style={({ pressed }) => [styles.searchBtn, pressed && { opacity: 0.9, transform: [{ scale: 0.99 }] }]}
                  onPress={handleSearch}
                  accessibilityRole="button"
                  accessibilityLabel="Search tradies"
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

      {/* ─── Side Drawer ─── */}
      <SideDrawer visible={drawerOpen} onClose={() => setDrawerOpen(false)} />
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
    top: 0,
    left: 0,
    right: 0,
    height: HERO_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 5,
    paddingHorizontal: 24,
  },
  heroBrandName: {
    fontSize: 36,
    lineHeight: 44,
    fontFamily: 'RussoOne_400Regular',
    color: '#FFFFFF',
    letterSpacing: 2,
    textShadowColor: 'rgba(0,0,0,0.35)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  heroBrandTagline: {
    fontSize: 14,
    fontWeight: '400',
    color: 'rgba(255,255,255,0.8)',
    marginTop: 4,
    letterSpacing: 0.3,
    textShadowColor: 'rgba(0,0,0,0.15)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  heroSearchPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 16,
    backgroundColor: 'rgba(255,255,255,0.32)',
    borderRadius: 28,
    paddingHorizontal: 20,
    paddingVertical: 11,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    width: '100%',
    maxWidth: 300,
  },
  heroSearchPillText: {
    ...Type.bodySemiBold,
    color: 'rgba(255,255,255,0.9)',
    flex: 1,
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
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
  },

  /* ─── Search Bar (sticky) ─── */
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
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
  },

  /* ─── Sticky Search Bar ─── */
  stickySearchWrapper: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 20,
    paddingBottom: 8,
  },

  /* ─── Sections ─── */
  section: { paddingHorizontal: 16, marginTop: 20 },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionTitle: { ...Type.h2 },
  seeAllText: { fontSize: 13, fontWeight: '500', color: '#0D7C66' },

  /* ─── Trade Grid — 2-column horizontal cards ─── */
  tradeListGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tradeListCard: {
    width: (SCREEN_WIDTH - 32 - 8) / 2,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 12,
    gap: 10,
    height: 56,
  },
  tradeListIconBox: {
    width: 34,
    height: 34,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  tradeListLabel: {
    ...Type.captionSemiBold,
    flex: 1,
  },
  tradeListChevron: {
    flexShrink: 0,
  },

  /* ─── Trending Now ─── */
  trendingList: {
    marginTop: 8,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
  },
  trendingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 14,
    gap: 10,
    minHeight: 48,
  },
  trendingIcon: {
    flexShrink: 0,
  },
  trendingLabel: {
    ...Type.body,
    flex: 1,
  },

  /* ─── Recently Viewed ─── */
  recentList: {
    gap: 12,
    paddingRight: 16,
  },
  recentCard: {
    width: 160,
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
    ...Shadows.md,
  },
  recentPhoto: {
    width: '100%',
    height: 100,
    backgroundColor: '#E0E7EC',
  },
  recentCardBody: {
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 10,
    gap: 2,
  },
  recentName: {
    fontSize: 14,
    fontWeight: '700',
  },
  recentTrade: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize' as const,
  },
  recentSuburb: {
    fontSize: 12,
    fontWeight: '400',
  },

  /* ─── AI Nudge Card ─── */
  aiCard: {
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 18,
    paddingVertical: 16,
    gap: 4,
    ...Platform.select({
      ios: { shadowColor: '#0f172a', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 6 },
      android: { elevation: 1 },
      default: {},
    }),
  },
  aiCardTitle: {
    ...Type.h3,
  },
  aiCardSubtitle: {
    ...Type.caption,
  },
  aiCardLink: {
    ...Type.captionSemiBold,
    marginTop: 8,
  },

  /* ─── Post Job FAB ─── */
  fab: {
    position: 'absolute',
    right: 16,
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 30,
    ...Platform.select({
      ios: { shadowColor: '#0f172a', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 10 },
      android: { elevation: 8 },
      default: {},
    }),
  },
  fabAction: {
    position: 'absolute',
    right: 16,
    zIndex: 29,
    alignItems: 'flex-end',
  },
  fabActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 24,
    gap: 8,
    ...Platform.select({
      ios: { shadowColor: '#0f172a', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.18, shadowRadius: 8 },
      android: { elevation: 6 },
      default: {},
    }),
  },
  fabActionLabel: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },

  /* Bottom pad */
  bottomPad: { height: 32 },

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
    ...Type.label,
    textTransform: 'uppercase',
  },

  /* Location input */
  locationInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 16,
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
    borderRadius: 16,
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
    borderRadius: 16,
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
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  overlayTradeLabel: {
    ...Type.captionSemiBold,
    fontSize: 12,
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
    borderRadius: 16,
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
    borderRadius: 16,
    paddingVertical: 12,
    alignItems: 'center',
  },
  urgencyChipText: { ...Type.captionSemiBold },

  /* CTA */
  stickyButtonContainer: { paddingHorizontal: 20, paddingTop: Spacing.md, borderTopWidth: 1 },
  searchBtn: { borderRadius: 16, overflow: 'hidden' },
  searchBtnGradient: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  searchBtnText: { ...Type.btnPrimary, color: '#fff' },
  hamburgerBtn: {
    position: 'absolute',
    left: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.28)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  stickySearchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    gap: 8,
    marginBottom: 6,
  },
  stickyHamburger: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
});
