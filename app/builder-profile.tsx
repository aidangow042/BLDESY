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

import * as Clipboard from 'expo-clipboard';

import { ThemedText } from '@/components/themed-text';
import { Colors, Spacing, Radius, Shadows } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { supabase } from '@/lib/supabase';
import { addRecentProfile } from '@/lib/recent-profiles';

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
  team_members?: TeamMember[] | null;
  faqs?: FAQItem[] | null;
};

type ProjectData = {
  id: string;
  title: string;
  description?: string;
  costRange?: string;
  images: string[];
  beforeImage?: string | null;
  afterImage?: string | null;
  testimonial?: { name: string; videoUri?: string; text?: string } | null;
};

type CredentialData = {
  id: string;
  name: string;
  type: string;
};

type TeamMember = {
  id: string;
  name: string;
  role: string;
  photoUri?: string | null;
};

type FAQItem = {
  id: string;
  question: string;
  answer: string;
};

type Project = {
  id: string;
  title: string;
  description?: string;
  costRange?: string;
  media: { uri: string; type: 'image' | 'video' }[];
  beforeImage?: string | null;
  afterImage?: string | null;
  testimonial?: { name: string; videoUri?: string; text?: string } | null;
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

// ─── Convert DB project to display format ────────────────────────────────────

function projectToDisplay(p: ProjectData): Project {
  return {
    id: p.id,
    title: p.title,
    description: p.description,
    costRange: p.costRange,
    media: (p.images ?? []).map(uri => ({
      uri,
      type: (uri.match(/\.(mp4|mov|webm)$/i) ? 'video' : 'image') as 'image' | 'video',
    })),
    beforeImage: p.beforeImage,
    afterImage: p.afterImage,
    testimonial: p.testimonial,
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
  const teal = colors.teal;
  return (
    <View style={sectionStyles.headerContainer}>
      <View style={[sectionStyles.headerAccent, { backgroundColor: teal }]} />
      <Text style={[sectionStyles.headerText, { color: colors.text }]}>{title}</Text>
      <View style={[sectionStyles.headerLine, { backgroundColor: colors.border, opacity: 0.5 }]} />
    </View>
  );
}

const sectionStyles = StyleSheet.create({
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: Spacing.lg,
  },
  headerAccent: {
    width: 3,
    height: 16,
    borderRadius: 1.5,
  },
  headerText: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  headerLine: {
    flex: 1,
    height: 0.5,
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

// ─── Before / After Slider ──────────────────────────────────────────────────

function BeforeAfterCompare({ beforeUri, afterUri, onPress }: { beforeUri: string; afterUri: string; onPress?: (index: number) => void }) {
  const halfWidth = (SCREEN_WIDTH - Spacing.lg * 2 - Spacing.lg * 2 - 3) / 2;

  return (
    <View style={baStyles.container}>
      <View style={baStyles.header}>
        <Ionicons name="git-compare-outline" size={14} color="#fff" />
        <Text style={baStyles.headerText}>Before & After</Text>
      </View>
      <View style={baStyles.row}>
        <Pressable
          onPress={() => onPress?.(0)}
          style={({ pressed }) => [baStyles.half, pressed && { opacity: 0.9 }]}
        >
          <Image source={{ uri: beforeUri }} style={[baStyles.image, { width: halfWidth }]} />
          <View style={baStyles.label}>
            <Text style={baStyles.labelText}>BEFORE</Text>
          </View>
        </Pressable>
        <View style={baStyles.divider} />
        <Pressable
          onPress={() => onPress?.(1)}
          style={({ pressed }) => [baStyles.half, pressed && { opacity: 0.9 }]}
        >
          <Image source={{ uri: afterUri }} style={[baStyles.image, { width: halfWidth }]} />
          <View style={[baStyles.label, baStyles.labelAfter]}>
            <Text style={baStyles.labelText}>AFTER</Text>
          </View>
        </Pressable>
      </View>
    </View>
  );
}

const baStyles = StyleSheet.create({
  container: {
    borderRadius: Radius.md,
    overflow: 'hidden',
    marginBottom: Spacing.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  headerText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  row: {
    flexDirection: 'row',
  },
  half: {
    flex: 1,
    height: 180,
    overflow: 'hidden',
  },
  image: {
    height: 180,
    resizeMode: 'cover',
  },
  divider: {
    width: 3,
    backgroundColor: '#fff',
  },
  label: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    backgroundColor: 'rgba(220,50,50,0.85)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  labelAfter: {
    backgroundColor: 'rgba(16,185,129,0.85)',
    left: undefined,
    right: 8,
  },
  labelText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
});

// ─── Project Image Carousel ──────────────────────────────────────────────────

function ProjectCarousel({ media, onPress }: { media: { uri: string; type: 'image' | 'video' }[]; onPress: (index: number) => void }) {
  const CAROUSEL_WIDTH = SCREEN_WIDTH - Spacing.lg * 2 - 2; // card padding + border
  const CAROUSEL_HEIGHT = 220;
  const [activeIndex, setActiveIndex] = useState(0);

  const onScroll = useRef((e: any) => {
    const idx = Math.round(e.nativeEvent.contentOffset.x / CAROUSEL_WIDTH);
    setActiveIndex(idx);
  }).current;

  if (media.length === 1) {
    return (
      <Pressable onPress={() => onPress(0)} style={({ pressed }) => pressed && { opacity: 0.9 }}>
        <View style={{ height: CAROUSEL_HEIGHT, overflow: 'hidden' }}>
          <Image source={{ uri: media[0].uri }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
          {media[0].type === 'video' && (
            <View style={carouselStyles.playOverlay}>
              <View style={carouselStyles.playCircle}>
                <Ionicons name="play" size={22} color="#fff" />
              </View>
            </View>
          )}
        </View>
      </Pressable>
    );
  }

  return (
    <View>
      <ScrollView
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
        decelerationRate="fast"
        snapToInterval={CAROUSEL_WIDTH}
      >
        {media.map((m, idx) => (
          <Pressable
            key={idx}
            onPress={() => onPress(idx)}
            style={({ pressed }) => pressed && { opacity: 0.9 }}
          >
            <View style={{ width: CAROUSEL_WIDTH, height: CAROUSEL_HEIGHT }}>
              <Image source={{ uri: m.uri }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
              {m.type === 'video' && (
                <View style={carouselStyles.playOverlay}>
                  <View style={carouselStyles.playCircle}>
                    <Ionicons name="play" size={22} color="#fff" />
                  </View>
                </View>
              )}
            </View>
          </Pressable>
        ))}
      </ScrollView>
      {/* Dots */}
      {media.length > 1 && (
        <View style={carouselStyles.dots}>
          {media.map((_, idx) => (
            <View
              key={idx}
              style={[
                carouselStyles.dot,
                idx === activeIndex ? carouselStyles.dotActive : carouselStyles.dotInactive,
              ]}
            />
          ))}
          {media.length > 1 && (
            <Text style={carouselStyles.countText}>{activeIndex + 1}/{media.length}</Text>
          )}
        </View>
      )}
    </View>
  );
}

const carouselStyles = StyleSheet.create({
  playOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  playCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderWidth: 2.5,
    borderColor: 'rgba(255,255,255,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingLeft: 3,
  },
  dots: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 10,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  dotActive: {
    backgroundColor: '#0d9488',
    width: 18,
    borderRadius: 4,
  },
  dotInactive: {
    backgroundColor: 'rgba(0,0,0,0.15)',
  },
  countText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#94a3b8',
    marginLeft: 6,
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
  const [expandedFAQs, setExpandedFAQs] = useState<Set<string>>(new Set());
  const [faqOpen, setFaqOpen] = useState(false);

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
      .select('id, rating, comment, reviewer_name, project_type, created_at')
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
      .select('id, user_id, business_name, trade_category, suburb, postcode, bio, website, profile_photo_url, cover_photo_url, projects, specialties, credentials, availability, availability_note, response_time, urgency_capacity, abn, license_key, latitude, longitude, radius_km, faqs, team_members')
      .eq('id', id)
      .single();

    if (fetchError) {
      setError(fetchError.message);
    } else {
      setBuilder(data);
      addRecentProfile({
        id: data.id,
        business_name: data.business_name,
        trade_category: data.trade_category,
        suburb: data.suburb,
        profile_photo_url: data.profile_photo_url,
      });
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

  async function fetchContactInfo(): Promise<{ phone: string | null; email: string | null } | null> {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData?.user) {
      Alert.alert('Sign in required', 'Please sign in to view contact details.');
      return null;
    }
    const { data, error } = await supabase.rpc('get_builder_contact', { p_builder_id: id });
    if (error || !data) {
      Alert.alert('Error', 'Could not load contact info.');
      return null;
    }
    return data as { phone: string | null; email: string | null };
  }

  async function handleCall() {
    const contact = await fetchContactInfo();
    if (contact?.phone) {
      await Clipboard.setStringAsync(contact.phone);
      Alert.alert('Copied', `${contact.phone} copied to clipboard`);
    } else if (contact) {
      Alert.alert('No phone', 'This builder has not listed a phone number.');
    }
  }

  async function handleEmail() {
    const contact = await fetchContactInfo();
    if (contact?.email) {
      await Clipboard.setStringAsync(contact.email);
      Alert.alert('Copied', `${contact.email} copied to clipboard`);
    } else if (contact) {
      Alert.alert('No email', 'This builder has not listed an email address.');
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
  const totalVideos = builderProjects.reduce((acc: number, p) => acc + p.media.filter(m => m.type === 'video').length, 0);
  const displayProjects = showAllProjects ? builderProjects : builderProjects.slice(0, 3);
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

      {/* ─── TOP TEAL BAR ─── */}
      <LinearGradient
        colors={colorScheme === 'dark' ? ['#134E4A', '#0D3B3B'] : ['#0D7C66', '#0A6B58']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.topBar, { paddingTop: insets.top + 4 }]}
      >
        <Pressable
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Go back"
          style={({ pressed }) => [styles.topBarBackBtn, pressed && { opacity: 0.7 }]}
        >
          <Ionicons name="arrow-back" size={20} color="#fff" />
        </Pressable>
        <Text style={styles.topBarTitle} numberOfLines={1}>{builder.business_name}</Text>
        <Pressable
          onPress={toggleSave}
          disabled={savingToggle}
          accessibilityRole="button"
          accessibilityLabel={isSaved ? 'Remove from saved' : 'Save builder'}
          style={({ pressed }) => [styles.topBarBackBtn, pressed && { opacity: 0.7 }]}
        >
          <MaterialIcons
            name={isSaved ? 'bookmark' : 'bookmark-border'}
            size={20}
            color={isSaved ? '#fff' : 'rgba(255,255,255,0.7)'}
          />
        </Pressable>
      </LinearGradient>

      <ScrollView
        showsVerticalScrollIndicator={false}
        bounces
        contentContainerStyle={{ paddingBottom: 140 }}
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
            colors={['transparent', 'rgba(0,0,0,0.7)']}
            style={styles.coverGradient}
          />

          {/* Back + Save buttons moved to top teal bar */}

          {/* Profile photo + info overlay */}
          <View style={styles.headerInfoContainer}>
            <View style={[styles.avatarContainer, { borderColor: '#ffffff' }]}>
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

        {/* ─── AVAILABILITY BANNER ─── */}
        <View style={[styles.availBanner, { backgroundColor: availDotColor + '12', borderColor: availDotColor + '30' }]}>
          <View style={[styles.availBannerDot, { backgroundColor: availDotColor }]} />
          <Text style={[styles.availBannerText, { color: availDotColor === '#22c55e' ? '#15803d' : availDotColor === '#f59e0b' ? '#b45309' : '#dc2626' }]}>
            {availLabel}
          </Text>
          {builder.response_time && (
            <>
              <View style={{ width: 1, height: 14, backgroundColor: availDotColor + '40', marginHorizontal: 8 }} />
              <Ionicons name="time-outline" size={13} color={colors.textSecondary} />
              <Text style={{ fontSize: 13, color: colors.textSecondary, fontWeight: '500' }}>
                {builder.response_time}
              </Text>
            </>
          )}
        </View>

        {/* ─── QUICK INFO BAR ─── */}
        <View style={[styles.metaBar, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.metaItem}>
            <Ionicons name="location-sharp" size={14} color={teal} />
            <Text style={[styles.metaText, { color: colors.text }]}>
              {builder.suburb}, NSW
            </Text>
          </View>
          {estYear && (
            <>
              <View style={[styles.metaDivider, { backgroundColor: colors.border }]} />
              <View style={styles.metaItem}>
                <Ionicons name="business-outline" size={14} color={teal} />
                <Text style={[styles.metaText, { color: colors.text }]}>Est. {estYear}</Text>
              </View>
            </>
          )}
          {badges.length > 0 && (
            <>
              <View style={[styles.metaDivider, { backgroundColor: colors.border }]} />
              <View style={styles.metaItem}>
                <Ionicons name="checkmark-circle" size={14} color={teal} />
                <Text style={[styles.metaText, { color: colors.text }]}>
                  {badges.length}x Verified
                </Text>
              </View>
            </>
          )}
        </View>

        {/* ─── VERIFICATION PILLS ─── */}
        {badges.length > 0 && (
          <View style={styles.badgeRow}>
            {badges.map(badge => (
              <View key={badge} style={[styles.badge, { borderColor: teal }]}>
                <Ionicons name="checkmark-circle" size={13} color={teal} />
                <Text style={[styles.badgeText, { color: teal }]}>{badge}</Text>
              </View>
            ))}
          </View>
        )}

        {/* ─── CONTACT BUTTONS ─── */}
        <View style={[styles.sectionContainer, styles.actionSection]}>
          <View style={styles.actionRow}>
            <Pressable
              onPress={handleCall}
              style={({ pressed }) => [
                styles.actionBtn,
                { backgroundColor: colors.surface, borderColor: teal },
                pressed && { opacity: 0.7 },
              ]}
            >
              <Ionicons name="call-outline" size={20} color={teal} />
              <Text style={[styles.actionBtnLabel, { color: colors.text }]}>Call</Text>
            </Pressable>

            <Pressable
              onPress={handleEmail}
              style={({ pressed }) => [
                styles.actionBtn,
                { backgroundColor: colors.surface, borderColor: teal },
                pressed && { opacity: 0.7 },
              ]}
            >
              <Ionicons name="mail-outline" size={20} color={teal} />
              <Text style={[styles.actionBtnLabel, { color: colors.text }]}>Email</Text>
            </Pressable>

            <Pressable
              onPress={handleWebsite}
              style={({ pressed }) => [
                styles.actionBtn,
                { backgroundColor: colors.surface, borderColor: teal },
                pressed && { opacity: 0.7 },
              ]}
            >
              <Ionicons name="globe-outline" size={20} color={teal} />
              <Text style={[styles.actionBtnLabel, { color: colors.text }]}>Website</Text>
            </Pressable>
          </View>
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
            {builder.abn && <DetailRow iconName="document-text-outline" label="ABN" value={builder.abn} colors={colors} teal={teal} />}
            {builder.license_key && <DetailRow iconName="shield-checkmark-outline" label="Licence" value={builder.license_key} colors={colors} teal={teal} />}
            {yearsInBusiness && <DetailRow iconName="time-outline" label="Experience" value={`${yearsInBusiness} years`} colors={colors} teal={teal} />}
            {builder.team_size && <DetailRow iconName="people-outline" label="Team" value={builder.team_size} colors={colors} teal={teal} />}
            <DetailRow
              iconName="location-outline"
              label="Service area"
              value={builder.areas_serviced || `${builder.suburb} & surrounds within ${builder.radius_km ?? 50}km`}
              colors={colors}
              teal={teal}
            />
          </View>
        </View>

        {/* ─── SPECIALTIES ─── */}
        {builderSpecialties.length > 0 && (
          <View style={[styles.sectionContainer, styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <SectionHeader title="Specialties" colors={colors} />
            <View style={styles.chipWrap}>
              {builderSpecialties.map(spec => {
                const titleCase = spec.replace(/\b\w/g, c => c.toUpperCase());
                return (
                  <View key={spec} style={[styles.chip, { borderColor: teal, backgroundColor: tealBg }]}>
                    <Text style={[styles.chipText, { color: teal }]}>{titleCase}</Text>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* ─── OUR WORK ─── */}
        <View style={styles.sectionContainer}>
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <SectionHeader title="Our Work" colors={colors} />
            {builderProjects.length > 0 ? (
              <Text style={[styles.projectStats, { color: colors.textSecondary }]}>
                {builderProjects.length} project{builderProjects.length !== 1 ? 's' : ''} · {totalPhotos} photo{totalPhotos !== 1 ? 's' : ''}
                {totalVideos > 0 ? ` · ${totalVideos} video${totalVideos !== 1 ? 's' : ''}` : ''}
              </Text>
            ) : (
              <View style={styles.emptyProject}>
                <Ionicons name="images-outline" size={32} color={colors.textSecondary} style={{ opacity: 0.5 }} />
                <Text style={[styles.projectStats, { color: colors.textSecondary, marginBottom: 0, marginTop: 8 }]}>
                  No projects added yet
                </Text>
              </View>
            )}

            {displayProjects.map((project) => {
              const allMedia = [
                ...(project.media ?? []),
              ];
              return (
              <View key={project.id} style={[styles.projectCard, { borderColor: colors.border, backgroundColor: colors.surface }]}>
                {/* ── Before / After ── */}
                {project.beforeImage && project.afterImage && (
                  <BeforeAfterCompare
                    beforeUri={project.beforeImage}
                    afterUri={project.afterImage}
                    onPress={(idx) => openLightbox(
                      [{ uri: project.beforeImage!, type: 'image' as const }, { uri: project.afterImage!, type: 'image' as const }],
                      idx,
                    )}
                  />
                )}

                {/* ── Image carousel ── */}
                {allMedia.length > 0 && (
                  <ProjectCarousel media={allMedia} onPress={(idx) => openLightbox(allMedia, idx)} />
                )}

                {/* ── Body ── */}
                <View style={styles.projectCardBody}>
                  <Text style={[styles.projectTitle, { color: colors.text }]}>{project.title}</Text>
                  {project.description && (
                    <Text style={[styles.projectDesc, { color: colors.textSecondary }]} numberOfLines={3}>
                      {project.description}
                    </Text>
                  )}
                  {project.costRange && (
                    <View style={[styles.costBadge, { backgroundColor: tealBg }]}>
                      <Ionicons name="cash-outline" size={13} color={teal} />
                      <Text style={[styles.costText, { color: teal }]}>{project.costRange}</Text>
                    </View>
                  )}
                </View>

                {/* ── Testimonial ── */}
                {project.testimonial && (
                  <View style={[styles.testimonialContainer, { borderTopColor: colors.border, backgroundColor: tealBg }]}>
                    <Text style={{ fontSize: 18 }}>💬</Text>
                    <View style={{ flex: 1 }}>
                      {project.testimonial.text && (
                        <Text style={[styles.testimonialText, { color: colors.text }]} numberOfLines={4}>
                          {`"${project.testimonial.text}"`}
                        </Text>
                      )}
                      <Text style={[styles.testimonialName, { color: colors.textSecondary }]}>
                        — {project.testimonial.name}
                      </Text>
                    </View>
                  </View>
                )}
              </View>
              );
            })}

            {!showAllProjects && builderProjects.length > 3 && (
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

        {/* ─── TEAM MEMBERS ─── */}
        {(builder.team_members ?? []).length > 0 && (
          <View style={[styles.sectionContainer, styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <SectionHeader title="Meet the Team" colors={colors} />
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.teamScroll}
            >
              {(builder.team_members ?? []).map((member) => {
                const initials = member.name
                  .split(' ')
                  .map(w => w.charAt(0))
                  .join('')
                  .slice(0, 2)
                  .toUpperCase();
                return (
                  <View key={member.id} style={styles.teamCard}>
                    {member.photoUri ? (
                      <Image source={{ uri: member.photoUri }} style={styles.teamPhoto} />
                    ) : (
                      <View style={[styles.teamPhoto, styles.teamInitials, { backgroundColor: tealBg }]}>
                        <Text style={{ color: teal, fontSize: 18, fontWeight: '700' }}>{initials}</Text>
                      </View>
                    )}
                    <Text style={[styles.teamName, { color: colors.text }]} numberOfLines={1}>
                      {member.name.split(' ')[0]}
                    </Text>
                    <Text style={[styles.teamRole, { color: colors.textSecondary }]} numberOfLines={1}>
                      {member.role}
                    </Text>
                  </View>
                );
              })}
            </ScrollView>
          </View>
        )}

        {/* ─── REVIEWS ─── */}
        <View style={styles.sectionContainer}>
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <SectionHeader title="Reviews" colors={colors} />

            {reviewCount === 0 ? (
              /* Empty state */
              <View style={styles.reviewsEmpty}>
                <Ionicons name="star-outline" size={32} color={colors.textSecondary} style={{ opacity: 0.5 }} />
                <Text style={[styles.reviewsEmptyTitle, { color: colors.text }]}>
                  No reviews yet
                </Text>
                <Text style={[styles.reviewsEmptySubtitle, { color: colors.textSecondary }]}>
                  Be the first to share your experience
                </Text>
              </View>
            ) : (
              <>
                {/* Overall rating */}
                <View style={styles.ratingOverview}>
                  <View style={styles.ratingLeft}>
                    <Text style={[styles.ratingBig, { color: colors.text }]}>{avgRating}</Text>
                    <StarRow rating={avgRating} size={18} color="#f59e0b" />
                    <Text style={[styles.ratingCount, { color: colors.textSecondary }]}>
                      {reviewCount} review{reviewCount !== 1 ? 's' : ''}
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
                                width: `${(count / reviewCount) * 100}%`,
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
                  const initials = review.reviewer
                    .split(' ')
                    .map(w => w.charAt(0))
                    .join('')
                    .slice(0, 2)
                    .toUpperCase();
                  return (
                    <View key={review.id} style={[styles.reviewCard, { borderTopColor: colors.border }]}>
                      <View style={styles.reviewHeader}>
                        <View style={[styles.reviewerAvatar, { backgroundColor: tealBg }]}>
                          <Text style={{ color: teal, fontWeight: '700', fontSize: 13 }}>
                            {initials}
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
                        <View style={[styles.reviewProjectBadge, { backgroundColor: tealBg }]}>
                          <Ionicons name="construct-outline" size={12} color={teal} />
                          <Text style={[styles.reviewProjectText, { color: teal }]}>
                            Hired for: {review.projectType}
                          </Text>
                        </View>
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
              </>
            )}

            {/* Write a review button */}
            <Pressable
              onPress={() => Alert.alert('Coming soon', 'Review submission will be available soon.')}
              style={({ pressed }) => [
                styles.writeReviewBtn,
                { borderColor: teal },
                pressed && { opacity: 0.7 },
              ]}
            >
              <Ionicons name="create-outline" size={18} color={teal} />
              <Text style={[styles.writeReviewText, { color: teal }]}>Write a Review</Text>
            </Pressable>
          </View>
        </View>

        {/* Team Members moved after Our Work */}

        {/* FAQ moved to bottom */}

        {/* Availability moved to top */}

        {/* ─── AWARDS & MEMBERSHIPS ─── */}
        {builderCredentials.filter(c => c.type === 'membership' || c.type === 'award').length > 0 && (
          <View style={[styles.sectionContainer, styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <SectionHeader title="Awards & Memberships" colors={colors} />
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.awardsScroll}
            >
              {builderCredentials
                .filter(c => c.type === 'membership' || c.type === 'award')
                .map((cred) => (
                  <View key={cred.id} style={[styles.awardCard, { borderColor: colors.border }]}>
                    <View style={[styles.awardIconCircle, { backgroundColor: tealBg }]}>
                      <Ionicons
                        name={cred.type === 'award' ? 'trophy-outline' : 'ribbon-outline'}
                        size={20}
                        color={teal}
                      />
                    </View>
                    <Text style={[styles.awardName, { color: colors.text }]} numberOfLines={2}>
                      {cred.name}
                    </Text>
                  </View>
                ))}
            </ScrollView>
          </View>
        )}

        {/* ─── INSURANCE ─── */}
        {builderCredentials.filter(c => c.type === 'insurance').length > 0 && (
          <View style={[styles.sectionContainer, styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <SectionHeader title="Insurance" colors={colors} />
            {builderCredentials
              .filter(c => c.type === 'insurance')
              .map((cred) => (
                <View key={cred.id} style={styles.insuranceRow}>
                  <Ionicons name="shield-checkmark" size={18} color="#22c55e" />
                  <Text style={[styles.insuranceName, { color: colors.text }]}>{cred.name}</Text>
                  <View style={styles.insuranceVerified}>
                    <Ionicons name="checkmark-circle" size={14} color="#22c55e" />
                    <Text style={styles.insuranceVerifiedText}>Active</Text>
                  </View>
                </View>
              ))}
          </View>
        )}

        {/* ─── FAQ (fold-out) ─── */}
        {(builder.faqs ?? []).length > 0 && (
          <View style={[styles.sectionContainer, styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Pressable
              onPress={() => setFaqOpen(!faqOpen)}
              style={styles.foldoutHeader}
            >
              <Text style={[styles.foldoutTitle, { color: colors.text }]}>FAQ</Text>
              <Ionicons name={faqOpen ? 'chevron-up' : 'chevron-down'} size={20} color={teal} />
            </Pressable>
            {faqOpen && (builder.faqs ?? []).map((faq, idx) => {
              const isOpen = expandedFAQs.has(faq.id);
              return (
                <Pressable
                  key={faq.id}
                  onPress={() => {
                    setExpandedFAQs(prev => {
                      const next = new Set(prev);
                      if (next.has(faq.id)) next.delete(faq.id);
                      else next.add(faq.id);
                      return next;
                    });
                  }}
                  style={[
                    styles.faqItem,
                    { borderTopWidth: 1, borderTopColor: colors.border },
                  ]}
                >
                  <View style={styles.faqQuestion}>
                    <Text style={[styles.faqQuestionText, { color: colors.text }]}>{faq.question}</Text>
                    <Ionicons
                      name={isOpen ? 'chevron-up' : 'chevron-down'}
                      size={16}
                      color={colors.textSecondary}
                    />
                  </View>
                  {isOpen && (
                    <Text style={[styles.faqAnswer, { color: colors.textSecondary }]}>
                      {faq.answer}
                    </Text>
                  )}
                </Pressable>
              );
            })}
          </View>
        )}

        {/* ─── CREDENTIALS & DOCUMENTS (fold-out) ─── */}
        <View style={[styles.sectionContainer, styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Pressable
            onPress={() => setCredentialsExpanded(!credentialsExpanded)}
            style={styles.foldoutHeader}
          >
            <Text style={[styles.foldoutTitle, { color: colors.text }]}>Credentials & Documents</Text>
            <Ionicons
              name={credentialsExpanded ? 'chevron-up' : 'chevron-down'}
              size={20}
              color={teal}
            />
          </Pressable>

          {credentialsExpanded && builderCredentials.length > 0 && (
            <View style={{ gap: Spacing.sm, marginTop: Spacing.md }}>
              {builderCredentials.map((cred: CredentialData) => (
                <View key={cred.id} style={[styles.credCard, { borderColor: colors.border }]}>
                  <View style={[styles.credIconCircle, { backgroundColor: tealBg }]}>
                    <Ionicons
                      name={
                        cred.type === 'licence' ? 'shield-checkmark-outline' :
                        cred.type === 'insurance' ? 'document-lock-outline' :
                        cred.type === 'membership' ? 'ribbon-outline' :
                        cred.type === 'award' ? 'trophy-outline' :
                        'document-text-outline'
                      }
                      size={18}
                      color={teal}
                    />
                  </View>
                  <View style={styles.credInfo}>
                    <Text style={[styles.credName, { color: colors.text }]}>{cred.name}</Text>
                    <View style={styles.credStatus}>
                      <Ionicons name="checkmark-circle" size={13} color="#22c55e" />
                      <Text style={styles.credStatusText}>Verified by BLDEASY</Text>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          )}
          {credentialsExpanded && builderCredentials.length === 0 && (
            <View style={{ alignItems: 'center', paddingVertical: Spacing.xl }}>
              <Ionicons name="folder-open-outline" size={28} color={colors.textSecondary} style={{ opacity: 0.5 }} />
              <Text style={{ color: colors.textSecondary, fontSize: 14, marginTop: 8 }}>No documents added yet</Text>
            </View>
          )}
        </View>

        {/* Similar tradies removed — don't recommend competitors on a builder's profile */}
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
            { backgroundColor: '#0D7C66' },
            pressed && { backgroundColor: '#0A6B58' },
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
  iconName,
  label,
  value,
  colors,
  teal,
}: {
  iconName: string;
  label: string;
  value: string;
  colors: any;
  teal: string;
}) {
  return (
    <View style={styles.detailRow}>
      <Ionicons name={iconName as any} size={18} color={teal} />
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
    height: COVER_HEIGHT * 0.6,
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
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
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
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
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
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingBottom: 10,
    gap: 8,
  },
  topBarBackBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topBarTitle: {
    flex: 1,
    fontSize: 17,
    fontWeight: '700',
    color: '#fff',
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  availBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.md,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: Radius.lg,
    borderWidth: 1,
  },
  availBannerDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  availBannerText: {
    fontSize: 14,
    fontWeight: '600',
  },
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
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Radius.full,
    borderWidth: 1,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
  },

  // Actions
  sectionContainer: {
    marginHorizontal: Spacing.lg,
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
  // Card wrapper
  card: {
    borderWidth: 1,
    borderRadius: Radius.lg,
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
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: Radius.full,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.2,
  },

  // Projects
  projectStats: {
    fontSize: 13,
    fontWeight: '500',
    marginBottom: Spacing.lg,
    marginTop: -4,
  },
  projectCard: {
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderRadius: Radius.lg,
    overflow: 'hidden',
  },
  projectCardBody: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.md,
  },
  emptyProject: {
    alignItems: 'center',
    paddingVertical: Spacing['2xl'],
  },
  testimonialContainer: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderRadius: Radius.md,
    borderTopWidth: 0,
  },
  testimonialText: {
    fontSize: 13,
    lineHeight: 20,
    fontStyle: 'italic',
  },
  testimonialName: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
  },
  // (carousel styles moved to carouselStyles)
  projectTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  projectDesc: {
    fontSize: 13,
    lineHeight: 20,
    marginTop: 4,
  },
  costBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 4,
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
  reviewProjectBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.full,
    marginBottom: 8,
  },
  reviewProjectText: {
    fontSize: 11,
    fontWeight: '600',
  },
  reviewText: {
    fontSize: 14,
    lineHeight: 22,
  },
  reviewsEmpty: {
    alignItems: 'center',
    paddingVertical: Spacing['2xl'],
    gap: 6,
  },
  reviewsEmptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginTop: 4,
  },
  reviewsEmptySubtitle: {
    fontSize: 13,
    fontWeight: '400',
  },
  writeReviewBtn: {
    flexDirection: 'row',
    borderWidth: 1.5,
    borderRadius: Radius.lg,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: Spacing.lg,
  },
  writeReviewText: {
    fontSize: 14,
    fontWeight: '700',
  },

  // Team members
  teamScroll: {
    gap: Spacing.lg,
    paddingRight: Spacing.sm,
  },
  teamCard: {
    alignItems: 'center',
    width: 80,
  },
  teamPhoto: {
    width: 64,
    height: 64,
    borderRadius: 32,
  },
  teamInitials: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  teamName: {
    fontSize: 13,
    fontWeight: '700',
    marginTop: 8,
    textAlign: 'center',
  },
  teamRole: {
    fontSize: 11,
    fontWeight: '500',
    textAlign: 'center',
    marginTop: 2,
  },

  // FAQ
  faqItem: {
    paddingVertical: Spacing.md,
  },
  faqQuestion: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
  faqQuestionText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 20,
  },
  faqAnswer: {
    fontSize: 14,
    lineHeight: 22,
    marginTop: Spacing.sm,
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
  availTextPrimary: {
    fontSize: 15,
    fontWeight: '700',
    flex: 1,
  },
  availText: {
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },

  // Awards & Memberships
  awardsScroll: {
    gap: Spacing.md,
    paddingRight: Spacing.sm,
  },
  awardCard: {
    width: 120,
    alignItems: 'center',
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.sm,
    borderWidth: 1,
    borderRadius: Radius.lg,
  },
  awardIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  awardName: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 16,
  },

  // Insurance
  insuranceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.sm,
  },
  insuranceName: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
  },
  insuranceVerified: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  insuranceVerifiedText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#22c55e',
  },

  // Fold-out sections (FAQ, Credentials)
  foldoutHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  foldoutTitle: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.2,
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
    borderRadius: Radius.lg,
  },
  credIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  credInfo: {
    flex: 1,
    gap: 3,
  },
  credName: {
    fontSize: 14,
    fontWeight: '600',
  },
  credStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  credStatusText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#22c55e',
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
