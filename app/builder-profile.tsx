import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated as RNAnimated,
  Dimensions,
  FlatList,
  Image,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Video, ResizeMode } from 'expo-av';

import { Ionicons } from '@expo/vector-icons';
import { MaterialIcons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { Colors, Spacing, Radius, Shadows } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { supabase } from '@/lib/supabase';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const COVER_HEIGHT = 260;
const AVATAR_SIZE = 88;

// ─── Types ───────────────────────────────────────────────────────────────────

type BuilderProfile = {
  id: string;
  business_name: string;
  bio: string | null;
  trade_category: string;
  suburb: string;
  postcode: string;
  phone: string | null;
  website: string | null;
  email?: string | null;
  radius_km?: number | null;
  abn?: string | null;
  license_key?: string | null;
  specialties?: string[] | null;
  established_year?: number | null;
  team_size?: string | null;
  availability?: string | null;
  availability_note?: string | null;
  response_time?: string | null;
  areas_serviced?: string | null;
  cover_photo_url?: string | null;
  profile_photo_url?: string | null;
  projects?: ProjectData[] | null;
  credentials?: CredentialData[] | null;
};

type ProjectData = {
  id: string;
  title: string;
  description?: string;
  costRange?: string;
  images: string[];
};

type CredentialData = {
  id: string;
  name: string;
  type: string;
};

type Project = {
  id: string;
  title: string;
  description?: string;
  costRange?: string;
  media: { uri: string; type: 'image' | 'video' }[];
};

type Review = {
  id: string;
  reviewer: string;
  rating: number;
  date: string;
  text: string;
  projectType?: string;
};

type SimilarBuilder = {
  id: string;
  name: string;
  trade: string;
  rating: number;
  location: string;
  photo: string;
};

// ─── Credential icon helper ──────────────────────────────────────────────────

function credentialIcon(type: string): string {
  switch (type) {
    case 'licence': return '🛡️';
    case 'insurance': return '📋';
    case 'membership': return '🏆';
    case 'award': return '⭐';
    default: return '📄';
  }
}

// ─── Convert DB project to display format ────────────────────────────────────

function projectToDisplay(p: ProjectData): Project {
  return {
    id: p.id,
    title: p.title,
    description: p.description,
    costRange: p.costRange,
    media: (p.images ?? []).map(uri => ({ uri, type: 'image' as const })),
  };
}

// ─── Helper Components ───────────────────────────────────────────────────────

function StarRow({ rating, size = 14, color }: { rating: number; size?: number; color: string }) {
  const stars = [];
  for (let i = 1; i <= 5; i++) {
    if (i <= Math.floor(rating)) {
      stars.push(<Text key={i} style={{ fontSize: size, color }}>★</Text>);
    } else if (i - 0.5 <= rating) {
      stars.push(<Text key={i} style={{ fontSize: size, color }}>★</Text>);
    } else {
      stars.push(<Text key={i} style={{ fontSize: size, color, opacity: 0.3 }}>★</Text>);
    }
  }
  return <View style={{ flexDirection: 'row', gap: 1 }}>{stars}</View>;
}

function SectionHeader({ title, colors }: { title: string; colors: any }) {
  return (
    <View style={sectionStyles.headerContainer}>
      <Text style={[sectionStyles.headerText, { color: colors.text }]}>{title}</Text>
      <View style={[sectionStyles.headerLine, { backgroundColor: colors.border }]} />
    </View>
  );
}

const sectionStyles = StyleSheet.create({
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: Spacing.lg,
  },
  headerText: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  headerLine: {
    flex: 1,
    height: 1,
  },
});

// ─── Gallery Lightbox ────────────────────────────────────────────────────────

function GalleryLightbox({
  visible,
  media,
  initialIndex,
  onClose,
}: {
  visible: boolean;
  media: { uri: string; type: 'image' | 'video' }[];
  initialIndex: number;
  onClose: () => void;
}) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    setCurrentIndex(initialIndex);
  }, [initialIndex]);

  const onViewableItemsChanged = useRef(({ viewableItems }: any) => {
    if (viewableItems.length > 0) {
      setCurrentIndex(viewableItems[0].index ?? 0);
    }
  }).current;

  if (!visible) return null;

  return (
    <Modal visible={visible} animationType="fade" transparent statusBarTranslucent>
      <View style={lightboxStyles.container}>
        <StatusBar barStyle="light-content" />
        <Pressable onPress={onClose} style={lightboxStyles.closeBtn}>
          <Text style={lightboxStyles.closeText}>✕</Text>
        </Pressable>

        <FlatList
          ref={flatListRef}
          data={media}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          initialScrollIndex={initialIndex}
          getItemLayout={(_, index) => ({
            length: SCREEN_WIDTH,
            offset: SCREEN_WIDTH * index,
            index,
          })}
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={{ itemVisiblePercentThreshold: 50 }}
          keyExtractor={(_, i) => String(i)}
          renderItem={({ item }) => (
            <View style={lightboxStyles.mediaContainer}>
              {item.type === 'video' ? (
                <Video
                  source={{ uri: item.uri }}
                  style={lightboxStyles.video}
                  resizeMode={ResizeMode.CONTAIN}
                  useNativeControls
                  shouldPlay
                />
              ) : (
                <Image
                  source={{ uri: item.uri }}
                  style={lightboxStyles.image}
                  resizeMode="contain"
                />
              )}
            </View>
          )}
        />

        <View style={lightboxStyles.counter}>
          <Text style={lightboxStyles.counterText}>
            {currentIndex + 1} / {media.length}
          </Text>
        </View>
      </View>
    </Modal>
  );
}

const lightboxStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
  },
  closeBtn: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 40,
    right: 20,
    zIndex: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '600',
  },
  mediaContainer: {
    width: SCREEN_WIDTH,
    justifyContent: 'center',
    alignItems: 'center',
  },
  image: {
    width: SCREEN_WIDTH,
    height: SCREEN_WIDTH * 0.75,
  },
  video: {
    width: SCREEN_WIDTH,
    height: SCREEN_WIDTH * 0.75,
  },
  counter: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 50 : 30,
    alignSelf: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
  },
  counterText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});

// ─── Main Component ──────────────────────────────────────────────────────────

export default function BuilderProfileScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme === 'dark' ? 'dark' : 'light'];
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [builder, setBuilder] = useState<BuilderProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSaved, setIsSaved] = useState(false);
  const [savingToggle, setSavingToggle] = useState(false);
  const [bioExpanded, setBioExpanded] = useState(false);
  const [showAllProjects, setShowAllProjects] = useState(false);
  const [showAllReviews, setShowAllReviews] = useState(false);
  const [credentialsExpanded, setCredentialsExpanded] = useState(false);
  const [lightboxVisible, setLightboxVisible] = useState(false);
  const [lightboxMedia, setLightboxMedia] = useState<{ uri: string; type: 'image' | 'video' }[]>([]);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [expandedReviews, setExpandedReviews] = useState<Set<string>>(new Set());

  // Animated save icon
  const saveScale = useRef(new RNAnimated.Value(1)).current;

  // Real data from DB (with safe defaults)
  const [reviews, setReviews] = useState<Review[]>([]);
  const [similarBuilders, setSimilarBuilders] = useState<SimilarBuilder[]>([]);
  const [avgRating, setAvgRating] = useState(0);
  const [reviewCount, setReviewCount] = useState(0);

  // Fetch reviews for this builder
  useEffect(() => {
    if (id) fetchReviews();
  }, [id]);

  async function fetchReviews() {
    const { data } = await supabase
      .from('reviews')
      .select('*')
      .eq('builder_id', id)
      .order('created_at', { ascending: false });

    if (data && data.length > 0) {
      setReviews(data.map((r: any) => ({
        id: r.id,
        reviewer: r.reviewer_name ?? 'Anonymous',
        rating: r.rating ?? 5,
        date: new Date(r.created_at).toLocaleDateString('en-AU', { month: 'short', year: 'numeric' }),
        text: r.comment ?? '',
        projectType: r.project_type ?? undefined,
      })));
      setReviewCount(data.length);
      const sum = data.reduce((acc: number, r: any) => acc + (r.rating ?? 0), 0);
      setAvgRating(Math.round((sum / data.length) * 10) / 10);
    }
  }

  // Fetch similar builders
  useEffect(() => {
    if (builder?.trade_category && builder?.id) fetchSimilar();
  }, [builder?.trade_category]);

  async function fetchSimilar() {
    if (!builder) return;
    const { data } = await supabase
      .from('builder_profiles')
      .select('id, business_name, trade_category, suburb, profile_photo_url')
      .eq('trade_category', builder.trade_category)
      .neq('id', builder.id)
      .eq('approved', true)
      .limit(4);

    if (data) {
      setSimilarBuilders(data.map((b: any) => ({
        id: b.id,
        name: b.business_name,
        trade: b.trade_category,
        rating: 0,
        location: `${b.suburb}, NSW`,
        photo: b.profile_photo_url ?? `https://ui-avatars.com/api/?name=${encodeURIComponent(b.business_name)}&background=0d9488&color=fff`,
      })));
    }
  }

  useEffect(() => {
    if (id) {
      fetchBuilder();
      checkIfSaved();
    }
  }, [id]);

  async function fetchBuilder() {
    setLoading(true);
    setError(null);

    const { data, error: fetchError } = await supabase
      .from('builder_profiles')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError) {
      setError(fetchError.message);
    } else {
      setBuilder(data);
    }
    setLoading(false);
  }

  async function checkIfSaved() {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData?.user) return;

    const { data } = await supabase
      .from('saved_builders')
      .select('id')
      .eq('user_id', userData.user.id)
      .eq('builder_id', id)
      .maybeSingle();

    setIsSaved(!!data);
  }

  async function toggleSave() {
    // Animate
    RNAnimated.sequence([
      RNAnimated.timing(saveScale, { toValue: 1.3, duration: 120, useNativeDriver: true }),
      RNAnimated.timing(saveScale, { toValue: 1, duration: 120, useNativeDriver: true }),
    ]).start();

    setSavingToggle(true);

    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData?.user) {
      Alert.alert('Sign in required', 'You need to be logged in to save builders.');
      setSavingToggle(false);
      return;
    }

    if (isSaved) {
      await supabase
        .from('saved_builders')
        .delete()
        .eq('user_id', userData.user.id)
        .eq('builder_id', id);
      setIsSaved(false);
    } else {
      const { error: insertError } = await supabase.from('saved_builders').insert({
        user_id: userData.user.id,
        builder_id: id,
      });
      if (insertError) {
        Alert.alert('Error', insertError.message);
      } else {
        setIsSaved(true);
      }
    }

    setSavingToggle(false);
  }

  function handleCall() {
    if (builder?.phone) {
      Linking.openURL(`tel:${builder.phone}`);
    }
  }

  function handleEmail() {
    if (builder?.email) {
      Linking.openURL(`mailto:${builder.email}`);
    }
  }

  function handleWebsite() {
    if (builder?.website) {
      const url = builder.website.startsWith('http')
        ? builder.website
        : `https://${builder.website}`;
      Linking.openURL(url);
    }
  }

  function openLightbox(media: { uri: string; type: 'image' | 'video' }[], index: number) {
    setLightboxMedia(media);
    setLightboxIndex(index);
    setLightboxVisible(true);
  }

  function toggleReviewExpanded(reviewId: string) {
    setExpandedReviews(prev => {
      const next = new Set(prev);
      if (next.has(reviewId)) next.delete(reviewId);
      else next.add(reviewId);
      return next;
    });
  }

  // (rating breakdown is computed after builder loads)

  // ─── Render helpers ──────────────────────────────────────────────────

  const teal = colors.teal;
  const tealDark = colors.tealDark;

  const tealBg = colors.tealBg;
  const bgCanvas = colors.canvas;

  if (loading) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={teal} style={styles.loader} />
      </SafeAreaView>
    );
  }

  if (error || !builder) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
        <View style={styles.centeredContainer}>
          <ThemedText type="subtitle">Builder not found</ThemedText>
          <ThemedText style={{ color: colors.textSecondary, textAlign: 'center', fontSize: 14, lineHeight: 20 }}>
            {error ?? 'This builder profile could not be loaded.'}
          </ThemedText>
          <Pressable
            onPress={() => (router.back())}
            style={({ pressed }) => [
              styles.outlineBtn,
              { borderColor: teal },
              pressed && { opacity: 0.7 },
            ]}
          >
            <Text style={[styles.outlineBtnText, { color: teal }]}>Go back</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  // Derive display data from real builder object
  const builderProjects: Project[] = (builder.projects ?? []).map(projectToDisplay);
  const displayProjects = showAllProjects ? builderProjects : builderProjects.slice(0, 4);
  const displayReviews = showAllReviews ? reviews : reviews.slice(0, 3);
  const bio = builder.bio ?? '';
  const builderSpecialties = builder.specialties ?? [];
  const builderCredentials = builder.credentials ?? [];
  const estYear = builder.established_year;
  const yearsInBusiness = estYear ? new Date().getFullYear() - estYear : null;
  const totalPhotos = builderProjects.reduce((acc: number, p) => acc + p.media.length, 0);
  const coverUri = builder.cover_photo_url ?? null;
  const avatarUri = builder.profile_photo_url ?? `https://ui-avatars.com/api/?name=${encodeURIComponent(builder.business_name)}&background=0d9488&color=fff&size=200`;

  // Verification badges (only show ones that apply)
  const badges: string[] = [];
  if (builder.license_key) badges.push('Licensed');
  if (builder.abn) badges.push('ABN Verified');

  // Availability display
  const availLabel = builder.availability === 'available' ? (builder.availability_note || 'Taking jobs now')
    : builder.availability === 'limited' ? (builder.availability_note || 'Limited availability')
    : (builder.availability_note || 'Currently unavailable');
  const availDotColor = builder.availability === 'available' ? '#22c55e'
    : builder.availability === 'limited' ? '#f59e0b' : '#ef4444';

  // Rating breakdown from real reviews
  const ratingBreakdown = [5, 4, 3, 2, 1].map(stars => ({
    stars,
    count: reviews.filter(r => r.rating === stars).length,
  }));

  return (
    <View style={[styles.safeArea, { backgroundColor: bgCanvas }]}>
      <StatusBar barStyle="light-content" />

      {/* Lightbox */}
      <GalleryLightbox
        visible={lightboxVisible}
        media={lightboxMedia}
        initialIndex={lightboxIndex}
        onClose={() => setLightboxVisible(false)}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        bounces
        contentContainerStyle={{ paddingBottom: 100 }}
      >
        {/* ─── COVER PHOTO + HEADER ─── */}
        <View style={{ height: COVER_HEIGHT + AVATAR_SIZE / 2 }}>
          {coverUri ? (
            <Image source={{ uri: coverUri }} style={styles.coverImage} />
          ) : (
            <LinearGradient
              colors={colorScheme === 'dark' ? ['#042f2e', '#0f3d3a', '#134E4A'] : ['#0d9488', '#0f766e', '#115e59']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.coverImage}
            >
              <View style={styles.coverDotsLayer} pointerEvents="none">
                {Array.from({ length: 4 }).map((_, row) => (
                  <View key={row} style={styles.coverDotsRow}>
                    {Array.from({ length: 10 }).map((_, col) => (
                      <View key={col} style={styles.coverDot} />
                    ))}
                  </View>
                ))}
              </View>
            </LinearGradient>
          )}
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.65)']}
            style={styles.coverGradient}
          />

          {/* Back button */}
          <Pressable
            onPress={() => (router.back())}
            accessibilityRole="button"
            accessibilityLabel="Go back"
            style={({ pressed }) => [
              styles.backBtn,
              { top: insets.top + 8 },
              pressed && { opacity: 0.7 },
            ]}
          >
            <Ionicons name="arrow-back" size={22} color="#ffffff" />
          </Pressable>

          {/* Save button (top right) */}
          <Pressable
            onPress={toggleSave}
            disabled={savingToggle}
            accessibilityRole="button"
            accessibilityLabel={isSaved ? 'Remove from saved' : 'Save builder'}
            style={({ pressed }) => [
              styles.saveHeaderBtn,
              { top: insets.top + 8 },
              pressed && { opacity: 0.7 },
            ]}
          >
            <RNAnimated.View style={{ transform: [{ scale: saveScale }] }}>
              <MaterialIcons
                name={isSaved ? 'favorite' : 'favorite-border'}
                size={22}
                color={isSaved ? '#EF4444' : '#ffffff'}
              />
            </RNAnimated.View>
          </Pressable>

          {/* Profile photo + info overlay */}
          <View style={styles.headerInfoContainer}>
            <View style={[styles.avatarContainer, { borderColor: bgCanvas }]}>
              <Image source={{ uri: avatarUri }} style={styles.avatar} />
            </View>
            <View style={styles.headerTextContainer}>
              <Text style={styles.businessNameOverlay} numberOfLines={2}>
                {builder.business_name}
              </Text>
              <Text style={styles.tradeSubtitle}>
                Licensed {builder.trade_category.charAt(0).toUpperCase() + builder.trade_category.slice(1)}
              </Text>
            </View>
          </View>
        </View>

        {/* ─── META INFO BAR ─── */}
        <View style={[styles.metaBar, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.metaItem}>
            <Text style={{ fontSize: 13, color: colors.textSecondary }}>📍</Text>
            <Text style={[styles.metaText, { color: colors.text }]}>
              {builder.suburb}, NSW
            </Text>
          </View>
          {reviewCount > 0 && (
            <>
              <View style={[styles.metaDivider, { backgroundColor: colors.border }]} />
              <View style={styles.metaItem}>
                <StarRow rating={avgRating} size={13} color="#f59e0b" />
                <Text style={[styles.metaText, { color: colors.text }]}>
                  {avgRating} · {reviewCount} reviews
                </Text>
              </View>
            </>
          )}
          {estYear && (
            <>
              <View style={[styles.metaDivider, { backgroundColor: colors.border }]} />
              <View style={styles.metaItem}>
                <Text style={{ fontSize: 13, color: colors.textSecondary }}>🏗️</Text>
                <Text style={[styles.metaText, { color: colors.text }]}>Est. {estYear}</Text>
              </View>
            </>
          )}
        </View>

        {/* ─── VERIFICATION BADGES ─── */}
        {badges.length > 0 && (
          <View style={styles.badgeRow}>
            {badges.map(badge => (
              <View key={badge} style={[styles.badge, { backgroundColor: tealBg }]}>
                <Text style={{ fontSize: 12, color: teal }}>✓</Text>
                <Text style={[styles.badgeText, { color: teal }]}>{badge}</Text>
              </View>
            ))}
          </View>
        )}

        {/* ─── ACTION BUTTONS ─── */}
        <View style={[styles.sectionContainer, styles.actionSection]}>
          <View style={styles.actionRow}>
            <Pressable
              onPress={handleCall}
              style={({ pressed }) => [
                styles.actionBtn,
                { backgroundColor: colors.surface, borderColor: colors.border },
                pressed && { opacity: 0.7 },
              ]}
            >
              <Text style={{ fontSize: 20 }}>📞</Text>
              <Text style={[styles.actionBtnLabel, { color: colors.text }]}>Call</Text>
            </Pressable>

            <Pressable
              onPress={handleEmail}
              style={({ pressed }) => [
                styles.actionBtn,
                { backgroundColor: colors.surface, borderColor: colors.border },
                pressed && { opacity: 0.7 },
              ]}
            >
              <Text style={{ fontSize: 20 }}>✉️</Text>
              <Text style={[styles.actionBtnLabel, { color: colors.text }]}>Email</Text>
            </Pressable>

            <Pressable
              onPress={handleWebsite}
              style={({ pressed }) => [
                styles.actionBtn,
                { backgroundColor: colors.surface, borderColor: colors.border },
                pressed && { opacity: 0.7 },
              ]}
            >
              <Text style={{ fontSize: 20 }}>🌐</Text>
              <Text style={[styles.actionBtnLabel, { color: colors.text }]}>Website</Text>
            </Pressable>
          </View>

          {/* REQUEST QUOTE - Primary CTA */}
          <Pressable
            style={({ pressed }) => [
              styles.quoteCta,
              { backgroundColor: teal },
              pressed && { backgroundColor: tealDark },
            ]}
          >
            <Text style={styles.quoteCtaText}>Request a Quote</Text>
          </Pressable>
        </View>

        {/* ─── ABOUT ─── */}
        <View style={[styles.sectionContainer, styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <SectionHeader title="About" colors={colors} />

          <Text
            style={[styles.bioText, { color: colors.text }]}
            numberOfLines={bioExpanded ? undefined : 4}
          >
            {bio}
          </Text>
          {bio.length > 200 && (
            <Pressable onPress={() => setBioExpanded(!bioExpanded)}>
              <Text style={[styles.readMoreText, { color: teal }]}>
                {bioExpanded ? 'Show less' : 'Read more'}
              </Text>
            </Pressable>
          )}

          {/* Business details */}
          <View style={[styles.detailsGrid, { borderTopColor: colors.border }]}>
            {builder.abn && <DetailRow icon="📄" label="ABN" value={builder.abn} colors={colors} />}
            {builder.license_key && <DetailRow icon="🪪" label="Licence" value={builder.license_key} colors={colors} />}
            {yearsInBusiness && <DetailRow icon="⏱️" label="Experience" value={`${yearsInBusiness} years`} colors={colors} />}
            {builder.team_size && <DetailRow icon="👷" label="Team" value={builder.team_size} colors={colors} />}
            <DetailRow
              icon="📍"
              label="Service area"
              value={builder.areas_serviced || `${builder.suburb} & surrounds within ${builder.radius_km ?? 50}km`}
              colors={colors}
            />
          </View>
        </View>

        {/* ─── SPECIALTIES ─── */}
        {builderSpecialties.length > 0 && (
          <View style={[styles.sectionContainer, styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <SectionHeader title="Specialties" colors={colors} />
            <View style={styles.chipWrap}>
              {builderSpecialties.map(spec => (
                <View key={spec} style={[styles.chip, { borderColor: teal, backgroundColor: tealBg }]}>
                  <Text style={[styles.chipText, { color: teal }]}>{spec}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* ─── PROJECT GALLERY ─── */}
        <View style={styles.sectionContainer}>
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <SectionHeader title="Our Work" colors={colors} />
            {builderProjects.length > 0 ? (
              <Text style={[styles.projectStats, { color: colors.textSecondary }]}>
                {builderProjects.length} project{builderProjects.length !== 1 ? 's' : ''} · {totalPhotos} photo{totalPhotos !== 1 ? 's' : ''}
              </Text>
            ) : (
              <Text style={[styles.projectStats, { color: colors.textSecondary }]}>
                No projects added yet.
              </Text>
            )}

            {displayProjects.map((project) => (
              <View key={project.id} style={styles.projectCard}>
                {/* Project images grid: large left + stacked right */}
                <View style={styles.projectGrid}>
                  {/* Main image */}
                  <Pressable
                    onPress={() => openLightbox(project.media, 0)}
                    style={({ pressed }) => [
                      styles.projectMainImage,
                      pressed && { opacity: 0.8 },
                    ]}
                  >
                    <Image source={{ uri: project.media[0].uri }} style={styles.projectImageFill} />
                    {project.media[0].type === 'video' && (
                      <View style={styles.playOverlay}>
                        <Text style={styles.playIcon}>▶</Text>
                      </View>
                    )}
                  </Pressable>
                  {/* Stacked thumbs on right */}
                  {project.media.length > 1 && (
                    <View style={styles.projectThumbColumn}>
                      {project.media.slice(1, 3).map((m, idx) => (
                        <Pressable
                          key={idx}
                          onPress={() => openLightbox(project.media, idx + 1)}
                          style={({ pressed }) => [
                            styles.projectThumb,
                            pressed && { opacity: 0.8 },
                          ]}
                        >
                          <Image source={{ uri: m.uri }} style={styles.projectImageFill} />
                          {m.type === 'video' && (
                            <View style={styles.playOverlay}>
                              <Text style={styles.playIcon}>▶</Text>
                            </View>
                          )}
                          {idx === 1 && project.media.length > 3 && (
                            <View style={styles.moreOverlay}>
                              <Text style={styles.moreText}>+{project.media.length - 3}</Text>
                            </View>
                          )}
                        </Pressable>
                      ))}
                    </View>
                  )}
                </View>

                <Text style={[styles.projectTitle, { color: colors.text }]}>{project.title}</Text>
                {project.description && (
                  <Text style={[styles.projectDesc, { color: colors.textSecondary }]} numberOfLines={2}>
                    {project.description}
                  </Text>
                )}
                {project.costRange && (
                  <View style={[styles.costBadge, { backgroundColor: tealBg }]}>
                    <Text style={[styles.costText, { color: teal }]}>{project.costRange}</Text>
                  </View>
                )}
              </View>
            ))}

            {!showAllProjects && builderProjects.length > 4 && (
              <Pressable
                onPress={() => setShowAllProjects(true)}
                style={({ pressed }) => [
                  styles.viewAllBtn,
                  { borderColor: teal },
                  pressed && { opacity: 0.7 },
                ]}
              >
                <Text style={[styles.viewAllText, { color: teal }]}>
                  View all {builderProjects.length} projects
                </Text>
              </Pressable>
            )}
          </View>
        </View>

        {/* ─── REVIEWS ─── */}
        <View style={styles.sectionContainer}>
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <SectionHeader title="Reviews" colors={colors} />

            {/* Overall rating */}
            <View style={styles.ratingOverview}>
              <View style={styles.ratingLeft}>
                <Text style={[styles.ratingBig, { color: colors.text }]}>{avgRating}</Text>
                <StarRow rating={avgRating} size={18} color="#f59e0b" />
                <Text style={[styles.ratingCount, { color: colors.textSecondary }]}>
                  {reviewCount} reviews
                </Text>
              </View>

              {/* Rating breakdown bars */}
              <View style={styles.ratingBars}>
                {ratingBreakdown.map(({ stars, count }) => (
                  <View key={stars} style={styles.barRow}>
                    <Text style={[styles.barLabel, { color: colors.textSecondary }]}>{stars}</Text>
                    <View style={[styles.barTrack, { backgroundColor: colors.borderLight }]}>
                      <View
                        style={[
                          styles.barFill,
                          {
                            backgroundColor: '#f59e0b',
                            width: `${reviewCount > 0 ? (count / reviewCount) * 100 : 0}%`,
                          },
                        ]}
                      />
                    </View>
                  </View>
                ))}
              </View>
            </View>

            {/* Individual reviews */}
            {displayReviews.map((review) => {
              const isExpanded = expandedReviews.has(review.id);
              return (
                <View key={review.id} style={[styles.reviewCard, { borderTopColor: colors.border }]}>
                  <View style={styles.reviewHeader}>
                    <View style={[styles.reviewerAvatar, { backgroundColor: tealBg }]}>
                      <Text style={{ color: teal, fontWeight: '700', fontSize: 14 }}>
                        {review.reviewer.charAt(0)}
                      </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.reviewerName, { color: colors.text }]}>{review.reviewer}</Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <StarRow rating={review.rating} size={12} color="#f59e0b" />
                        <Text style={[styles.reviewDate, { color: colors.textSecondary }]}>{review.date}</Text>
                      </View>
                    </View>
                  </View>
                  {review.projectType && (
                    <Text style={[styles.reviewProject, { color: colors.textSecondary }]}>
                      Hired for: {review.projectType}
                    </Text>
                  )}
                  <Text
                    style={[styles.reviewText, { color: colors.text }]}
                    numberOfLines={isExpanded ? undefined : 3}
                  >
                    {review.text}
                  </Text>
                  {review.text.length > 120 && (
                    <Pressable onPress={() => toggleReviewExpanded(review.id)}>
                      <Text style={[styles.readMoreText, { color: teal }]}>
                        {isExpanded ? 'Show less' : 'Read more'}
                      </Text>
                    </Pressable>
                  )}
                </View>
              );
            })}

            {!showAllReviews && reviews.length > 3 && (
              <Pressable
                onPress={() => setShowAllReviews(true)}
                style={({ pressed }) => [
                  styles.viewAllBtn,
                  { borderColor: teal },
                  pressed && { opacity: 0.7 },
                ]}
              >
                <Text style={[styles.viewAllText, { color: teal }]}>
                  View all {reviewCount} reviews
                </Text>
              </Pressable>
            )}

            {/* Write a review button */}
            <Pressable
              onPress={() => Alert.alert('Coming soon', 'Review submission will be available soon.')}
              style={({ pressed }) => [
                styles.writeReviewBtn,
                { borderColor: colors.border },
                pressed && { opacity: 0.7 },
              ]}
            >
              <Text style={[styles.writeReviewText, { color: colors.text }]}>✏️  Write a Review</Text>
            </Pressable>
          </View>
        </View>

        {/* ─── AVAILABILITY ─── */}
        <View style={[styles.sectionContainer, styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <SectionHeader title="Availability" colors={colors} />
          <View style={styles.availRow}>
            <View style={[styles.greenDot, { backgroundColor: availDotColor }]} />
            <Text style={[styles.availText, { color: colors.text }]}>{availLabel}</Text>
          </View>
          {builder.response_time && (
            <View style={styles.availRow}>
              <Text style={{ fontSize: 14, color: colors.textSecondary }}>⏱️</Text>
              <Text style={[styles.availText, { color: colors.textSecondary }]}>Usually responds {builder.response_time.toLowerCase()}</Text>
            </View>
          )}
          <View style={styles.availRow}>
            <Text style={{ fontSize: 14, color: colors.textSecondary }}>📍</Text>
            <Text style={[styles.availText, { color: colors.textSecondary }]}>
              {builder.areas_serviced || builder.suburb}
            </Text>
          </View>
        </View>

        {/* ─── CREDENTIALS ─── */}
        <View style={[styles.sectionContainer, styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Pressable
            onPress={() => setCredentialsExpanded(!credentialsExpanded)}
            style={styles.credentialsHeader}
          >
            <SectionHeader title="Credentials & Documents" colors={colors} />
            <Text style={{ fontSize: 16, color: colors.textSecondary }}>
              {credentialsExpanded ? '▲' : '▼'}
            </Text>
          </Pressable>

          {credentialsExpanded && builderCredentials.length > 0 && (
            <View style={{ gap: Spacing.sm }}>
              {builderCredentials.map((cred: CredentialData) => (
                <View key={cred.id} style={[styles.credCard, { borderColor: colors.border }]}>
                  <Text style={{ fontSize: 22 }}>{credentialIcon(cred.type)}</Text>
                  <Text style={[styles.credName, { color: colors.text }]}>{cred.name}</Text>
                  <Pressable
                    style={({ pressed }) => [
                      styles.credViewBtn,
                      { backgroundColor: tealBg },
                      pressed && { opacity: 0.7 },
                    ]}
                  >
                    <Text style={[styles.credViewText, { color: teal }]}>View</Text>
                  </Pressable>
                </View>
              ))}
            </View>
          )}
          {credentialsExpanded && builderCredentials.length === 0 && (
            <Text style={{ color: colors.textSecondary, fontSize: 14 }}>No documents added yet.</Text>
          )}
        </View>

        {/* ─── SIMILAR TRADIES ─── */}
        {similarBuilders.length > 0 && (
          <View style={styles.sectionContainer}>
            <SectionHeader title="Similar tradies in your area" colors={colors} />
            <FlatList
              data={similarBuilders}
              horizontal
              showsHorizontalScrollIndicator={false}
              keyExtractor={(item) => item.id}
              contentContainerStyle={{ gap: Spacing.md }}
              renderItem={({ item }) => (
                <Pressable
                  onPress={() => router.push({ pathname: '/builder-profile', params: { id: item.id } })}
                  style={({ pressed }) => [
                    styles.similarCard,
                    { backgroundColor: colors.surface, borderColor: colors.border },
                    pressed && { opacity: 0.8 },
                  ]}
                >
                  <Image source={{ uri: item.photo }} style={styles.similarPhoto} />
                  <View style={styles.similarInfo}>
                    <Text style={[styles.similarName, { color: colors.text }]} numberOfLines={1}>
                      {item.name}
                    </Text>
                    <Text style={[styles.similarTrade, { color: colors.textSecondary }]}>
                      {item.trade}
                    </Text>
                    <Text style={[styles.similarLocation, { color: colors.textSecondary }]}>
                      {item.location}
                    </Text>
                  </View>
                </Pressable>
              )}
            />
          </View>
        )}
      </ScrollView>

      {/* ─── STICKY BOTTOM CTA ─── */}
      <View
        style={[
          styles.stickyBottom,
          {
            backgroundColor: bgCanvas,
            borderTopColor: colors.border,
            paddingBottom: Math.max(insets.bottom, 16),
          },
        ]}
      >
        <Pressable
          style={({ pressed }) => [
            styles.stickyQuoteBtn,
            { backgroundColor: teal },
            pressed && { backgroundColor: tealDark },
          ]}
        >
          <Text style={styles.stickyQuoteText}>Request a Quote</Text>
        </Pressable>
      </View>
    </View>
  );
}

// ─── Detail Row sub-component ────────────────────────────────────────────────

function DetailRow({
  icon,
  label,
  value,
  colors,
}: {
  icon: string;
  label: string;
  value: string;
  colors: any;
}) {
  return (
    <View style={styles.detailRow}>
      <Text style={{ fontSize: 15 }}>{icon}</Text>
      <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>{label}</Text>
      <Text style={[styles.detailValue, { color: colors.text }]}>{value}</Text>
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  loader: {
    marginTop: 60,
  },
  centeredContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing['2xl'],
    gap: Spacing.md,
  },
  outlineBtn: {
    borderWidth: 1.5,
    borderRadius: Radius.lg,
    height: 48,
    paddingHorizontal: Spacing['3xl'],
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.sm,
  },
  outlineBtnText: {
    fontSize: 15,
    fontWeight: '600',
  },

  // Cover
  coverImage: {
    width: '100%',
    height: COVER_HEIGHT,
    backgroundColor: '#1e293b',
  },
  coverGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: AVATAR_SIZE / 2,
    height: COVER_HEIGHT / 2,
  },
  coverDotsLayer: {
    ...StyleSheet.absoluteFillObject,
    gap: 16,
    paddingHorizontal: 10,
    paddingTop: 20,
    opacity: 0.5,
  },
  coverDotsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  coverDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  backBtn: {
    position: 'absolute',
    left: 16,
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(0,0,0,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  saveHeaderBtn: {
    position: 'absolute',
    right: 16,
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(0,0,0,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },

  // Header info
  headerInfoContainer: {
    position: 'absolute',
    bottom: 0,
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  avatarContainer: {
    width: AVATAR_SIZE + 4,
    height: AVATAR_SIZE + 4,
    borderRadius: (AVATAR_SIZE + 4) / 2,
    borderWidth: 3,
    overflow: 'hidden',
    ...Shadows.md,
  },
  avatar: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
  },
  headerTextContainer: {
    flex: 1,
    marginLeft: 14,
    marginBottom: AVATAR_SIZE / 2 + 4,
  },
  businessNameOverlay: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.3,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  tradeSubtitle: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 14,
    fontWeight: '500',
    marginTop: 2,
  },

  // Meta bar
  metaBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderBottomWidth: 1,
    marginHorizontal: Spacing.lg,
    borderRadius: Radius.lg,
    marginTop: Spacing.md,
    ...Shadows.sm,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    flex: 1,
    justifyContent: 'center',
  },
  metaText: {
    fontSize: 12,
    fontWeight: '600',
  },
  metaDivider: {
    width: 1,
    height: 24,
    marginHorizontal: 4,
  },

  // Badges
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    marginTop: Spacing.md,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: Radius.full,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
  },

  // Actions
  sectionContainer: {
    paddingHorizontal: Spacing.lg,
    marginTop: Spacing.xl,
  },
  actionSection: {
    marginTop: Spacing.sm,
  },
  actionRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  actionBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    borderRadius: Radius.lg,
    borderWidth: 1,
    gap: 4,
    ...Shadows.sm,
  },
  actionBtnLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  quoteCta: {
    marginTop: Spacing.md,
    height: 54,
    borderRadius: Radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.md,
  },
  quoteCtaText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: 0.3,
  },

  // Card wrapper
  card: {
    borderWidth: 1,
    borderRadius: Radius.xl,
    padding: Spacing.lg,
    ...Shadows.sm,
  },

  // About
  bioText: {
    fontSize: 15,
    lineHeight: 24,
  },
  readMoreText: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 6,
  },
  detailsGrid: {
    marginTop: Spacing.lg,
    paddingTop: Spacing.lg,
    borderTopWidth: 1,
    gap: Spacing.md,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  detailLabel: {
    fontSize: 13,
    fontWeight: '600',
    width: 80,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },

  // Specialties
  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: Radius.full,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '600',
  },

  // Projects
  projectStats: {
    fontSize: 13,
    fontWeight: '500',
    marginBottom: Spacing.lg,
    marginTop: -4,
  },
  projectCard: {
    marginBottom: Spacing.xl,
  },
  projectGrid: {
    flexDirection: 'row',
    gap: 3,
    borderRadius: Radius.md,
    overflow: 'hidden',
    height: 180,
  },
  projectMainImage: {
    flex: 2,
    height: '100%',
  },
  projectThumbColumn: {
    flex: 1,
    gap: 3,
  },
  projectThumb: {
    flex: 1,
  },
  projectImageFill: {
    width: '100%',
    height: '100%',
    backgroundColor: '#e2e8f0',
  },
  playOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  playIcon: {
    color: '#fff',
    fontSize: 28,
  },
  moreOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  moreText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  projectTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginTop: Spacing.sm,
  },
  projectDesc: {
    fontSize: 13,
    lineHeight: 20,
    marginTop: 4,
  },
  costBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radius.full,
    marginTop: 6,
  },
  costText: {
    fontSize: 13,
    fontWeight: '700',
  },
  viewAllBtn: {
    borderWidth: 1.5,
    borderRadius: Radius.lg,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.sm,
  },
  viewAllText: {
    fontSize: 14,
    fontWeight: '700',
  },

  // Reviews
  ratingOverview: {
    flexDirection: 'row',
    marginBottom: Spacing.lg,
    gap: Spacing.xl,
  },
  ratingLeft: {
    alignItems: 'center',
    gap: 4,
  },
  ratingBig: {
    fontSize: 42,
    fontWeight: '800',
    letterSpacing: -1,
    lineHeight: 46,
  },
  ratingCount: {
    fontSize: 13,
    fontWeight: '500',
  },
  ratingBars: {
    flex: 1,
    justifyContent: 'center',
    gap: 5,
  },
  barRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  barLabel: {
    fontSize: 12,
    fontWeight: '600',
    width: 12,
    textAlign: 'center',
  },
  barTrack: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 4,
  },
  reviewCard: {
    paddingTop: Spacing.lg,
    borderTopWidth: 1,
    marginTop: Spacing.md,
  },
  reviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  reviewerAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reviewerName: {
    fontSize: 14,
    fontWeight: '700',
  },
  reviewDate: {
    fontSize: 12,
    fontWeight: '400',
  },
  reviewProject: {
    fontSize: 12,
    fontWeight: '500',
    fontStyle: 'italic',
    marginBottom: 6,
  },
  reviewText: {
    fontSize: 14,
    lineHeight: 22,
  },
  writeReviewBtn: {
    borderWidth: 1,
    borderRadius: Radius.lg,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.lg,
  },
  writeReviewText: {
    fontSize: 14,
    fontWeight: '600',
  },

  // Availability
  availRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  greenDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  availText: {
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },

  // Credentials
  credentialsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  credCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: Spacing.md,
    borderWidth: 1,
    borderRadius: Radius.md,
  },
  credName: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
  },
  credViewBtn: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: Radius.full,
  },
  credViewText: {
    fontSize: 13,
    fontWeight: '700',
  },

  // Similar tradies
  similarCard: {
    width: 160,
    borderWidth: 1,
    borderRadius: Radius.lg,
    overflow: 'hidden',
    ...Shadows.sm,
  },
  similarPhoto: {
    width: '100%',
    height: 100,
    backgroundColor: '#e2e8f0',
  },
  similarInfo: {
    padding: 10,
    gap: 2,
  },
  similarName: {
    fontSize: 13,
    fontWeight: '700',
  },
  similarTrade: {
    fontSize: 12,
    fontWeight: '500',
  },
  similarRating: {
    fontSize: 12,
    fontWeight: '600',
  },
  similarLocation: {
    fontSize: 11,
    fontWeight: '400',
  },

  // Sticky bottom
  stickyBottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
  },
  stickyQuoteBtn: {
    height: 52,
    borderRadius: Radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.md,
  },
  stickyQuoteText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
});
