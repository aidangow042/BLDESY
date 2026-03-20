import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Dimensions,
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
import { useRouter } from 'expo-router';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import Ionicons from '@expo/vector-icons/Ionicons';

import { Colors, Radius, Shadows, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ─── Types ────────────────────────────────────────────────────────────────────

type Tradie = {
  id: string;
  business_name: string;
  trade_category: string;
  latitude: number;
  longitude: number;
  radius_km: number;
  rating: number;
  review_count: number;
  availability: string;
  phone: string | null;
  suburb: string;
  bio: string | null;
  profile_photo_url: string | null;
  abn: boolean;
  license_key: boolean;
};

// ─── Mock data — realistic Newcastle NSW coordinates ─────────────────────────

const MOCK_TRADIES: Tradie[] = [
  {
    id: 'mock-1',
    business_name: 'Hamilton Building Co.',
    trade_category: 'builder',
    latitude: -32.9282,
    longitude: 151.7567,
    radius_km: 25,
    rating: 4.8,
    review_count: 34,
    availability: 'Available',
    phone: '0412 345 678',
    suburb: 'Hamilton',
    bio: 'Residential and commercial builds with 15+ years experience across the Hunter Valley.',
    profile_photo_url: null,
    abn: true,
    license_key: true,
  },
  {
    id: 'mock-2',
    business_name: 'Merewether Electrical',
    trade_category: 'electrician',
    latitude: -32.9542,
    longitude: 151.7598,
    radius_km: 20,
    rating: 4.6,
    review_count: 22,
    availability: 'Available',
    phone: '0423 456 789',
    suburb: 'Merewether',
    bio: 'Licensed electrician specialising in solar installs and smart home wiring.',
    profile_photo_url: null,
    abn: true,
    license_key: true,
  },
  {
    id: 'mock-3',
    business_name: 'Charlestown Plumbing',
    trade_category: 'plumber',
    latitude: -32.9706,
    longitude: 151.7050,
    radius_km: 18,
    rating: 4.9,
    review_count: 61,
    availability: 'Booked Until Friday',
    phone: '0434 567 890',
    suburb: 'Charlestown',
    bio: '24/7 emergency plumbing for homes and strata across Newcastle.',
    profile_photo_url: null,
    abn: true,
    license_key: false,
  },
  {
    id: 'mock-4',
    business_name: 'Lambton Carpentry',
    trade_category: 'carpenter',
    latitude: -32.9251,
    longitude: 151.7232,
    radius_km: 15,
    rating: 4.7,
    review_count: 18,
    availability: 'Available',
    phone: '0445 678 901',
    suburb: 'Lambton',
    bio: 'Custom decks, pergolas, and furniture. Family business since 2008.',
    profile_photo_url: null,
    abn: false,
    license_key: false,
  },
  {
    id: 'mock-5',
    business_name: 'Adamstown Painting',
    trade_category: 'painter',
    latitude: -32.9367,
    longitude: 151.7309,
    radius_km: 22,
    rating: 4.5,
    review_count: 27,
    availability: 'Available',
    phone: '0456 789 012',
    suburb: 'Adamstown',
    bio: 'Interior and exterior painting. Dulux certified. Meticulous prep work.',
    profile_photo_url: null,
    abn: true,
    license_key: false,
  },
  {
    id: 'mock-6',
    business_name: 'Mayfield Roofing',
    trade_category: 'roofer',
    latitude: -32.8978,
    longitude: 151.7356,
    radius_km: 30,
    rating: 4.3,
    review_count: 14,
    availability: 'Available in 2 days',
    phone: '0467 890 123',
    suburb: 'Mayfield',
    bio: 'Metal, tile, and colorbond roofing. Free quotes within 24h.',
    profile_photo_url: null,
    abn: true,
    license_key: true,
  },
  {
    id: 'mock-7',
    business_name: 'Cooks Hill Tiling',
    trade_category: 'tiler',
    latitude: -32.9334,
    longitude: 151.7694,
    radius_km: 12,
    rating: 5.0,
    review_count: 9,
    availability: 'Available',
    phone: '0478 901 234',
    suburb: 'Cooks Hill',
    bio: 'Bathroom and kitchen tiling. Only accept premium projects.',
    profile_photo_url: null,
    abn: false,
    license_key: false,
  },
  {
    id: 'mock-8',
    business_name: 'Junction Landscaping',
    trade_category: 'landscaper',
    latitude: -32.9422,
    longitude: 151.7641,
    radius_km: 50,
    rating: 4.4,
    review_count: 38,
    availability: 'Available',
    phone: '0489 012 345',
    suburb: 'The Junction',
    bio: 'Garden design, retaining walls, irrigation, and lawn care across Newcastle and Lake Macquarie.',
    profile_photo_url: null,
    abn: true,
    license_key: false,
  },
];

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

function formatRating(rating: number): string {
  return rating.toFixed(1);
}

// ─── Star Row ─────────────────────────────────────────────────────────────────

function StarRow({ rating, count }: { rating: number; count: number }) {
  const full = Math.floor(rating);
  const half = rating - full >= 0.3;
  const stars: string[] = [];
  for (let i = 0; i < full; i++) stars.push('star');
  if (half && stars.length < 5) stars.push('star-half');
  while (stars.length < 5) stars.push('star-border');

  return (
    <View style={starStyles.row}>
      {stars.map((s, i) => (
        <MaterialIcons key={i} name={s as any} size={14} color="#F59E0B" />
      ))}
      <Text style={starStyles.value}>{formatRating(rating)}</Text>
      <Text style={starStyles.count}>({count})</Text>
    </View>
  );
}

const starStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  value: { fontSize: 13, fontWeight: '700', color: '#78716C', marginLeft: 4 },
  count: { fontSize: 13, color: '#A3A3A3' },
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

  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [selectedTradie, setSelectedTradie] = useState<Tradie | null>(null);
  const [activeFilter, setActiveFilter] = useState('all');
  const [tradies] = useState<Tradie[]>(MOCK_TRADIES);

  const bottomSheetRef = useRef<BottomSheet>(null);
  const snapPoints = useMemo(() => ['35%', '65%'], []);

  // Request user location on mount
  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;
      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      setUserLocation({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
      });
    })();
  }, []);

  // Filtered tradies based on active filter pill
  const filteredTradies = useMemo(() => {
    if (activeFilter === 'all') return tradies;
    return tradies.filter((t) => t.trade_category.toLowerCase() === activeFilter);
  }, [tradies, activeFilter]);

  // Open bottom sheet when a marker is tapped
  const handleMarkerPress = useCallback((tradie: Tradie) => {
    setSelectedTradie(tradie);
    bottomSheetRef.current?.snapToIndex(0);
  }, []);

  // Close bottom sheet
  const handleSheetClose = useCallback(() => {
    setSelectedTradie(null);
  }, []);

  const tradeLabel = selectedTradie
    ? selectedTradie.trade_category.charAt(0).toUpperCase() + selectedTradie.trade_category.slice(1)
    : '';

  const tradeColor = selectedTradie ? getTradeColor(selectedTradie.trade_category) : '#0d9488';
  const avatarUri = selectedTradie?.profile_photo_url
    ?? (selectedTradie
      ? `https://ui-avatars.com/api/?name=${encodeURIComponent(selectedTradie.business_name)}&background=${tradeColor.slice(1)}&color=fff&size=120`
      : null);

  return (
    <GestureHandlerRootView style={styles.root}>
      {/* ─── Map ─────────────────────────────────────────────── */}
      <MapView
        style={StyleSheet.absoluteFillObject}
        initialRegion={NEWCASTLE_REGION}
        region={userLocation
          ? { ...userLocation, latitudeDelta: 0.12, longitudeDelta: 0.12 }
          : undefined}
        showsUserLocation
        showsMyLocationButton={false}
        userInterfaceStyle={isDark ? 'dark' : 'light'}
      >
        {filteredTradies.map((tradie) => {
          const pinColor = getTradeColor(tradie.trade_category);
          const isSelected = selectedTradie?.id === tradie.id;

          return (
            <React.Fragment key={tradie.id}>
              {/* Service area circle — only show for selected tradie */}
              {isSelected && (
                <Circle
                  center={{ latitude: tradie.latitude, longitude: tradie.longitude }}
                  radius={tradie.radius_km * 1000}
                  fillColor="rgba(29,158,117,0.15)"
                  strokeColor="rgba(29,158,117,0.4)"
                  strokeWidth={1.5}
                />
              )}

              <Marker
                coordinate={{ latitude: tradie.latitude, longitude: tradie.longitude }}
                onPress={() => handleMarkerPress(tradie)}
                tracksViewChanges={false}
              >
                <View
                  style={[
                    styles.markerPin,
                    {
                      backgroundColor: pinColor,
                      borderColor: isSelected ? '#fff' : 'transparent',
                      borderWidth: isSelected ? 2.5 : 0,
                      transform: [{ scale: isSelected ? 1.2 : 1 }],
                    },
                  ]}
                >
                  <Text style={styles.markerInitial}>
                    {tradie.business_name.charAt(0).toUpperCase()}
                  </Text>
                </View>
                {/* Pin tail */}
                <View style={[styles.pinTail, { borderTopColor: pinColor }]} />
              </Marker>
            </React.Fragment>
          );
        })}
      </MapView>

      {/* ─── Trade filter bar ────────────────────────────────── */}
      <View
        style={[
          styles.filterBar,
          { top: insets.top + Spacing.sm },
        ]}
      >
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterContent}
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

      {/* ─── Tradie count badge ──────────────────────────────── */}
      <View
        style={[
          styles.countBadge,
          {
            top: insets.top + 54,
            backgroundColor: isDark ? 'rgba(30,41,59,0.95)' : 'rgba(255,255,255,0.97)',
            borderColor: colors.border,
          },
        ]}
      >
        <MaterialIcons name="location-on" size={13} color={colors.teal} />
        <Text style={[styles.countText, { color: colors.textSecondary }]}>
          {filteredTradies.length} tradie{filteredTradies.length !== 1 ? 's' : ''} nearby
        </Text>
      </View>

      {/* ─── Bottom sheet (tradie mini-profile) ──────────────── */}
      {selectedTradie && (
        <BottomSheet
          ref={bottomSheetRef}
          index={0}
          snapPoints={snapPoints}
          onClose={handleSheetClose}
          enablePanDownToClose
          backgroundStyle={{
            backgroundColor: isDark ? colors.surface : '#FFFFFF',
            borderRadius: 20,
          }}
          handleIndicatorStyle={{ backgroundColor: colors.border }}
        >
          <BottomSheetScrollView
            contentContainerStyle={styles.sheetContent}
            showsVerticalScrollIndicator={false}
          >
            {/* ─── Header row ─── */}
            <View style={styles.sheetHeader}>
              <Image
                source={{ uri: avatarUri! }}
                style={styles.sheetAvatar}
              />
              <View style={styles.sheetHeaderText}>
                <Text style={[styles.sheetName, { color: colors.text }]} numberOfLines={1}>
                  {selectedTradie.business_name}
                </Text>
                <View style={styles.sheetMetaRow}>
                  <View style={[styles.tradePill, { backgroundColor: `${tradeColor}20` }]}>
                    <Text style={[styles.tradePillText, { color: tradeColor }]}>
                      {tradeLabel}
                    </Text>
                  </View>
                  <View style={styles.locationRow}>
                    <MaterialIcons name="location-on" size={13} color={colors.textSecondary} />
                    <Text style={[styles.locationText, { color: colors.textSecondary }]}>
                      {selectedTradie.suburb}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Close button */}
              <Pressable
                style={[styles.closeBtn, { backgroundColor: isDark ? colors.border : '#F1F5F9' }]}
                onPress={() => {
                  bottomSheetRef.current?.close();
                  setSelectedTradie(null);
                }}
                accessibilityRole="button"
                accessibilityLabel="Close tradie sheet"
              >
                <MaterialIcons name="close" size={18} color={colors.text} />
              </Pressable>
            </View>

            {/* ─── Stats row ─── */}
            <View style={[styles.statsRow, { borderColor: colors.borderLight }]}>
              <View style={styles.statItem}>
                <StarRow rating={selectedTradie.rating} count={selectedTradie.review_count} />
              </View>
              <View style={[styles.statDivider, { backgroundColor: colors.borderLight }]} />
              <View style={styles.statItem}>
                <MaterialIcons
                  name={selectedTradie.availability === 'Available' ? 'check-circle' : 'schedule'}
                  size={14}
                  color={selectedTradie.availability === 'Available' ? colors.success : colors.warning}
                />
                <Text
                  style={[
                    styles.availText,
                    {
                      color: selectedTradie.availability === 'Available'
                        ? colors.success
                        : colors.warning,
                    },
                  ]}
                  numberOfLines={1}
                >
                  {selectedTradie.availability}
                </Text>
              </View>
              <View style={[styles.statDivider, { backgroundColor: colors.borderLight }]} />
              <View style={styles.statItem}>
                <MaterialIcons name="radar" size={14} color={colors.textSecondary} />
                <Text style={[styles.radiusText, { color: colors.textSecondary }]}>
                  {selectedTradie.radius_km}km radius
                </Text>
              </View>
            </View>

            {/* ─── Verification badges ─── */}
            <View style={styles.badgeRow}>
              {selectedTradie.abn && (
                <View style={[styles.badge, { borderColor: `${tradeColor}40`, backgroundColor: `${tradeColor}10` }]}>
                  <MaterialIcons name="check-circle" size={12} color={tradeColor} />
                  <Text style={[styles.badgeText, { color: tradeColor }]}>ABN</Text>
                </View>
              )}
              {selectedTradie.license_key && (
                <View style={[styles.badge, { borderColor: `${tradeColor}40`, backgroundColor: `${tradeColor}10` }]}>
                  <MaterialIcons name="verified" size={12} color={tradeColor} />
                  <Text style={[styles.badgeText, { color: tradeColor }]}>Licensed</Text>
                </View>
              )}
            </View>

            {/* ─── Bio ─── */}
            {selectedTradie.bio ? (
              <Text style={[styles.bio, { color: colors.textSecondary }]}>
                {selectedTradie.bio}
              </Text>
            ) : null}

            {/* ─── Action buttons ─── */}
            <View style={styles.actionRow}>
              {selectedTradie.phone && (
                <Pressable
                  style={({ pressed }) => [
                    styles.actionBtn,
                    styles.actionBtnOutline,
                    { borderColor: colors.border, opacity: pressed ? 0.7 : 1 },
                  ]}
                  onPress={() => Linking.openURL(`tel:${selectedTradie.phone}`)}
                  accessibilityRole="button"
                  accessibilityLabel={`Call ${selectedTradie.business_name}`}
                >
                  <MaterialIcons name="phone" size={16} color={colors.text} />
                  <Text style={[styles.actionBtnText, { color: colors.text }]}>Call</Text>
                </Pressable>
              )}

              <Pressable
                style={({ pressed }) => [
                  styles.actionBtn,
                  styles.actionBtnPrimary,
                  { backgroundColor: tradeColor, opacity: pressed ? 0.85 : 1 },
                ]}
                onPress={() =>
                  router.push({ pathname: '/builder-profile', params: { id: selectedTradie.id } })
                }
                accessibilityRole="button"
                accessibilityLabel={`View ${selectedTradie.business_name} profile`}
              >
                <Ionicons name="person-circle-outline" size={16} color="#fff" />
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

  // ── Marker ──
  markerPin: {
    width: 36,
    height: 36,
    borderRadius: 18,
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
  markerInitial: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '800',
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
    marginTop: -1,
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

  // ── Count badge ──
  countBadge: {
    position: 'absolute',
    right: Spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing.sm + 2,
    paddingVertical: 5,
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
  countText: {
    fontSize: 12,
    fontWeight: '600',
  },

  // ── Bottom sheet ──
  sheetContent: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing['3xl'],
    gap: Spacing.lg,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingTop: Spacing.sm,
  },
  sheetAvatar: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: '#e2e8f0',
  },
  sheetHeaderText: {
    flex: 1,
    gap: 4,
  },
  sheetName: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  sheetMetaRow: {
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
});
