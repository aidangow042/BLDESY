import { useState, useCallback, useRef, useEffect } from 'react';
import {
  Animated,
  Dimensions,
  FlatList,
  Image,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
// SafeAreaView not needed — PageHeader handles top inset, tab bar handles bottom
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import Ionicons from '@expo/vector-icons/Ionicons';

import { Colors, Spacing, Radius, Shadows } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { supabase } from '@/lib/supabase';
import { PageHeader, HeaderIcon } from '@/components/page-header';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_PADDING = Spacing.xl;
const CARD_WIDTH = SCREEN_WIDTH - CARD_PADDING * 2;
const CAROUSEL_HEIGHT = 200;
const AVATAR_SIZE = 48;

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

// ─── Types ───────────────────────────────────────────────────────────────────

type SavedBuilder = {
  builder_id: string;
  business_name: string;
  trade_category: string;
  suburb: string;
  postcode: string;
  bio: string | null;
  profile_photo_url: string | null;
  cover_photo_url: string | null;
  projects: any[] | null;
  specialties: string[] | null;
  abn: string | null;
  license_key: string | null;
  saved_at: string;
  avg_rating: number;
  review_count: number;
};

// ─── Photo carousel ──────────────────────────────────────────────────────────

function PhotoCarousel({
  images,
  tradeCategory,
  colors,
  isDark,
}: {
  images: string[];
  tradeCategory: string;
  colors: any;
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

  // No images — branded placeholder
  if (images.length === 0) {
    return (
      <LinearGradient
        colors={isDark ? ['#134E4A', '#0f2a2a'] : ['#e6f7f5', '#f0fdfa']}
        style={styles.carouselPlaceholder}
      >
        <View style={styles.placeholderPattern}>
          {/* Subtle repeating dots */}
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
        <Text style={[styles.placeholderText, { color: colors.teal }]}>
          {tradeCategory.charAt(0).toUpperCase() + tradeCategory.slice(1)}
        </Text>
      </LinearGradient>
    );
  }

  const imageWidth = CARD_WIDTH - 2; // account for card border

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
      {/* Dot indicators */}
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

// ─── Animated card entrance ──────────────────────────────────────────────────

function AnimatedCard({ index, children }: { index: number; children: React.ReactNode }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(28)).current;

  useEffect(() => {
    const delay = Math.min(index * 100, 400);
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 420, delay, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 0, duration: 420, delay, useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <Animated.View style={{ opacity, transform: [{ translateY }] }}>
      {children}
    </Animated.View>
  );
}

// ─── Heart button with pop animation ─────────────────────────────────────────

function HeartButton({ onPress }: { onPress: () => void }) {
  const scale = useRef(new Animated.Value(1)).current;

  function handlePress() {
    Animated.sequence([
      Animated.timing(scale, { toValue: 1.35, duration: 100, useNativeDriver: true }),
      Animated.timing(scale, { toValue: 0.9, duration: 80, useNativeDriver: true }),
      Animated.timing(scale, { toValue: 1, duration: 100, useNativeDriver: true }),
    ]).start();
    onPress();
  }

  return (
    <Pressable onPress={handlePress} hitSlop={10} style={styles.heartBtn}>
      <Animated.View style={{ transform: [{ scale }] }}>
        <MaterialIcons name="favorite" size={22} color="#EF4444" />
      </Animated.View>
    </Pressable>
  );
}

// ─── Star display ────────────────────────────────────────────────────────────

function StarRating({ rating, count }: { rating: number; count: number }) {
  const full = Math.floor(rating);
  const half = rating - full >= 0.25;
  const stars: string[] = [];
  for (let i = 0; i < full; i++) stars.push('star');
  if (half) stars.push('star-half');
  while (stars.length < 5) stars.push('star-border');

  return (
    <View style={styles.starRow}>
      {stars.map((s, i) => (
        <MaterialIcons key={i} name={s as any} size={14} color="#F59E0B" />
      ))}
      <Text style={styles.ratingText}>{rating.toFixed(1)}</Text>
      <Text style={styles.reviewCountText}>({count})</Text>
    </View>
  );
}

// ─── Skeleton loading card ───────────────────────────────────────────────────

function SkeletonCard({ colors }: { colors: any }) {
  const shimmer = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, { toValue: 1, duration: 1000, useNativeDriver: true }),
        Animated.timing(shimmer, { toValue: 0, duration: 1000, useNativeDriver: true }),
      ]),
    );
    anim.start();
    return () => anim.stop();
  }, []);

  const opacity = shimmer.interpolate({ inputRange: [0, 1], outputRange: [0.25, 0.55] });

  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <Animated.View style={{ height: CAROUSEL_HEIGHT, backgroundColor: colors.border, opacity, borderTopLeftRadius: 15, borderTopRightRadius: 15 }} />
      <View style={{ padding: Spacing.lg, gap: Spacing.md }}>
        <View style={{ flexDirection: 'row', gap: Spacing.md, alignItems: 'center' }}>
          <Animated.View style={{ width: AVATAR_SIZE, height: AVATAR_SIZE, borderRadius: AVATAR_SIZE / 2, backgroundColor: colors.border, opacity }} />
          <View style={{ flex: 1, gap: 6 }}>
            <Animated.View style={{ height: 14, width: '65%', borderRadius: 7, backgroundColor: colors.border, opacity }} />
            <Animated.View style={{ height: 11, width: '45%', borderRadius: 5, backgroundColor: colors.border, opacity }} />
          </View>
        </View>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Animated.View style={{ height: 28, width: 80, borderRadius: Radius.full, backgroundColor: colors.border, opacity }} />
          <Animated.View style={{ height: 28, width: 90, borderRadius: Radius.full, backgroundColor: colors.border, opacity }} />
        </View>
        <Animated.View style={{ height: 12, width: '100%', borderRadius: 6, backgroundColor: colors.border, opacity }} />
        <Animated.View style={{ height: 12, width: '80%', borderRadius: 6, backgroundColor: colors.border, opacity }} />
        <View style={{ flexDirection: 'row', gap: 10, marginTop: 6 }}>
          <Animated.View style={{ flex: 1, height: 44, borderRadius: Radius.md, backgroundColor: colors.border, opacity }} />
          <Animated.View style={{ flex: 1.3, height: 44, borderRadius: Radius.md, backgroundColor: colors.border, opacity }} />
        </View>
      </View>
    </View>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═════════════════════════════════════════════════════════════════════════════

export default function SavedScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const colors = Colors[isDark ? 'dark' : 'light'];
  const teal = colors.teal;
  const router = useRouter();

  const [builders, setBuilders] = useState<SavedBuilder[]>([]);
  const [loading, setLoading] = useState(true);
  const [loggedIn, setLoggedIn] = useState(false);

  useFocusEffect(
    useCallback(() => {
      fetchSavedBuilders();
    }, []),
  );

  async function fetchSavedBuilders() {
    setLoading(true);

    const { data: userData } = await supabase.auth.getUser();
    if (!userData?.user) {
      setLoggedIn(false);
      setBuilders([]);
      setLoading(false);
      return;
    }

    setLoggedIn(true);

    const { data, error } = await supabase
      .from('saved_builders')
      .select('builder_id, created_at, builder_profiles(business_name, trade_category, suburb, postcode, bio, profile_photo_url, cover_photo_url, projects, specialties, abn, license_key)')
      .eq('user_id', userData.user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[Saved] fetch error:', error.message);
      setBuilders([]);
      setLoading(false);
      return;
    }

    // Map the base data
    const mapped: SavedBuilder[] = (data ?? [])
      .filter((row: any) => row.builder_profiles)
      .map((row: any) => ({
        builder_id: row.builder_id,
        business_name: row.builder_profiles.business_name,
        trade_category: row.builder_profiles.trade_category,
        suburb: row.builder_profiles.suburb,
        postcode: row.builder_profiles.postcode,
        bio: row.builder_profiles.bio,
        profile_photo_url: row.builder_profiles.profile_photo_url,
        cover_photo_url: row.builder_profiles.cover_photo_url,
        projects: row.builder_profiles.projects,
        specialties: row.builder_profiles.specialties,
        abn: row.builder_profiles.abn,
        license_key: row.builder_profiles.license_key,
        saved_at: row.created_at,
        avg_rating: 0,
        review_count: 0,
      }));

    // Fetch review stats for all saved builders in one query
    if (mapped.length > 0) {
      const builderIds = mapped.map((b) => b.builder_id);
      const { data: reviewData } = await supabase
        .from('reviews')
        .select('builder_id, rating')
        .in('builder_id', builderIds);

      if (reviewData && reviewData.length > 0) {
        const statsMap = new Map<string, { sum: number; count: number }>();
        for (const r of reviewData) {
          const existing = statsMap.get(r.builder_id) ?? { sum: 0, count: 0 };
          existing.sum += r.rating ?? 0;
          existing.count += 1;
          statsMap.set(r.builder_id, existing);
        }
        for (const b of mapped) {
          const stats = statsMap.get(b.builder_id);
          if (stats) {
            b.avg_rating = Math.round((stats.sum / stats.count) * 10) / 10;
            b.review_count = stats.count;
          }
        }
      }
    }

    setBuilders(mapped);
    setLoading(false);
  }

  async function unsaveBuilder(builderId: string) {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData?.user) return;
    setBuilders((prev) => prev.filter((b) => b.builder_id !== builderId));
    await supabase
      .from('saved_builders')
      .delete()
      .eq('user_id', userData.user.id)
      .eq('builder_id', builderId);
  }

  // ─── Collect project images for carousel ──────────────────────────

  function getCarouselImages(builder: SavedBuilder): string[] {
    const images: string[] = [];
    if (builder.cover_photo_url) images.push(builder.cover_photo_url);
    if (builder.projects?.length) {
      for (const proj of builder.projects) {
        if (proj.images?.length) {
          images.push(...proj.images);
        } else if (proj.image_url) {
          images.push(proj.image_url);
        }
      }
    }
    return images.slice(0, 5);
  }

  // ─── Verification badges ──────────────────────────────────────────

  function getVerifications(item: SavedBuilder) {
    const v: { label: string }[] = [];
    if (item.abn) v.push({ label: 'ABN' });
    if (item.license_key) v.push({ label: 'Licensed' });
    return v;
  }

  // ═════════════════════════════════════════════════════════════════════
  // BUILDER CARD
  // ═════════════════════════════════════════════════════════════════════

  function renderCard({ item, index }: { item: SavedBuilder; index: number }) {
    const tradeLabel = item.trade_category.charAt(0).toUpperCase() + item.trade_category.slice(1);
    const avatarUri =
      item.profile_photo_url ??
      `https://ui-avatars.com/api/?name=${encodeURIComponent(item.business_name)}&background=0d9488&color=fff&size=120`;
    const images = getCarouselImages(item);
    const verifications = getVerifications(item);
    const savedDate = new Date(item.saved_at).toLocaleDateString('en-AU', {
      day: 'numeric',
      month: 'short',
    });

    return (
      <AnimatedCard index={index}>
        <View
          style={[
            styles.card,
            { backgroundColor: isDark ? colors.surface : '#FFFFFF', borderColor: colors.border },
          ]}
        >
          {/* ─── Photo carousel (hero) ─── */}
          <View style={styles.carouselWrapper}>
            <PhotoCarousel
              images={images}
              tradeCategory={item.trade_category}
              colors={colors}
              isDark={isDark}
            />

            {/* Gradient overlay at bottom */}
            <LinearGradient
              colors={['transparent', 'rgba(0,0,0,0.35)']}
              style={styles.carouselGradient}
              pointerEvents="none"
            />

            {/* Heart button — frosted glass */}
            <HeartButton onPress={() => unsaveBuilder(item.builder_id)} />

            {/* Image count pill */}
            {images.length > 1 && (
              <View style={styles.imageCountPill}>
                <MaterialIcons name="photo-library" size={12} color="#fff" />
                <Text style={styles.imageCountText}>{images.length}</Text>
              </View>
            )}
          </View>

          {/* ─── Profile section ─── */}
          <View style={styles.profileSection}>
            {/* Avatar + name + trade */}
            <View style={styles.profileRow}>
              <View style={styles.avatarWrap}>
                <Image source={{ uri: avatarUri }} style={styles.avatar} />
              </View>
              <View style={styles.profileInfo}>
                <Text
                  style={[styles.businessName, { color: colors.text }]}
                  numberOfLines={1}
                >
                  {item.business_name}
                </Text>
                <View style={styles.tradeLocationRow}>
                  <View style={[styles.tradePill, { backgroundColor: colors.tealBg }]}>
                    <Text style={[styles.tradePillText, { color: teal }]}>{tradeLabel}</Text>
                  </View>
                  <View style={styles.locationChip}>
                    <MaterialIcons name="location-on" size={13} color={colors.textSecondary} />
                    <Text style={[styles.locationText, { color: colors.textSecondary }]}>
                      {item.suburb}, {item.postcode}
                    </Text>
                  </View>
                </View>
              </View>
            </View>

            {/* Star rating */}
            {item.review_count > 0 ? (
              <StarRating rating={item.avg_rating} count={item.review_count} />
            ) : (
              <View style={styles.starRow}>
                <MaterialIcons name="star-border" size={14} color={colors.icon} />
                <Text style={[styles.reviewCountText, { color: colors.textSecondary }]}>
                  No reviews yet
                </Text>
              </View>
            )}

            {/* Verification badges + specialties */}
            <View style={styles.badgeRow}>
              {verifications.map((v) => (
                <View
                  key={v.label}
                  style={[
                    styles.verifyBadge,
                    {
                      borderColor: isDark ? 'rgba(45,212,191,0.3)' : 'rgba(13,148,136,0.25)',
                      backgroundColor: isDark ? 'rgba(45,212,191,0.08)' : 'rgba(13,148,136,0.05)',
                    },
                  ]}
                >
                  <MaterialIcons name="check-circle" size={13} color={teal} />
                  <Text style={[styles.verifyText, { color: teal }]}>{v.label}</Text>
                </View>
              ))}
              {item.specialties && item.specialties.length > 0 && (
                <Pressable
                  style={[
                    styles.specBadge,
                    { backgroundColor: isDark ? colors.tintLight : '#F0F0FF' },
                  ]}
                  onPress={() =>
                    router.push({ pathname: '/builder-profile', params: { id: item.builder_id } })
                  }
                >
                  <Text style={[styles.specBadgeText, { color: colors.tint }]}>
                    {item.specialties.length} specialties
                  </Text>
                  <MaterialIcons name="chevron-right" size={14} color={colors.tint} />
                </Pressable>
              )}
            </View>

            {/* Bio snippet */}
            {item.bio ? (
              <Text
                style={[styles.bio, { color: colors.textSecondary }]}
                numberOfLines={2}
              >
                {item.bio}
              </Text>
            ) : null}

            {/* Saved date */}
            <Text style={[styles.savedDate, { color: colors.icon }]}>
              Saved {savedDate}
            </Text>

            {/* ─── CTA buttons ─── */}
            <View style={[styles.ctaDivider, { backgroundColor: colors.border }]} />
            <View style={styles.ctaRow}>
              <Pressable
                style={({ pressed }) => [
                  styles.btnOutline,
                  { borderColor: colors.border, backgroundColor: isDark ? colors.surface : '#fff' },
                  pressed && { opacity: 0.7, backgroundColor: colors.borderLight },
                ]}
                onPress={() =>
                  router.push({ pathname: '/builder-profile', params: { id: item.builder_id } })
                }
              >
                <Text style={[styles.btnOutlineText, { color: colors.text }]}>View Profile</Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [
                  styles.btnPrimary,
                  { backgroundColor: teal },
                  pressed && { opacity: 0.85 },
                ]}
                onPress={() =>
                  router.push({ pathname: '/builder-profile', params: { id: item.builder_id } })
                }
              >
                <Text style={styles.btnPrimaryText}>Request Quote</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </AnimatedCard>
    );
  }

  // ═════════════════════════════════════════════════════════════════════
  // HEADER
  // ═════════════════════════════════════════════════════════════════════

  function renderHeader() {
    return (
      <PageHeader
        title="Saved"
        subtitle={
          builders.length > 0
            ? `${builders.length} builder${builders.length !== 1 ? 's' : ''} saved`
            : 'Your favourite tradies'
        }
        variant="warm"
        rightElement={
          <HeaderIcon size={48} onRichBackground>
            <Ionicons name="bookmark" size={22} color="#ffffff" />
          </HeaderIcon>
        }
      />
    );
  }

  // ═════════════════════════════════════════════════════════════════════
  // STATES
  // ═════════════════════════════════════════════════════════════════════

  const pageBackground = colors.canvas;

  if (loading) {
    return (
      <View style={[styles.safeArea, { backgroundColor: pageBackground }]}>
        {renderHeader()}
        <View style={styles.skeletonList}>
          <SkeletonCard colors={colors} />
          <SkeletonCard colors={colors} />
        </View>
      </View>
    );
  }

  if (!loggedIn) {
    return (
      <View style={[styles.safeArea, { backgroundColor: pageBackground }]}>
        {renderHeader()}
        <View style={styles.emptyState}>
          <View style={[styles.emptyIconWrap, { backgroundColor: colors.tealBg }]}>
            <MaterialIcons name="lock-outline" size={44} color={teal} />
          </View>
          <Text style={[styles.emptyTitle, { color: colors.text }]}>Sign in to save tradies</Text>
          <Text style={[styles.emptySubtext, { color: colors.textSecondary }]}>
            Keep track of your favourite tradies so you can find them quickly when you need them.
          </Text>
        </View>
      </View>
    );
  }

  if (builders.length === 0) {
    return (
      <View style={[styles.safeArea, { backgroundColor: pageBackground }]}>
        {renderHeader()}
        <View style={styles.emptyState}>
          <View style={[styles.emptyIconWrap, { backgroundColor: colors.tealBg }]}>
            <Ionicons name="bookmarks-outline" size={44} color={teal} />
          </View>
          <Text style={[styles.emptyTitle, { color: colors.text }]}>
            No saved tradies yet
          </Text>
          <Text style={[styles.emptySubtext, { color: colors.textSecondary }]}>
            Tradies you save will appear here. Tap the heart on any tradie's profile to save them.
          </Text>
          <Pressable
            style={({ pressed }) => [
              styles.emptyCta,
              { backgroundColor: teal },
              pressed && { opacity: 0.85 },
            ]}
            onPress={() => router.push('/(tabs)' as any)}
          >
            <MaterialIcons name="search" size={20} color="#fff" />
            <Text style={styles.emptyCtaText}>Search tradies</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  // ═════════════════════════════════════════════════════════════════════
  // MAIN LIST
  // ═════════════════════════════════════════════════════════════════════

  return (
    <View style={[styles.safeArea, { backgroundColor: pageBackground }]}>
      {renderHeader()}
      <FlatList
        data={builders}
        keyExtractor={(item) => item.builder_id}
        renderItem={renderCard}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// STYLES
// ═════════════════════════════════════════════════════════════════════════════

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },

  /* ─── List ─────────────────────────────────────── */
  listContent: {
    paddingTop: Spacing.lg,
    paddingHorizontal: CARD_PADDING,
    paddingBottom: Spacing['5xl'] + 20,
    gap: Spacing.lg,
  },
  skeletonList: {
    paddingTop: Spacing.lg,
    paddingHorizontal: CARD_PADDING,
    gap: Spacing.lg,
  },

  /* ─── Card ─────────────────────────────────────── */
  card: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#0f172a',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
      },
      android: { elevation: 2 },
      default: {},
    }),
  },

  /* ─── Carousel ─────────────────────────────────── */
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
    gap: 6,
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
    fontSize: 44,
  },
  placeholderText: {
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  carouselGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 70,
  },
  dotRow: {
    position: 'absolute',
    bottom: 12,
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
  heartBtn: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.85)',
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.15,
        shadowRadius: 3,
      },
      android: { elevation: 3 },
      default: {},
    }),
  },
  imageCountPill: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Radius.full,
  },
  imageCountText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },

  /* ─── Profile section ──────────────────────────── */
  profileSection: {
    padding: Spacing.lg,
    gap: 10,
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  avatarWrap: {
    width: AVATAR_SIZE + 4,
    height: AVATAR_SIZE + 4,
    borderRadius: (AVATAR_SIZE + 4) / 2,
    borderWidth: 2.5,
    borderColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.08,
        shadowRadius: 3,
      },
      android: { elevation: 2 },
      default: {},
    }),
  },
  avatar: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
  },
  profileInfo: {
    flex: 1,
    gap: 4,
  },
  businessName: {
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  tradeLocationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  tradePill: {
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: Radius.full,
  },
  tradePillText: {
    fontSize: 12,
    fontWeight: '700',
  },
  locationChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  locationText: {
    fontSize: 13,
  },

  /* ─── Stars ────────────────────────────────────── */
  starRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  ratingText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#78716C',
    marginLeft: 3,
  },
  reviewCountText: {
    fontSize: 13,
    fontWeight: '400',
    color: '#A3A3A3',
  },

  /* ─── Badges ───────────────────────────────────── */
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    alignItems: 'center',
  },
  verifyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: Radius.full,
    borderWidth: 1,
  },
  verifyText: {
    fontSize: 12,
    fontWeight: '600',
  },
  specBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: Radius.full,
  },
  specBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },

  /* ─── Bio ──────────────────────────────────────── */
  bio: {
    fontSize: 14,
    lineHeight: 21,
    letterSpacing: -0.1,
  },

  /* ─── Saved date ───────────────────────────────── */
  savedDate: {
    fontSize: 12,
    fontWeight: '500',
  },

  /* ─── CTA buttons ──────────────────────────────── */
  ctaDivider: {
    height: 1,
    marginTop: 4,
  },
  ctaRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 2,
  },
  btnOutline: {
    flex: 1,
    height: 44,
    borderRadius: Radius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnOutlineText: {
    fontSize: 14,
    fontWeight: '600',
  },
  btnPrimary: {
    flex: 1.3,
    height: 44,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnPrimaryText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },

  /* ─── Empty state ──────────────────────────────── */
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing['3xl'] + 8,
    gap: Spacing.md,
  },
  emptyIconWrap: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  emptySubtext: {
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    letterSpacing: -0.1,
  },
  emptyCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing['2xl'],
    paddingVertical: Spacing.md + 2,
    borderRadius: Radius.lg,
    marginTop: Spacing.md,
    ...Shadows.md,
  },
  emptyCtaText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});
