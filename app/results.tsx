import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  FlatList,
  Image,
  Modal,
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
  let score = 0;
  const maxScore = 100;

  if (searchKeywords.length > 0 && builder.specialties?.length) {
    const specLower = builder.specialties.map((s: string) => s.toLowerCase());
    const bioLower = (builder.bio ?? '').toLowerCase();
    let keywordHits = 0;
    for (const kw of searchKeywords) {
      const kwLower = kw.toLowerCase();
      if (specLower.some((s: string) => s.includes(kwLower)) || bioLower.includes(kwLower)) {
        keywordHits++;
      }
    }
    score += Math.min(40, (keywordHits / searchKeywords.length) * 40);
  } else if (searchKeywords.length === 0) {
    score += 20;
  }

  if (builder._distance != null && maxDistance > 0) {
    const distRatio = 1 - Math.min(builder._distance / maxDistance, 1);
    score += distRatio * 30;
  } else {
    score += 15;
  }

  if (builder.availability === 'available') score += 15;
  else if (builder.availability === 'limited') score += 8;

  if (urgencyOrder && builder.urgency_capacity?.length) {
    const uScore = getUrgencyScore(builder.urgency_capacity, urgencyOrder);
    if (uScore === 0) score += 10;
    else if (uScore === 1) score += 6;
    else if (uScore === 2) score += 3;
  } else {
    score += 5;
  }

  if (builder.license_key) score += 2;
  if (builder.abn) score += 2;
  if (builder.credentials?.some((c: any) => c.type === 'insurance')) score += 1;

  const pct = Math.round(Math.min(score, maxScore));
  let label = 'Partial match';
  if (pct >= 85) label = 'Strong match';
  else if (pct >= 65) label = 'Good match';

  return { score: pct, label };
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
  const slideAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    const delay = Math.min(index * 60, 300);
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 350, delay, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 350, delay, useNativeDriver: true }),
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
    if (!userData?.user) return;

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
    if (score >= 85) return { bg: isDark ? '#064e3b' : '#ecfdf5', text: colors.success, ring: colors.success };
    if (score >= 65) return { bg: isDark ? '#78350f' : '#fffbeb', text: colors.warning, ring: colors.warning };
    return { bg: colors.surface, text: colors.textSecondary, ring: colors.border };
  }

  // ─── Bookmark button ──────────────────────────────────────────────

  function BookmarkButton({ builderId }: { builderId: string }) {
    const scale = useRef(new Animated.Value(1)).current;
    const isSaved = savedBuilders.has(builderId);

    function handlePress() {
      Animated.sequence([
        Animated.timing(scale, { toValue: 1.3, duration: 120, useNativeDriver: true }),
        Animated.timing(scale, { toValue: 1, duration: 120, useNativeDriver: true }),
      ]).start();
      toggleSave(builderId);
    }

    return (
      <Pressable onPress={handlePress} hitSlop={8} style={styles.saveBtn}>
        <Animated.View style={{ transform: [{ scale }] }}>
          <MaterialIcons
            name={isSaved ? 'favorite' : 'favorite-border'}
            size={20}
            color={isSaved ? '#f87171' : colors.icon}
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

    // Top specialties
    const topSpecs = (item.specialties ?? []).slice(0, 2);

    return (
      <AnimatedCard index={index}>
        <Pressable
          onPress={() => router.push({ pathname: '/builder-profile', params: { id: item.id } })}
          style={({ pressed }) => [
            styles.card,
            Shadows.sm,
            { backgroundColor: colors.surface, borderColor: colors.border },
            pressed && { opacity: 0.92, transform: [{ scale: 0.985 }] },
          ]}
        >
          {/* ─── Top section: Avatar + info + match ring ─── */}
          <View style={styles.cardTop}>
            {/* Match score accent stripe */}
            <View style={[styles.matchStripe, { backgroundColor: matchColor.ring }]} />

            <View style={styles.cardTopInner}>
              {/* Avatar */}
              <View style={[styles.avatarRing, { borderColor: matchColor.ring }]}>
                <Image source={{ uri: avatarUri }} style={styles.avatar} />
              </View>

              {/* Name + trade + location */}
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
                      <MaterialIcons name="verified" size={12} color={colors.success} />
                      <Text style={[styles.verifiedText, { color: colors.success }]}>
                        {verifyCount === 1 ? 'Verified' : `${verifyCount}x Verified`}
                      </Text>
                    </View>
                  )}
                </View>
                <View style={styles.locationRow}>
                  <MaterialIcons name="location-on" size={14} color={colors.textSecondary} />
                  <Text style={[styles.locationText, { color: colors.textSecondary }]} numberOfLines={1}>
                    {item.suburb}, {item.postcode}
                    {item._distance != null ? `  ·  ${item._distance} km` : ''}
                  </Text>
                </View>
              </View>

              {/* Match score ring */}
              <View style={styles.matchScoreWrap}>
                <View style={[styles.matchScoreRing, { borderColor: matchColor.ring, backgroundColor: matchColor.bg }]}>
                  <Text style={[styles.matchScoreNum, { color: matchColor.text }]}>{item._matchScore}</Text>
                  <Text style={[styles.matchScoreLabel, { color: matchColor.text }]}>%</Text>
                </View>
                <Text style={[styles.matchScoreCaption, { color: matchColor.text }]}>
                  {item._matchLabel}
                </Text>
              </View>
            </View>
          </View>

          {/* ─── Quick stats row ─── */}
          <View style={[styles.statsRow, { borderTopColor: colors.border, borderBottomColor: colors.border }]}>
            <View style={styles.statItem}>
              <MaterialIcons name={availInfo.icon as any} size={16} color={availInfo.color} />
              <Text style={[styles.statText, { color: colors.text }]}>{availInfo.text}</Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
            <View style={styles.statItem}>
              <MaterialIcons name="speed" size={16} color={colors.tintMuted} />
              <Text style={[styles.statText, { color: colors.text }]}>
                {item.response_time ?? 'N/A'}
              </Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
            <View style={styles.statItem}>
              <MaterialIcons name="star" size={16} color="#FBBF24" />
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
                  <View key={spec} style={[styles.specChip, { backgroundColor: colors.tintLight }]}>
                    <Text style={[styles.specChipText, { color: colors.tint }]}>{spec}</Text>
                  </View>
                ))}
                {(item.specialties ?? []).length > 2 && (
                  <Text style={[styles.specMore, { color: colors.textSecondary }]}>
                    +{(item.specialties ?? []).length - 2} more
                  </Text>
                )}
              </View>
            )}

            {/* ─── Action row ─── */}
            <View style={styles.actionRow}>
              <BookmarkButton builderId={item.id} />
              <Pressable
                style={({ pressed }) => [
                  styles.btnOutline,
                  { borderColor: colors.border },
                  pressed && { opacity: 0.7 },
                ]}
                onPress={() => router.push({ pathname: '/builder-profile', params: { id: item.id } })}
              >
                <MaterialIcons name="person" size={16} color={colors.text} />
                <Text style={[styles.btnOutlineText, { color: colors.text }]}>Profile</Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [
                  styles.btnPrimary,
                  { backgroundColor: teal },
                  pressed && { opacity: 0.85 },
                ]}
                onPress={() => router.push({ pathname: '/builder-profile', params: { id: item.id } })}
              >
                <MaterialIcons name="chat-bubble-outline" size={15} color="#fff" />
                <Text style={styles.btnPrimaryText}>Request Quote</Text>
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
    paddingRight: Spacing.sm,
    borderBottomWidth: 1,
    gap: 8,
  },
  sortScroll: {
    gap: 8,
    paddingRight: 4,
  },
  sortPill: {
    flexDirection: 'row',
    alignItems: 'center',
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
    gap: Spacing.md,
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

  // ─── Card ──────────────────────────────────────
  card: {
    borderRadius: Radius.xl,
    borderWidth: 1,
    overflow: 'hidden',
  },
  cardTop: {
    position: 'relative',
  },
  matchStripe: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 3,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
  },
  cardTopInner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: Spacing.lg,
    paddingTop: Spacing.lg + 3,
    gap: Spacing.md,
  },
  avatarRing: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 2.5,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 2,
  },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
  },
  infoCol: {
    flex: 1,
    gap: 4,
  },
  businessName: {
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  tradeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  tradePill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: Radius.full,
  },
  tradePillText: {
    fontSize: 12,
    fontWeight: '700',
  },
  verifiedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: Radius.full,
  },
  verifiedText: {
    fontSize: 11,
    fontWeight: '600',
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  locationText: {
    fontSize: 13,
    flex: 1,
  },

  // ─── Match score ───────────────────────────────
  matchScoreWrap: {
    alignItems: 'center',
    gap: 3,
  },
  matchScoreRing: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  matchScoreNum: {
    fontSize: 18,
    fontWeight: '800',
  },
  matchScoreLabel: {
    fontSize: 10,
    fontWeight: '700',
    marginTop: -2,
  },
  matchScoreCaption: {
    fontSize: 10,
    fontWeight: '600',
  },

  // ─── Stats row ─────────────────────────────────
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    paddingVertical: Spacing.sm + 2,
    marginHorizontal: Spacing.lg,
  },
  statItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
  },
  statText: {
    fontSize: 12,
    fontWeight: '600',
  },
  statDivider: {
    width: 1,
    height: 20,
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
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.full,
  },
  specChipText: {
    fontSize: 11,
    fontWeight: '600',
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
  saveBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnOutline: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 10,
    borderRadius: Radius.md,
    borderWidth: 1,
  },
  btnOutlineText: {
    fontSize: 13,
    fontWeight: '600',
  },
  btnPrimary: {
    flex: 1.4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 10,
    borderRadius: Radius.md,
  },
  btnPrimaryText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#fff',
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
