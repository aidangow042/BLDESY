/**
 * Map tab — ~/bldesy-web/app/map/page.tsx: loads every searchable tradie with
 * coordinates (`fetchMapBuilders`) and renders the interactive map, or one of
 * the three states — "Loading map...", "Failed to load map data" / "Please try
 * refreshing the page." + Refresh, "No tradies on the map yet" / "Tradies with
 * location data will appear here as they join.". Inside AppShell so the AI
 * launcher gets its map lift. No phone RPCs anywhere on this surface.
 */
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import { AppShell } from '@/components/layout';
import { MapScreenView } from '@/components/map/map-view';
import { Colors, FontFamily, Radius, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { fetchMapBuilders, type MapBuilder } from '@/lib/data/map';

export default function MapScreen() {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];
  const [builders, setBuilders] = useState<MapBuilder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const { builders: rows, error: fetchError } = await fetchMapBuilders();
    if (fetchError) {
      setError(true);
    } else {
      setError(false);
      setBuilders(rows);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function refresh() {
    setRefreshing(true);
    try {
      await load();
    } finally {
      setRefreshing(false);
    }
  }

  let body: React.ReactNode;
  if (loading) {
    body = (
      <View style={styles.state}>
        <ActivityIndicator size="large" color={c.primary} />
        <Text style={[styles.stateCopy, { color: c.textSecondary }]}>Loading map...</Text>
      </View>
    );
  } else if (error) {
    body = (
      <View style={styles.state}>
        <View style={[styles.bubble, { backgroundColor: c.errorBg }]}>
          <Ionicons name="alert-circle-outline" size={28} color={c.error} />
        </View>
        <Text style={[styles.stateTitle, { color: c.textPrimary }]}>Failed to load map data</Text>
        <Text style={[styles.stateCopy, { color: c.textSecondary }]}>Please try refreshing the page.</Text>
        <Pressable
          accessibilityRole="button"
          onPress={() => {
            setLoading(true);
            load();
          }}
          style={({ pressed }) => [styles.refreshBtn, { backgroundColor: pressed ? c.primaryDark : c.primary }]}
        >
          <Text style={styles.refreshText}>Refresh</Text>
        </Pressable>
      </View>
    );
  } else if (builders.length === 0) {
    body = (
      <View style={styles.state}>
        <View style={[styles.bubble, { backgroundColor: c.primaryBg }]}>
          <Ionicons name="location-outline" size={28} color={c.primary} />
        </View>
        <Text style={[styles.stateTitle, { color: c.textPrimary }]}>No tradies on the map yet</Text>
        <Text style={[styles.stateCopy, { color: c.textSecondary }]}>
          Tradies with location data will appear here as they join.
        </Text>
      </View>
    );
  } else {
    body = <MapScreenView builders={builders} onRefresh={refresh} refreshing={refreshing} />;
  }

  return <AppShell background={c.canvas}>{body}</AppShell>;
}

const styles = StyleSheet.create({
  state: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing['2xl'],
    gap: Spacing.sm,
  },
  bubble: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  stateTitle: {
    fontFamily: FontFamily.bodyMedium,
    fontWeight: '500',
    fontSize: 14,
    textAlign: 'center',
  },
  stateCopy: {
    fontFamily: FontFamily.body,
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
    maxWidth: 320,
  },
  refreshBtn: {
    marginTop: Spacing.md,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing['2xl'],
    paddingVertical: Spacing.sm,
  },
  refreshText: {
    color: '#ffffff',
    fontFamily: FontFamily.bodySemiBold,
    fontWeight: '600',
    fontSize: 14,
  },
});
