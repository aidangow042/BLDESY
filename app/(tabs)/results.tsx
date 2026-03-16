import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors, Spacing, Radius, Shadows } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { geocode, distanceKm } from '@/lib/geo';
import { supabase } from '@/lib/supabase';

// Maps the urgency param from home screen to the builder's urgency_capacity values
// and defines sort priority (index = priority, lower = better match)
const URGENCY_PRIORITY: Record<string, string[]> = {
  asap: ['emergency', 'soon', 'planned'],
  this_week: ['soon', 'emergency', 'planned'],
  flexible: ['planned', 'soon', 'emergency'],
};

type BuilderResult = {
  id: string;
  business_name: string;
  trade_category: string;
  suburb: string;
  postcode: string;
  bio: string | null;
  latitude: number | null;
  longitude: number | null;
  radius_km: number | null;
  urgency_capacity: string[] | null;
  availability: string | null;
  // computed client-side
  _distance: number | null;
};

export default function ResultsScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme === 'dark' ? 'dark' : 'light'];
  const router = useRouter();
  const params = useLocalSearchParams<{
    suburb?: string;
    postcode?: string;
    trade_category?: string;
    urgency?: string;
    keywords?: string;
  }>();

  const [builders, setBuilders] = useState<BuilderResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchBuilders();
  }, [params.suburb, params.trade_category, params.urgency, params.keywords]);

  async function fetchBuilders() {
    setLoading(true);
    setError(null);

    // 1. Geocode the customer's search term
    let searchLat: number | null = null;
    let searchLon: number | null = null;
    if (params.suburb) {
      const geo = await geocode(params.suburb);
      if (geo) {
        searchLat = geo.latitude;
        searchLon = geo.longitude;
      }
    }

    // 2. Fetch all approved builders (filtered by trade if selected)
    let query = supabase
      .from('builder_profiles')
      .select(
        'id, business_name, trade_category, suburb, postcode, bio, latitude, longitude, radius_km, urgency_capacity, availability',
      )
      .eq('approved', true);

    if (params.trade_category && params.trade_category !== 'all') {
      const trades = params.trade_category.split(',').map((t) => t.trim());
      if (trades.length === 1) {
        query = query.ilike('trade_category', trades[0]);
      } else {
        // Multiple trades selected — match any of them (case-insensitive)
        query = query.or(
          trades.map((t) => `trade_category.ilike.${t}`).join(','),
        );
      }
    }

    const { data, error: fetchError } = await query;

    if (fetchError) {
      setError(fetchError.message);
      setLoading(false);
      return;
    }

    // Debug: log what came back from DB + geocode result
    console.log('[Search] params:', JSON.stringify(params));
    console.log('[Search] geocode result:', searchLat, searchLon);
    console.log('[Search] builders from DB:', data?.length, data?.map((b) => ({
      name: b.business_name, lat: b.latitude, lng: b.longitude, radius: b.radius_km,
    })));

    let results: BuilderResult[] = (data ?? []).map((b) => ({
      ...b,
      _distance: null as number | null,
    }));

    // 3. Calculate distances for all builders that have coordinates
    if (searchLat != null && searchLon != null) {
      results = results.map((b) => {
        if (b.latitude != null && b.longitude != null) {
          const dist = distanceKm(searchLat!, searchLon!, b.latitude, b.longitude);
          return { ...b, _distance: Math.round(dist) };
        }
        return b;
      });
    }

    // 4. Filter: show builders who cover the customer's area
    if (params.suburb) {
      const term = params.suburb.toLowerCase();

      if (searchLat != null && searchLon != null) {
        // We have GPS for the search — use distance-based filtering
        results = results.filter((b) => {
          if (b._distance != null) {
            const radius = b.radius_km ?? 25;
            return b._distance <= radius;
          }
          // Builder has no coordinates — fall back to suburb/postcode text match only
          return (
            b.suburb.toLowerCase().includes(term) ||
            b.postcode.includes(term)
          );
        });
      } else {
        // Geocoding failed — fall back to suburb/postcode text match only
        results = results.filter((b) =>
          b.suburb.toLowerCase().includes(term) ||
          b.postcode.includes(term)
        );
      }
    }

    // 4. Sort: urgency match first, then distance
    const urgencyOrder = params.urgency ? URGENCY_PRIORITY[params.urgency] : null;

    results.sort((a, b) => {
      // Urgency sort: builders whose urgency_capacity best matches the selected urgency
      if (urgencyOrder) {
        const scoreA = getUrgencyScore(a.urgency_capacity, urgencyOrder);
        const scoreB = getUrgencyScore(b.urgency_capacity, urgencyOrder);
        if (scoreA !== scoreB) return scoreA - scoreB;
      }

      // Then sort by distance (closer first)
      const distA = a._distance ?? 9999;
      const distB = b._distance ?? 9999;
      return distA - distB;
    });

    setBuilders(results);
    setLoading(false);
  }

  function renderBuilderCard({ item }: { item: BuilderResult }) {
    return (
      <Pressable
        style={({ pressed }) => [
          styles.card,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
          },
          Shadows.sm,
          pressed && { opacity: 0.7 },
        ]}
        onPress={() =>
          router.push({ pathname: '/(tabs)/builder/[id]', params: { id: item.id } })
        }
      >
        <View style={styles.cardTop}>
          <ThemedText type="defaultSemiBold" style={styles.businessName} numberOfLines={1}>
            {item.business_name}
          </ThemedText>
          {item._distance != null && (
            <View style={[styles.distanceBadge, { backgroundColor: colors.tintLight }]}>
              <ThemedText style={[styles.distanceText, { color: colors.tint }]}>
                ~{item._distance} km
              </ThemedText>
            </View>
          )}
        </View>

        <View style={styles.cardRow}>
          <ThemedText style={[styles.tradeBadgeText, { color: colors.tint }]}>
            {item.trade_category}
          </ThemedText>
          <ThemedText style={[styles.locationText, { color: colors.textSecondary }]}>
            {item.suburb} {item.postcode}
          </ThemedText>
        </View>

        {item.bio ? (
          <ThemedText
            numberOfLines={2}
            style={[styles.bioSnippet, { color: colors.textSecondary }]}
          >
            {item.bio}
          </ThemedText>
        ) : null}
      </Pressable>
    );
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <ThemedView style={styles.container}>
        {/* Header */}
        <View style={[styles.headerRow, { borderBottomColor: colors.border }]}>
          <Pressable
            style={({ pressed }) => [
              styles.backButton,
              { backgroundColor: colors.surface, borderColor: colors.border },
              pressed && { opacity: 0.7 },
            ]}
            onPress={() => router.back()}
          >
            <ThemedText style={[styles.backArrow, { color: colors.tint }]}>
              ←
            </ThemedText>
          </Pressable>
          <ThemedText type="subtitle" style={styles.headerTitle}>
            Search Results
          </ThemedText>
          <View style={styles.headerSpacer} />
        </View>

        {loading ? (
          <ActivityIndicator color={colors.tint} style={styles.loader} />
        ) : error ? (
          <View style={styles.centeredState}>
            <ThemedText style={[styles.errorText, { color: colors.error }]}>
              Error: {error}
            </ThemedText>
          </View>
        ) : builders.length === 0 ? (
          <View style={styles.centeredState}>
            <ThemedText type="subtitle" style={styles.emptyTitle}>
              No tradies found
            </ThemedText>
            <ThemedText style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
              Try broadening your search or changing filters.
            </ThemedText>
          </View>
        ) : (
          <FlatList
            data={builders}
            keyExtractor={(item) => item.id}
            renderItem={renderBuilderCard}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          />
        )}
      </ThemedView>
    </SafeAreaView>
  );
}

/**
 * Score a builder's urgency match. Lower = better.
 * Checks which of the builder's urgency_capacity values appears earliest
 * in the priority order for the selected urgency.
 */
function getUrgencyScore(
  capacity: string[] | null,
  priorityOrder: string[],
): number {
  if (!capacity || capacity.length === 0) return 99;
  let best = 99;
  for (const cap of capacity) {
    const idx = priorityOrder.indexOf(cap.toLowerCase());
    if (idx !== -1 && idx < best) best = idx;
  }
  return best;
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing['2xl'],
    paddingVertical: Spacing.lg,
    borderBottomWidth: 1,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: Radius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backArrow: {
    fontSize: 18,
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
  },
  headerSpacer: {
    width: 40,
  },
  loader: {
    marginTop: Spacing['5xl'],
  },
  centeredState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing['3xl'],
  },
  errorText: {
    textAlign: 'center',
    fontSize: 15,
  },
  emptyTitle: {
    textAlign: 'center',
    fontSize: 20,
  },
  emptySubtitle: {
    textAlign: 'center',
    fontSize: 15,
  },
  listContent: {
    gap: Spacing.md,
    padding: Spacing['2xl'],
  },
  card: {
    borderWidth: 1,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    gap: Spacing.sm,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  businessName: {
    fontSize: 17,
    flex: 1,
  },
  distanceBadge: {
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
  },
  distanceText: {
    fontSize: 12,
    fontWeight: '600',
  },
  cardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  tradeBadgeText: {
    fontSize: 14,
    fontWeight: '600',
  },
  locationText: {
    fontSize: 13,
  },
  bioSnippet: {
    fontSize: 14,
    lineHeight: 20,
  },
});
