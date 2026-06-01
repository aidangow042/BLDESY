import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  FlatList,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import Ionicons from '@expo/vector-icons/Ionicons';

import * as Haptics from 'expo-haptics';
import ReAnimated, { FadeInUp } from 'react-native-reanimated';

import { AppShell } from '@/components/layout';
import { useToast } from '@/components/ui';
import { Colors, Spacing, Radius, Shadows, Type } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { geocode, distanceKm } from '@/lib/geo';
import { supabase } from '@/lib/supabase';
import { friendlyError } from '@/lib/error-messages';
import { useUser } from '@/lib/auth-context';
import { getCached, setCache } from '@/lib/query-cache';
import { TRADE_ICONS, getTradeIcon, getCarouselImages } from '@/lib/trade-utils';
import {
  getSpecialisationsForTrade,
  getSpecialisationName,
  hasSpecialisations,
} from '@/lib/trade-specialisations';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const PAGE_SIZE = 10;
const CARD_WIDTH = SCREEN_WIDTH - Spacing.lg * 2;
const CAROUSEL_HEIGHT = 180;

// ─── Urgency mapping ─────────────────────────────────────────────────────────

const URGENCY_PRIORITY: Record<string, string[]> = {
  asap: ['emergency', 'soon', 'planned'],
  this_week: ['soon', 'emergency', 'planned'],
  flexible: ['planned', 'soon', 'emergency'],
};

function getUrgencyScore(capacity: string[] | null, priorityOrder: string[]): number {
  if (!capacity || capacity.length === 0) return 99;
  let best = 99;
  for (const cap of capacity) {
    const idx = priorityOrder.indexOf(cap.toLowerCase());
    if (idx !== -1 && idx < best) best = idx;
  }
  return best;
}

// ─── Types ───────────────────────────────────────────────────────────────────

type BuilderResult = {
  id: string;
  business_name: string;
  trade_category: string;
  suburb: string;
  postcode: string;
  bio: string | null;
  latitude: number | null;
  longitude: number | null;
  radius_km: number | null;
  urgency_capacity: string[] | null;
  availability: string | null;
  availability_note: string | null;
  response_time: string | null;
  profile_photo_url: string | null;
  cover_photo_url: string | null;
  projects: any[] | null;
  specialties: string[] | null;
  specialisations: Record<string, string[]> | null;
  abn: string | null;
  license_key: string | null;
  credentials: any[] | null;
  credentials_verified: any | null;
  _distance: number | null;
  _matchScore: number;
  _matchLabel: string;
};

type SortMode = 'best' | 'closest' | 'rated' | 'available';

// ─── 100-point match score algorithm ─────────────────────────────────────────
// Trade (30) + Keywords (25) + Availability (12) + Response Time (8) +
// Distance (15) + Credentials (10) = 100 points max

const RT_SCORES: Record<string, number> = {
  'Within 1 hour': 8, 'Within 4 hours': 6, 'Within 24 hours': 4,
  'Within 2 days': 2, 'Within a week': 1,
};

function computeMatchScore(
  builder: any,
  searchKeywords: string[],
  urgencyOrder: string[] | null,
  maxDistance: number,
  searchTrade?: string,
  urgency?: string,
  specTrade?: string,
  selectedSpecs?: string[],
): { score: number; label: string } {
  let total = 0;
  const DEFAULT_RADIUS_KM = 30;

  // 1. Trade match (30 pts)
  const searchedTrades = (searchTrade || builder.trade_category || '').toLowerCase().split(',').map((t: string) => t.trim());
  const primaryMatch = searchedTrades.includes(builder.trade_category?.toLowerCase());
  if (primaryMatch) total += 30;
  else total += 15; // partial match (already filtered by query)

  // 2. Keywords / Specialties (25 pts)
  if (searchKeywords.length > 0) {
    const searchable = [
      builder.business_name ?? '',
      builder.bio ?? '',
      ...(builder.specialties ?? []),
      ...(builder.projects ?? []).map((p: any) => `${p.title || ''} ${p.description || ''}`),
    ].join(' ').toLowerCase();

    const perKw = Math.round(25 / searchKeywords.length);
    let kwPoints = 0;
    for (const kw of searchKeywords) {
      if (searchable.includes(kw.toLowerCase())) kwPoints += perKw;
    }
    total += Math.min(kwPoints, 25);
  }

  // 2b. Specialisation overlap (soft boost, up to ~20 pts) — scaled by the
  // fraction of the searcher's selected sub-trades this builder tags for the
  // searched trade. Purely additive (like keywords above): never filters anyone
  // out, just lifts better-matched builders. Relies on the final 99 clamp.
  if (specTrade && selectedSpecs && selectedSpecs.length > 0) {
    const builderSpecs = builder.specialisations?.[specTrade] ?? [];
    if (builderSpecs.length > 0) {
      const builderSet = new Set<string>(builderSpecs);
      let matched = 0;
      for (const s of selectedSpecs) {
        if (builderSet.has(s)) matched += 1;
      }
      if (matched > 0) {
        total += Math.round(20 * (matched / selectedSpecs.length));
      }
    }
  }

  // 3. Availability (12 pts) — urgency-aware
  const urg = urgency || '';
  if (!urg || urg === 'any' || urg === 'flexible') {
    if (builder.availability === 'available') total += 12;
    else if (builder.availability === 'limited') total += 8;
    else total += 2;
  } else if (urg === 'asap') {
    if (builder.availability === 'available') total += 12;
    else if (builder.availability === 'limited') total += 4;
  } else if (urg === 'this_week') {
    if (builder.availability === 'available') total += 12;
    else if (builder.availability === 'limited') total += 8;
  }

  // 4. Response time (8 pts)
  total += RT_SCORES[builder.response_time ?? ''] ?? 0;

  // 5. Distance proximity (15 pts) — linear scale
  const bRadius = builder.radius_km ?? DEFAULT_RADIUS_KM;
  if (builder._distance != null && bRadius > 0) {
    const ratio = Math.max(0, 1 - builder._distance / bRadius);
    total += Math.round(15 * ratio);
  } else {
    total += 3; // fallback for text-matched builders
  }

  // 6. Credentials (10 pts)
  const cv = builder.credentials_verified;
  if (cv?.abn?.verified) total += 3;
  if (cv?.licences?.some((l: any) => l.verified)) total += 4;
  if (cv?.insurance?.verified) total += 3;
  // Fallback to old credentials system
  if (!cv) {
    if (builder.abn) total += 2;
    if (builder.license_key) total += 2;
    if (builder.credentials?.some((c: any) => c.type === 'insurance')) total += 2;
    if (builder.projects?.length > 0) total += 1;
  }

  const pct = Math.max(20, Math.min(99, total));
  let label = 'Partial match';
  if (pct >= 85) label = 'Strong match';
  else if (pct >= 65) label = 'Good match';

  return { score: pct, label };
}

// ─── Photo carousel ─────────────────────────────────────────────────────────

function PhotoCarousel({
  images,
  tradeCategory,
  isDark,
  onImagePress,
}: {
  images: string[];
  tradeCategory: string;
  isDark: boolean;
  onImagePress?: () => void;
}) {
  const [activeIndex, setActiveIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);

  const onViewableItemsChanged = useRef(({ viewableItems }: any) => {
    if (viewableItems.length > 0) {
      setActiveIndex(viewableItems[0].index ?? 0);
    }
  }).current;

  const viewabilityConfig = useRef({ viewAreaCoveragePercentThreshold: 50 }).current;

  if (images.length === 0) {
    return (
      <LinearGradient
        colors={isDark ? ['#134E4A', '#1e293b'] : ['#e6f7f5', '#e2e8f0']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.carouselPlaceholder}
      >
        <View style={styles.placeholderPattern}>
          {Array.from({ length: 24 }).map((_, i) => (
            <View
              key={i}
              style={[
                styles.patternDot,
                { backgroundColor: isDark ? 'rgba(45,212,191,0.08)' : 'rgba(13,148,136,0.06)' },
              ]}
            />
          ))}
        </View>
        <Text style={styles.placeholderIcon}>{getTradeIcon(tradeCategory)}</Text>
      </LinearGradient>
    );
  }

  const imageWidth = CARD_WIDTH - 2;

  return (
    <View>
      <FlatList
        ref={flatListRef}
        data={images.slice(0, 5)}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        keyExtractor={(_, i) => String(i)}
        snapToInterval={imageWidth}
        decelerationRate="fast"
        renderItem={({ item }) => (
          <Pressable
            onPress={onImagePress}
            // Pressable inside a horizontal FlatList — tap navigates, swipe
            // lets the FlatList own the pan gesture.
            style={{ width: imageWidth }}
          >
            <Image
              source={{ uri: item }}
              style={[styles.carouselImage, { width: imageWidth }]}
              cachePolicy="disk"
              placeholder={{ blurhash: 'LKO2?U%2Tw=w]~RBVZRi};RPxuwH' }}
            />
          </Pressable>
        )}
      />
      {images.length > 1 && (
        <View style={styles.dotRow}>
          {images.slice(0, 5).map((_, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                {
                  backgroundColor: i === activeIndex ? '#fff' : 'rgba(255,255,255,0.45)',
                  width: i === activeIndex ? 8 : 6,
                  height: i === activeIndex ? 8 : 6,
                },
              ]}
            />
          ))}
        </View>
      )}
    </View>
  );
}

// ─── Skeleton shimmer ────────────────────────────────────────────────────────

function SkeletonCard({ colors, delay = 0 }: { colors: any; delay?: number }) {
  const shimmer = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(shimmer, { toValue: 1, duration: 1000, useNativeDriver: true }),
        Animated.timing(shimmer, { toValue: 0, duration: 1000, useNativeDriver: true }),
      ]),
    );
    anim.start();
    return () => anim.stop();
  }, []);

  const opacity = shimmer.interpolate({ inputRange: [0, 1], outputRange: [0.3, 0.7] });

  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      {/* Carousel skeleton */}
      <Animated.View style={{ height: CAROUSEL_HEIGHT, backgroundColor: colors.border, opacity }} />
      {/* Top row skeleton */}
      <View style={{ flexDirection: 'row', padding: Spacing.lg, gap: Spacing.md }}>
        <Animated.View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: colors.border, opacity }} />
        <View style={{ flex: 1, gap: 8 }}>
          <Animated.View style={{ height: 14, width: '70%', borderRadius: 7, backgroundColor: colors.border, opacity }} />
          <Animated.View style={{ height: 12, width: '50%', borderRadius: 6, backgroundColor: colors.border, opacity }} />
          <Animated.View style={{ height: 12, width: '40%', borderRadius: 6, backgroundColor: colors.border, opacity }} />
        </View>
        <Animated.View style={{ width: 48, height: 48, borderRadius: 12, backgroundColor: colors.border, opacity }} />
      </View>
      {/* Stats row skeleton */}
      <View style={{ flexDirection: 'row', paddingHorizontal: Spacing.lg, gap: Spacing.sm, paddingBottom: Spacing.md }}>
        <Animated.View style={{ flex: 1, height: 44, borderRadius: Radius.md, backgroundColor: colors.border, opacity }} />
        <Animated.View style={{ flex: 1, height: 44, borderRadius: Radius.md, backgroundColor: colors.border, opacity }} />
        <Animated.View style={{ flex: 1, height: 44, borderRadius: Radius.md, backgroundColor: colors.border, opacity }} />
      </View>
      {/* Bio skeleton */}
      <View style={{ paddingHorizontal: Spacing.lg, paddingBottom: Spacing.lg, gap: 6 }}>
        <Animated.View style={{ height: 11, width: '100%', borderRadius: 5, backgroundColor: colors.border, opacity }} />
        <Animated.View style={{ height: 11, width: '85%', borderRadius: 5, backgroundColor: colors.border, opacity }} />
      </View>
    </View>
  );
}

// ─── Animated card wrapper ───────────────────────────────────────────────────

function AnimatedCard({ children, index }: { children: React.ReactNode; index: number }) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(16)).current;

  useEffect(() => {
    const delay = Math.min(index * 50, 250);
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 300, delay, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 300, delay, useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
      {children}
    </Animated.View>
  );
}

// ─── Filter sheet ────────────────────────────────────────────────────────────

function FilterSheet({
  visible,
  onClose,
  onApply,
  filters,
  colors,
  specTrade,
}: {
  visible: boolean;
  onClose: () => void;
  onApply: (f: FilterState) => void;
  filters: FilterState;
  colors: any;
  specTrade: string | null;
}) {
  const [local, setLocal] = useState(filters);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    setLocal(filters);
  }, [visible]);

  const DISTANCE_OPTIONS = [5, 10, 25, 50, 100];
  const AVAILABILITY_OPTIONS = ['Any', 'Available now', 'This week', 'This month'];
  const specOptions = specTrade ? getSpecialisationsForTrade(specTrade) : [];

  function toggleSpec(slug: string) {
    setLocal((p) => ({
      ...p,
      specialisations: p.specialisations.includes(slug)
        ? p.specialisations.filter((s) => s !== slug)
        : [...p.specialisations, slug],
    }));
  }

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <Pressable style={styles.filterOverlayBg} onPress={onClose} />
      <View
        style={[
          styles.filterSheet,
          {
            backgroundColor: colors.background,
            paddingBottom: insets.bottom + 16,
          },
        ]}
      >
        <View style={[styles.filterHandle, { backgroundColor: colors.border }]} />

        <Text style={[styles.filterTitle, { color: colors.text }]}>Filter Results</Text>

        {/* Distance */}
        <Text style={[styles.filterLabel, { color: colors.textSecondary }]}>Max distance</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {DISTANCE_OPTIONS.map((d) => (
              <Pressable
                key={d}
                onPress={() => setLocal((p) => ({ ...p, maxDistance: d }))}
                style={[
                  styles.filterChip,
                  {
                    backgroundColor: local.maxDistance === d ? colors.teal : colors.surface,
                    borderColor: local.maxDistance === d ? colors.teal : colors.border,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    { color: local.maxDistance === d ? '#fff' : colors.text },
                  ]}
                >
                  {d} km
                </Text>
              </Pressable>
            ))}
          </View>
        </ScrollView>

        {/* Availability */}
        <Text style={[styles.filterLabel, { color: colors.textSecondary }]}>Availability</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {AVAILABILITY_OPTIONS.map((opt) => (
              <Pressable
                key={opt}
                onPress={() => setLocal((p) => ({ ...p, availabilityFilter: opt }))}
                style={[
                  styles.filterChip,
                  {
                    backgroundColor: local.availabilityFilter === opt ? colors.teal : colors.surface,
                    borderColor: local.availabilityFilter === opt ? colors.teal : colors.border,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    { color: local.availabilityFilter === opt ? '#fff' : colors.text },
                  ]}
                >
                  {opt}
                </Text>
              </Pressable>
            ))}
          </View>
        </ScrollView>

        {/* Specialisations (sub-trades) — only when the searched trade has them */}
        {specOptions.length > 0 && (
          <>
            <Text style={[styles.filterLabel, { color: colors.textSecondary }]}>Specialisations</Text>
            <View style={[styles.specFilterWrap, { marginBottom: 16 }]}>
              {specOptions.map((spec) => {
                const selected = local.specialisations.includes(spec.slug);
                return (
                  <Pressable
                    key={spec.slug}
                    onPress={() => toggleSpec(spec.slug)}
                    style={[
                      styles.filterChip,
                      {
                        backgroundColor: selected ? colors.teal : colors.surface,
                        borderColor: selected ? colors.teal : colors.border,
                      },
                    ]}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: selected }}
                    accessibilityLabel={spec.name}
                  >
                    <Text style={[styles.filterChipText, { color: selected ? '#fff' : colors.text }]}>
                      {spec.name}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </>
        )}

        {/* Verified only */}
        <Text style={[styles.filterLabel, { color: colors.textSecondary }]}>Verification</Text>
        <Pressable
          onPress={() => setLocal((p) => ({ ...p, verifiedOnly: !p.verifiedOnly }))}
          style={[
            styles.filterChip,
            {
              backgroundColor: local.verifiedOnly ? colors.teal : colors.surface,
              borderColor: local.verifiedOnly ? colors.teal : colors.border,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 6,
              marginBottom: 16,
              alignSelf: 'flex-start',
            },
          ]}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: local.verifiedOnly }}
          accessibilityLabel="Verified tradies only"
        >
          <MaterialIcons
            name={local.verifiedOnly ? 'check-circle' : 'radio-button-unchecked'}
            size={16}
            color={local.verifiedOnly ? '#fff' : colors.textSecondary}
          />
          <Text style={[styles.filterChipText, { color: local.verifiedOnly ? '#fff' : colors.text }]}>
            Licensed, insured, or ABN verified
          </Text>
        </Pressable>

        {/* Buttons */}
        <View style={{ flexDirection: 'row', gap: 12, marginTop: 20 }}>
          <Pressable
            onPress={() => {
              setLocal({ maxDistance: 0, availabilityFilter: 'Any', verifiedOnly: false, specialisations: [] });
            }}
            style={[styles.filterResetBtn, { borderColor: colors.border }]}
          >
            <Text style={[styles.filterResetText, { color: colors.textSecondary }]}>Reset</Text>
          </Pressable>
          <Pressable
            onPress={() => {
              onApply(local);
              onClose();
            }}
            style={[styles.filterApplyBtn, { backgroundColor: colors.teal }]}
          >
            <Text style={styles.filterApplyText}>Apply Filters</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

type FilterState = {
  maxDistance: number;
  availabilityFilter: string;
  verifiedOnly: boolean;
  specialisations: string[];
};

// ─── Main Component ──────────────────────────────────────────────────────────

export default function ResultsScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const colors = Colors[isDark ? 'dark' : 'light'];
  const teal = colors.teal;
  const router = useRouter();
  const toast = useToast();
  const { userId } = useUser();
  const params = useLocalSearchParams<{
    suburb?: string;
    postcode?: string;
    trade_category?: string;
    urgency?: string;
    keywords?: string;
  }>();

  const [allBuilders, setAllBuilders] = useState<BuilderResult[]>([]);
  const [displayedBuilders, setDisplayedBuilders] = useState<BuilderResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sortMode, setSortMode] = useState<SortMode>('best');
  const [page, setPage] = useState(1);
  const [filterVisible, setFilterVisible] = useState(false);
  const [filters, setFilters] = useState<FilterState>({
    maxDistance: 0,
    availabilityFilter: 'Any',
    verifiedOnly: false,
    specialisations: [],
  });
  const [savedBuilders, setSavedBuilders] = useState<Set<string>>(new Set());

  const searchKeywords = (params.keywords ?? '').split(',').filter(Boolean);
  const tradeName = params.trade_category
    ? params.trade_category.split(',').map((t) => t.trim().charAt(0).toUpperCase() + t.trim().slice(1)).join(', ')
    : 'All Trades';
  const locationName = params.suburb ?? 'Nearby';

  // First searched trade (slug), used to scope sub-trade specialisation filtering
  // + match boosting. null when "all"/empty or the trade has no sub-trades.
  const rawFirstTrade = (params.trade_category ?? '')
    .split(',')[0]
    ?.trim()
    .toLowerCase();
  const specTrade =
    rawFirstTrade && rawFirstTrade !== 'all' && hasSpecialisations(rawFirstTrade)
      ? rawFirstTrade
      : null;

  // ─── Fetch builders ──────────────────────────────────────────────────

  useEffect(() => {
    Promise.all([fetchBuilders(), fetchSavedBuilders()]);
  }, [params.suburb, params.trade_category, params.urgency, params.keywords]);

  async function fetchSavedBuilders() {
    if (!userId) return;
    const { data } = await supabase
      .from('saved_builders')
      .select('builder_id')
      .eq('user_id', userId);
    if (data) {
      setSavedBuilders(new Set(data.map((d: any) => d.builder_id)));
    }
  }

  async function fetchBuilders() {
    // Check cache first
    const cacheKey = `search:${params.trade_category}:${params.suburb}:${params.urgency}:${params.keywords}`;
    const cached = getCached<any[]>(cacheKey);
    if (cached) {
      setAllBuilders(cached);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    let searchLat: number | null = null;
    let searchLon: number | null = null;
    if (params.suburb) {
      const geo = await geocode(params.suburb);
      if (geo) {
        searchLat = geo.latitude;
        searchLon = geo.longitude;
      }
    }

    let query = supabase
      .from('builder_profiles')
      .select(
        'id, business_name, trade_category, suburb, postcode, latitude, longitude, radius_km, availability, availability_note, response_time, profile_photo_url, cover_photo_url, projects, specialties, specialisations, abn, license_key, credentials_verified',
      )
      .eq('approved', true);

    if (params.trade_category && params.trade_category !== 'all') {
      const trades = params.trade_category.split(',').map((t) => t.trim());
      if (trades.length === 1) {
        query = query.ilike('trade_category', trades[0]);
      } else {
        query = query.or(trades.map((t) => `trade_category.ilike.${t}`).join(','));
      }
    }

    const { data, error: fetchError } = await query;

    if (fetchError) {
      setError(friendlyError(fetchError));
      setLoading(false);
      return;
    }

    let results: BuilderResult[] = (data ?? []).map((b: any) => ({
      ...b,
      _distance: null as number | null,
      _matchScore: 0,
      _matchLabel: '',
    }));

    if (searchLat != null && searchLon != null) {
      results = results.map((b) => {
        if (b.latitude != null && b.longitude != null) {
          const dist = distanceKm(searchLat!, searchLon!, b.latitude, b.longitude);
          return { ...b, _distance: Math.round(dist * 10) / 10 };
        }
        return b;
      });
    }

    if (params.suburb) {
      const term = params.suburb.toLowerCase();
      if (searchLat != null && searchLon != null) {
        results = results.filter((b) => {
          if (b._distance != null) {
            return b._distance <= (b.radius_km ?? 25);
          }
          return b.suburb.toLowerCase().includes(term) || b.postcode.includes(term);
        });
      } else {
        results = results.filter(
          (b) => b.suburb.toLowerCase().includes(term) || b.postcode.includes(term),
        );
      }
    }

    const urgencyOrder = params.urgency ? URGENCY_PRIORITY[params.urgency] : null;
    const maxDist = Math.max(...results.map((b) => b._distance ?? 0), 1);
    results = results.map((b) => {
      const { score, label } = computeMatchScore(b, searchKeywords, urgencyOrder, maxDist, params.trade_category, params.urgency);
      return { ...b, _matchScore: score, _matchLabel: label };
    });

    results.sort((a, b) => b._matchScore - a._matchScore);

    setAllBuilders(results);
    setCache(cacheKey, results); // Cache for 5 minutes
    setDisplayedBuilders(results.slice(0, PAGE_SIZE));
    setPage(1);
    setLoading(false);
  }

  // ─── Sort + filter ─────────────────────────────────────────────────

  const getFilteredSorted = useCallback(
    (builders: BuilderResult[], sort: SortMode, f: FilterState) => {
      let filtered = [...builders];

      if (f.maxDistance > 0) {
        filtered = filtered.filter((b) => b._distance != null && b._distance <= f.maxDistance);
      }
      if (f.availabilityFilter === 'Available now') {
        filtered = filtered.filter((b) => b.availability === 'available');
      } else if (f.availabilityFilter === 'This week') {
        filtered = filtered.filter((b) => b.availability === 'available' || b.availability === 'limited');
      }
      if (f.verifiedOnly) {
        filtered = filtered.filter(
          (b) => b.license_key || b.abn || b.credentials?.some((c: any) => c.type === 'insurance'),
        );
      }

      // Specialisation soft boost (NOT a filter): re-score via computeMatchScore
      // with the searcher's selected sub-trades so the boost stays the single
      // source of truth in the algorithm. Recomputed from cached base inputs, so
      // it's idempotent across repeated calls (loadMore etc). Builders that don't
      // overlap keep their base score — never removed.
      if (specTrade && f.specialisations.length > 0) {
        const urgencyOrder = params.urgency ? URGENCY_PRIORITY[params.urgency] : null;
        filtered = filtered.map((b) => {
          const { score, label } = computeMatchScore(
            b,
            searchKeywords,
            urgencyOrder,
            0,
            params.trade_category,
            params.urgency,
            specTrade,
            f.specialisations,
          );
          return { ...b, _matchScore: score, _matchLabel: label };
        });
      }

      switch (sort) {
        case 'best':
          filtered.sort((a, b) => b._matchScore - a._matchScore);
          break;
        case 'closest':
          filtered.sort((a, b) => (a._distance ?? 9999) - (b._distance ?? 9999));
          break;
        case 'rated':
          filtered.sort((a, b) => b._matchScore - a._matchScore);
          break;
        case 'available':
          filtered.sort((a, b) => {
            const av: Record<string, number> = { available: 0, limited: 1, unavailable: 2 };
            return (av[a.availability ?? 'unavailable'] ?? 3) - (av[b.availability ?? 'unavailable'] ?? 3);
          });
          break;
      }

      return filtered;
    },
    // searchKeywords is derived from params.keywords; listing the primitive keeps
    // the closure honest without a fresh-array identity churning the callback.
    [specTrade, params.keywords, params.urgency, params.trade_category],
  );

  useEffect(() => {
    const sorted = getFilteredSorted(allBuilders, sortMode, filters);
    setDisplayedBuilders(sorted.slice(0, PAGE_SIZE));
    setPage(1);
  }, [sortMode, filters, allBuilders]);

  function loadMore() {
    const sorted = getFilteredSorted(allBuilders, sortMode, filters);
    if (displayedBuilders.length >= sorted.length) return;
    setLoadingMore(true);
    const nextPage = page + 1;
    setTimeout(() => {
      setDisplayedBuilders(sorted.slice(0, nextPage * PAGE_SIZE));
      setPage(nextPage);
      setLoadingMore(false);
    }, 300);
  }

  async function handleRefresh() {
    setRefreshing(true);
    await fetchBuilders();
    setRefreshing(false);
  }

  const totalFiltered = getFilteredSorted(allBuilders, sortMode, filters).length;

  // ─── Save/unsave ──────────────────────────────────────────────────

  async function toggleSave(builderId: string) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (!userId) {
      toast.show('Sign in to save tradies', { variant: 'warning' });
      return;
    }

    const newSet = new Set(savedBuilders);
    if (newSet.has(builderId)) {
      newSet.delete(builderId);
      setSavedBuilders(newSet);
      await supabase
        .from('saved_builders')
        .delete()
        .eq('user_id', userId)
        .eq('builder_id', builderId);
    } else {
      newSet.add(builderId);
      setSavedBuilders(newSet);
      await supabase.from('saved_builders').insert({
        user_id: userId,
        builder_id: builderId,
      });
    }
  }

  // ─── Helpers ───────────────────────────────────────────────────────

  function getVerificationCount(builder: BuilderResult): number {
    let count = 0;
    if (builder.license_key) count++;
    if (builder.abn) count++;
    if (builder.credentials?.some((c: any) => c.type === 'insurance')) count++;
    return count;
  }

  function getAvailabilityInfo(builder: BuilderResult): { text: string; color: string; icon: string } {
    if (builder.availability === 'available') {
      return { text: 'Available', color: colors.success, icon: 'check-circle' };
    }
    if (builder.availability === 'limited') {
      return { text: 'Limited', color: colors.warning, icon: 'schedule' };
    }
    return { text: 'Unavailable', color: colors.error, icon: 'cancel' };
  }

  function getMatchColor(score: number) {
    if (score >= 88) return { bg: teal, text: '#fff', pillBg: teal };
    if (score >= 75) return { bg: '#F59E0B', text: '#fff', pillBg: '#F59E0B' };
    return { bg: colors.textSecondary, text: '#fff', pillBg: 'rgba(0,0,0,0.5)' };
  }

  // ─── Bookmark button ──────────────────────────────────────────────

  function BookmarkButton({ builderId }: { builderId: string }) {
    const scale = useRef(new Animated.Value(1)).current;
    const isSaved = savedBuilders.has(builderId);

    function handlePress() {
      Animated.sequence([
        Animated.timing(scale, { toValue: 1.4, duration: 100, useNativeDriver: true }),
        Animated.timing(scale, { toValue: 0.85, duration: 80, useNativeDriver: true }),
        Animated.timing(scale, { toValue: 1, duration: 100, useNativeDriver: true }),
      ]).start();
      toggleSave(builderId);
    }

    return (
      <Pressable onPress={handlePress} hitSlop={8} style={styles.bookmarkBtn}>
        <Animated.View style={{ transform: [{ scale }] }}>
          <MaterialIcons
            name={isSaved ? 'bookmark' : 'bookmark-border'}
            size={22}
            color={isSaved ? teal : '#fff'}
          />
        </Animated.View>
      </Pressable>
    );
  }

  // ─── Builder card ─────────────────────────────────────────────────

  function renderCard({ item, index }: { item: BuilderResult; index: number }) {
    const availInfo = getAvailabilityInfo(item);
    const matchColor = getMatchColor(item._matchScore);
    const verifyCount = getVerificationCount(item);
    const tradeLabel = item.trade_category.charAt(0).toUpperCase() + item.trade_category.slice(1);
    const avatarUri =
      item.profile_photo_url ??
      `https://ui-avatars.com/api/?name=${encodeURIComponent(item.business_name)}&background=0d9488&color=fff&size=120`;

    // Specialisation chips: prefer the builder's tagged sub-trades for the
    // searched trade (resolved to display names), else fall back to the legacy
    // free-text `specialties` so nothing regresses for builders without them.
    const builderSpecSlugs =
      specTrade ? item.specialisations?.[specTrade] ?? [] : [];
    let specLabels: string[];
    if (builderSpecSlugs.length > 0) {
      specLabels = builderSpecSlugs
        .map((slug) => getSpecialisationName(specTrade!, slug))
        .filter((name): name is string => name != null);
    } else {
      specLabels = (item.specialties ?? []).map(
        (s) => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase(),
      );
    }
    const topSpecs = specLabels.slice(0, 3);
    const specMoreCount = Math.max(0, specLabels.length - 3);
    const images = getCarouselImages(item);

    const goToProfile = () =>
      router.push({ pathname: '/builder-profile', params: { id: item.id } });

    return (
      <AnimatedCard index={index}>
        <View
          style={[
            styles.card,
            Shadows.md,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
        >
          {/* ─── Photo carousel ─── */}
          <View style={styles.carouselWrapper}>
            <PhotoCarousel
              images={images}
              tradeCategory={item.trade_category}
              isDark={isDark}
              onImagePress={goToProfile}
            />

            {/* Bottom gradient overlay */}
            <LinearGradient
              colors={['transparent', 'rgba(0,0,0,0.3)']}
              style={styles.carouselGradient}
              pointerEvents="none"
            />

            {/* Match score pill — top left */}
            <View style={[styles.matchPill, { backgroundColor: matchColor.pillBg }]}>
              <Text style={styles.matchPillText}>{item._matchScore}% match</Text>
            </View>

            {/* Bookmark button — frosted glass */}
            <BookmarkButton builderId={item.id} />

            {/* Photo count badge */}
            {images.length > 0 && (
              <View style={styles.imageCountPill}>
                <MaterialIcons name="photo-library" size={12} color="#fff" />
                <Text style={styles.imageCountText}>{images.length}</Text>
              </View>
            )}
          </View>

          {/* Everything below the carousel is one tap target. Nested Pressables
              in the action row still capture their own taps. */}
          <Pressable
            onPress={goToProfile}
            style={({ pressed }) => (pressed ? { opacity: 0.95 } : null)}
          >
          {/* ─── Profile info section ─── */}
          <View style={styles.profileSection}>
            {/* Avatar */}
            <View style={styles.avatarRing}>
              <Image source={{ uri: avatarUri }} style={styles.avatar} cachePolicy="disk" placeholder={{ blurhash: 'L6PZfSi_.AyE_3t7t7R**0o#DgR4' }} />
            </View>

            {/* Name + trade + verified + location */}
            <View style={styles.infoCol}>
              <Text style={[styles.businessName, { color: colors.text }]} numberOfLines={1}>
                {item.business_name}
              </Text>
              <View style={styles.tradeRow}>
                <View style={[styles.tradePill, { backgroundColor: colors.tealBg }]}>
                  <Text style={[styles.tradePillText, { color: teal }]}>{tradeLabel}</Text>
                </View>
                {verifyCount > 0 && (
                  <View style={[styles.verifiedPill, { backgroundColor: isDark ? '#064e3b' : '#ecfdf5' }]}>
                    <MaterialIcons name="verified" size={11} color={colors.success} />
                    <Text style={[styles.verifiedText, { color: colors.success }]}>
                      {verifyCount === 1 ? 'Verified' : `${verifyCount}x Verified`}
                    </Text>
                  </View>
                )}
                <View style={styles.locationRow}>
                  <MaterialIcons name="location-on" size={12} color={colors.textSecondary} />
                  <Text style={[styles.locationText, { color: colors.textSecondary }]} numberOfLines={1}>
                    {item.suburb}, {item.postcode}
                    {item._distance != null ? ` · ${item._distance} km` : ''}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* ─── Quick stats row ─── */}
          <View style={[styles.statsRow, { borderTopColor: colors.border }]}>
            <View style={styles.statItem}>
              <View style={[styles.availDot, { backgroundColor: availInfo.color }]} />
              <Text style={[styles.statText, { color: colors.text }]}>{availInfo.text}</Text>
            </View>
            <View style={[styles.statDot, { backgroundColor: colors.textSecondary }]} />
            <View style={styles.statItem}>
              <MaterialIcons name="schedule" size={13} color={colors.textSecondary} />
              <Text style={[styles.statText, { color: colors.text }]}>
                {item.response_time ?? 'N/A'}
              </Text>
            </View>
            <View style={[styles.statDot, { backgroundColor: colors.textSecondary }]} />
            <View style={styles.statItem}>
              <MaterialIcons name="star" size={13} color="#FBBF24" />
              <Text style={[styles.statText, { color: colors.text }]}>
                {(item.specialties ?? []).length} specialties
              </Text>
            </View>
          </View>

          {/* ─── Bio + specialties ─── */}
          <View style={styles.cardBottom}>
            {item.bio && (
              <Text style={[styles.bio, { color: colors.textSecondary }]} numberOfLines={2}>
                {item.bio}
              </Text>
            )}

            {topSpecs.length > 0 && (
              <View style={styles.specRow}>
                {topSpecs.map((spec) => (
                  <View key={spec} style={[styles.specChip, { borderColor: colors.border }]}>
                    <Text style={[styles.specChipText, { color: colors.textSecondary }]}>{spec}</Text>
                  </View>
                ))}
                {specMoreCount > 0 && (
                  <Text style={[styles.specMore, { color: colors.textSecondary }]}>
                    +{specMoreCount} more
                  </Text>
                )}
              </View>
            )}

            {/* ─── Action row ─── */}
            <View style={styles.actionRow}>
              <Pressable
                style={({ pressed }) => [
                  styles.btnPrimary,
                  { backgroundColor: teal },
                  pressed && { opacity: 0.85 },
                ]}
                onPress={goToProfile}
              >
                <MaterialIcons name="person" size={16} color="#fff" />
                <Text style={styles.btnPrimaryText}>View Profile</Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [
                  styles.btnOutline,
                  { borderColor: colors.border },
                  pressed && { opacity: 0.7 },
                ]}
                onPress={goToProfile}
              >
                <MaterialIcons name="chat-bubble-outline" size={15} color={teal} />
                <Text style={[styles.btnOutlineText, { color: teal }]}>Request Quote</Text>
              </Pressable>
            </View>
          </View>
          </Pressable>
        </View>
      </AnimatedCard>
    );
  }

  // ─── Sort options ──────────────────────────────────────────────────

  const SORT_OPTIONS: { key: SortMode; label: string; icon: string }[] = [
    { key: 'best', label: 'Best match', icon: 'auto-awesome' },
    { key: 'closest', label: 'Closest', icon: 'near-me' },
    { key: 'rated', label: 'Top rated', icon: 'star-outline' },
    { key: 'available', label: 'Available', icon: 'event-available' },
  ];

  const activeFilterCount = [
    filters.maxDistance > 0,
    filters.availabilityFilter !== 'Any',
    filters.verifiedOnly,
    filters.specialisations.length > 0,
  ].filter(Boolean).length;

  // ─── Render ───────────────────────────────────────────────────────

  return (
    <AppShell title={tradeName} showBack>
      <View style={{ flex: 1, backgroundColor: colors.canvas }}>
        {/* Meta strip — location + result count */}
        <View style={[styles.metaStrip, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
          <MaterialIcons name="location-on" size={13} color={colors.textSecondary} />
          <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
            {locationName}
          </Text>
          <View style={[styles.headerDot, { backgroundColor: colors.textSecondary }]} />
          <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
            {loading ? '...' : `${totalFiltered} result${totalFiltered !== 1 ? 's' : ''}`}
          </Text>
        </View>

        {/* ─── Sort bar ─── */}
        <View style={[styles.sortBar, { backgroundColor: colors.background, borderBottomColor: colors.border }]}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.sortScroll}>
            {SORT_OPTIONS.map((opt) => {
              const active = sortMode === opt.key;
              return (
                <Pressable
                  key={opt.key}
                  onPress={() => setSortMode(opt.key)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  accessibilityLabel={`Sort by ${opt.label}`}
                  style={[
                    styles.sortPill,
                    active
                      ? { backgroundColor: teal, borderColor: teal, borderWidth: 1.5 }
                      : { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1 },
                  ]}
                >
                  <MaterialIcons
                    name={opt.icon as any}
                    size={14}
                    color={active ? '#fff' : colors.icon}
                  />
                  <Text
                    style={[
                      styles.sortPillText,
                      { color: active ? '#fff' : colors.textSecondary, fontWeight: active ? '700' : '500' },
                    ]}
                  >
                    {opt.label}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
          <Pressable
            onPress={() => setFilterVisible(true)}
            style={[
              styles.filterBtn,
              {
                backgroundColor: activeFilterCount > 0 ? colors.tealBg : colors.surface,
                borderColor: activeFilterCount > 0 ? teal : colors.border,
              },
            ]}
          >
            <MaterialIcons name="tune" size={18} color={activeFilterCount > 0 ? teal : colors.icon} />
            {activeFilterCount > 0 && (
              <View style={[styles.filterBadge, { backgroundColor: teal }]}>
                <Text style={styles.filterBadgeText}>{activeFilterCount}</Text>
              </View>
            )}
          </Pressable>
        </View>

      {/* ─── Content ─── */}
      <ReAnimated.View entering={FadeInUp.duration(300).delay(100)} style={{ flex: 1 }}>
      {loading ? (
        <ScrollView contentContainerStyle={styles.listContent} showsVerticalScrollIndicator={false}>
          {[0, 1, 2].map((i) => (
            <SkeletonCard key={i} colors={colors} delay={i * 150} />
          ))}
        </ScrollView>
      ) : error ? (
        <View style={styles.centeredState}>
          <View style={[styles.stateIconWrap, { backgroundColor: colors.errorLight }]}>
            <MaterialIcons name="error-outline" size={36} color={colors.error} />
          </View>
          <Text style={[styles.stateTitle, { color: colors.text }]}>Something went wrong</Text>
          <Text style={[styles.stateSubtext, { color: colors.textSecondary }]}>{error}</Text>
          <Pressable
            onPress={fetchBuilders}
            style={[styles.stateCta, { backgroundColor: teal }]}
          >
            <MaterialIcons name="refresh" size={18} color="#fff" />
            <Text style={styles.stateCtaText}>Try Again</Text>
          </Pressable>
        </View>
      ) : displayedBuilders.length === 0 ? (
        <View style={styles.centeredState}>
          <View style={[styles.stateIconCircle, { backgroundColor: colors.tealBg }]}>
            <MaterialIcons name="search-off" size={48} color={teal} />
          </View>
          <Text style={[styles.stateTitle, { color: colors.text }]}>No matches found</Text>
          <Text style={[styles.stateSubtext, { color: colors.textSecondary }]}>
            Try broadening your search — adjust the trade, location, or filters.
          </Text>
          <Pressable
            onPress={() => router.back()}
            style={({ pressed }) => [
              styles.stateOutlineCta,
              { borderColor: teal },
              pressed && { opacity: 0.7 },
            ]}
            accessibilityRole="button"
            accessibilityLabel="Modify Search"
          >
            <Text style={[styles.stateOutlineCtaText, { color: teal }]}>Modify Search</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={displayedBuilders}
          keyExtractor={(item) => item.id}
          renderItem={renderCard}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          onEndReached={loadMore}
          onEndReachedThreshold={0.4}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={teal} />
          }
          ListHeaderComponent={
            displayedBuilders.length < totalFiltered ? (
              <View style={styles.resultCountRow}>
                <MaterialIcons name="format-list-numbered" size={14} color={colors.textSecondary} />
                <Text style={[styles.resultCounter, { color: colors.textSecondary }]}>
                  Showing {displayedBuilders.length} of {totalFiltered} results
                </Text>
              </View>
            ) : null
          }
          ListFooterComponent={
            loadingMore ? (
              <ActivityIndicator color={teal} style={{ paddingVertical: 20 }} />
            ) : displayedBuilders.length >= totalFiltered && totalFiltered > 0 ? (
              <View style={styles.endRow}>
                <View style={[styles.endLine, { backgroundColor: colors.border }]} />
                <Text style={[styles.endText, { color: colors.textSecondary }]}>
                  All {totalFiltered} results shown
                </Text>
                <View style={[styles.endLine, { backgroundColor: colors.border }]} />
              </View>
            ) : null
          }
        />
      )}
      </ReAnimated.View>

      <FilterSheet
        visible={filterVisible}
        onClose={() => setFilterVisible(false)}
        onApply={setFilters}
        filters={filters}
        colors={colors}
        specTrade={specTrade}
      />
      </View>
    </AppShell>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },

  // ─── Header ────────────────────────────────────
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    gap: Spacing.md,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    flex: 1,
  },
  headerTitle: {
    ...Type.h1,
  },
  headerMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  metaStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerSubtitle: {
    ...Type.caption,
  },
  headerDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    marginHorizontal: 4,
  },

  // ─── Sort bar ──────────────────────────────────
  sortBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    paddingLeft: Spacing.lg,
    paddingRight: Spacing.md,
    borderBottomWidth: 1,
    gap: 10,
  },
  sortScroll: {
    gap: 8,
    paddingRight: 8,
  },
  sortPill: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 0,
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: Radius.full,
  },
  sortPillText: {
    ...Type.captionSemiBold,
  },
  filterBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  filterBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterBadgeText: {
    ...Type.micro,
    color: '#fff',
  },

  // ─── List ──────────────────────────────────────
  listContent: {
    padding: Spacing.lg,
    gap: Spacing.lg,
    paddingBottom: 40,
  },
  resultCountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingBottom: 4,
  },
  resultCounter: {
    ...Type.caption,
  },
  endRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: 20,
  },
  endLine: {
    flex: 1,
    height: 1,
  },
  endText: {
    ...Type.caption,
  },

  // ─── Carousel ────────────────────────────────────
  carouselWrapper: {
    height: CAROUSEL_HEIGHT,
    position: 'relative',
    overflow: 'hidden',
  },
  carouselImage: {
    height: CAROUSEL_HEIGHT,
    resizeMode: 'cover',
  },
  carouselPlaceholder: {
    width: '100%',
    height: CAROUSEL_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  placeholderPattern: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignContent: 'center',
    gap: 22,
    opacity: 0.8,
  },
  patternDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  placeholderIcon: {
    fontSize: 48,
  },
  carouselGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 60,
  },
  dotRow: {
    position: 'absolute',
    bottom: 10,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  dot: {
    borderRadius: 4,
  },
  imageCountPill: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.full,
  },
  imageCountText: {
    ...Type.label,
    color: '#fff',
  },

  // ─── Card ──────────────────────────────────────
  card: {
    borderRadius: Radius.xl,
    borderWidth: 1,
    overflow: 'hidden',
  },
  // ─── Match pill ──────────────────────────────────
  matchPill: {
    position: 'absolute',
    top: 10,
    left: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radius.full,
    zIndex: 2,
  },
  matchPillText: {
    ...Type.label,
    color: '#fff',
  },

  // ─── Profile info ───────────────────────────────
  profileSection: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 2,
    gap: Spacing.sm + 2,
  },
  avatarRing: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2.5,
    borderColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 1.5,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
      },
      default: { elevation: 2 },
    }),
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
  },
  infoCol: {
    flex: 1,
    gap: 2,
  },
  businessName: {
    ...Type.h3,
  },
  tradeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    flexWrap: 'wrap',
  },
  tradePill: {
    paddingHorizontal: 7,
    paddingVertical: 1.5,
    borderRadius: Radius.full,
  },
  tradePillText: {
    ...Type.label,
  },
  verifiedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: Radius.full,
  },
  verifiedText: {
    ...Type.micro,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  locationText: {
    ...Type.caption,
  },

  // ─── Stats row ─────────────────────────────────
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    paddingVertical: Spacing.sm,
    marginHorizontal: Spacing.lg,
    gap: 10,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    ...Type.label,
  },
  availDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  statDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    opacity: 0.4,
  },

  // ─── Card bottom ───────────────────────────────
  cardBottom: {
    padding: Spacing.lg,
    gap: Spacing.sm,
  },
  bio: {
    ...Type.caption,
  },
  specRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 6,
  },
  specChip: {
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: Radius.full,
    borderWidth: 1,
  },
  specChipText: {
    ...Type.label,
  },
  specMore: {
    ...Type.label,
  },

  // ─── Action row ────────────────────────────────
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginTop: 4,
  },
  bookmarkBtn: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.8)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 3,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.12,
        shadowRadius: 4,
      },
      default: { elevation: 4 },
    }),
  },
  btnPrimary: {
    flex: 1.4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 44,
    borderRadius: Radius.md,
  },
  btnPrimaryText: {
    ...Type.btnSecondary,
    color: '#fff',
  },
  btnOutline: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 44,
    borderRadius: Radius.md,
    borderWidth: 1,
  },
  btnOutlineText: {
    ...Type.btnSecondary,
  },

  // ─── States ────────────────────────────────────
  centeredState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    gap: Spacing.md,
  },
  stateIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  stateIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  stateTitle: {
    ...Type.h2,
  },
  stateSubtext: {
    ...Type.body,
    textAlign: 'center',
  },
  stateCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: Spacing.sm,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: Radius.lg,
    ...Shadows.md,
  },
  stateCtaText: {
    ...Type.btnPrimary,
    color: '#fff',
  },
  stateOutlineCta: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderRadius: 16,
    height: 48,
    paddingHorizontal: 32,
    marginTop: Spacing.sm,
  },
  stateOutlineCtaText: {
    ...Type.btnPrimary,
  },

  // ─── Filter sheet ──────────────────────────────
  filterOverlayBg: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  filterSheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  filterHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
  },
  filterTitle: {
    ...Type.h2,
    marginBottom: 20,
  },
  filterLabel: {
    ...Type.label,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: Radius.full,
    borderWidth: 1,
  },
  filterChipText: {
    ...Type.captionSemiBold,
  },
  specFilterWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 16,
    borderTopWidth: 1,
  },
  filterRowLabel: {
    ...Type.bodySemiBold,
  },
  filterRowSub: {
    ...Type.caption,
    marginTop: 2,
  },
  filterResetBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: Radius.md,
    borderWidth: 1,
    alignItems: 'center',
  },
  filterResetText: {
    ...Type.btnSecondary,
  },
  filterApplyBtn: {
    flex: 2,
    paddingVertical: 13,
    borderRadius: Radius.md,
    alignItems: 'center',
  },
  filterApplyText: {
    ...Type.btnPrimary,
    color: '#fff',
  },
});
