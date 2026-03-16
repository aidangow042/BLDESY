import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { Colors, Spacing, Radius, Shadows } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { supabase } from '@/lib/supabase';

/* ───────────────────────── Trade & Keyword Data ───────────────────────── */

const POPULAR_TRADES = [
  'Builder',
  'Electrician',
  'Plumber',
  'Carpenter',
  'Painter',
  'Landscaper',
  'Roofer',
  'Tiler',
];

const MORE_TRADES = [
  'Concreter',
  'Fencer',
  'Plasterer',
  'Bricklayer',
  'Cabinet Maker',
  'Glazier',
  'Renderer',
  'Demolition',
  'Scaffolder',
  'Waterproofer',
  'Locksmith',
  'Pest Control',
  'Air Conditioning / HVAC',
  'Solar Installer',
  'Pool Builder',
  'Handyman',
  'Cleaner',
  'Asbestos Removal',
  'Surveyor',
  'Drafting / Design',
];

const COMMON_KEYWORDS = [
  'Renovation',
  'Extension',
  'New Build',
  'Granny Flat',
  'Knock Down Rebuild',
  'Bathroom Reno',
  'Kitchen Reno',
  'Deck',
  'Pergola',
  'Retaining Wall',
  'Driveway',
  'Garage',
  'Carport',
  'Shop Fit-out',
  'Commercial',
  'Residential',
  'Strata',
  'Insurance Work',
  'Emergency Repair',
  'Council Approval',
  'Owner Builder',
];

const URGENCY_OPTIONS = ['Any', 'ASAP', 'This Week', 'Flexible'];

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

/* ───────────────────────── Types ───────────────────────── */

type BuilderProfile = {
  id: string;
  business_name: string;
  trade_category: string;
  suburb: string;
};

/* ───────────────────────── Component ───────────────────────── */

export default function HomeScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme === 'dark' ? 'dark' : 'light'];
  const router = useRouter();
  const insets = useSafeAreaInsets();

  // Featured builders
  const [featuredBuilders, setFeaturedBuilders] = useState<BuilderProfile[]>([]);
  const [loadingFeatured, setLoadingFeatured] = useState(true);

  // Search overlay state
  const [overlayVisible, setOverlayVisible] = useState(false);
  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // Filter selections (inside overlay)
  const [selectedTrades, setSelectedTrades] = useState<Set<string>>(new Set());
  const [selectedKeywords, setSelectedKeywords] = useState<Set<string>>(new Set());
  const [locationText, setLocationText] = useState('');
  const [selectedUrgency, setSelectedUrgency] = useState('Any');
  const [showMoreTrades, setShowMoreTrades] = useState(false);

  const locationInputRef = useRef<TextInput>(null);

  useEffect(() => {
    fetchFeaturedBuilders();
  }, []);

  async function fetchFeaturedBuilders() {
    setLoadingFeatured(true);
    const { data, error } = await supabase
      .from('builder_profiles')
      .select('id, business_name, trade_category, suburb')
      .eq('approved', true)
      .limit(5);

    if (!error && data) {
      setFeaturedBuilders(data);
    }
    setLoadingFeatured(false);
  }

  /* ── Overlay open / close ── */

  function openOverlay() {
    setOverlayVisible(true);
    Animated.parallel([
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 65,
        friction: 11,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start();
  }

  function closeOverlay() {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: SCREEN_HEIGHT,
        duration: 280,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setOverlayVisible(false);
      // Reset all selections
      setSelectedTrades(new Set());
      setSelectedKeywords(new Set());
      setLocationText('');
      setSelectedUrgency('Any');
      setShowMoreTrades(false);
    });
  }

  /* ── Toggle helpers ── */

  function toggleTrade(trade: string) {
    setSelectedTrades((prev) => {
      const next = new Set(prev);
      if (next.has(trade)) next.delete(trade);
      else next.add(trade);
      return next;
    });
  }

  function toggleKeyword(keyword: string) {
    setSelectedKeywords((prev) => {
      const next = new Set(prev);
      if (next.has(keyword)) next.delete(keyword);
      else next.add(keyword);
      return next;
    });
  }

  /* ── Search submission ── */

  function handleSearch() {
    const params: Record<string, string> = {};

    if (locationText.trim()) {
      params.suburb = locationText.trim();
    }

    if (selectedTrades.size > 0) {
      params.trade_category = Array.from(selectedTrades)
        .map((t) => t.toLowerCase())
        .join(',');
    }

    if (selectedUrgency !== 'Any') {
      params.urgency = selectedUrgency.toLowerCase().replace(' ', '_');
    }

    if (selectedKeywords.size > 0) {
      params.keywords = Array.from(selectedKeywords).join(',');
    }

    // Close overlay without resetting (navigating away will unmount)
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: SCREEN_HEIGHT,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 180,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setOverlayVisible(false);
      // Reset for next time
      setSelectedTrades(new Set());
      setSelectedKeywords(new Set());
      setLocationText('');
      setSelectedUrgency('Any');
      setShowMoreTrades(false);
    });

    router.push({ pathname: '/(tabs)/results', params });
  }

  function handlePostJob() {
    router.push('/(tabs)/post-job');
  }

  /* ── Chip renderer ── */

  function renderChip(
    label: string,
    isSelected: boolean,
    onPress: () => void,
    size: 'large' | 'small' = 'large',
  ) {
    return (
      <Pressable
        key={label}
        style={({ pressed }) => [
          size === 'large' ? styles.tradeChip : styles.keywordTag,
          {
            backgroundColor: isSelected ? colors.tint : colors.surface,
            borderColor: isSelected ? colors.tint : colors.border,
          },
          pressed && { opacity: 0.7 },
        ]}
        onPress={onPress}
      >
        <ThemedText
          style={[
            size === 'large' ? styles.tradeChipText : styles.keywordTagText,
            { color: isSelected ? '#fff' : colors.text },
          ]}
        >
          {label}
        </ThemedText>
      </Pressable>
    );
  }

  /* ───────────────────────── Render ───────────────────────── */

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={styles.headerSection}>
          <ThemedText type="title" style={[styles.header, { color: colors.tint }]}>
            BLDESY!
          </ThemedText>
          <ThemedText style={[styles.subtitle, { color: colors.textSecondary }]}>
            Find trusted tradies, fast
          </ThemedText>
        </View>

        {/* Search bar — tap to open overlay */}
        <Pressable
          style={({ pressed }) => [
            styles.searchBar,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
            },
            Shadows.sm,
            pressed && { opacity: 0.85 },
          ]}
          onPress={openOverlay}
        >
          <ThemedText style={[styles.searchBarIcon, { color: colors.icon }]}>
            🔍
          </ThemedText>
          <ThemedText style={[styles.searchBarPlaceholder, { color: colors.icon }]}>
            What do you need done?
          </ThemedText>
        </Pressable>

        {/* Featured Tradies */}
        <View style={styles.sectionHeader}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>
            Featured Tradies
          </ThemedText>
        </View>
        {loadingFeatured ? (
          <ActivityIndicator color={colors.tint} style={styles.loader} />
        ) : featuredBuilders.length === 0 ? (
          <View style={[styles.emptyState, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <ThemedText style={[styles.emptyText, { color: colors.textSecondary }]}>
              No featured tradies yet.
            </ThemedText>
          </View>
        ) : (
          <FlatList
            horizontal
            showsHorizontalScrollIndicator={false}
            data={featuredBuilders}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.featuredList}
            renderItem={({ item }) => (
              <Pressable
                style={({ pressed }) => [
                  styles.featuredCard,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                  },
                  Shadows.sm,
                  pressed && { opacity: 0.7 },
                ]}
                onPress={() =>
                  router.push({ pathname: '/(tabs)/builder/[id]', params: { id: item.id } })
                }
              >
                <View style={[styles.featuredTradeBadge, { backgroundColor: colors.tintLight }]}>
                  <ThemedText style={[styles.featuredTradeText, { color: colors.tint }]}>
                    {item.trade_category}
                  </ThemedText>
                </View>
                <ThemedText type="defaultSemiBold" numberOfLines={1} style={styles.featuredName}>
                  {item.business_name}
                </ThemedText>
                <ThemedText style={[styles.featuredLocation, { color: colors.textSecondary }]}>
                  {item.suburb}
                </ThemedText>
              </Pressable>
            )}
          />
        )}

        {/* Action buttons */}
        <View style={styles.actionRow}>
          <Pressable
            style={({ pressed }) => [
              styles.ghostButton,
              { borderColor: colors.border, backgroundColor: colors.surface },
              pressed && { opacity: 0.7 },
            ]}
            onPress={handlePostJob}
          >
            <ThemedText style={[styles.ghostButtonText, { color: colors.tint }]}>
              Post a Job
            </ThemedText>
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              styles.ghostButton,
              { borderColor: colors.border, backgroundColor: colors.surface },
              pressed && { opacity: 0.7 },
            ]}
            onPress={() => router.push('/(tabs)/my-jobs')}
          >
            <ThemedText style={[styles.ghostButtonText, { color: colors.tint }]}>
              My Jobs
            </ThemedText>
          </Pressable>
        </View>
      </ScrollView>

      {/* ─────────── Search Overlay ─────────── */}
      {overlayVisible && (
        <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
          {/* Backdrop */}
          <Animated.View
            style={[
              StyleSheet.absoluteFill,
              { backgroundColor: 'rgba(0,0,0,0.4)', opacity: fadeAnim },
            ]}
          >
            <Pressable style={StyleSheet.absoluteFill} onPress={closeOverlay} />
          </Animated.View>

          {/* Sliding panel */}
          <Animated.View
            style={[
              styles.overlayPanel,
              {
                backgroundColor: colors.background,
                transform: [{ translateY: slideAnim }],
                paddingTop: insets.top,
              },
            ]}
          >
            <KeyboardAvoidingView
              style={{ flex: 1 }}
              behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            >
              {/* Overlay header */}
              <View style={[styles.overlayHeader, { borderBottomColor: colors.border }]}>
                <Pressable
                  style={({ pressed }) => [
                    styles.closeButton,
                    { backgroundColor: colors.surface, borderColor: colors.border },
                    pressed && { opacity: 0.7 },
                  ]}
                  onPress={closeOverlay}
                >
                  <ThemedText style={[styles.closeButtonText, { color: colors.text }]}>
                    ✕
                  </ThemedText>
                </Pressable>
                <ThemedText type="subtitle" style={styles.overlayTitle}>
                  Find a Tradie
                </ThemedText>
                <View style={{ width: 40 }} />
              </View>

              <ScrollView
                style={styles.overlayScroll}
                contentContainerStyle={[
                  styles.overlayContent,
                  { paddingBottom: insets.bottom + 100 },
                ]}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
              >
                {/* ── Popular Trades ── */}
                <View style={styles.overlaySection}>
                  <ThemedText style={[styles.sectionLabel, { color: colors.textSecondary }]}>
                    POPULAR TRADES
                  </ThemedText>
                  <View style={styles.chipGrid}>
                    {POPULAR_TRADES.map((trade) =>
                      renderChip(trade, selectedTrades.has(trade), () => toggleTrade(trade), 'large'),
                    )}
                  </View>
                </View>

                {/* ── More Trades ── */}
                <View style={styles.overlaySection}>
                  <Pressable
                    style={({ pressed }) => [
                      styles.showMoreRow,
                      pressed && { opacity: 0.7 },
                    ]}
                    onPress={() => setShowMoreTrades(!showMoreTrades)}
                  >
                    <ThemedText style={[styles.sectionLabel, { color: colors.textSecondary }]}>
                      MORE TRADES
                    </ThemedText>
                    <ThemedText style={[styles.showMoreArrow, { color: colors.tint }]}>
                      {showMoreTrades ? '▲' : '▼'}
                    </ThemedText>
                  </Pressable>
                  {showMoreTrades && (
                    <Animated.View style={styles.chipGrid}>
                      {MORE_TRADES.map((trade) =>
                        renderChip(trade, selectedTrades.has(trade), () => toggleTrade(trade), 'large'),
                      )}
                    </Animated.View>
                  )}
                </View>

                {/* ── Common Keywords ── */}
                <View style={styles.overlaySection}>
                  <ThemedText style={[styles.sectionLabel, { color: colors.textSecondary }]}>
                    COMMON KEYWORDS
                  </ThemedText>
                  <View style={styles.tagGrid}>
                    {COMMON_KEYWORDS.map((kw) =>
                      renderChip(kw, selectedKeywords.has(kw), () => toggleKeyword(kw), 'small'),
                    )}
                  </View>
                </View>

                {/* ── Location ── */}
                <View style={styles.overlaySection}>
                  <ThemedText style={[styles.sectionLabel, { color: colors.textSecondary }]}>
                    LOCATION
                  </ThemedText>
                  <View
                    style={[
                      styles.overlayInput,
                      {
                        backgroundColor: colors.surface,
                        borderColor: colors.border,
                      },
                    ]}
                  >
                    <ThemedText style={[styles.inputIcon, { color: colors.icon }]}>📍</ThemedText>
                    <TextInput
                      ref={locationInputRef}
                      style={[styles.overlayTextInput, { color: colors.text }]}
                      placeholder="Suburb or postcode"
                      placeholderTextColor={colors.icon}
                      value={locationText}
                      onChangeText={setLocationText}
                      returnKeyType="done"
                    />
                  </View>
                </View>

                {/* ── Urgency ── */}
                <View style={styles.overlaySection}>
                  <ThemedText style={[styles.sectionLabel, { color: colors.textSecondary }]}>
                    URGENCY
                  </ThemedText>
                  <View style={styles.urgencyRow}>
                    {URGENCY_OPTIONS.map((option) => {
                      const isSelected = selectedUrgency === option;
                      return (
                        <Pressable
                          key={option}
                          style={({ pressed }) => [
                            styles.urgencyChip,
                            {
                              backgroundColor: isSelected ? colors.tint : colors.surface,
                              borderColor: isSelected ? colors.tint : colors.border,
                            },
                            pressed && { opacity: 0.7 },
                          ]}
                          onPress={() => setSelectedUrgency(option)}
                        >
                          <ThemedText
                            style={[
                              styles.urgencyChipText,
                              { color: isSelected ? '#fff' : colors.text },
                            ]}
                          >
                            {option}
                          </ThemedText>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
              </ScrollView>

              {/* ── Sticky search button ── */}
              <View
                style={[
                  styles.stickyButtonContainer,
                  {
                    backgroundColor: colors.background,
                    borderTopColor: colors.border,
                    paddingBottom: insets.bottom + Spacing.md,
                  },
                ]}
              >
                <Pressable
                  style={({ pressed }) => [
                    styles.searchButton,
                    { backgroundColor: colors.tint },
                    Shadows.md,
                    pressed && { opacity: 0.85 },
                  ]}
                  onPress={handleSearch}
                >
                  <ThemedText style={styles.searchButtonText}>Search Tradies</ThemedText>
                </Pressable>
              </View>
            </KeyboardAvoidingView>
          </Animated.View>
        </View>
      )}
    </SafeAreaView>
  );
}

/* ───────────────────────── Styles ───────────────────────── */

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: Spacing['2xl'],
    gap: Spacing.lg,
    paddingBottom: Spacing['5xl'],
  },

  /* Home header */
  headerSection: {
    alignItems: 'center',
    gap: Spacing.xs,
    marginBottom: Spacing.sm,
  },
  header: {
    fontSize: 28,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 15,
  },

  /* Tap-to-open search bar */
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: Radius.lg,
    height: 56,
    paddingHorizontal: Spacing.lg,
    gap: Spacing.sm,
  },
  searchBarIcon: {
    fontSize: 18,
  },
  searchBarPlaceholder: {
    fontSize: 16,
  },

  /* Featured section */
  sectionHeader: {
    marginTop: Spacing.lg,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
  },
  loader: {
    marginVertical: Spacing.xl,
  },
  emptyState: {
    borderWidth: 1,
    borderRadius: Radius.lg,
    padding: Spacing['3xl'],
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
  },
  featuredList: {
    gap: Spacing.md,
    paddingVertical: Spacing.xs,
  },
  featuredCard: {
    borderWidth: 1,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    width: 200,
    gap: Spacing.sm,
  },
  featuredTradeBadge: {
    alignSelf: 'flex-start',
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
  },
  featuredTradeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  featuredName: {
    fontSize: 16,
  },
  featuredLocation: {
    fontSize: 13,
  },

  /* Action row */
  actionRow: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginTop: Spacing.sm,
  },
  ghostButton: {
    flex: 1,
    borderWidth: 1,
    borderRadius: Radius.lg,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ghostButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },

  /* ─── Overlay ─── */
  overlayPanel: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  overlayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing['2xl'],
    paddingVertical: Spacing.lg,
    borderBottomWidth: 1,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: Radius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  overlayTitle: {
    fontSize: 20,
    fontWeight: '600',
  },
  overlayScroll: {
    flex: 1,
  },
  overlayContent: {
    paddingHorizontal: Spacing['2xl'],
    paddingTop: Spacing.xl,
    gap: Spacing['2xl'],
  },

  /* Overlay sections */
  overlaySection: {
    gap: Spacing.md,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  showMoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  showMoreArrow: {
    fontSize: 12,
    fontWeight: '600',
  },

  /* Trade chips (large) */
  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  tradeChip: {
    borderWidth: 1,
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    minWidth: 100,
    alignItems: 'center',
  },
  tradeChipText: {
    fontSize: 15,
    fontWeight: '600',
  },

  /* Keyword tags (small) */
  tagGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  keywordTag: {
    borderWidth: 1,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
  },
  keywordTagText: {
    fontSize: 13,
    fontWeight: '500',
  },

  /* Location input */
  overlayInput: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: Radius.md,
    height: 52,
    paddingHorizontal: Spacing.lg,
    gap: Spacing.sm,
  },
  inputIcon: {
    fontSize: 16,
  },
  overlayTextInput: {
    flex: 1,
    fontSize: 15,
    height: '100%',
  },

  /* Urgency chips */
  urgencyRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  urgencyChip: {
    flex: 1,
    borderWidth: 1,
    borderRadius: Radius.full,
    paddingVertical: Spacing.md,
    alignItems: 'center',
  },
  urgencyChipText: {
    fontSize: 14,
    fontWeight: '600',
  },

  /* Sticky bottom button */
  stickyButtonContainer: {
    paddingHorizontal: Spacing['2xl'],
    paddingTop: Spacing.md,
    borderTopWidth: 1,
  },
  searchButton: {
    borderRadius: Radius.lg,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchButtonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
  },
});
