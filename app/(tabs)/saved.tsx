import { useState, useCallback, useRef, useEffect } from 'react';
import {
  Alert,
  Animated,
  Dimensions,
  FlatList,
  Image,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import Ionicons from '@expo/vector-icons/Ionicons';

import { useSafeAreaInsets } from 'react-native-safe-area-context';

import * as Haptics from 'expo-haptics';

import { Colors, Spacing, Radius, Shadows, Type } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { supabase } from '@/lib/supabase';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_PADDING = Spacing.xl;
const CARD_WIDTH = SCREEN_WIDTH - CARD_PADDING * 2;
const CAROUSEL_HEIGHT = 190;
const AVATAR_SIZE = 60;
const AVATAR_OVERLAP = AVATAR_SIZE / 2;

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

  // No images — branded placeholder with trade icon on teal-to-grey gradient
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

// ─── Animated card entrance (staggered 50ms) ────────────────────────────────

function AnimatedCard({ index, children }: { index: number; children: React.ReactNode }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(24)).current;

  useEffect(() => {
    const delay = Math.min(index * 50, 300);
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 380, delay, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 0, duration: 380, delay, useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <Animated.View style={{ opacity, transform: [{ translateY }] }}>
      {children}
    </Animated.View>
  );
}

// ─── Bookmark button with frosted glass + pop animation ──────────────────────

function BookmarkButton({ onPress }: { onPress: () => void }) {
  const scale = useRef(new Animated.Value(1)).current;

  function handlePress() {
    Alert.alert(
      'Remove from Saved?',
      'This builder will be removed from your saved list.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            Animated.sequence([
              Animated.timing(scale, { toValue: 1.4, duration: 90, useNativeDriver: true }),
              Animated.timing(scale, { toValue: 0.85, duration: 70, useNativeDriver: true }),
              Animated.timing(scale, { toValue: 1, duration: 100, useNativeDriver: true }),
            ]).start();
            onPress();
          },
        },
      ],
    );
  }

  return (
    <Pressable
      onPress={handlePress}
      hitSlop={10}
      style={styles.bookmarkBtn}
      accessibilityLabel="Remove from saved"
      accessibilityRole="button"
    >
      <Animated.View style={{ transform: [{ scale }] }}>
        <MaterialIcons name="bookmark" size={22} color={Colors.light.teal} />
      </Animated.View>
    </Pressable>
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
      <View style={{ padding: Spacing.md, paddingTop: AVATAR_OVERLAP + Spacing.sm, gap: 8 }}>
        <View style={{ flexDirection: 'row', gap: Spacing.sm, alignItems: 'center' }}>
          <View style={{ flex: 1, gap: 6 }}>
            <Animated.View style={{ height: 14, width: '65%', borderRadius: 7, backgroundColor: colors.border, opacity }} />
            <Animated.View style={{ height: 11, width: '45%', borderRadius: 5, backgroundColor: colors.border, opacity }} />
          </View>
        </View>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Animated.View style={{ height: 26, width: 80, borderRadius: Radius.full, backgroundColor: colors.border, opacity }} />
          <Animated.View style={{ height: 26, width: 90, borderRadius: Radius.full, backgroundColor: colors.border, opacity }} />
        </View>
        <Animated.View style={{ height: 12, width: '100%', borderRadius: 6, backgroundColor: colors.border, opacity }} />
        <View style={{ flexDirection: 'row', gap: 10, marginTop: 4 }}>
          <Animated.View style={{ flex: 1, height: 42, borderRadius: Radius.md, backgroundColor: colors.border, opacity }} />
          <Animated.View style={{ flex: 1, height: 42, borderRadius: Radius.md, backgroundColor: colors.border, opacity }} />
        </View>
      </View>
    </View>
  );
}

// ─── Discover more tradies suggestion card ───────────────────────────────────

function DiscoverCard({ colors, teal, onPress }: { colors: any; teal: string; onPress: () => void }) {
  return (
    <AnimatedCard index={1}>
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [
          styles.discoverCard,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
          },
          pressed && { opacity: 0.85 },
        ]}
      >
        <View style={[styles.discoverIconWrap, { backgroundColor: colors.tealBg }]}>
          <MaterialIcons name="search" size={28} color={teal} />
        </View>
        <View style={styles.discoverTextCol}>
          <Text style={[styles.discoverTitle, { color: colors.text }]}>
            Discover more tradies
          </Text>
          <Text style={[styles.discoverSub, { color: colors.textSecondary }]}>
            Find the right trade for your next job
          </Text>
        </View>
        <MaterialIcons name="chevron-right" size={22} color={colors.icon} />
      </Pressable>
    </AnimatedCard>
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
  const [refreshing, setRefreshing] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);

  useFocusEffect(
    useCallback(() => {
      fetchSavedBuilders();
    }, []),
  );

  async function fetchSavedBuilders(isRefresh = false) {
    if (!isRefresh) setLoading(true);

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
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const { data: userData } = await supabase.auth.getUser();
    if (!userData?.user) return;
    setBuilders((prev) => prev.filter((b) => b.builder_id !== builderId));
    await supabase
      .from('saved_builders')
      .delete()
      .eq('user_id', userData.user.id)
      .eq('builder_id', builderId);
  }

  // ─── Collect project images for carousel (project photos only, not logo) ──

  function getCarouselImages(builder: SavedBuilder): string[] {
    const images: string[] = [];
    // Only use actual project photos, not logo/profile photo
    if (builder.projects?.length) {
      for (const proj of builder.projects) {
        if (proj.images?.length) {
          images.push(...proj.images);
        } else if (proj.image_url) {
          images.push(proj.image_url);
        }
      }
    }
    // Fall back to cover photo only if it exists and we have no project photos
    if (images.length === 0 && builder.cover_photo_url) {
      images.push(builder.cover_photo_url);
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
              isDark={isDark}
            />

            {/* Gradient overlay at bottom */}
            <LinearGradient
              colors={['transparent', 'rgba(0,0,0,0.3)']}
              style={styles.carouselGradient}
              pointerEvents="none"
            />

            {/* Bookmark button — frosted glass */}
            <BookmarkButton onPress={() => unsaveBuilder(item.builder_id)} />

            {/* Image count pill */}
            {images.length > 0 && (
              <View style={styles.imageCountPill}>
                <MaterialIcons name="photo-library" size={12} color="#fff" />
                <Text style={styles.imageCountText}>{images.length}</Text>
              </View>
            )}
          </View>

          {/* ─── Avatar overlapping banner ─── */}
          <View style={styles.avatarOverlapWrap}>
            <View style={styles.avatarRing}>
              <Image source={{ uri: avatarUri }} style={styles.avatar} />
            </View>
          </View>

          {/* ─── Profile section ─── */}
          <View style={styles.profileSection}>
            {/* Name + trade + location + saved date */}
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
                  <MaterialIcons name="location-on" size={12} color={colors.textSecondary} />
                  <Text style={[styles.locationText, { color: colors.textSecondary }]}>
                    {item.suburb}, {item.postcode}
                  </Text>
                </View>
                <Text style={[styles.savedDateInline, { color: colors.icon }]}>
                  · Saved {savedDate}
                </Text>
              </View>
            </View>

            {/* Rating or "New on BLDEASY" */}
            {item.review_count > 0 ? (
              <View style={styles.ratingRow}>
                <Text style={styles.ratingBig}>{item.avg_rating.toFixed(1)}</Text>
                <MaterialIcons name="star" size={16} color="#F59E0B" />
                <Text style={[styles.reviewCountText, { color: colors.textSecondary }]}>
                  · {item.review_count} review{item.review_count !== 1 ? 's' : ''}
                </Text>
              </View>
            ) : (
              <View style={styles.newBadgeRow}>
                <View style={styles.newBadge}>
                  <MaterialIcons name="auto-awesome" size={12} color="#92400E" />
                  <Text style={styles.newBadgeText}>New on BLDEASY</Text>
                </View>
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
                    {
                      borderColor: isDark ? 'rgba(99,102,241,0.3)' : 'rgba(79,70,229,0.2)',
                      backgroundColor: isDark ? colors.tintLight : '#F0F0FF',
                    },
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

            {/* ─── CTA buttons ─── */}
            <View style={[styles.ctaDivider, { backgroundColor: colors.border }]} />
            <View style={styles.ctaRow}>
              <Pressable
                style={({ pressed }) => [
                  styles.btnOutline,
                  {
                    borderColor: isDark ? colors.border : '#C4C9CF',
                    backgroundColor: isDark ? colors.surface : '#F8F9FA',
                  },
                  pressed && { opacity: 0.7 },
                ]}
                onPress={() =>
                  router.push({ pathname: '/builder-profile', params: { id: item.builder_id } })
                }
                accessibilityRole="button"
                accessibilityLabel={`View ${item.business_name} profile`}
              >
                <MaterialIcons name="person" size={15} color={colors.text} />
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
                accessibilityRole="button"
                accessibilityLabel={`Contact ${item.business_name}`}
              >
                <MaterialIcons name="phone" size={15} color="#fff" />
                <Text style={styles.btnPrimaryText}>Contact</Text>
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

  const insets = useSafeAreaInsets();
  const count = builders.length;
  const subtitleText = count > 0
    ? `${count} builder${count !== 1 ? 's' : ''} saved`
    : 'Your favourite tradies';

  function renderHeader() {
    return (
      <LinearGradient
        colors={isDark ? ['#134E4A', '#0D3B3B'] : ['#0D7C66', '#0A6B58']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[headerStyles.gradient, { paddingTop: insets.top + 6 }]}
      >
        <View style={headerStyles.content}>
          <View style={headerStyles.textCol}>
            <Text style={headerStyles.title}>Saved</Text>
            <Text style={headerStyles.subtitle}>{subtitleText}</Text>
          </View>
          {count > 0 ? (
            <View style={headerStyles.countBadge}>
              <Text style={headerStyles.countNumber}>{count}</Text>
              <Ionicons name="bookmark" size={11} color="rgba(255,255,255,0.7)" />
            </View>
          ) : (
            <View style={headerStyles.iconCircle}>
              <Ionicons name="bookmark-outline" size={20} color="#fff" />
            </View>
          )}
        </View>
      </LinearGradient>
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
          <View style={[styles.emptyIconCircle, { backgroundColor: colors.tealBg }]}>
            <MaterialIcons name="lock-outline" size={48} color={teal} />
          </View>
          <Text style={[styles.emptyTitle, { color: colors.text }]}>Sign in to save tradies</Text>
          <Text style={[styles.emptySubtext, { color: colors.textSecondary }]}>
            Keep track of your favourite tradies so you can find them quickly when you need them.
          </Text>
        </View>
      </View>
    );
  }

  // ─── Zero saved tradies — full empty state ───
  if (builders.length === 0) {
    return (

      <View style={[styles.safeArea, { backgroundColor: pageBackground }]}>
        {renderHeader()}
        <View style={styles.emptyState}>
          <View style={[styles.emptyIconCircle, { backgroundColor: colors.tealBg }]}>
            <Ionicons name="bookmark-outline" size={48} color={teal} />
          </View>
          <Text style={[styles.emptyTitle, { color: colors.text }]}>
            No saved tradies yet
          </Text>
          <Text style={[styles.emptySubtext, { color: colors.textSecondary }]}>
            Tap the bookmark on any tradie's profile to save them here for quick access.
          </Text>
          <Pressable
            style={({ pressed }) => [
              styles.emptyOutlineCta,
              { borderColor: teal },
              pressed && { opacity: 0.7 },
            ]}
            onPress={() => router.push('/(tabs)' as any)}
            accessibilityRole="button"
            accessibilityLabel="Browse Tradies"
          >
            <Text style={[styles.emptyOutlineCtaText, { color: teal }]}>Browse Tradies</Text>
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
        ListFooterComponent={
          builders.length <= 2 ? (
            <DiscoverCard
              colors={colors}
              teal={teal}
              onPress={() => router.push('/(tabs)' as any)}
            />
          ) : null
        }
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={async () => {
              setRefreshing(true);
              await fetchSavedBuilders(true);
              setRefreshing(false);
            }}
            tintColor={teal}
          />
        }
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
    gap: 15,
  },
  skeletonList: {
    paddingTop: Spacing.lg,
    paddingHorizontal: CARD_PADDING,
    gap: 15,
  },

  /* ─── Card ─────────────────────────────────────── */
  card: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#0f172a',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.06,
        shadowRadius: 10,
      },
      android: { elevation: 3 },
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
  bookmarkBtn: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.75)',
    alignItems: 'center',
    justifyContent: 'center',
    // Frosted glass effect
    ...(Platform.OS === 'ios'
      ? {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.12,
          shadowRadius: 4,
        }
      : { elevation: 4 }),
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

  /* ─── Avatar overlapping banner ──────────────────── */
  avatarOverlapWrap: {
    position: 'relative',
    height: AVATAR_OVERLAP,
    marginTop: -AVATAR_OVERLAP,
    paddingLeft: Spacing.md,
    zIndex: 2,
  },
  avatarRing: {
    width: AVATAR_SIZE + 6,
    height: AVATAR_SIZE + 6,
    borderRadius: (AVATAR_SIZE + 6) / 2,
    borderWidth: 3,
    borderColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: { elevation: 3 },
      default: {},
    }),
  },
  avatar: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
  },

  /* ─── Profile section ──────────────────────────── */
  profileSection: {
    paddingHorizontal: Spacing.md,
    paddingTop: AVATAR_OVERLAP + 4,
    paddingBottom: Spacing.md,
    gap: 7,
  },
  profileInfo: {
    gap: 3,
  },
  businessName: {
    ...Type.h3,
  },
  tradeLocationRow: {
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
    ...Type.label,
  },
  locationChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  locationText: {
    ...Type.caption,
  },
  savedDateInline: {
    ...Type.caption,
  },

  /* ─── Rating ────────────────────────────────────── */
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  ratingBig: {
    ...Type.captionSemiBold,
    color: '#92400E',
  },
  reviewCountText: {
    ...Type.caption,
  },

  /* ─── New badge ─────────────────────────────────── */
  newBadgeRow: {
    flexDirection: 'row',
  },
  newBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: Radius.full,
  },
  newBadgeText: {
    ...Type.label,
    color: '#92400E',
  },

  /* ─── Badges ───────────────────────────────────── */
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
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
    ...Type.caption,
  },
  specBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: Radius.full,
    borderWidth: 1,
  },
  specBadgeText: {
    ...Type.caption,
  },

  /* ─── Bio ──────────────────────────────────────── */
  bio: {
    ...Type.caption,
  },

  /* ─── CTA buttons ──────────────────────────────── */
  ctaDivider: {
    height: 1,
    marginTop: 2,
  },
  ctaRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 2,
  },
  btnOutline: {
    flex: 1,
    height: 42,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
  },
  btnOutlineText: {
    ...Type.btnSecondary,
  },
  btnPrimary: {
    flex: 1,
    height: 42,
    borderRadius: Radius.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
  },
  btnPrimaryText: {
    ...Type.btnSecondary,
    color: '#fff',
  },

  /* ─── Discover card ─────────────────────────────── */
  discoverCard: {
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    gap: Spacing.md,
  },
  discoverIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  discoverTextCol: {
    flex: 1,
    gap: 2,
  },
  discoverTitle: {
    ...Type.bodySemiBold,
  },
  discoverSub: {
    ...Type.caption,
  },

  /* ─── Empty state ──────────────────────────────── */
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing['3xl'] + 8,
    gap: Spacing.md,
  },
  emptyIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  emptyTitle: {
    ...Type.h2,
    textAlign: 'center',
  },
  emptySubtext: {
    ...Type.body,
    textAlign: 'center',
  },
  emptyOutlineCta: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderRadius: 16,
    height: 48,
    paddingHorizontal: 32,
    marginTop: Spacing.md,
  },
  emptyOutlineCtaText: {
    ...Type.btnSecondary,
  },
});

// ═════════════════════════════════════════════════════════════════════════════
// HEADER STYLES
// ═════════════════════════════════════════════════════════════════════════════

const headerStyles = StyleSheet.create({
  gradient: {
    paddingBottom: 12,
    paddingHorizontal: Spacing.xl,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.lg,
  },
  textCol: {
    flex: 1,
    gap: 2,
  },
  title: {
    ...Type.h3,
    color: '#fff',
    fontWeight: '700',
  },
  subtitle: {
    ...Type.caption,
    color: 'rgba(255,255,255,0.6)',
    fontWeight: '500',
  },
  countBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: Radius.full,
  },
  countNumber: {
    ...Type.captionSemiBold,
    color: '#fff',
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
