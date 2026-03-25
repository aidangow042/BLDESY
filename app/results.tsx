import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  FlatList,
  Image,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import Ionicons from '@expo/vector-icons/Ionicons';

import { Colors, Spacing, Radius, Shadows } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { geocode, distanceKm } from '@/lib/geo';
import { supabase } from '@/lib/supabase';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const PAGE_SIZE = 10;
const CARD_WIDTH = SCREEN_WIDTH - Spacing.lg * 2;
const CAROUSEL_HEIGHT = 180;

// ─── Trade icons for placeholders ────────────────────────────────────────────

const TRADE_ICONS: Record<string, string> = {
  builder: '🏗️', plumber: '🔧', electrician: '⚡', carpenter: '🪚',
  painter: '🎨', landscaper: '🌿', roofer: '🏠', tiler: '🧱',
  concreter: '🏢', fencer: '🪵', default: '🔨',
};

function getTradeIcon(trade: string): string {
  const key = trade.toLowerCase();
  for (const [k, v] of Object.entries(TRADE_ICONS)) {
    if (key.includes(k)) return v;
  }
  return TRADE_ICONS.default;
}

// ─── Extract carousel images from builder data ──────────────────────────────

function getCarouselImages(builder: { projects?: any[] | null; cover_photo_url?: string | null }): string[] {
  const images: string[] = [];
  if (builder.projects?.length) {
    for (const proj of builder.projects) {
      if (proj.media?.length) {
        for (const m of proj.media) {
          if (m.type === 'image' && m.uri) images.push(m.uri);
        }
      } else if (proj.images?.length) {
        images.push(...proj.images);
      } else if (proj.image_url) {
        images.push(proj.image_url);
      }
    }
  }
  if (images.length === 0 && builder.cover_photo_url) {
    images.push(builder.cover_photo_url);
  }
  return images.slice(0, 5);
}

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
  abn: string | null;
  license_key: string | null;
  credentials: any[] | null;
  _distance: number | null;
  _matchScore: number;
  _matchLabel: string;
};

type SortMode = 'best' | 'closest' | 'rated' | 'available';

// ─── Match score calculator ──────────────────────────────────────────────────

function computeMatchScore(
  builder: any,
  searchKeywords: string[],
  urgencyOrder: string[] | null,
  maxDistance: number,
): { score: number; label: string } {
  // Optimistic scoring: builders that match trade + are in radius start high.
  // Base score: 78 (same trade category is already filtered by query).
  // Bonuses push toward 95-99. Penalties pull down for weak fits.
  let score = 78;

  // ── Distance bonus/penalty (±12) ──
  if (builder._distance != null && builder.radius_km) {
    const ratio = builder._distance / builder.radius_km;
    if (ratio <= 0.3) score += 12;        // very close
    else if (ratio <= 0.6) score += 8;    // comfortably in range
    else if (ratio <= 1.0) score += 4;    // at edge of radius
    else score -= 10;                      // outside their radius
  } else if (builder._distance != null && maxDistance > 0) {
    const distRatio = 1 - Math.min(builder._distance / maxDistance, 1);
    score += Math.round(distRatio * 10);
  }

  // ── Keyword match bonus (up to +10) ──
  if (searchKeywords.length > 0) {
    const specLower = (builder.specialties ?? []).map((s: string) => s.toLowerCase());
    const bioLower = (builder.bio ?? '').toLowerCase();
    const nameLower = (builder.business_name ?? '').toLowerCase();
    let keywordHits = 0;
    for (const kw of searchKeywords) {
      const kwLower = kw.toLowerCase();
      if (
        specLower.some((s: string) => s.includes(kwLower)) ||
        bioLower.includes(kwLower) ||
        nameLower.includes(kwLower)
      ) {
        keywordHits++;
      }
    }
    const hitRatio = keywordHits / searchKeywords.length;
    score += Math.round(hitRatio * 10);
    // Penalty if no keywords match at all
    if (keywordHits === 0) score -= 8;
  }

  // ── Availability bonus (+3 to +5) / penalty ──
  if (builder.availability === 'available') score += 5;
  else if (builder.availability === 'limited') score += 2;
  else if (builder.availability === 'unavailable') score -= 12;

  // ── Urgency capacity match (+3) ──
  if (urgencyOrder && builder.urgency_capacity?.length) {
    const uScore = getUrgencyScore(builder.urgency_capacity, urgencyOrder);
    if (uScore === 0) score += 3;
    else if (uScore === 1) score += 1;
  }

  // ── Credibility bonuses (up to +4) ──
  if (builder.license_key) score += 1;
  if (builder.abn) score += 1;
  if (builder.credentials?.some((c: any) => c.type === 'insurance')) score += 1;
  if (builder.projects?.length > 0) score += 1;

  // Clamp between 45 and 99
  const pct = Math.max(45, Math.min(99, score));
  let label = 'Partial match';
  if (pct >= 90) label = 'Strong match';
  else if (pct >= 75) label = 'Good match';

  return { score: pct, label };
}

// ─── Photo carousel ─────────────────────────────────────────────────────────

function PhotoCarousel({
  images,
  tradeCategory,
  isDark,
}: {
  images: string[];
  tradeCategory: string;
  isDark: boolean;
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
          <Image
            source={{ uri: item }}
            style={[styles.carouselImage, { width: imageWidth }]}
          />
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
}: {
  visible: boolean;
  onClose: () => void;
  onApply: (f: FilterState) => void;
  filters: FilterState;
  colors: any;
}) {
  const [local, setLocal] = useState(filters);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    setLocal(filters);
  }, [visible]);

  const DISTANCE_OPTIONS = [5, 10, 25, 50, 100];
  const AVAILABILITY_OPTIONS = ['Any', 'Available now', 'This week', 'This month'];

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
              setLocal({ maxDistance: 0, availabilityFilter: 'Any', verifiedOnly: false });
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
};

// ─── Main Component ──────────────────────────────────────────────────────────

export default function ResultsScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const colors = Colors[isDark ? 'dark' : 'light'];
  const teal = colors.teal;
  const router = useRouter();
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
  const [error, setError] = useState<string | null>(null);
  const [sortMode, setSortMode] = useState<SortMode>('best');
  const [page, setPage] = useState(1);
  const [filterVisible, setFilterVisible] = useState(false);
  const [filters, setFilters] = useState<FilterState>({
    maxDistance: 0,
    availabilityFilter: 'Any',
    verifiedOnly: false,
  });
  const [savedBuilders, setSavedBuilders] = useState<Set<string>>(new Set());

  const searchKeywords = (params.keywords ?? '').split(',').filter(Boolean);
  const tradeName = params.trade_category
    ? params.trade_category.split(',').map((t) => t.trim().charAt(0).toUpperCase() + t.trim().slice(1)).join(', ')
    : 'All Trades';
  const locationName = params.suburb ?? 'Nearby';

  // ─── Fetch builders ──────────────────────────────────────────────────

  useEffect(() => {
    fetchBuilders();
    fetchSavedBuilders();
  }, [params.suburb, params.trade_category, params.urgency, params.keywords]);

  async function fetchSavedBuilders() {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData?.user) return;
    const { data } = await supabase
      .from('saved_builders')
      .select('builder_id')
      .eq('user_id', userData.user.id);
    if (data) {
      setSavedBuilders(new Set(data.map((d: any) => d.builder_id)));
    }
  }

  async function fetchBuilders() {
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
        'id, business_name, trade_category, suburb, postcode, bio, latitude, longitude, radius_km, urgency_capacity, availability, availability_note, response_time, profile_photo_url, cover_photo_url, projects, specialties, abn, license_key, credentials',
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
      setError(fetchError.message);
      setLoading(false);
      return;
    }

    let results: BuilderResult[] = (data ?? []).map((b) => ({
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
      const { score, label } = computeMatchScore(b, searchKeywords, urgencyOrder, maxDist);
      return { ...b, _matchScore: score, _matchLabel: label };
    });

    results.sort((a, b) => b._matchScore - a._matchScore);

    setAllBuilders(results);
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
    [],
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

  const totalFiltered = getFilteredSorted(allBuilders, sortMode, filters).length;

  // ─── Save/unsave ──────────────────────────────────────────────────

  async function toggleSave(builderId: string) {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData?.user) {
      Alert.alert('Sign in required', 'You need to be logged in to save builders.');
      return;
    }

    const newSet = new Set(savedBuilders);
    if (newSet.has(builderId)) {
      newSet.delete(builderId);
      setSavedBuilders(newSet);
      await supabase
        .from('saved_builders')
        .delete()
        .eq('user_id', userData.user.id)
        .eq('builder_id', builderId);
    } else {
      newSet.add(builderId);
      setSavedBuilders(newSet);
      await supabase.from('saved_builders').insert({
        user_id: userData.user.id,
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

    // Top specialties (show 3, title case)
    const topSpecs = (item.specialties ?? []).slice(0, 3).map(
      (s) => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase(),
    );
    const images = getCarouselImages(item);

    return (
      <AnimatedCard index={index}>
        <Pressable
          onPress={() => router.push({ pathname: '/builder-profile', params: { id: item.id } })}
          style={({ pressed }) => [
            styles.card,
            Shadows.md,
            { backgroundColor: colors.surface, borderColor: colors.border },
            pressed && { opacity: 0.95, transform: [{ scale: 0.98 }] },
          ]}
        >
          {/* ─── Photo carousel ─── */}
          <View style={styles.carouselWrapper}>
            <PhotoCarousel images={images} tradeCategory={item.trade_category} isDark={isDark} />

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

          {/* ─── Profile info section ─── */}
          <View style={styles.profileSection}>
            {/* Avatar */}
            <View style={styles.avatarRing}>
              <Image source={{ uri: avatarUri }} style={styles.avatar} />
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
                {(item.specialties ?? []).length > 3 && (
                  <Text style={[styles.specMore, { color: colors.textSecondary }]}>
                    +{(item.specialties ?? []).length - 3} more
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
                onPress={() => router.push({ pathname: '/builder-profile', params: { id: item.id } })}
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
                onPress={() => router.push({ pathname: '/builder-profile', params: { id: item.id } })}
              >
                <MaterialIcons name="chat-bubble-outline" size={15} color={teal} />
                <Text style={[styles.btnOutlineText, { color: teal }]}>Request Quote</Text>
              </Pressable>
            </View>
          </View>
        </Pressable>
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
  ].filter(Boolean).length;

  // ─── Render ───────────────────────────────────────────────────────

  return (
    <View style={[styles.screen, { backgroundColor: colors.canvas }]}>
      <SafeAreaView edges={['top']} style={{ backgroundColor: colors.background }}>
        {/* ─── Header ─── */}
        <View style={[styles.headerBar, { backgroundColor: colors.background }]}>
          <Pressable
            style={({ pressed }) => [
              styles.backBtn,
              { backgroundColor: colors.surface, borderColor: colors.border },
              pressed && { opacity: 0.7 },
            ]}
            onPress={() => router.back()}
          >
            <MaterialIcons name="arrow-back" size={20} color={teal} />
          </Pressable>
          <View style={styles.headerCenter}>
            <Text style={[styles.headerTitle, { color: colors.text }]}>{tradeName}</Text>
            <View style={styles.headerMeta}>
              <MaterialIcons name="location-on" size={13} color={colors.textSecondary} />
              <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
                {locationName}
              </Text>
              <View style={[styles.headerDot, { backgroundColor: colors.textSecondary }]} />
              <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
                {loading ? '...' : `${totalFiltered} result${totalFiltered !== 1 ? 's' : ''}`}
              </Text>
            </View>
          </View>
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
      </SafeAreaView>

      {/* ─── Content ─── */}
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
          <View style={[styles.stateIconWrap, { backgroundColor: colors.tealBg }]}>
            <Ionicons name="search-outline" size={36} color={teal} />
          </View>
          <Text style={[styles.stateTitle, { color: colors.text }]}>No tradies found</Text>
          <Text style={[styles.stateSubtext, { color: colors.textSecondary }]}>
            Try broadening your search, changing your location, or using different keywords.
          </Text>
          <Pressable
            onPress={() => router.back()}
            style={[styles.stateCta, { backgroundColor: teal }]}
          >
            <MaterialIcons name="search" size={18} color="#fff" />
            <Text style={styles.stateCtaText}>Modify Search</Text>
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

      <FilterSheet
        visible={filterVisible}
        onClose={() => setFilterVisible(false)}
        onApply={setFilters}
        filters={filters}
        colors={colors}
      />
    </View>
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
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.4,
  },
  headerMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  headerSubtitle: {
    fontSize: 13,
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
    fontSize: 13,
    fontWeight: '600',
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
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
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
    fontSize: 12,
    fontWeight: '500',
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
    fontSize: 13,
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
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
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
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
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
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.3,
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
    fontSize: 11,
    fontWeight: '700',
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
    fontSize: 10,
    fontWeight: '600',
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  locationText: {
    fontSize: 12,
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
    fontSize: 12,
    fontWeight: '500',
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
    fontSize: 13,
    lineHeight: 19,
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
    fontSize: 11,
    fontWeight: '500',
  },
  specMore: {
    fontSize: 11,
    fontWeight: '500',
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
    fontSize: 14,
    fontWeight: '700',
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
    fontSize: 14,
    fontWeight: '600',
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
  stateTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  stateSubtext: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
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
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
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
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 20,
  },
  filterLabel: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: Radius.full,
    borderWidth: 1,
  },
  filterChipText: {
    fontSize: 14,
    fontWeight: '600',
  },
  filterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 16,
    borderTopWidth: 1,
  },
  filterRowLabel: {
    fontSize: 15,
    fontWeight: '600',
  },
  filterRowSub: {
    fontSize: 12,
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
    fontSize: 15,
    fontWeight: '600',
  },
  filterApplyBtn: {
    flex: 2,
    paddingVertical: 13,
    borderRadius: Radius.md,
    alignItems: 'center',
  },
  filterApplyText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
});
