import { useState, useCallback } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors, Spacing, Radius, Shadows } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { supabase } from '@/lib/supabase';

type SavedBuilder = {
  builder_id: string;
  business_name: string;
  trade_category: string;
  suburb: string;
  postcode: string;
  bio: string | null;
};

export default function SavedScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme === 'dark' ? 'dark' : 'light'];
  const router = useRouter();

  const [builders, setBuilders] = useState<SavedBuilder[]>([]);
  const [loading, setLoading] = useState(true);
  const [loggedIn, setLoggedIn] = useState(false);

  // Re-fetch every time the tab is focused (picks up new saves/unsaves)
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
      .select('builder_id, builder_profiles(business_name, trade_category, suburb, postcode, bio)')
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
      }));

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

  function renderCard({ item }: { item: SavedBuilder }) {
    return (
      <Pressable
        style={({ pressed }) => [
          styles.card,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
            opacity: pressed ? 0.85 : 1,
          },
          Shadows.sm,
        ]}
        onPress={() =>
          router.push({ pathname: '/(tabs)/builder/[id]', params: { id: item.builder_id } })
        }
      >
        <View style={styles.cardHeader}>
          <View style={{ flex: 1 }}>
            <ThemedText type="defaultSemiBold" style={styles.businessName}>
              {item.business_name}
            </ThemedText>
            <View style={styles.cardRow}>
              <View style={[styles.tradeBadge, { backgroundColor: colors.tintLight }]}>
                <ThemedText style={[styles.tradeBadgeText, { color: colors.tint }]}>
                  {item.trade_category}
                </ThemedText>
              </View>
              <ThemedText style={[styles.locationCaption, { color: colors.textSecondary }]}>
                {item.suburb} {item.postcode}
              </ThemedText>
            </View>
          </View>
          <Pressable
            style={({ pressed }) => [
              styles.unsaveButton,
              { opacity: pressed ? 0.6 : 1 },
            ]}
            onPress={() => unsaveBuilder(item.builder_id)}
          >
            <ThemedText style={[styles.unsaveText, { color: colors.error }]}>Remove</ThemedText>
          </Pressable>
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
        <ThemedText type="title" style={styles.title}>Saved</ThemedText>

        {loading ? (
          <ActivityIndicator color={colors.tint} style={styles.loader} />
        ) : !loggedIn ? (
          <View style={styles.emptyContainer}>
            <ThemedText
              type="subtitle"
              style={[styles.emptyTitle, { color: colors.text }]}
            >
              Sign in to save builders
            </ThemedText>
            <ThemedText style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
              Save your favourite tradies so you can find them quickly later.
            </ThemedText>
          </View>
        ) : builders.length === 0 ? (
          <View style={styles.emptyContainer}>
            <ThemedText
              type="subtitle"
              style={[styles.emptyTitle, { color: colors.text }]}
            >
              No saved builders yet
            </ThemedText>
            <ThemedText style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
              Tap "Save Builder" on any builder's profile to add them here.
            </ThemedText>
          </View>
        ) : (
          <FlatList
            data={builders}
            keyExtractor={(item) => item.builder_id}
            renderItem={renderCard}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          />
        )}
      </ThemedView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.xl,
  },
  title: {
    marginBottom: Spacing.xl,
    letterSpacing: -0.5,
  },
  loader: {
    marginTop: Spacing['4xl'],
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing['3xl'],
    gap: Spacing.sm,
  },
  emptyTitle: {
    textAlign: 'center',
  },
  emptySubtitle: {
    textAlign: 'center',
    fontSize: 15,
    lineHeight: 22,
  },
  listContent: {
    gap: Spacing.md,
    paddingBottom: Spacing['3xl'],
  },
  card: {
    borderWidth: 1,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    gap: Spacing.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: Spacing.md,
  },
  businessName: {
    fontSize: 17,
    letterSpacing: -0.2,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.sm,
    gap: Spacing.sm,
  },
  tradeBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.full,
  },
  tradeBadgeText: {
    fontSize: 13,
    fontWeight: '600',
  },
  locationCaption: {
    fontSize: 13,
  },
  unsaveButton: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  unsaveText: {
    fontSize: 13,
    fontWeight: '600',
  },
  bioSnippet: {
    fontSize: 14,
    lineHeight: 20,
    marginTop: Spacing.xs,
  },
});
