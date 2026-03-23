import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  FlatList,
  Image,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import MapView, { Circle, Marker, Region } from 'react-native-maps';
import * as Location from 'expo-location';
import BottomSheet, { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import Ionicons from '@expo/vector-icons/Ionicons';

import { Colors, Radius, Shadows, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { supabase } from '@/lib/supabase';

const DEBOUNCE_MS = 500;

// ─── Types ────────────────────────────────────────────────────────────────────

type Tradie = {
  id: string;
  business_name: string;
  trade_category: string;
  latitude: number;
  longitude: number;
  radius_km: number;
  availability: string;
  availability_note: string | null;
  phone: string | null;
  suburb: string;
  bio: string | null;
  profile_photo_url: string | null;
  abn: string | null;
  license_key: string | null;
  specialties: string[] | null;
  established_year: number | null;
  projects: { id: string; title: string; images: string[] }[] | null;
};

// ─── Filter pills ─────────────────────────────────────────────────────────────

const TRADE_FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'builder', label: 'Builder' },
  { key: 'electrician', label: 'Electrician' },
  { key: 'plumber', label: 'Plumber' },
  { key: 'carpenter', label: 'Carpenter' },
  { key: 'painter', label: 'Painter' },
  { key: 'landscaper', label: 'Landscaper' },
  { key: 'roofer', label: 'Roofer' },
  { key: 'tiler', label: 'Tiler' },
  { key: 'all-trades', label: 'All Trades' },
];

// Trade → pin color
const TRADE_COLORS: Record<string, string> = {
  builder: '#0d9488',
  electrician: '#EA580C',
  plumber: '#2563EB',
  carpenter: '#059669',
  painter: '#E11D48',
  landscaper: '#16A34A',
  roofer: '#D97706',
  tiler: '#7C3AED',
};

// Trade → MaterialIcons icon name
const TRADE_ICONS: Record<string, string> = {
  builder: 'construction',
  electrician: 'bolt',
  plumber: 'plumbing',
  carpenter: 'carpenter',
  painter: 'format-paint',
  landscaper: 'grass',
  roofer: 'roofing',
  tiler: 'grid-view',
};

// ─── Default map region (Newcastle NSW) ──────────────────────────────────────

const NEWCASTLE_REGION: Region = {
  latitude: -32.929,
  longitude: 151.773,
  latitudeDelta: 0.12,
  longitudeDelta: 0.12,
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getTradeColor(trade: string): string {
  return TRADE_COLORS[trade.toLowerCase()] ?? '#0d9488';
}

function getTradeIcon(trade: string): string {
  return TRADE_ICONS[trade.toLowerCase()] ?? 'build';
}

function getAvailLabel(tradie: Tradie): string {
  if (tradie.availability_note) return tradie.availability_note;
  if (tradie.availability === 'available') return 'Available';
  if (tradie.availability === 'limited') return 'Limited';
  return 'Unavailable';
}

function getAvatarUri(tradie: Tradie, tradeColor: string): string {
  return (
    tradie.profile_photo_url ??
    `https://ui-avatars.com/api/?name=${encodeURIComponent(tradie.business_name)}&background=${tradeColor.slice(1)}&color=fff&size=200`
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// LIST VIEW CARD
// ═════════════════════════════════════════════════════════════════════════════

function ListCard({
  tradie,
  colors,
  isDark,
  onPress,
}: {
  tradie: Tradie;
  colors: typeof Colors.light;
  isDark: boolean;
  onPress: () => void;
}) {
  const color = getTradeColor(tradie.trade_category);
  const label =
    tradie.trade_category.charAt(0).toUpperCase() + tradie.trade_category.slice(1);
  const avail = getAvailLabel(tradie);

  return (
    <Pressable
      style={({ pressed }) => [
        listStyles.card,
        {
          backgroundColor: isDark ? colors.surface : '#fff',
          borderColor: colors.borderLight,
          opacity: pressed ? 0.9 : 1,
        },
      ]}
      onPress={onPress}
    >
      <Image
        source={{ uri: getAvatarUri(tradie, color) }}
        style={listStyles.avatar}
      />
      <View style={listStyles.info}>
        <Text style={[listStyles.name, { color: colors.text }]} numberOfLines={1}>
          {tradie.business_name}
        </Text>
        <View style={listStyles.metaRow}>
          <View style={[listStyles.tradePill, { backgroundColor: `${color}18` }]}>
            <MaterialIcons name={getTradeIcon(tradie.trade_category) as any} size={11} color={color} />
            <Text style={[listStyles.tradeText, { color }]}>{label}</Text>
          </View>
          <MaterialIcons name="location-on" size={12} color={colors.textSecondary} />
          <Text style={[listStyles.suburb, { color: colors.textSecondary }]}>
            {tradie.suburb}
          </Text>
        </View>
        <View style={listStyles.bottomRow}>
          <MaterialIcons
            name={avail === 'Available' ? 'check-circle' : 'schedule'}
            size={12}
            color={avail === 'Available' ? colors.success : colors.warning}
          />
          <Text
            style={[
              listStyles.availText,
              { color: avail === 'Available' ? colors.success : colors.warning },
            ]}
          >
            {avail}
          </Text>
          <Text style={[listStyles.radius, { color: colors.textSecondary }]}>
            {tradie.radius_km}km
          </Text>
        </View>
      </View>
      <MaterialIcons name="chevron-right" size={20} color={colors.textSecondary} />
    </Pressable>
  );
}

const listStyles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.sm,
    borderRadius: Radius.lg,
    borderWidth: 1,
    gap: Spacing.md,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#e2e8f0',
  },
  info: { flex: 1, gap: 3 },
  name: { fontSize: 15, fontWeight: '700', letterSpacing: -0.2 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  tradePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Radius.full,
  },
  tradeText: { fontSize: 11, fontWeight: '700' },
  suburb: { fontSize: 12 },
  bottomRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 1 },
  availText: { fontSize: 11, fontWeight: '600' },
  radius: { fontSize: 11, marginLeft: 'auto' },
});

// ═════════════════════════════════════════════════════════════════════════════
// MAIN MAP SCREEN
// ═════════════════════════════════════════════════════════════════════════════

export default function MapScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const colors = Colors[isDark ? 'dark' : 'light'];
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { selectedTrade } = useLocalSearchParams<{ selectedTrade?: string }>();

  const [userLocation, setUserLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [selectedTradie, setSelectedTradie] = useState<Tradie | null>(null);
  const [activeFilter, setActiveFilter] = useState('all');
  const [tradies, setTradies] = useState<Tradie[]>([]);
  const [loading, setLoading] = useState(true);
  const [locationDenied, setLocationDenied] = useState(false);
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const [showListView, setShowListView] = useState(false);
  const [showSearchArea, setShowSearchArea] = useState(false);
  const [currentRegion, setCurrentRegion] = useState<Region>(NEWCASTLE_REGION);
  const [sheetReviews, setSheetReviews] = useState<{
    avg: number;
    count: number;
    latest: { reviewer: string; rating: number; text: string } | null;
  }>({ avg: 0, count: 0, latest: null });
  const [reviewsLoading, setReviewsLoading] = useState(false);

  const bottomSheetRef = useRef<BottomSheet>(null);
  const mapRef = useRef<MapView>(null);
  const snapPoints = useMemo(() => ['45%', '85%'], []);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const initialFetchDone = useRef(false);
  const emptyHintOpacity = useRef(new Animated.Value(0)).current;

  // Apply trade selected from all-trades page
  useEffect(() => {
    if (selectedTrade) {
      setActiveFilter(selectedTrade);
    }
  }, [selectedTrade]);

  // ── Request user location on mount ──
  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setLocationDenied(true);
        fetchBuilders(NEWCASTLE_REGION);
        return;
      }
      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const coords = {
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
      };
      setUserLocation(coords);
      const region = { ...coords, latitudeDelta: 0.12, longitudeDelta: 0.12 };
      setCurrentRegion(region);
      fetchBuilders(region);
    })();
  }, []);

  // ── Fetch approved builders within region ──
  async function fetchBuilders(region: Region) {
    setLoading(true);
    const latMin = region.latitude - region.latitudeDelta / 2;
    const latMax = region.latitude + region.latitudeDelta / 2;
    const lngMin = region.longitude - region.longitudeDelta / 2;
    const lngMax = region.longitude + region.longitudeDelta / 2;

    const { data, error } = await supabase
      .from('builder_profiles')
      .select(
        'id, business_name, trade_category, suburb, bio, phone, latitude, longitude, radius_km, availability, availability_note, profile_photo_url, abn, license_key, specialties, established_year, projects',
      )
      .eq('approved', true)
      .not('latitude', 'is', null)
      .not('longitude', 'is', null)
      .gte('latitude', latMin)
      .lte('latitude', latMax)
      .gte('longitude', lngMin)
      .lte('longitude', lngMax)
      .limit(100);

    if (!error && data) {
      setTradies(data as Tradie[]);
    }
    setLoading(false);
    setShowSearchArea(false);
    initialFetchDone.current = true;
  }

  // ── Debounced region change → show "Search this area" button ──
  const handleRegionChangeComplete = useCallback(
    (region: Region) => {
      setCurrentRegion(region);
      if (!initialFetchDone.current) return;
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
      debounceTimer.current = setTimeout(() => {
        setShowSearchArea(true);
      }, DEBOUNCE_MS);
    },
    [],
  );

  // ── Filtered tradies ──
  const filteredTradies = useMemo(() => {
    if (activeFilter === 'all') return tradies;
    return tradies.filter((t) => t.trade_category.toLowerCase() === activeFilter);
  }, [tradies, activeFilter]);

  // Flash empty hint: fade in → hold 1.5s → fade out
  const showEmpty = !loading && filteredTradies.length === 0 && !selectedTradie && !showListView;
  const emptyHintScale = useRef(new Animated.Value(0.9)).current;
  const emptyHintTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (emptyHintTimer.current) clearTimeout(emptyHintTimer.current);

    if (showEmpty) {
      Animated.parallel([
        Animated.spring(emptyHintOpacity, { toValue: 1, useNativeDriver: true, tension: 80, friction: 10 }),
        Animated.spring(emptyHintScale, { toValue: 1, useNativeDriver: true, tension: 80, friction: 10 }),
      ]).start(() => {
        emptyHintTimer.current = setTimeout(() => {
          Animated.parallel([
            Animated.timing(emptyHintOpacity, { toValue: 0, duration: 300, useNativeDriver: true }),
            Animated.timing(emptyHintScale, { toValue: 0.95, duration: 300, useNativeDriver: true }),
          ]).start();
        }, 1200);
      });
    } else {
      emptyHintOpacity.setValue(0);
      emptyHintScale.setValue(0.9);
    }

    return () => {
      if (emptyHintTimer.current) clearTimeout(emptyHintTimer.current);
    };
  }, [showEmpty]);

  // ── Fetch reviews for a tradie (on marker press) ──
  async function fetchTradieReviews(builderId: string) {
    setReviewsLoading(true);
    setSheetReviews({ avg: 0, count: 0, latest: null });
    const { data } = await supabase
      .from('reviews')
      .select('rating, reviewer_name, comment')
      .eq('builder_id', builderId)
      .order('created_at', { ascending: false })
      .limit(10);

    if (data && data.length > 0) {
      const sum = data.reduce((acc: number, r: any) => acc + (r.rating ?? 0), 0);
      const avg = Math.round((sum / data.length) * 10) / 10;
      const first = data[0];
      setSheetReviews({
        avg,
        count: data.length,
        latest: {
          reviewer: first.reviewer_name ?? 'Anonymous',
          rating: first.rating ?? 5,
          text: first.comment ?? '',
        },
      });
    }
    setReviewsLoading(false);
  }

  // ── Marker press → animate to tradie + open bottom sheet ──
  const handleMarkerPress = useCallback(
    (tradie: Tradie) => {
      setSelectedTradie(tradie);
      bottomSheetRef.current?.snapToIndex(0);
      mapRef.current?.animateToRegion(
        {
          latitude: tradie.latitude,
          longitude: tradie.longitude,
          latitudeDelta: 0.04,
          longitudeDelta: 0.04,
        },
        400,
      );
      fetchTradieReviews(tradie.id);
    },
    [],
  );

  const handleSheetClose = useCallback(() => {
    setSelectedTradie(null);
  }, []);

  // ── Re-center on user location ──
  const handleRecenter = useCallback(() => {
    if (!userLocation) return;
    const region = { ...userLocation, latitudeDelta: 0.12, longitudeDelta: 0.12 };
    mapRef.current?.animateToRegion(region, 400);
  }, [userLocation]);

  // ── Derived values for selected tradie ──
  const tradeLabel = selectedTradie
    ? selectedTradie.trade_category.charAt(0).toUpperCase() +
      selectedTradie.trade_category.slice(1)
    : '';
  const tradeColor = selectedTradie
    ? getTradeColor(selectedTradie.trade_category)
    : '#0d9488';
  const availLabel = selectedTradie ? getAvailLabel(selectedTradie) : '';
  const avatarUri = selectedTradie ? getAvatarUri(selectedTradie, tradeColor) : null;

  // ═══════════════════════════════════════════════════════════════════════════
  // LIST VIEW
  // ═══════════════════════════════════════════════════════════════════════════

  if (showListView) {
    return (
      <GestureHandlerRootView style={styles.root}>
        <View
          style={[
            styles.listContainer,
            { backgroundColor: isDark ? colors.background : colors.canvas },
          ]}
        >
          {/* ── Header bar ── */}
          <View
            style={[
              styles.listHeader,
              {
                paddingTop: insets.top + Spacing.sm,
                backgroundColor: isDark ? colors.surface : '#fff',
                borderBottomColor: colors.borderLight,
              },
            ]}
          >
            {/* Filter pills */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.filterContent}
              style={{ marginBottom: Spacing.sm }}
            >
              {TRADE_FILTERS.map((filter) => {
                const isActive = activeFilter === filter.key;
                return (
                  <Pressable
                    key={filter.key}
                    style={[
                      styles.filterPill,
                      {
                        backgroundColor: isActive
                          ? colors.teal
                          : isDark
                            ? 'rgba(30,41,59,0.95)'
                            : 'rgba(255,255,255,0.97)',
                        borderColor: isActive ? colors.teal : colors.border,
                      },
                    ]}
                    onPress={() => setActiveFilter(filter.key)}
                  >
                    <Text
                      style={[
                        styles.filterPillText,
                        { color: isActive ? '#fff' : colors.text },
                      ]}
                    >
                      {filter.label}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            {/* Count + toggle */}
            <View style={styles.listSubHeader}>
              <Text style={[styles.listCount, { color: colors.textSecondary }]}>
                {filteredTradies.length} tradie
                {filteredTradies.length !== 1 ? 's' : ''} in this area
              </Text>
              <Pressable
                style={[styles.viewToggle, { backgroundColor: isDark ? colors.border : '#F1F5F9' }]}
                onPress={() => setShowListView(false)}
              >
                <MaterialIcons name="map" size={16} color={colors.teal} />
                <Text style={[styles.viewToggleText, { color: colors.teal }]}>Map</Text>
              </Pressable>
            </View>
          </View>

          {/* ── Tradie list ── */}
          {loading ? (
            <View style={styles.listEmpty}>
              <ActivityIndicator size="large" color={colors.teal} />
            </View>
          ) : filteredTradies.length === 0 ? (
            <View style={styles.listEmpty}>
              <MaterialIcons name="search-off" size={48} color={colors.borderLight} />
              <Text style={[styles.emptyTitle, { color: colors.text }]}>
                No tradies found
              </Text>
              <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
                Try a different filter or search area
              </Text>
            </View>
          ) : (
            <FlatList
              data={filteredTradies}
              keyExtractor={(item) => item.id}
              contentContainerStyle={{ paddingTop: Spacing.md, paddingBottom: insets.bottom + 90 }}
              renderItem={({ item }) => (
                <ListCard
                  tradie={item}
                  colors={colors}
                  isDark={isDark}
                  onPress={() =>
                    router.push({
                      pathname: '/builder-profile',
                      params: { id: item.id },
                    })
                  }
                />
              )}
            />
          )}
        </View>
      </GestureHandlerRootView>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // MAP VIEW
  // ═══════════════════════════════════════════════════════════════════════════

  return (
    <GestureHandlerRootView style={styles.root}>
      {/* ─── Map ─── */}
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFillObject}
        initialRegion={
          userLocation
            ? { ...userLocation, latitudeDelta: 0.12, longitudeDelta: 0.12 }
            : NEWCASTLE_REGION
        }
        showsUserLocation
        showsMyLocationButton={false}
        userInterfaceStyle={isDark ? 'dark' : 'light'}
        onRegionChangeComplete={handleRegionChangeComplete}
      >
        {filteredTradies.map((tradie) => {
          const pinColor = getTradeColor(tradie.trade_category);
          const isSelected = selectedTradie?.id === tradie.id;
          const iconName = getTradeIcon(tradie.trade_category);
          const hasPhoto = !!tradie.profile_photo_url;

          return (
            <React.Fragment key={tradie.id}>
              {/* Service area circle — brand teal */}
              {isSelected && (
                <Circle
                  center={{
                    latitude: tradie.latitude,
                    longitude: tradie.longitude,
                  }}
                  radius={tradie.radius_km * 1000}
                  fillColor="rgba(29,158,117,0.12)"
                  strokeColor="rgba(29,158,117,0.35)"
                  strokeWidth={1.5}
                />
              )}

              <Marker
                coordinate={{
                  latitude: tradie.latitude,
                  longitude: tradie.longitude,
                }}
                onPress={() => handleMarkerPress(tradie)}
                tracksViewChanges={false}
              >
                {/* ── Profile photo marker (Snap Maps style) ── */}
                {hasPhoto ? (
                  <View style={styles.markerOuter}>
                    <View
                      style={[
                        styles.markerPhotoRing,
                        {
                          borderColor: isSelected ? '#fff' : pinColor,
                          transform: [{ scale: isSelected ? 1.15 : 1 }],
                        },
                      ]}
                    >
                      <Image
                        source={{ uri: tradie.profile_photo_url! }}
                        style={styles.markerPhoto}
                      />
                    </View>
                    <View
                      style={[styles.pinTail, { borderTopColor: isSelected ? '#fff' : pinColor }]}
                    />
                  </View>
                ) : (
                  /* ── Trade icon marker ── */
                  <View style={styles.markerOuter}>
                    <View
                      style={[
                        styles.markerIcon,
                        {
                          backgroundColor: pinColor,
                          borderColor: isSelected ? '#fff' : pinColor,
                          borderWidth: isSelected ? 3 : 0,
                          transform: [{ scale: isSelected ? 1.15 : 1 }],
                        },
                      ]}
                    >
                      <MaterialIcons
                        name={iconName as any}
                        size={18}
                        color="#fff"
                      />
                    </View>
                    <View
                      style={[styles.pinTail, { borderTopColor: isSelected ? '#fff' : pinColor }]}
                    />
                  </View>
                )}
              </Marker>
            </React.Fragment>
          );
        })}
      </MapView>

      {/* ─── Trade filter bar ─── */}
      <View style={[styles.filterBar, { top: insets.top + Spacing.sm }]}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterContent}
        >
          {TRADE_FILTERS.map((filter) => {
            if (filter.key === 'all-trades') {
              return (
                <Pressable
                  key={filter.key}
                  style={[
                    styles.filterPill,
                    styles.allTradesPill,
                    {
                      backgroundColor: isDark
                        ? 'rgba(30,41,59,0.95)'
                        : 'rgba(255,255,255,0.97)',
                      borderColor: colors.teal,
                    },
                  ]}
                  onPress={() => router.push('/all-trades')}
                  accessibilityRole="button"
                  accessibilityLabel="View all trades"
                >
                  <MaterialIcons name="apps" size={14} color={colors.teal} />
                  <Text
                    style={[styles.filterPillText, { color: colors.teal }]}
                  >
                    {filter.label}
                  </Text>
                  <MaterialIcons name="chevron-right" size={14} color={colors.teal} />
                </Pressable>
              );
            }
            const isActive = activeFilter === filter.key;
            return (
              <Pressable
                key={filter.key}
                style={[
                  styles.filterPill,
                  {
                    backgroundColor: isActive
                      ? colors.teal
                      : isDark
                        ? 'rgba(30,41,59,0.95)'
                        : 'rgba(255,255,255,0.97)',
                    borderColor: isActive ? colors.teal : colors.border,
                  },
                ]}
                onPress={() => setActiveFilter(filter.key)}
                accessibilityRole="button"
                accessibilityLabel={`Filter by ${filter.label}`}
                accessibilityState={{ selected: isActive }}
              >
                <Text
                  style={[
                    styles.filterPillText,
                    { color: isActive ? '#fff' : colors.text },
                  ]}
                >
                  {filter.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {/* ─── Right-side action buttons ─── */}
      <View style={[styles.mapActions, { top: insets.top + 54 }]}>
        {/* List view toggle */}
        <Pressable
          style={[
            styles.mapActionBtn,
            {
              backgroundColor: isDark
                ? 'rgba(30,41,59,0.95)'
                : 'rgba(255,255,255,0.97)',
              borderColor: colors.border,
            },
          ]}
          onPress={() => setShowListView(true)}
          accessibilityRole="button"
          accessibilityLabel="Switch to list view"
        >
          <MaterialIcons name="view-list" size={18} color={colors.teal} />
        </Pressable>

        {/* Re-center on location */}
        {userLocation && (
          <Pressable
            style={[
              styles.mapActionBtn,
              {
                backgroundColor: isDark
                  ? 'rgba(30,41,59,0.95)'
                  : 'rgba(255,255,255,0.97)',
                borderColor: colors.border,
              },
            ]}
            onPress={handleRecenter}
            accessibilityRole="button"
            accessibilityLabel="Re-center on your location"
          >
            <MaterialIcons name="my-location" size={18} color={colors.teal} />
          </Pressable>
        )}

        {/* Search this area — always visible */}
        <Pressable
          style={[
            styles.mapActionBtn,
            {
              backgroundColor: showSearchArea ? colors.teal : (isDark ? 'rgba(30,41,59,0.95)' : 'rgba(255,255,255,0.97)'),
              borderColor: showSearchArea ? colors.teal : colors.border,
            },
          ]}
          onPress={() => fetchBuilders(currentRegion)}
          accessibilityRole="button"
          accessibilityLabel="Search this area"
        >
          <MaterialIcons name="refresh" size={18} color={showSearchArea ? '#fff' : colors.teal} />
        </Pressable>
      </View>

      {/* ─── Empty state hint (fades in/out) ─── */}
      <Animated.View
        pointerEvents={showEmpty ? 'auto' : 'none'}
        style={[styles.emptyHint, { backgroundColor: isDark ? 'rgba(30,41,59,0.95)' : 'rgba(255,255,255,0.97)', opacity: emptyHintOpacity, transform: [{ scale: emptyHintScale }] }]}
      >
        <MaterialIcons name="explore" size={20} color={colors.teal} />
        <Text style={[styles.emptyHintText, { color: colors.text }]}>
          No tradies in this area
        </Text>
        <Text style={[styles.emptyHintSub, { color: colors.textSecondary }]}>
          Zoom out or pan to find more
        </Text>
      </Animated.View>

      {/* ─── Location denied banner (dismissable) ─── */}
      {locationDenied && !bannerDismissed && (
        <View
          style={[
            styles.deniedBanner,
            {
              bottom: insets.bottom + 8,
              backgroundColor: isDark
                ? 'rgba(30,41,59,0.95)'
                : 'rgba(255,255,255,0.97)',
              borderColor: colors.border,
            },
          ]}
        >
          <MaterialIcons name="location-off" size={16} color={colors.warning} />
          <Text style={[styles.deniedText, { color: colors.textSecondary }]}>
            Enable location for better results
          </Text>
          <Pressable
            onPress={() => setBannerDismissed(true)}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Dismiss location banner"
          >
            <MaterialIcons name="close" size={16} color={colors.textSecondary} />
          </Pressable>
        </View>
      )}

      {/* ─── Bottom sheet (tradie profile) ─── */}
      {selectedTradie && (
        <BottomSheet
          ref={bottomSheetRef}
          index={0}
          snapPoints={snapPoints}
          onClose={handleSheetClose}
          enablePanDownToClose
          backgroundStyle={{
            backgroundColor: isDark ? colors.surface : '#F5F2EC',
            borderRadius: 20,
          }}
          handleIndicatorStyle={{ backgroundColor: colors.border, width: 40 }}
        >
          <BottomSheetScrollView
            contentContainerStyle={[
              styles.sheetContent,
              { paddingBottom: insets.bottom + 100 },
            ]}
            showsVerticalScrollIndicator={false}
          >
            {/* ─── Header row ─── */}
            <View style={styles.sheetHeader}>
              <View style={[styles.avatarRing, { borderColor: tradeColor }]}>
                <Image source={{ uri: avatarUri! }} style={styles.sheetAvatar} />
              </View>
              <View style={styles.sheetHeaderText}>
                <Text
                  style={[styles.sheetName, { color: colors.text }]}
                  numberOfLines={1}
                >
                  {selectedTradie.business_name}
                </Text>
                <View style={styles.sheetMetaRow}>
                  <View
                    style={[
                      styles.tradePill,
                      { backgroundColor: `${tradeColor}18` },
                    ]}
                  >
                    <MaterialIcons
                      name={getTradeIcon(selectedTradie.trade_category) as any}
                      size={11}
                      color={tradeColor}
                    />
                    <Text style={[styles.tradePillText, { color: tradeColor }]}>
                      {tradeLabel}
                    </Text>
                  </View>
                  <View style={styles.locationRow}>
                    <MaterialIcons
                      name="location-on"
                      size={13}
                      color={colors.textSecondary}
                    />
                    <Text
                      style={[styles.locationText, { color: colors.textSecondary }]}
                    >
                      {selectedTradie.suburb}
                    </Text>
                  </View>
                </View>
              </View>

              <Pressable
                style={[
                  styles.closeBtn,
                  {
                    backgroundColor: isDark ? colors.border : '#F1F5F9',
                  },
                ]}
                onPress={() => {
                  bottomSheetRef.current?.close();
                  setSelectedTradie(null);
                }}
                accessibilityRole="button"
                accessibilityLabel="Close"
              >
                <MaterialIcons name="close" size={18} color={colors.text} />
              </Pressable>
            </View>

            {/* ─── Stats row ─── */}
            <View
              style={[styles.statsRow, { borderColor: colors.borderLight }]}
            >
              <View style={styles.statItem}>
                <MaterialIcons
                  name={
                    availLabel === 'Available' ? 'check-circle' : 'schedule'
                  }
                  size={14}
                  color={
                    availLabel === 'Available' ? colors.success : colors.warning
                  }
                />
                <Text
                  style={[
                    styles.availText,
                    {
                      color:
                        availLabel === 'Available'
                          ? colors.success
                          : colors.warning,
                    },
                  ]}
                  numberOfLines={1}
                >
                  {availLabel}
                </Text>
              </View>
              <View
                style={[
                  styles.statDivider,
                  { backgroundColor: colors.borderLight },
                ]}
              />
              <View style={styles.statItem}>
                <MaterialIcons
                  name="radar"
                  size={14}
                  color={colors.textSecondary}
                />
                <Text
                  style={[styles.radiusText, { color: colors.textSecondary }]}
                >
                  {selectedTradie.radius_km}km radius
                </Text>
              </View>
            </View>

            {/* ─── Verification badges ─── */}
            {(selectedTradie.abn || selectedTradie.license_key) && (
              <View style={styles.badgeRow}>
                {selectedTradie.abn && (
                  <View
                    style={[
                      styles.badge,
                      {
                        borderColor: `${tradeColor}40`,
                        backgroundColor: `${tradeColor}10`,
                      },
                    ]}
                  >
                    <MaterialIcons
                      name="check-circle"
                      size={12}
                      color={tradeColor}
                    />
                    <Text style={[styles.badgeText, { color: tradeColor }]}>
                      ABN
                    </Text>
                  </View>
                )}
                {selectedTradie.license_key && (
                  <View
                    style={[
                      styles.badge,
                      {
                        borderColor: `${tradeColor}40`,
                        backgroundColor: `${tradeColor}10`,
                      },
                    ]}
                  >
                    <MaterialIcons
                      name="verified"
                      size={12}
                      color={tradeColor}
                    />
                    <Text style={[styles.badgeText, { color: tradeColor }]}>
                      Licensed
                    </Text>
                  </View>
                )}
              </View>
            )}

            {/* ─── Experience + Stats row enhancement ─── */}
            {selectedTradie.established_year && (
              <View style={styles.experienceRow}>
                <MaterialIcons name="workspace-premium" size={14} color={tradeColor} />
                <Text style={[styles.experienceText, { color: colors.text }]}>
                  {new Date().getFullYear() - selectedTradie.established_year}+ years experience
                </Text>
                <Text style={[styles.experienceSince, { color: colors.textSecondary }]}>
                  Est. {selectedTradie.established_year}
                </Text>
              </View>
            )}

            {/* ─── Bio ─── */}
            {selectedTradie.bio ? (
              <Text style={[styles.bio, { color: colors.textSecondary }]}>
                {selectedTradie.bio}
              </Text>
            ) : null}

            {/* ─── Specialties ─── */}
            {selectedTradie.specialties && selectedTradie.specialties.length > 0 && (
              <View style={styles.specialtiesSection}>
                <Text style={[styles.sectionLabel, { color: colors.text }]}>Specialties</Text>
                <View style={styles.chipRow}>
                  {selectedTradie.specialties.map((s, i) => (
                    <View
                      key={i}
                      style={[
                        styles.chip,
                        {
                          backgroundColor: `${tradeColor}10`,
                          borderColor: `${tradeColor}30`,
                        },
                      ]}
                    >
                      <Text style={[styles.chipText, { color: tradeColor }]}>{s}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* ─── Recent work (per-project cards) ─── */}
            {selectedTradie.projects && selectedTradie.projects.length > 0 && (
              <View style={styles.projectsSection}>
                <Text style={[styles.sectionLabel, { color: colors.text }]}>
                  Recent work
                </Text>
                {selectedTradie.projects.slice(0, 2).map((project) => {
                  const thumb = (project.images ?? [])[0];
                  const imageCount = (project.images ?? []).length;
                  return (
                    <Pressable
                      key={project.id}
                      onPress={() =>
                        router.push({
                          pathname: '/builder-profile',
                          params: { id: selectedTradie.id },
                        })
                      }
                      style={({ pressed }) => [
                        styles.projectCard,
                        {
                          backgroundColor: isDark ? colors.canvas : '#FFFFFF',
                          borderColor: colors.borderLight,
                        },
                        pressed && { opacity: 0.7 },
                      ]}
                    >
                      {thumb && (
                        <Image
                          source={{ uri: thumb }}
                          style={styles.projectThumb}
                        />
                      )}
                      <View style={styles.projectInfo}>
                        <Text
                          style={[styles.projectTitle, { color: colors.text }]}
                          numberOfLines={1}
                        >
                          {project.title}
                        </Text>
                        {imageCount > 1 && (
                          <Text style={[styles.projectMeta, { color: colors.textSecondary }]}>
                            {imageCount} photos
                          </Text>
                        )}
                      </View>
                      <MaterialIcons name="chevron-right" size={18} color={colors.teal} />
                    </Pressable>
                  );
                })}
                <Pressable
                  onPress={() =>
                    router.push({
                      pathname: '/builder-profile',
                      params: { id: selectedTradie.id },
                    })
                  }
                  style={({ pressed }) => [
                    styles.viewMoreBtn,
                    { borderColor: colors.borderLight },
                    pressed && { opacity: 0.6 },
                  ]}
                >
                  <Text style={[styles.viewMoreText, { color: colors.teal }]}>
                    View all work
                  </Text>
                  <MaterialIcons name="arrow-forward" size={14} color={colors.teal} />
                </Pressable>
              </View>
            )}

            {/* ─── Reviews ─── */}
            {sheetReviews.count > 0 && (
              <View style={styles.reviewsSection}>
                <View style={styles.reviewsHeader}>
                  <Text style={[styles.sectionLabel, { color: colors.text }]}>Reviews</Text>
                  <View style={styles.ratingPill}>
                    <MaterialIcons name="star" size={14} color="#F59E0B" />
                    <Text style={[styles.ratingText, { color: colors.text }]}>
                      {sheetReviews.avg.toFixed(1)}
                    </Text>
                    <Text style={[styles.ratingCount, { color: colors.textSecondary }]}>
                      ({sheetReviews.count})
                    </Text>
                  </View>
                </View>
                {sheetReviews.latest && sheetReviews.latest.text ? (
                  <View
                    style={[
                      styles.reviewCard,
                      {
                        backgroundColor: isDark ? colors.canvas : '#F8FAFC',
                        borderColor: colors.borderLight,
                      },
                    ]}
                  >
                    <View style={styles.reviewCardHeader}>
                      <Text style={[styles.reviewerName, { color: colors.text }]}>
                        {sheetReviews.latest.reviewer}
                      </Text>
                      <View style={styles.miniStars}>
                        {Array.from({ length: 5 }).map((_, i) => (
                          <MaterialIcons
                            key={i}
                            name={i < sheetReviews.latest!.rating ? 'star' : 'star-border'}
                            size={12}
                            color="#F59E0B"
                          />
                        ))}
                      </View>
                    </View>
                    <Text
                      style={[styles.reviewText, { color: colors.textSecondary }]}
                      numberOfLines={3}
                    >
                      "{sheetReviews.latest.text}"
                    </Text>
                  </View>
                ) : null}
              </View>
            )}

            {reviewsLoading && sheetReviews.count === 0 && (
              <ActivityIndicator size="small" color={colors.teal} style={{ alignSelf: 'center' }} />
            )}

            {/* ─── Action buttons ─── */}
            <View style={styles.actionRow}>
              {selectedTradie.phone && (
                <Pressable
                  style={({ pressed }) => [
                    styles.actionBtn,
                    styles.actionBtnOutline,
                    {
                      borderColor: colors.border,
                      opacity: pressed ? 0.7 : 1,
                    },
                  ]}
                  onPress={() =>
                    Linking.openURL(`tel:${selectedTradie.phone}`)
                  }
                  accessibilityRole="button"
                  accessibilityLabel={`Call ${selectedTradie.business_name}`}
                >
                  <MaterialIcons name="phone" size={16} color={colors.text} />
                  <Text style={[styles.actionBtnText, { color: colors.text }]}>
                    Call
                  </Text>
                </Pressable>
              )}

              <Pressable
                style={({ pressed }) => [
                  styles.actionBtn,
                  styles.actionBtnPrimary,
                  {
                    backgroundColor: tradeColor,
                    opacity: pressed ? 0.85 : 1,
                  },
                ]}
                onPress={() =>
                  router.push({
                    pathname: '/builder-profile',
                    params: { id: selectedTradie.id },
                  })
                }
                accessibilityRole="button"
                accessibilityLabel={`View ${selectedTradie.business_name} profile`}
              >
                <Ionicons
                  name="person-circle-outline"
                  size={16}
                  color="#fff"
                />
                <Text style={styles.actionBtnPrimaryText}>View Profile</Text>
              </Pressable>
            </View>
          </BottomSheetScrollView>
        </BottomSheet>
      )}
    </GestureHandlerRootView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },

  // ── Marker (photo style — Snap Maps) ──
  markerOuter: {
    alignItems: 'center',
  },
  markerPhotoRing: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
      },
      android: { elevation: 4 },
      default: {},
    }),
  },
  markerPhoto: {
    width: 34,
    height: 34,
    borderRadius: 17,
  },
  // ── Marker (trade icon style) ──
  markerIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
      },
      android: { elevation: 4 },
      default: {},
    }),
  },
  pinTail: {
    width: 0,
    height: 0,
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderTopWidth: 8,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    alignSelf: 'center',
    marginTop: -2,
  },

  // ── Filter bar ──
  filterBar: {
    position: 'absolute',
    left: 0,
    right: 0,
  },
  filterContent: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing.sm,
  },
  filterPill: {
    paddingHorizontal: Spacing.md + 2,
    paddingVertical: 8,
    borderRadius: Radius.full,
    borderWidth: 1,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
      },
      android: { elevation: 2 },
      default: {},
    }),
  },
  filterPillText: {
    fontSize: 13,
    fontWeight: '600',
  },
  allTradesPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },

  // ── Right-side map actions ──
  mapActions: {
    position: 'absolute',
    right: Spacing.lg,
    gap: Spacing.sm,
    alignItems: 'center',
  },
  mapActionBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 2,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.12,
        shadowRadius: 3,
      },
      android: { elevation: 2 },
      default: {},
    }),
  },
  countText: {
    fontSize: 13,
    fontWeight: '700',
  },

  // ── Empty state hint ──
  emptyHint: {
    position: 'absolute',
    alignSelf: 'center',
    top: '45%',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.lg,
    borderRadius: Radius.lg,
    gap: 4,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.12,
        shadowRadius: 6,
      },
      android: { elevation: 3 },
      default: {},
    }),
  },
  emptyHintText: {
    fontSize: 15,
    fontWeight: '700',
    marginTop: 4,
  },
  emptyHintSub: {
    fontSize: 13,
  },

  // ── Location denied banner (dismissable, bottom-positioned) ──
  deniedBanner: {
    position: 'absolute',
    left: Spacing.lg,
    right: Spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    borderRadius: Radius.full,
    borderWidth: 1,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
      },
      android: { elevation: 2 },
      default: {},
    }),
  },
  deniedText: {
    fontSize: 13,
    fontWeight: '500',
    flex: 1,
  },

  // ── Bottom sheet ──
  sheetContent: {
    paddingHorizontal: Spacing.xl,
    gap: Spacing.lg,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingTop: Spacing.xs,
  },
  avatarRing: {
    width: 66,
    height: 66,
    borderRadius: 33,
    borderWidth: 2.5,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#e2e8f0',
  },
  sheetAvatar: {
    width: 58,
    height: 58,
    borderRadius: 29,
  },
  sheetHeaderText: {
    flex: 1,
    gap: 5,
  },
  sheetName: {
    fontSize: 19,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  sheetMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  tradePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: Radius.full,
  },
  tradePillText: {
    fontSize: 12,
    fontWeight: '700',
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  locationText: {
    fontSize: 13,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ── Stats row ──
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: Radius.lg,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
  },
  statItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  statDivider: {
    width: 1,
    height: 20,
    marginHorizontal: 4,
  },
  availText: {
    fontSize: 12,
    fontWeight: '600',
    flexShrink: 1,
  },
  radiusText: {
    fontSize: 12,
    fontWeight: '500',
  },

  // ── Badges ──
  badgeRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    flexWrap: 'wrap',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: Radius.full,
    borderWidth: 1,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
  },

  // ── Bio ──
  bio: {
    fontSize: 14,
    lineHeight: 21,
    letterSpacing: -0.1,
  },

  // ── Experience row ──
  experienceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  experienceText: {
    fontSize: 13,
    fontWeight: '700',
  },
  experienceSince: {
    fontSize: 12,
    marginLeft: 'auto',
  },

  // ── Section labels ──
  sectionLabel: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: -0.2,
  },

  // ── Specialties ──
  specialtiesSection: {
    gap: Spacing.sm,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: Radius.full,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '600',
  },

  // ── Project cards ──
  projectsSection: {
    gap: Spacing.sm,
  },
  projectCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.sm,
    borderRadius: Radius.md,
    borderWidth: 1,
  },
  projectThumb: {
    width: 52,
    height: 52,
    borderRadius: Radius.sm,
    backgroundColor: '#e2e8f0',
  },
  projectInfo: {
    flex: 1,
    gap: 2,
  },
  projectTitle: {
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: -0.1,
  },
  projectMeta: {
    fontSize: 12,
  },
  viewMoreBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: Spacing.sm + 2,
    borderRadius: Radius.md,
    borderWidth: 1,
  },
  viewMoreText: {
    fontSize: 13,
    fontWeight: '600',
  },

  // ── Reviews ──
  reviewsSection: {
    gap: Spacing.sm,
  },
  reviewsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  ratingPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  ratingText: {
    fontSize: 14,
    fontWeight: '700',
  },
  ratingCount: {
    fontSize: 12,
    fontWeight: '500',
  },
  reviewCard: {
    borderRadius: Radius.md,
    borderWidth: 1,
    padding: Spacing.md,
    gap: 6,
  },
  reviewCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  reviewerName: {
    fontSize: 13,
    fontWeight: '600',
  },
  miniStars: {
    flexDirection: 'row',
    gap: 1,
  },
  reviewText: {
    fontSize: 13,
    lineHeight: 19,
    fontStyle: 'italic',
  },

  // ── Action buttons ──
  actionRow: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  actionBtn: {
    height: 48,
    borderRadius: Radius.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    ...Shadows.sm,
  },
  actionBtnOutline: {
    flex: 1,
    borderWidth: 1,
    backgroundColor: 'transparent',
  },
  actionBtnPrimary: {
    flex: 2,
  },
  actionBtnText: {
    fontSize: 15,
    fontWeight: '600',
  },
  actionBtnPrimaryText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },

  // ── List view ──
  listContainer: {
    flex: 1,
  },
  listHeader: {
    paddingHorizontal: 0,
    paddingBottom: Spacing.sm,
    borderBottomWidth: 1,
  },
  listSubHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
  },
  listCount: {
    fontSize: 14,
    fontWeight: '600',
  },
  viewToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: Radius.full,
  },
  viewToggleText: {
    fontSize: 13,
    fontWeight: '600',
  },
  listEmpty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '700',
  },
  emptySubtitle: {
    fontSize: 14,
  },
});
