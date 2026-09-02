/**
 * MapScreenView — ~/bldesy-web/components/map/map-view.tsx on react-native-maps:
 * the filter bar (smart trade/specialty search, suburb search, trade chips with
 * counts), trade-coloured pins with availability dots (selected 1.2×),
 * brand-styled clusters, the selected tradie's service-radius circle, the
 * locate / zoom / legend controls, "Search this area" (a client-side bounds
 * filter once the map has moved > 5km from the reference point) and the
 * results bottom sheet (peek / half / full) whose compact cards open the
 * detail panel.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import ClusteredMapView from 'react-native-map-clustering';
import MapView, { Circle, type Region } from 'react-native-maps';
import BottomSheet, { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import * as Location from 'expo-location';
import Ionicons from '@expo/vector-icons/Ionicons';

import { BuilderDetailPanel } from '@/components/map/builder-detail-panel';
import { BuilderListCard } from '@/components/map/builder-list-card';
import { BuilderMarker } from '@/components/map/builder-marker';
import { ClusterMarker, type ClusterFeature } from '@/components/map/cluster-marker';
import { MapControls, MapLegend, SearchAreaPill } from '@/components/map/map-controls';
import { MapEmptyState } from '@/components/map/map-empty-state';
import { MapFilterBar } from '@/components/map/map-filter-bar';
import {
  DEFAULT_CENTER,
  FILTER_TRADES,
  SEARCH_AREA_THRESHOLD_KM,
  baseFilter,
  chipCounts,
  filterByTrade,
  tradieCountLabel,
  type LatLng,
  type SpecialtyToken,
} from '@/components/map/map-logic';
import { Colors, FontFamily, Radius, Shadows, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import type { MapBuilder } from '@/lib/data/map';
import { distanceKm } from '@/lib/geo';
import { getTradeColour } from '@/lib/web/trade-colours';

interface MapScreenViewProps {
  builders: MapBuilder[];
  onRefresh: () => Promise<void>;
  refreshing: boolean;
}

/** Results sheet peek height (mobile-sheet.tsx PEEK_PX). */
const PEEK_PX = 116;
const FILTER_BAR_HEIGHT = 52;

/** Web-map zoom levels → a react-native-maps Region (longitude span of the viewport). */
function regionForZoom(center: LatLng, zoom: number, width: number, height: number): Region {
  const longitudeDelta = (360 * width) / (256 * Math.pow(2, zoom));
  return {
    latitude: center.latitude,
    longitude: center.longitude,
    latitudeDelta: longitudeDelta * (height / width),
    longitudeDelta,
  };
}

export function MapScreenView({ builders, onRefresh, refreshing }: MapScreenViewProps) {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];
  const { width, height } = useWindowDimensions();
  const mapRef = useRef<MapView | null>(null);
  const sheetRef = useRef<BottomSheet>(null);

  const [filter, setFilter] = useState<string>('All');
  const [specialty, setSpecialty] = useState<SpecialtyToken | null>(null);
  const [userPos, setUserPos] = useState<LatLng | null>(null);
  const [searchedCentre, setSearchedCentre] = useState<LatLng | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showRadius, setShowRadius] = useState(true);
  const [boundsFilter, setBoundsFilter] = useState<Region | null>(null);
  const [showSearchArea, setShowSearchArea] = useState(false);
  const [locating, setLocating] = useState(false);
  const [locateError, setLocateError] = useState<string | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const regionRef = useRef<Region>(regionForZoom(DEFAULT_CENTER, 11, width, height));

  const snapPoints = useMemo(() => [PEEK_PX, '50%', '85%'], []);

  function flyTo(center: LatLng, zoom?: number) {
    const base = regionRef.current;
    const region = zoom != null ? regionForZoom(center, zoom, width, height) : { ...base, ...center };
    mapRef.current?.animateToRegion(region, 1000);
  }

  // Request geolocation on mount — fly to the user, else stay on Sydney.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted' || cancelled) return;
        const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        if (cancelled) return;
        const loc = { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
        setUserPos(loc);
        flyTo(loc);
      } catch {
        // Denied or error — stay on Sydney
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selectedBuilder = useMemo(() => builders.find((b) => b.id === selectedId) ?? null, [builders, selectedId]);

  // Specialty + bounds applied first so chip counts show what clicking each chip yields.
  const baseFiltered = useMemo(() => baseFilter(builders, specialty, boundsFilter), [builders, specialty, boundsFilter]);
  const filtered = useMemo(() => filterByTrade(baseFiltered, filter), [baseFiltered, filter]);
  const counts = useMemo(() => chipCounts(baseFiltered), [baseFiltered]);

  function handleSelectTrade(t: string) {
    setFilter(t);
    setSpecialty(null);
    setSelectedId(null);
  }

  function handlePickSpecialty(token: SpecialtyToken) {
    setSpecialty(token);
    setFilter(token.tradeName);
    setSelectedId(null);
  }

  function selectBuilder(b: MapBuilder) {
    setSelectedId(b.id);
    flyTo({ latitude: b.latitude, longitude: b.longitude });
    sheetRef.current?.snapToIndex(1);
  }

  // Stable identity so React.memo on BuilderMarker holds across renders
  const toggleSelect = useCallback((id: string) => {
    setSelectedId((prev) => {
      const next = prev === id ? null : id;
      if (next) sheetRef.current?.snapToIndex(1);
      return next;
    });
  }, []);

  const distanceOrigin = searchedCentre ?? userPos ?? DEFAULT_CENTER;

  function handleSuburbLocate(coords: LatLng) {
    setSearchedCentre(coords);
    setBoundsFilter(null);
    setShowSearchArea(false);
    flyTo(coords, 12);
  }

  async function handleLocate() {
    setLocating(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') throw new Error('denied');
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const loc = { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
      setUserPos(loc);
      setSearchedCentre(loc);
      setBoundsFilter(null);
      setShowSearchArea(false);
      flyTo(loc, 13);
    } catch {
      setLocateError('Location unavailable — check browser permissions');
      setTimeout(() => setLocateError(null), 3000);
    } finally {
      setLocating(false);
    }
  }

  function handleRegionChangeComplete(region: Region) {
    regionRef.current = region;
    const ref = searchedCentre ?? userPos ?? DEFAULT_CENTER;
    setShowSearchArea(distanceKm(ref.latitude, ref.longitude, region.latitude, region.longitude) > SEARCH_AREA_THRESHOLD_KM);
  }

  function applySearchArea() {
    const region = regionRef.current;
    setBoundsFilter(region);
    setSearchedCentre({ latitude: region.latitude, longitude: region.longitude });
    setShowSearchArea(false);
  }

  function zoomBy(factor: number) {
    const r = regionRef.current;
    mapRef.current?.animateToRegion(
      { ...r, latitudeDelta: r.latitudeDelta * factor, longitudeDelta: r.longitudeDelta * factor },
      300,
    );
  }

  const controlsBottom = PEEK_PX + Spacing.md;

  return (
    <View style={styles.root}>
      {/* ── Map ─────────────────────────────────────────────────── */}
      <ClusteredMapView
        mapRef={(ref: unknown) => {
          mapRef.current = ref as MapView | null;
        }}
        style={StyleSheet.absoluteFill}
        initialRegion={regionRef.current}
        onRegionChangeComplete={handleRegionChangeComplete}
        onPress={() => setSelectedId(null)}
        showsUserLocation={userPos !== null}
        showsMyLocationButton={false}
        showsCompass={false}
        toolbarEnabled={false}
        radius={50}
        maxZoom={14}
        minPoints={2}
        animationEnabled={false}
        tracksViewChanges={false}
        clusterColor={c.primary}
        spiralEnabled
        renderCluster={(cluster: ClusterFeature) => <ClusterMarker key={`cluster-${cluster.id}`} cluster={cluster} />}
      >
        {selectedBuilder && showRadius && selectedBuilder.radius_km != null && selectedBuilder.radius_km > 0 ? (
          <Circle
            center={{ latitude: selectedBuilder.latitude, longitude: selectedBuilder.longitude }}
            radius={selectedBuilder.radius_km * 1000}
            strokeColor={getTradeColour(selectedBuilder.trade_category) + '66'}
            fillColor={getTradeColour(selectedBuilder.trade_category) + '1A'}
            strokeWidth={2}
          />
        ) : null}
        {filtered.map((b) => (
          <BuilderMarker
            key={b.id}
            id={b.id}
            latitude={b.latitude}
            longitude={b.longitude}
            colour={getTradeColour(b.trade_category)}
            availability={b.availability ?? 'none'}
            isSelected={selectedId === b.id}
            onSelect={toggleSelect}
          />
        ))}
      </ClusteredMapView>

      {/* ── Floating chrome ─────────────────────────────────────── */}
      {showSearchArea ? <SearchAreaPill onPress={applySearchArea} top={FILTER_BAR_HEIGHT + Spacing.md} /> : null}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Refresh tradies"
        accessibilityState={{ disabled: refreshing, busy: refreshing }}
        disabled={refreshing}
        onPress={onRefresh}
        style={[styles.refreshBtn, Shadows.md, { top: FILTER_BAR_HEIGHT + Spacing.md, backgroundColor: c.surface, borderColor: c.border + '80' }, refreshing && { opacity: 0.5 }]}
      >
        {refreshing ? <ActivityIndicator size="small" color={c.primary} /> : <Ionicons name="refresh-outline" size={20} color={c.primary} />}
      </Pressable>
      <MapControls
        onZoomIn={() => zoomBy(0.5)}
        onZoomOut={() => zoomBy(2)}
        onLocate={handleLocate}
        locating={locating}
        locateError={locateError}
        bottom={controlsBottom}
      />
      <MapLegend trades={FILTER_TRADES.filter((t) => t !== 'All')} bottom={controlsBottom} />

      {/* ── Search + trade filter bar (stretches while a dropdown is open so
             its taps stay inside the bar's bounds on Android) ───────── */}
      <View style={[styles.barLayer, dropdownOpen && styles.barLayerFull]} pointerEvents="box-none">
        <MapFilterBar
          filter={filter}
          counts={counts}
          onSelectTrade={handleSelectTrade}
          onClearTrade={() => handleSelectTrade('All')}
          specialty={specialty}
          onPickSpecialty={handlePickSpecialty}
          onClearSpecialty={() => setSpecialty(null)}
          onLocate={handleSuburbLocate}
          onDropdownChange={setDropdownOpen}
        />
      </View>

      {/* ── Results sheet: peek / half / full ───────────────────── */}
      <BottomSheet
        ref={sheetRef}
        index={0}
        snapPoints={snapPoints}
        enableDynamicSizing={false}
        backgroundStyle={[styles.sheetBg, { backgroundColor: c.surface, borderColor: c.border }]}
        handleIndicatorStyle={{ backgroundColor: c.border }}
        accessibilityLabel="Drag to resize results list"
      >
        {selectedBuilder ? (
          <View style={styles.sheetBody}>
            <BottomSheetScrollView contentContainerStyle={styles.sheetScroll} keyboardShouldPersistTaps="handled">
              <BuilderDetailPanel
                builder={selectedBuilder}
                onClose={() => setSelectedId(null)}
                showRadius={showRadius}
                onToggleRadius={setShowRadius}
                activeSpecialtySlug={specialty?.slug ?? null}
              />
            </BottomSheetScrollView>
          </View>
        ) : (
          <View style={styles.sheetBody}>
            <View style={styles.sheetHeader}>
              <Text style={[styles.sheetTitle, { color: c.textPrimary }]}>
                {tradieCountLabel(filtered.length, 'nearby')}
                {specialty ? <Text style={[styles.sheetTitleMeta, { color: c.textSecondary }]}> · {specialty.name}</Text> : null}
              </Text>
            </View>
            <BottomSheetScrollView contentContainerStyle={styles.list} keyboardShouldPersistTaps="handled">
              {filtered.map((b) => (
                <BuilderListCard
                  key={b.id}
                  builder={b}
                  selected={selectedId === b.id}
                  onSelect={() => selectBuilder(b)}
                  distanceKm={distanceKm(distanceOrigin.latitude, distanceOrigin.longitude, b.latitude, b.longitude)}
                />
              ))}
              {filtered.length === 0 ? <MapEmptyState trade={filter} specialty={specialty?.name ?? null} /> : null}
            </BottomSheetScrollView>
          </View>
        )}
      </BottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  barLayer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 20,
  },
  barLayerFull: {
    bottom: 0,
  },
  refreshBtn: {
    position: 'absolute',
    right: Spacing.md,
    width: 44,
    height: 44,
    borderRadius: Radius.lg,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetBg: {
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  sheetBody: {
    flex: 1,
  },
  sheetHeader: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.sm,
  },
  sheetTitle: {
    fontFamily: FontFamily.bodyBold,
    fontWeight: '700',
    fontSize: 12,
  },
  sheetTitleMeta: {
    fontFamily: FontFamily.bodyMedium,
    fontWeight: '500',
  },
  sheetScroll: {
    flexGrow: 1,
  },
  list: {
    padding: Spacing.md,
    gap: Spacing.sm,
    paddingBottom: Spacing['4xl'],
  },
});
