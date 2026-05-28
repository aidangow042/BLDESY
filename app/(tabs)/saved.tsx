/**
 * Saved tradies tab. Mirrors `~/bldesy-web/app/saved/page.tsx`:
 * Header with count + "Browse more" link, empty state, or list of saved cards.
 *
 * The full BuilderCard with image carousel + match score lives in `components/search/`
 * and is built when /results gets ported. For now this screen renders a compact
 * SavedBuilderCard inline — same data shape, simpler chrome.
 */

import { useCallback, useState } from 'react';
import {
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';

import { AppShell } from '@/components/layout';
import { Badge, Button, Card, Skeleton, useToast } from '@/components/ui';
import { Colors, FontFamily, Radius, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { supabase } from '@/lib/supabase';
import { useUser } from '@/lib/auth-context';

interface SavedBuilder {
  user_id: string;
  business_name: string;
  trade_category: string;
  suburb: string;
  postcode?: string | null;
  bio?: string | null;
  profile_photo_url?: string | null;
  cover_photo_url?: string | null;
}

export default function SavedScreen() {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];
  const router = useRouter();
  const toast = useToast();
  const { user, userId, loading: authLoading } = useUser();

  const [builders, setBuilders] = useState<SavedBuilder[] | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchSaved = useCallback(async () => {
    if (!userId) {
      setBuilders([]);
      return;
    }
    const { data: rows, error } = await supabase
      .from('saved_builders')
      .select('builder_id')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      setBuilders([]);
      return;
    }

    const ids = (rows ?? []).map((r) => (r as any).builder_id);
    if (ids.length === 0) {
      setBuilders([]);
      return;
    }

    const { data: profiles } = await supabase
      .from('builder_profiles')
      .select('user_id, business_name, trade_category, suburb, postcode, bio, profile_photo_url, cover_photo_url')
      .in('user_id', ids);

    const map = new Map((profiles ?? []).map((p: any) => [p.user_id, p]));
    const ordered = ids.map((id) => map.get(id)).filter(Boolean) as SavedBuilder[];
    setBuilders(ordered);
  }, [userId]);

  useFocusEffect(
    useCallback(() => {
      fetchSaved();
    }, [fetchSaved]),
  );

  async function handleUnsave(builderId: string) {
    if (!userId) return;
    // Optimistic remove
    setBuilders((prev) => (prev ?? []).filter((b) => b.user_id !== builderId));
    const { error } = await supabase
      .from('saved_builders')
      .delete()
      .eq('user_id', userId)
      .eq('builder_id', builderId);
    if (error) {
      toast.show("Couldn't unsave — try again", { variant: 'error' });
      fetchSaved(); // resync
    }
  }

  async function onRefresh() {
    setRefreshing(true);
    await fetchSaved();
    setRefreshing(false);
  }

  /* ── Render ───────────────────────────────────────────────────── */

  // Auth gate — show a sign-in CTA inside the shell.
  if (!authLoading && !user) {
    return (
      <AppShell title="Saved">
        <View style={styles.signedOut}>
          <View style={[styles.iconBubble, { backgroundColor: c.primaryBg }]}>
            <Text style={[styles.iconGlyph, { color: c.primary }]}>🔖</Text>
          </View>
          <Text style={[styles.emptyTitle, { color: c.textPrimary }]}>Sign in to save tradies</Text>
          <Text style={[styles.emptyCopy, { color: c.textSecondary }]}>
            Bookmark tradies you like and they&apos;ll show up here for next time.
          </Text>
          <Button variant="primary" size="md" onPress={() => router.push('/(auth)/login' as any)}>
            Sign in
          </Button>
        </View>
      </AppShell>
    );
  }

  const loading = builders === null;
  const count = builders?.length ?? 0;

  return (
    <AppShell title="Saved">
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.primary} />
        }
      >
        {/* Header row */}
        <View style={styles.headerRow}>
          <View>
            <Text style={[styles.title, { color: c.textPrimary }]}>Saved tradies</Text>
            <Text style={[styles.subtitle, { color: c.textSecondary }]}>
              {loading ? 'Loading…' : `${count} saved`}
            </Text>
          </View>
          {!loading && count > 0 ? (
            <Pressable onPress={() => router.push('/results' as any)} hitSlop={6}>
              <Text style={[styles.browseMore, { color: c.primary }]}>Browse more →</Text>
            </Pressable>
          ) : null}
        </View>

        {/* Loading skeletons */}
        {loading ? (
          <View style={styles.list}>
            {[1, 2, 3].map((i) => (
              <Card key={i} padding={Spacing.lg}>
                <View style={styles.skeletonRow}>
                  <Skeleton variant="avatar" />
                  <View style={{ flex: 1, gap: 6 }}>
                    <Skeleton variant="text" style={{ width: '60%' }} />
                    <Skeleton variant="text" style={{ width: '40%', height: 12 }} />
                  </View>
                </View>
              </Card>
            ))}
          </View>
        ) : count === 0 ? (
          <Card padding={Spacing['4xl']} style={{ alignItems: 'center' }}>
            <View style={[styles.iconBubble, { backgroundColor: c.primaryBg }]}>
              <Text style={[styles.iconGlyph, { color: c.primary }]}>🔖</Text>
            </View>
            <Text style={[styles.emptyTitle, { color: c.textPrimary }]}>No saved tradies yet</Text>
            <Text style={[styles.emptyCopy, { color: c.textSecondary }]}>
              Tap the bookmark on any tradie&apos;s profile to save them here for later.
            </Text>
            <Button variant="primary" size="md" onPress={() => router.push('/results' as any)}>
              Browse tradies
            </Button>
          </Card>
        ) : (
          <View style={styles.list}>
            {builders?.map((b) => (
              <SavedBuilderRow
                key={b.user_id}
                builder={b}
                onPress={() => router.push(`/builder-profile?id=${b.user_id}` as any)}
                onUnsave={() => handleUnsave(b.user_id)}
              />
            ))}
          </View>
        )}
      </ScrollView>
    </AppShell>
  );
}

/* ── Row component ─────────────────────────────────────────────── */

function SavedBuilderRow({
  builder,
  onPress,
  onUnsave,
}: {
  builder: SavedBuilder;
  onPress: () => void;
  onUnsave: () => void;
}) {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [pressed && { transform: [{ scale: 0.99 }] }]}
    >
      <Card padding={Spacing.lg}>
        <View style={styles.row}>
          {builder.profile_photo_url ? (
            <Image source={{ uri: builder.profile_photo_url }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, { backgroundColor: c.primary, alignItems: 'center', justifyContent: 'center' }]}>
              <Text style={styles.avatarInitial}>{builder.business_name[0]}</Text>
            </View>
          )}
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={[styles.name, { color: c.textPrimary }]} numberOfLines={1}>
              {builder.business_name}
            </Text>
            <View style={styles.metaRow}>
              <Badge variant="trade">{builder.trade_category}</Badge>
              <Text style={[styles.location, { color: c.textSecondary }]} numberOfLines={1}>
                {builder.suburb}
                {builder.postcode ? ` ${builder.postcode}` : ''}
              </Text>
            </View>
            {builder.bio ? (
              <Text style={[styles.bio, { color: c.textSecondary }]} numberOfLines={2}>
                {builder.bio}
              </Text>
            ) : null}
          </View>
          <Pressable
            onPress={onUnsave}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel="Remove from saved"
          >
            <Text style={[styles.bookmark, { color: c.primary }]}>🔖</Text>
          </Pressable>
        </View>
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  scroll: {
    padding: Spacing.lg,
    paddingBottom: Spacing['5xl'],
    gap: Spacing.lg,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: Spacing.md,
  },
  title: {
    fontSize: 22,
    fontFamily: FontFamily.bodyBold,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 13,
    fontFamily: FontFamily.body,
    marginTop: 2,
  },
  browseMore: {
    fontSize: 13,
    fontFamily: FontFamily.bodySemiBold,
    fontWeight: '600',
  },
  list: {
    gap: Spacing.md,
  },
  signedOut: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing['3xl'],
    gap: Spacing.md,
  },
  iconBubble: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  iconGlyph: {
    fontSize: 26,
  },
  emptyTitle: {
    fontSize: 18,
    fontFamily: FontFamily.bodyBold,
    fontWeight: '700',
    textAlign: 'center',
  },
  emptyCopy: {
    fontSize: 13,
    lineHeight: 20,
    fontFamily: FontFamily.body,
    textAlign: 'center',
    maxWidth: 320,
    marginBottom: Spacing.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.md,
  },
  skeletonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: Radius.lg,
  },
  avatarInitial: {
    color: '#ffffff',
    fontFamily: FontFamily.bodyBold,
    fontWeight: '700',
    fontSize: 18,
  },
  name: {
    fontSize: 15,
    fontFamily: FontFamily.bodyBold,
    fontWeight: '700',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginTop: 4,
    flexWrap: 'wrap',
  },
  location: {
    fontSize: 12,
    fontFamily: FontFamily.body,
    flexShrink: 1,
  },
  bio: {
    fontSize: 12,
    lineHeight: 18,
    fontFamily: FontFamily.body,
    marginTop: 6,
  },
  bookmark: {
    fontSize: 22,
  },
});
