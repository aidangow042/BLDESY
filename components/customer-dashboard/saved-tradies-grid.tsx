/**
 * SavedTradiesGrid — port of ~/bldesy-web/components/dashboard/saved-tradies-grid.tsx:
 * the saved list with optimistic unsave (reverts on error) and the
 * "No saved tradies yet…" empty state with the amber "Browse tradies" CTA.
 */
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter, type Href } from 'expo-router';

import { Card } from '@/components/ui';
import { Colors, FontFamily, Radius, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { unsaveBuilder } from '@/lib/data/saved';
import { ROUTES } from '@/lib/routes';

import { SavedTradieCard, type SavedTradie } from './saved-tradie-card';

interface SavedTradiesGridProps {
  initialTradies: SavedTradie[];
  userId: string;
  onCountChange?: (count: number) => void;
}

export function SavedTradiesGrid({ initialTradies, userId, onCountChange }: SavedTradiesGridProps) {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];
  const router = useRouter();
  const [tradies, setTradies] = useState(initialTradies);

  function update(next: SavedTradie[]) {
    setTradies(next);
    onCountChange?.(next.length);
  }

  async function unsave(builderId: string) {
    const removed = tradies.find((t) => t.user_id === builderId);
    // Optimistic remove
    update(tradies.filter((t) => t.user_id !== builderId));
    try {
      await unsaveBuilder(userId, builderId);
    } catch (e) {
      console.warn('unsave failed', e instanceof Error ? e.message : e);
      // Revert
      if (removed) update([removed, ...tradies.filter((t) => t.user_id !== builderId)]);
    }
  }

  if (tradies.length === 0) {
    return (
      <Card padding={Spacing['3xl']} style={styles.empty}>
        <Text style={[styles.emptyText, { color: c.textSecondary }]}>
          No saved tradies yet. Tap the bookmark on any tradie&apos;s profile.
        </Text>
        <Pressable
          accessibilityRole="link"
          onPress={() => router.push(ROUTES.search as Href)}
          style={({ pressed }) => [styles.browseBtn, { backgroundColor: pressed ? c.ctaDark : c.cta }]}
        >
          <Text style={styles.browseText}>Browse tradies</Text>
        </Pressable>
      </Card>
    );
  }

  return (
    <View style={styles.grid}>
      {tradies.map((t) => (
        <SavedTradieCard key={t.user_id} tradie={t} onUnsave={() => unsave(t.user_id)} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { gap: Spacing.lg },
  empty: { alignItems: 'center', gap: Spacing.lg },
  emptyText: { fontSize: 14, lineHeight: 20, fontFamily: FontFamily.body, textAlign: 'center' },
  browseBtn: { borderRadius: Radius.xl, paddingHorizontal: Spacing.xl, paddingVertical: 10 },
  browseText: { color: '#ffffff', fontSize: 14, fontFamily: FontFamily.bodyBold, fontWeight: '700' },
});
