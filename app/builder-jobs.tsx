import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import Ionicons from '@expo/vector-icons/Ionicons';

import ReAnimated, { FadeInUp } from 'react-native-reanimated';

import { AppShell } from '@/components/layout';
import { Colors, Spacing, Radius, Shadows, Type } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { supabase } from '@/lib/supabase';
import { useUser } from '@/lib/auth-context';
import { TRADE_ICONS, getTradeIcon } from '@/lib/trade-utils';
import { friendlyError } from '@/lib/error-messages';
import { filterJobsByBuilderRadius } from '@/lib/job-feed-filter';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CAROUSEL_HEIGHT = 160;

// ─── Constants ───────────────────────────────────────────────────────────────

const URGENCY_CONFIG: Record<string, {
  label: string;
  icon: string;
  gradient: readonly [string, string];
  pillBg: string;
  pillColor: string;
}> = {
  asap: {
    label: 'ASAP',
    icon: 'alarm',
    gradient: ['#DC2626', '#EF4444'] as const,
    pillBg: '#FEF2F2',
    pillColor: '#DC2626',
  },
  this_week: {
    label: 'This Week',
    icon: 'schedule',
    gradient: ['#D97706', '#F59E0B'] as const,
    pillBg: '#FFFBEB',
    pillColor: '#D97706',
  },
  flexible: {
    label: 'Flexible',
    icon: 'event-available',
    gradient: ['#059669', '#10B981'] as const,
    pillBg: '#ECFDF5',
    pillColor: '#059669',
  },
};

const FILTER_OPTIONS: { key: string | null; label: string; icon: string }[] = [
  { key: null, label: 'All Jobs', icon: 'list' },
  { key: 'asap', label: 'ASAP', icon: 'alarm' },
  { key: 'this_week', label: 'This Week', icon: 'schedule' },
  { key: 'flexible', label: 'Flexible', icon: 'event-available' },
];

// ─── Types ───────────────────────────────────────────────────────────────────

type Job = {
  id: string;
  title: string;
  description: string | null;
  trade_category: string;
  urgency: string;
  suburb: string;
  postcode: string;
  budget: string | null;
  created_at: string;
  photos: string[];
  // Contract / enterprise detail fields (present on contract posts)
  workers_needed: number | null;
  day_rate: string | null;
  contract_duration: string | null;
  start_date: string | null;
  // Soft "recommended" signal — the job's wanted sub-trades overlap the builder's
  specMatch: boolean;
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function timeAgo(dateString: string): string {
  const diff = Date.now() - new Date(dateString).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function capitalise(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function formatStartDate(dateString: string): string {
  try {
    return new Date(dateString).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' });
  } catch {
    return dateString;
  }
}

// ─── Skeleton card ───────────────────────────────────────────────────────────

function SkeletonCard({ colors, delay = 0 }: { colors: any; delay?: number }) {
  const shimmer = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(shimmer, { toValue: 1, duration: 900, useNativeDriver: true }),
        Animated.timing(shimmer, { toValue: 0, duration: 900, useNativeDriver: true }),
      ]),
    );
    anim.start();
    return () => anim.stop();
  }, []);

  const opacity = shimmer.interpolate({ inputRange: [0, 1], outputRange: [0.3, 0.7] });

  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      {/* Gradient header skeleton */}
      <Animated.View style={{ height: 90, backgroundColor: colors.border, opacity }} />
      {/* Info section skeleton */}
      <View style={{ flexDirection: 'row', padding: Spacing.lg, gap: Spacing.md }}>
        <Animated.View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: colors.border, opacity }} />
        <View style={{ flex: 1, gap: 8 }}>
          <Animated.View style={{ height: 14, width: '65%', borderRadius: 7, backgroundColor: colors.border, opacity }} />
          <Animated.View style={{ height: 11, width: '45%', borderRadius: 6, backgroundColor: colors.border, opacity }} />
          <Animated.View style={{ height: 11, width: '55%', borderRadius: 6, backgroundColor: colors.border, opacity }} />
        </View>
      </View>
      {/* Stats row skeleton */}
      <View style={{ flexDirection: 'row', paddingHorizontal: Spacing.lg, gap: Spacing.sm, paddingBottom: Spacing.md }}>
        <Animated.View style={{ flex: 1, height: 36, borderRadius: Radius.md, backgroundColor: colors.border, opacity }} />
        <Animated.View style={{ flex: 1, height: 36, borderRadius: Radius.md, backgroundColor: colors.border, opacity }} />
        <Animated.View style={{ flex: 1, height: 36, borderRadius: Radius.md, backgroundColor: colors.border, opacity }} />
      </View>
      {/* Description skeleton */}
      <View style={{ paddingHorizontal: Spacing.lg, paddingBottom: Spacing.lg, gap: 6 }}>
        <Animated.View style={{ height: 11, width: '100%', borderRadius: 5, backgroundColor: colors.border, opacity }} />
        <Animated.View style={{ height: 11, width: '80%', borderRadius: 5, backgroundColor: colors.border, opacity }} />
      </View>
    </View>
  );
}

// ─── Animated card wrapper ────────────────────────────────────────────────────

function AnimatedCard({ children, index }: { children: React.ReactNode; index: number }) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(16)).current;

  useEffect(() => {
    const delay = Math.min(index * 60, 280);
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

// ─── Photo carousel ─────────────────────────────────────────────────────────

function PhotoCarousel({ images, urgency }: { images: string[]; urgency: typeof URGENCY_CONFIG[string] }) {
  const [activeIndex, setActiveIndex] = useState(0);

  if (images.length === 0) {
    // Fallback: gradient with dot pattern
    return (
      <View style={styles.carouselWrapper}>
        <LinearGradient
          colors={urgency.gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFillObject}
        />
        <View style={styles.headerPattern} pointerEvents="none">
          {Array.from({ length: 18 }).map((_, i) => (
            <View key={i} style={[styles.headerPatternDot, { backgroundColor: 'rgba(255,255,255,0.12)' }]} />
          ))}
        </View>
      </View>
    );
  }

  return (
    <View style={styles.carouselWrapper}>
      <ScrollView
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(e) => {
          const idx = Math.round(e.nativeEvent.contentOffset.x / (SCREEN_WIDTH - Spacing.lg * 2));
          setActiveIndex(idx);
        }}
      >
        {images.map((uri, i) => (
          <Image
            key={i}
            source={{ uri }}
            style={styles.carouselImage}
            contentFit="cover"
            cachePolicy="disk"
            placeholder={{ blurhash: 'LKO2?U%2Tw=w]~RBVZRi};RPxuwH' }}
          />
        ))}
      </ScrollView>
      {/* Photo count badge */}
      <View style={styles.imageCountPill}>
        <MaterialIcons name="photo-library" size={12} color="#fff" />
        <Text style={styles.imageCountText}>{images.length}</Text>
      </View>
      {/* Dot indicators */}
      {images.length > 1 && (
        <View style={styles.dotRow}>
          {images.map((_, i) => (
            <View
              key={i}
              style={[
                styles.carouselDot,
                { backgroundColor: i === activeIndex ? '#fff' : 'rgba(255,255,255,0.5)' },
                i === activeIndex ? { width: 16 } : { width: 6 },
              ]}
            />
          ))}
        </View>
      )}
      {/* Bottom gradient for readability */}
      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.3)']}
        style={styles.carouselGradient}
        pointerEvents="none"
      />
    </View>
  );
}

// ─── Job card ─────────────────────────────────────────────────────────────────

function JobCard({
  item,
  index,
  colors,
  teal,
  isDark,
  isContract,
  onPress,
  onApply,
}: {
  item: Job;
  index: number;
  colors: any;
  teal: string;
  isDark: boolean;
  isContract: boolean;
  onPress: () => void;
  onApply: () => void;
}) {
  const urgency = URGENCY_CONFIG[item.urgency] ?? URGENCY_CONFIG.flexible;
  const tradeIcon = getTradeIcon(item.trade_category);
  const tradeLabel = capitalise(item.trade_category);
  const locationText = `${item.suburb}, ${item.postcode}`;
  const postedText = timeAgo(item.created_at);

  return (
    <AnimatedCard index={index}>
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [
          styles.card,
          Shadows.md,
          { backgroundColor: colors.surface, borderColor: colors.border },
          pressed && { opacity: 0.95, transform: [{ scale: 0.98 }] },
        ]}
        accessibilityRole="button"
        accessibilityLabel={`Job: ${item.title}`}
      >
        {/* ─── Photo carousel / gradient fallback ─── */}
        <PhotoCarousel images={item.photos} urgency={urgency} />
        {/* Urgency pill overlay — top left */}
        <View style={[styles.urgencyPill, { backgroundColor: urgency.pillColor }]}>
          <MaterialIcons name={urgency.icon as any} size={13} color="#fff" />
          <Text style={styles.urgencyPillText}>{urgency.label}</Text>
        </View>

        {/* ─── Info section ─── */}
        <View style={styles.infoSection}>
          {/* Trade icon circle */}
          <View style={[styles.tradeIconCircle, { backgroundColor: isDark ? colors.border : '#f1f5f9' }]}>
            <Text style={{ fontSize: 22 }}>{tradeIcon}</Text>
          </View>

          {/* Title + trade pill + location */}
          <View style={styles.infoCol}>
            <Text style={[styles.jobTitle, { color: colors.text }]} numberOfLines={1}>
              {item.title}
            </Text>
            <View style={styles.infoMetaRow}>
              <View style={[styles.tradePill, { backgroundColor: colors.tealBg }]}>
                <Text style={[styles.tradePillText, { color: teal }]}>{tradeLabel}</Text>
              </View>
              {item.specMatch ? (
                <View style={styles.specPill}>
                  <MaterialIcons name="star" size={11} color="#059669" />
                  <Text style={styles.specPillText}>Matches your speciality</Text>
                </View>
              ) : null}
              <View style={styles.locationRow}>
                <MaterialIcons name="location-on" size={12} color={colors.textSecondary} />
                <Text style={[styles.locationText, { color: colors.textSecondary }]} numberOfLines={1}>
                  {locationText}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* ─── Stats row ─── */}
        <View style={[styles.statsRow, { borderTopColor: colors.border, borderBottomColor: colors.border }]}>
          {/* Budget */}
          <View style={styles.statItem}>
            <MaterialIcons name="payments" size={13} color={colors.textSecondary} />
            <Text style={[styles.statText, { color: colors.text }]}>
              {item.budget ? item.budget : 'Open budget'}
            </Text>
          </View>
          <View style={[styles.statDot, { backgroundColor: colors.textSecondary }]} />
          {/* Urgency */}
          <View style={styles.statItem}>
            <View style={[styles.urgencyDot, { backgroundColor: urgency.pillColor }]} />
            <Text style={[styles.statText, { color: colors.text }]}>{urgency.label}</Text>
          </View>
          <View style={[styles.statDot, { backgroundColor: colors.textSecondary }]} />
          {/* Time */}
          <View style={styles.statItem}>
            <MaterialIcons name="access-time" size={13} color={colors.textSecondary} />
            <Text style={[styles.statText, { color: colors.text }]}>{postedText}</Text>
          </View>
        </View>

        {/* ─── Contract details ─── */}
        {isContract &&
        ((item.workers_needed ?? 0) > 1 || item.day_rate || item.contract_duration || item.start_date) ? (
          <View style={styles.contractChips}>
            {(item.workers_needed ?? 0) > 1 ? (
              <View style={[styles.contractChip, { backgroundColor: colors.tealBg }]}>
                <MaterialIcons name="groups" size={12} color={teal} />
                <Text style={[styles.contractChipText, { color: teal }]}>{item.workers_needed} workers</Text>
              </View>
            ) : null}
            {item.day_rate ? (
              <View style={[styles.contractChip, { backgroundColor: colors.tealBg }]}>
                <Text style={[styles.contractChipText, { color: teal }]}>{item.day_rate}</Text>
              </View>
            ) : null}
            {item.contract_duration ? (
              <View style={[styles.contractChip, { backgroundColor: colors.tealBg }]}>
                <Text style={[styles.contractChipText, { color: teal }]}>{item.contract_duration}</Text>
              </View>
            ) : null}
            {item.start_date ? (
              <View style={[styles.contractChip, { backgroundColor: colors.tealBg }]}>
                <Text style={[styles.contractChipText, { color: teal }]}>Start: {formatStartDate(item.start_date)}</Text>
              </View>
            ) : null}
          </View>
        ) : null}

        {/* ─── Description ─── */}
        {item.description ? (
          <View style={styles.descriptionWrap}>
            <Text style={[styles.description, { color: colors.textSecondary }]} numberOfLines={2}>
              {item.description}
            </Text>
          </View>
        ) : null}

        {/* ─── Action row ─── */}
        <View style={styles.actionRow}>
          <Pressable
            style={({ pressed }) => [
              styles.btnPrimary,
              { backgroundColor: teal },
              pressed && { opacity: 0.85 },
            ]}
            onPress={onPress}
            accessibilityRole="button"
            accessibilityLabel="View job details"
          >
            <MaterialIcons name="visibility" size={15} color="#fff" />
            <Text style={styles.btnPrimaryText}>View Details</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [
              styles.btnOutline,
              { borderColor: colors.border },
              pressed && { opacity: 0.7 },
            ]}
            onPress={onApply}
            accessibilityRole="button"
            accessibilityLabel="Apply for this job"
          >
            <MaterialIcons name="send" size={14} color={teal} />
            <Text style={[styles.btnOutlineText, { color: teal }]}>Apply</Text>
          </Pressable>
        </View>
      </Pressable>
    </AnimatedCard>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function BuilderJobsFeed() {
  const colorScheme = useColorScheme() ?? 'light';
  const isDark = colorScheme === 'dark';
  const colors = Colors[colorScheme];
  const teal = colors.teal;
  const router = useRouter();
  const params = useLocalSearchParams<{ type?: string }>();
  const jobType = params.type || 'all'; // 'commercial', 'residential', 'contracts', or 'all'
  const { userId } = useUser();

  const isContracts = jobType === 'contracts';

  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [builderTrade, setBuilderTrade] = useState<string | null>(null);
  const [filterUrgency, setFilterUrgency] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  // Contracts feed only: "My" (applied to) vs "Explore" (available) + search
  const [contractTab, setContractTab] = useState<'explore' | 'my'>('explore');
  const [search, setSearch] = useState('');
  const [appliedJobIds, setAppliedJobIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!userId) return;
    loadJobs();
  }, [userId]);

  useEffect(() => {
    if (builderTrade !== null) {
      loadJobs();
    }
  }, [filterUrgency]);

  async function loadJobs() {
    try {
      setLoading(true);
      setError(null);

      if (!userId) {
        setLoading(false);
        return;
      }

      // The builder's trade(s), service area and sub-trade specialities drive
      // which jobs we surface — same model as the website portal feeds.
      const { data: profile } = await supabase
        .from('builder_profiles')
        .select('latitude, longitude, radius_km, trade_category, trade_categories, specialisations')
        .eq('user_id', userId)
        .maybeSingle();

      const trade = profile?.trade_category ?? null;
      setBuilderTrade(trade);

      // Prefer the multi-trade array; fall back to the legacy single trade.
      const builderTrades: string[] =
        Array.isArray(profile?.trade_categories) && profile!.trade_categories.length > 0
          ? profile!.trade_categories.filter((t: unknown): t is string => typeof t === 'string')
          : trade
            ? [trade]
            : [];

      const builderSpecs = (profile?.specialisations ?? {}) as Record<string, string[]>;

      let query = supabase
        .from('jobs')
        .select(
          'id, title, description, trade_category, suburb, postcode, urgency, budget, status, created_at, customer_id, photo_urls, poster_type, posting_kind, workers_needed, day_rate, contract_duration, start_date, specialisations',
        )
        .eq('status', 'open')
        .order('created_at', { ascending: false });

      // Separate the feeds cleanly by poster + posting kind (matches the website):
      //   commercial   → enterprise project jobs   (poster=enterprise, kind=job)
      //   residential  → customer home jobs         (poster=customer)
      //   contracts    → enterprise ongoing work    (poster=enterprise, kind=contract)
      if (jobType === 'commercial') {
        query = query.eq('poster_type', 'enterprise').eq('posting_kind', 'job');
      } else if (jobType === 'residential') {
        query = query.eq('poster_type', 'customer');
      } else if (jobType === 'contracts') {
        query = query.eq('poster_type', 'enterprise').eq('posting_kind', 'contract');
      }

      // Hard-filter to the builder's trade(s). With no trades set, show all.
      if (builderTrades.length > 0) {
        query = query.in('trade_category', builderTrades);
      }

      if (filterUrgency) {
        query = query.eq('urgency', filterUrgency);
      }

      // Fetch jobs + the builder's own applications (for the contracts My/Explore tab).
      const [jobsRes, appsRes] = await Promise.all([
        query,
        supabase.from('applications').select('job_id').eq('builder_id', userId),
      ]);

      // RLS already limits this to open jobs visible to approved builders; the
      // trade + radius narrowing below is the same client-side model as the web.
      const { data: jobsData, error: fetchError } = jobsRes;

      if (fetchError) {
        setError(friendlyError(fetchError));
        setJobs([]);
        return;
      }

      setAppliedJobIds(new Set((appsRes.data ?? []).map((a: any) => a.job_id)));

      if (!jobsData?.length) {
        setJobs([]);
        return;
      }

      // Fetch photos for all jobs in one query
      const jobIds = jobsData.map((j: any) => j.id);
      const { data: photosData } = await supabase
        .from('job_photos')
        .select('job_id, file_path')
        .in('job_id', jobIds)
        .order('is_cover', { ascending: false });

      const photoMap = new Map<string, string[]>();
      for (const photo of photosData ?? []) {
        const arr = photoMap.get(photo.job_id) ?? [];
        arr.push(photo.file_path);
        photoMap.set(photo.job_id, arr);
      }

      let allJobs: Job[] = jobsData.map((j: any) => {
        const jobSpecs: string[] = Array.isArray(j.specialisations) ? j.specialisations : [];
        const mine = builderSpecs[j.trade_category] ?? [];
        return {
          ...j,
          photos: (photoMap.get(j.id) ?? []).length > 0
            ? photoMap.get(j.id)!
            : Array.isArray(j.photo_urls)
              ? j.photo_urls
              : [],
          specMatch: jobSpecs.length > 0 && jobSpecs.some((s) => mine.includes(s)),
        };
      });

      // Only show work inside the builder's service radius.
      allJobs = await filterJobsByBuilderRadius(allJobs, {
        latitude: profile?.latitude ?? null,
        longitude: profile?.longitude ?? null,
        radius_km: profile?.radius_km ?? null,
      });

      // Project Jobs: float speciality matches ("recommended") to the top.
      if (jobType === 'commercial') {
        allJobs = [...allJobs].sort((a, b) => Number(b.specMatch) - Number(a.specMatch));
      }

      setJobs(allJobs);
    } catch (err: any) {
      setError(friendlyError(err));
    } finally {
      setLoading(false);
    }
  }

  async function handleRefresh() {
    setRefreshing(true);
    await loadJobs();
    setRefreshing(false);
  }

  const handleJobPress = useCallback(
    (id: string) => {
      router.push({ pathname: '/job-detail', params: { id } });
    },
    [router],
  );

  // The feed is already hard-filtered to the builder's trade(s) + radius. The
  // contracts feed adds a My/Explore + search layer on top (matches the web).
  const displayedJobs = useMemo(() => {
    if (!isContracts) return jobs;
    let list = contractTab === 'my' ? jobs.filter((j) => appliedJobIds.has(j.id)) : jobs;
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (j) =>
          j.title.toLowerCase().includes(q) ||
          (j.description ?? '').toLowerCase().includes(q) ||
          j.suburb.toLowerCase().includes(q),
      );
    }
    return list;
  }, [jobs, isContracts, contractTab, search, appliedJobIds]);

  const renderJob = useCallback(
    ({ item, index }: { item: Job; index: number }) => (
      <JobCard
        item={item}
        index={index}
        colors={colors}
        teal={teal}
        isDark={isDark}
        isContract={isContracts}
        onPress={() => handleJobPress(item.id)}
        onApply={() => handleJobPress(item.id)}
      />
    ),
    [colors, teal, isDark, isContracts, handleJobPress],
  );

  const keyExtractor = useCallback((item: Job) => item.id, []);

  const unit = isContracts ? 'contract' : 'job';
  const emptyTitle = isContracts
    ? contractTab === 'my'
      ? 'No applications yet'
      : 'No contracts right now'
    : 'No open jobs right now';
  const emptySubtext = search.trim()
    ? 'No results for your search. Try a different term.'
    : isContracts
      ? contractTab === 'my'
        ? "You haven't applied to any contracts yet."
        : 'No contracts in your trade and area right now. Pull down to refresh.'
      : filterUrgency
        ? `No ${URGENCY_CONFIG[filterUrgency]?.label ?? filterUrgency} jobs at the moment. Try a different filter.`
        : 'New jobs are posted regularly. Pull down to refresh.';

  const screenTitle =
    jobType === 'commercial'
      ? 'Project Jobs'
      : jobType === 'residential'
        ? 'Home Jobs'
        : jobType === 'contracts'
          ? 'Contracts'
          : 'Open Jobs';

  return (
    <AppShell title={screenTitle} showBack>
      <View style={{ flex: 1, backgroundColor: colors.canvas }}>
        {/* Meta strip — count */}
        <View style={[styles.metaStrip, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
          <Text style={[styles.metaText, { color: colors.textSecondary }]}>
            {loading ? '...' : `${displayedJobs.length} ${unit}${displayedJobs.length !== 1 ? 's' : ''}`}
            {builderTrade ? ` · ${capitalise(builderTrade)}` : ''}
          </Text>
        </View>

        {isContracts ? (
          /* ─── Contracts: My / Explore subtabs + search ─── */
          <View style={[styles.contractControls, { backgroundColor: colors.background, borderBottomColor: colors.border }]}>
            <View style={styles.subtabRow}>
              {(['explore', 'my'] as const).map((t) => {
                const active = contractTab === t;
                return (
                  <Pressable
                    key={t}
                    onPress={() => setContractTab(t)}
                    accessibilityRole="button"
                    accessibilityState={{ selected: active }}
                    style={[styles.subtab, { borderBottomColor: active ? teal : 'transparent' }]}
                  >
                    <Text style={[styles.subtabText, { color: active ? teal : colors.textSecondary }]}>
                      {t === 'my' ? 'My Contracts' : 'Explore'}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            <View style={[styles.searchWrap, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <MaterialIcons name="search" size={18} color={colors.textSecondary} />
              <TextInput
                value={search}
                onChangeText={setSearch}
                placeholder="Search title, suburb…"
                placeholderTextColor={colors.textSecondary}
                style={[styles.searchInput, { color: colors.text }]}
                returnKeyType="search"
                accessibilityLabel="Search contracts"
              />
              {search ? (
                <Pressable onPress={() => setSearch('')} hitSlop={8} accessibilityRole="button" accessibilityLabel="Clear search">
                  <MaterialIcons name="close" size={16} color={colors.textSecondary} />
                </Pressable>
              ) : null}
            </View>
          </View>
        ) : (
          /* ─── Jobs: urgency filter/sort bar ─── */
          <View style={[styles.sortBar, { backgroundColor: colors.background, borderBottomColor: colors.border }]}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.sortScroll}>
              {FILTER_OPTIONS.map((opt) => {
                const active = filterUrgency === opt.key;
                return (
                  <Pressable
                    key={String(opt.key)}
                    onPress={() => setFilterUrgency(opt.key)}
                    accessibilityRole="button"
                    accessibilityState={{ selected: active }}
                    accessibilityLabel={`Filter: ${opt.label}`}
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
          </View>
        )}

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
            <Ionicons name="alert-circle-outline" size={36} color={colors.textSecondary} />
          </View>
          <Text style={[styles.stateTitle, { color: colors.text }]}>Something went wrong</Text>
          <Text style={[styles.stateSubtext, { color: colors.textSecondary }]}>{error}</Text>
          <Pressable
            onPress={loadJobs}
            style={({ pressed }) => [
              styles.stateCta,
              { backgroundColor: teal },
              pressed && { opacity: 0.85 },
            ]}
            accessibilityRole="button"
            accessibilityLabel="Try again"
          >
            <MaterialIcons name="refresh" size={18} color="#fff" />
            <Text style={styles.stateCtaText}>Try Again</Text>
          </Pressable>
        </View>
      ) : displayedJobs.length === 0 ? (
        <View style={styles.centeredState}>
          <View style={[styles.stateIconWrap, { backgroundColor: colors.tealBg }]}>
            <Ionicons name={isContracts ? 'reader-outline' : 'briefcase-outline'} size={36} color={teal} />
          </View>
          <Text style={[styles.stateTitle, { color: colors.text }]}>{emptyTitle}</Text>
          <Text style={[styles.stateSubtext, { color: colors.textSecondary }]}>{emptySubtext}</Text>
          <Pressable
            onPress={loadJobs}
            style={({ pressed }) => [
              styles.stateCta,
              { backgroundColor: teal },
              pressed && { opacity: 0.85 },
            ]}
          >
            <MaterialIcons name="refresh" size={18} color="#fff" />
            <Text style={styles.stateCtaText}>Refresh</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={displayedJobs}
          keyExtractor={keyExtractor}
          renderItem={renderJob}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          windowSize={5}
          maxToRenderPerBatch={8}
          removeClippedSubviews
          keyboardShouldPersistTaps="handled"
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={teal} />
          }
          ListHeaderComponent={
            <View style={styles.resultCountRow}>
              <MaterialIcons name="format-list-numbered" size={14} color={colors.textSecondary} />
              <Text style={[styles.resultCounter, { color: colors.textSecondary }]}>
                {displayedJobs.length} {unit}{displayedJobs.length !== 1 ? 's' : ''}
                {!isContracts && filterUrgency ? ` · ${URGENCY_CONFIG[filterUrgency]?.label ?? filterUrgency}` : ''}
              </Text>
            </View>
          }
          ListFooterComponent={
            <View style={styles.endRow}>
              <View style={[styles.endLine, { backgroundColor: colors.border }]} />
              <Text style={[styles.endText, { color: colors.textSecondary }]}>
                All {displayedJobs.length} results shown
              </Text>
              <View style={[styles.endLine, { backgroundColor: colors.border }]} />
            </View>
          }
        />
      )}
      </ReAnimated.View>
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
  metaStrip: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  metaText: {
    fontSize: 12,
    fontWeight: '500',
  },
  headerBar: {
    paddingBottom: 12,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
  },
  backBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  headerTitle: {
    ...Type.h3,
    color: '#fff',
    fontWeight: '700',
  },
  headerSubtitle: {
    ...Type.caption,
    color: 'rgba(255,255,255,0.6)',
    fontWeight: '500',
  },

  // ─── Sort bar ──────────────────────────────────
  sortBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    paddingLeft: Spacing.lg,
    paddingRight: Spacing.md,
    borderBottomWidth: 1,
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
    ...Type.caption,
  },

  // ─── Card ──────────────────────────────────────
  card: {
    borderRadius: Radius.xl,
    borderWidth: 1,
    overflow: 'hidden',
  },

  // ─── Carousel ─────────────────────────────────────
  carouselWrapper: {
    height: CAROUSEL_HEIGHT,
    position: 'relative',
    overflow: 'hidden',
  },
  carouselImage: {
    width: SCREEN_WIDTH - Spacing.lg * 2 - 2, // account for card border
    height: CAROUSEL_HEIGHT,
  },
  carouselGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 50,
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
    fontWeight: '600',
    color: '#fff',
  },
  dotRow: {
    position: 'absolute',
    bottom: 10,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
  },
  carouselDot: {
    height: 6,
    borderRadius: 3,
  },

  // ─── Gradient fallback ────────────────────────────
  headerPattern: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignContent: 'center',
    gap: 20,
  },
  headerPatternDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  urgencyPill: {
    position: 'absolute',
    top: 10,
    left: 10,
    zIndex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radius.full,
  },
  urgencyPillText: {
    ...Type.label,
    color: '#fff',
  },
  // ─── Info section ──────────────────────────────
  infoSection: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.md,
    gap: Spacing.md,
  },
  tradeIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  infoCol: {
    flex: 1,
    gap: 6,
  },
  jobTitle: {
    ...Type.h3,
    fontWeight: '700',
  },
  infoMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  tradePill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.full,
  },
  tradePillText: {
    ...Type.label,
    textTransform: 'capitalize',
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
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flex: 1,
  },
  statText: {
    ...Type.caption,
    fontWeight: '500',
  },
  statDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    marginHorizontal: 6,
    opacity: 0.4,
  },
  urgencyDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },

  // ─── Description ───────────────────────────────
  descriptionWrap: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
  },
  description: {
    ...Type.caption,
  },

  // ─── Action row ────────────────────────────────
  actionRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    padding: Spacing.lg,
  },
  btnPrimary: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 11,
    borderRadius: Radius.lg,
    minHeight: 44,
  },
  btnPrimaryText: {
    ...Type.btnSecondary,
    color: '#fff',
    fontWeight: '700',
  },
  btnOutline: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 11,
    borderRadius: Radius.lg,
    borderWidth: 1.5,
    minHeight: 44,
  },
  btnOutlineText: {
    ...Type.btnSecondary,
    fontWeight: '700',
  },

  // ─── Empty / error states ──────────────────────
  centeredState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing['4xl'],
    gap: Spacing.md,
  },
  stateIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  stateTitle: {
    ...Type.h2,
    textAlign: 'center',
  },
  stateSubtext: {
    ...Type.body,
    textAlign: 'center',
  },
  stateCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: Spacing['2xl'],
    paddingVertical: Spacing.md,
    borderRadius: Radius.lg,
    marginTop: 8,
    minHeight: 44,
  },
  stateCtaText: {
    ...Type.bodySemiBold,
    color: '#fff',
    fontWeight: '700',
  },

  // ─── Speciality badge ──────────────────────────
  specPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.full,
  },
  specPillText: {
    ...Type.label,
    color: '#059669',
    fontWeight: '700',
  },

  // ─── Contract detail chips ─────────────────────
  contractChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
  },
  contractChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radius.full,
  },
  contractChipText: {
    ...Type.label,
    fontWeight: '600',
  },

  // ─── Contracts controls (My/Explore + search) ──
  contractControls: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    gap: Spacing.sm,
  },
  subtabRow: {
    flexDirection: 'row',
    gap: Spacing.lg,
  },
  subtab: {
    paddingVertical: 6,
    borderBottomWidth: 2,
  },
  subtabText: {
    ...Type.bodySemiBold,
    fontWeight: '700',
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    height: 40,
    borderRadius: Radius.lg,
    borderWidth: 1,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    paddingVertical: 0,
  },
});
