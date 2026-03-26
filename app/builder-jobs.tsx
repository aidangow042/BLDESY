import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  FlatList,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import Ionicons from '@expo/vector-icons/Ionicons';

import ReAnimated, { FadeInUp } from 'react-native-reanimated';

import { Colors, Spacing, Radius, Shadows, Type } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { supabase } from '@/lib/supabase';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CAROUSEL_HEIGHT = 160;

// ─── Constants ───────────────────────────────────────────────────────────────

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
            resizeMode="cover"
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
  onPress,
  onApply,
}: {
  item: Job;
  index: number;
  colors: any;
  teal: string;
  isDark: boolean;
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

  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [builderTrade, setBuilderTrade] = useState<string | null>(null);
  const [filterUrgency, setFilterUrgency] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadJobs();
  }, []);

  useEffect(() => {
    if (builderTrade !== null) {
      loadJobs();
    }
  }, [filterUrgency]);

  async function loadJobs() {
    try {
      setLoading(true);

      const { data: userData } = await supabase.auth.getUser();
      if (!userData?.user) {
        setLoading(false);
        return;
      }

      const { data: profile } = await supabase
        .from('builder_profiles')
        .select('trade_category')
        .eq('user_id', userData.user.id)
        .maybeSingle();

      const trade = profile?.trade_category ?? null;
      setBuilderTrade(trade);

      // Build query: show matching trade first, then all other open jobs
      let query = supabase
        .from('jobs')
        .select('id, title, description, trade_category, suburb, postcode, urgency, budget, status, created_at, customer_id')
        .eq('status', 'open')
        .order('created_at', { ascending: false });

      if (filterUrgency) {
        query = query.eq('urgency', filterUrgency);
      }

      const { data: jobsData, error } = await query;

      // RLS filters to open jobs visible to approved builders

      if (!error && jobsData?.length) {
        // Fetch photos for all jobs in one query
        const jobIds = jobsData.map((j: any) => j.id);
        const { data: photosData } = await supabase
          .from('job_photos')
          .select('job_id, file_path')
          .in('job_id', jobIds)
          .order('is_cover', { ascending: false });

        // Group photos by job_id
        const photoMap = new Map<string, string[]>();
        for (const photo of photosData ?? []) {
          const arr = photoMap.get(photo.job_id) ?? [];
          arr.push(photo.file_path);
          photoMap.set(photo.job_id, arr);
        }

        const allJobs = jobsData.map((j: any) => ({ ...j, photos: photoMap.get(j.id) ?? [] }));
        // Sort: matching trade jobs first, then the rest
        if (trade) {
          const tradeLower = trade.toLowerCase();
          const matchingTrade = allJobs.filter((j: any) => j.trade_category?.toLowerCase() === tradeLower);
          const otherJobs = allJobs.filter((j: any) => j.trade_category?.toLowerCase() !== tradeLower);
          setJobs([...matchingTrade, ...otherJobs]);
        } else {
          setJobs(allJobs);
        }
      } else {
        setJobs([]);
      }
    } catch {
      // silently handle
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

  // Find the index where "other jobs" start
  const otherJobsStartIndex = builderTrade
    ? jobs.findIndex((j) => j.trade_category?.toLowerCase() !== builderTrade.toLowerCase())
    : -1;
  const hasMatchingJobs = builderTrade && otherJobsStartIndex !== 0;
  const hasOtherJobs = otherJobsStartIndex > 0 && otherJobsStartIndex < jobs.length;

  const renderJob = useCallback(
    ({ item, index }: { item: Job; index: number }) => (
      <>
        {/* Section header: Your Trade */}
        {index === 0 && hasMatchingJobs && builderTrade ? (
          <View style={styles.sectionHeader}>
            <View style={[styles.sectionHeaderDot, { backgroundColor: teal }]} />
            <Text style={[styles.sectionHeaderText, { color: colors.text }]}>
              {capitalise(builderTrade)} Jobs
            </Text>
          </View>
        ) : null}
        {/* Section header: Other Jobs */}
        {index === otherJobsStartIndex && hasOtherJobs ? (
          <View style={[styles.sectionHeader, { marginTop: Spacing.lg }]}>
            <View style={[styles.sectionHeaderDot, { backgroundColor: colors.textSecondary }]} />
            <Text style={[styles.sectionHeaderText, { color: colors.textSecondary }]}>
              Other Trades
            </Text>
          </View>
        ) : null}
        <JobCard
          item={item}
          index={index}
          colors={colors}
          teal={teal}
          isDark={isDark}
          onPress={() => handleJobPress(item.id)}
          onApply={() => handleJobPress(item.id)}
        />
      </>
    ),
    [colors, teal, isDark, handleJobPress, builderTrade, otherJobsStartIndex, hasMatchingJobs, hasOtherJobs],
  );

  const keyExtractor = useCallback((item: Job) => item.id, []);

  return (
    <View style={[styles.screen, { backgroundColor: colors.canvas }]}>
      {/* ─── Header ─── */}
      <LinearGradient
        colors={isDark ? ['#134E4A', '#0D3B3B'] : ['#0D7C66', '#0A6B58']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <SafeAreaView edges={['top']}>
          <View style={styles.headerBar}>
            <View style={styles.headerRow}>
              <Pressable
                style={({ pressed }) => [
                  styles.backBtn,
                  pressed && { opacity: 0.7 },
                ]}
                onPress={() => router.back()}
                accessibilityRole="button"
                accessibilityLabel="Go back"
              >
                <MaterialIcons name="arrow-back" size={20} color="#fff" />
              </Pressable>
              <View style={styles.headerCenter}>
                <Text style={styles.headerTitle}>Open Jobs</Text>
                <Text style={styles.headerSubtitle}>
                  {loading ? '...' : `${jobs.length} job${jobs.length !== 1 ? 's' : ''} available`}
                  {builderTrade ? ` · ${capitalise(builderTrade)}` : ''}
                </Text>
              </View>
              <View style={{ width: 36 }} />
            </View>
          </View>

        {/* ─── Filter/sort bar ─── */}
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
        </SafeAreaView>
      </LinearGradient>

      {/* ─── Content ─── */}
      <ReAnimated.View entering={FadeInUp.duration(300).delay(100)} style={{ flex: 1 }}>
      {loading ? (
        <ScrollView contentContainerStyle={styles.listContent} showsVerticalScrollIndicator={false}>
          {[0, 1, 2].map((i) => (
            <SkeletonCard key={i} colors={colors} delay={i * 150} />
          ))}
        </ScrollView>
      ) : jobs.length === 0 ? (
        <View style={styles.centeredState}>
          <View style={[styles.stateIconWrap, { backgroundColor: colors.tealBg }]}>
            <Ionicons name="briefcase-outline" size={36} color={teal} />
          </View>
          <Text style={[styles.stateTitle, { color: colors.text }]}>No open jobs right now</Text>
          <Text style={[styles.stateSubtext, { color: colors.textSecondary }]}>
            {filterUrgency
              ? `No ${URGENCY_CONFIG[filterUrgency]?.label ?? filterUrgency} jobs at the moment. Try a different filter.`
              : 'New jobs are posted regularly. Pull down to refresh.'}
          </Text>
          <Pressable
            onPress={loadJobs}
            style={({ pressed }) => [
              styles.stateCta,
              { backgroundColor: teal },
              pressed && { opacity: 0.85 },
            ]}
          >
            <MaterialIcons name="refresh" size={18} color="#fff" />
            <Text style={styles.stateCtaText}>Refresh Jobs</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={jobs}
          keyExtractor={keyExtractor}
          renderItem={renderJob}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          windowSize={5}
          maxToRenderPerBatch={8}
          removeClippedSubviews
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={teal} />
          }
          ListHeaderComponent={
            <View style={styles.resultCountRow}>
              <MaterialIcons name="format-list-numbered" size={14} color={colors.textSecondary} />
              <Text style={[styles.resultCounter, { color: colors.textSecondary }]}>
                {jobs.length} open job{jobs.length !== 1 ? 's' : ''}
                {filterUrgency ? ` · ${URGENCY_CONFIG[filterUrgency]?.label ?? filterUrgency}` : ''}
              </Text>
            </View>
          }
          ListFooterComponent={
            <View style={styles.endRow}>
              <View style={[styles.endLine, { backgroundColor: colors.border }]} />
              <Text style={[styles.endText, { color: colors.textSecondary }]}>
                All {jobs.length} results shown
              </Text>
              <View style={[styles.endLine, { backgroundColor: colors.border }]} />
            </View>
          }
        />
      )}
      </ReAnimated.View>
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

  // ─── Section headers ────────────────────────────
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  sectionHeaderDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  sectionHeaderText: {
    ...Type.h3,
    fontWeight: '700',
  },
});
