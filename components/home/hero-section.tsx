/**
 * HeroSection — homepage hero. Mirrors `~/bldesy-web/components/home/hero-section.tsx`:
 *   • Photo banner with dark overlay
 *   • Headline pinned to upper third of photo
 *   • Floating search card overlapping the photo (negative top margin)
 *   • Mode toggle pill — "I need a tradie" / "I'm a tradie"
 *   • Search input + primary CTA
 *
 * Native-only differences:
 *   • No web-style search overlay — tapping the input pushes /results.
 *   • Image is bundled instead of next/image.
 */

import { useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';

import { Colors, FontFamily, Radius, Shadows, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

type Mode = 'homeowner' | 'tradie';

const HERO_IMAGE = require('@/assets/images/new.jpg');

export function HeroSection() {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];
  const router = useRouter();

  const [mode, setMode] = useState<Mode>('homeowner');

  function openSearch() {
    // Homeowner → full-page "find a tradie" search (mirrors the website's /search).
    // Tradie → the jobs feed, which has its own search/filters.
    if (mode === 'tradie') router.push('/builder-jobs' as any);
    else router.push('/search' as any);
  }

  const placeholder = mode === 'tradie' ? 'Search jobs by keyword…' : 'Suburb, postcode, or trade';
  const ctaLabel = mode === 'tradie' ? 'Browse jobs' : 'Find tradies';

  return (
    <View style={styles.section}>
      {/* Photo banner */}
      <View style={styles.banner}>
        <Image source={HERO_IMAGE} style={StyleSheet.absoluteFill} contentFit="cover" cachePolicy="memory-disk" />
        <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.18)' }]} />
        <View style={styles.headlineWrap}>
          <Text style={styles.headline}>Find your tradie. Fast.</Text>
          <Text style={styles.subhead}>Verified Australian tradies, ready when you are.</Text>
        </View>
      </View>

      {/* Floating search card */}
      <View style={styles.cardWrap}>
        <View
          style={[
            styles.card,
            Shadows.lg,
            { backgroundColor: c.surface, borderColor: c.border },
          ]}
        >
          {/* Mode toggle */}
          <View
            style={[
              styles.toggle,
              { backgroundColor: c.canvas },
            ]}
          >
            <Pressable
              onPress={() => setMode('homeowner')}
              style={[
                styles.toggleBtn,
                mode === 'homeowner' && {
                  backgroundColor: c.surface,
                  ...Shadows.sm,
                },
              ]}
            >
              <Text
                style={[
                  styles.toggleText,
                  { color: mode === 'homeowner' ? c.primary : c.textSecondary },
                ]}
              >
                I need a tradie
              </Text>
            </Pressable>
            <Pressable
              onPress={() => setMode('tradie')}
              style={[
                styles.toggleBtn,
                mode === 'tradie' && {
                  backgroundColor: c.surface,
                  ...Shadows.sm,
                },
              ]}
            >
              <Text
                style={[
                  styles.toggleText,
                  { color: mode === 'tradie' ? c.primary : c.textSecondary },
                ]}
              >
                I&apos;m a tradie
              </Text>
            </Pressable>
          </View>

          {/* Search bar (tap → opens the structured search) + CTA */}
          <View style={styles.searchRow}>
            <Pressable
              onPress={openSearch}
              style={[
                styles.inputWrap,
                { backgroundColor: c.canvas, borderColor: c.border },
              ]}
              accessibilityRole="button"
              accessibilityLabel={placeholder}
            >
              <Text style={[styles.searchIcon, { color: c.textSecondary }]}>🔍</Text>
              <Text
                style={[styles.input, styles.placeholderText, { color: c.textSecondary }]}
                numberOfLines={1}
              >
                {placeholder}
              </Text>
            </Pressable>
            <Pressable
              onPress={openSearch}
              style={({ pressed }) => [
                styles.cta,
                { backgroundColor: c.primary },
                pressed && { backgroundColor: c.primaryDark, transform: [{ scale: 0.98 }] },
              ]}
            >
              <Text style={styles.ctaText}>{ctaLabel}</Text>
            </Pressable>
          </View>

          <Pressable
            onPress={() => router.push('/builder-signup' as any)}
            hitSlop={4}
          >
            <Text style={[styles.smallLink, { color: c.textSecondary }]}>
              New to BLDESY?{' '}
              <Text style={{ color: c.primary, fontFamily: FontFamily.bodySemiBold }}>
                Sign up as a tradie →
              </Text>
            </Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    paddingBottom: Spacing['3xl'],
  },
  banner: {
    height: 280,
    width: '100%',
    overflow: 'hidden',
  },
  headlineWrap: {
    position: 'absolute',
    top: 56,
    left: 16,
    right: 16,
    alignItems: 'center',
    gap: 6,
  },
  headline: {
    fontFamily: FontFamily.display,
    fontSize: 38,
    lineHeight: 42,
    color: '#ffffff',
    letterSpacing: -0.5,
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 18,
  },
  subhead: {
    fontFamily: FontFamily.bodyMedium,
    fontSize: 14,
    color: 'rgba(255,255,255,0.92)',
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.45)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 10,
  },
  cardWrap: {
    paddingHorizontal: Spacing.lg,
    marginTop: -72,
  },
  card: {
    borderRadius: Radius.xl,
    borderWidth: 1,
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  toggle: {
    flexDirection: 'row',
    padding: 4,
    borderRadius: Radius.full,
    gap: 4,
  },
  toggleBtn: {
    flex: 1,
    height: 36,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggleText: {
    fontFamily: FontFamily.bodyBold,
    fontSize: 12,
    fontWeight: '700',
  },
  searchRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  inputWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    height: 48,
    borderRadius: Radius.lg,
    borderWidth: 1,
    paddingHorizontal: 12,
    gap: 8,
  },
  searchIcon: {
    fontSize: 14,
  },
  input: {
    flex: 1,
    fontSize: 14,
  },
  placeholderText: {
    fontFamily: FontFamily.body,
  },
  cta: {
    height: 48,
    paddingHorizontal: Spacing.xl,
    borderRadius: Radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaText: {
    color: '#ffffff',
    fontFamily: FontFamily.bodyBold,
    fontWeight: '700',
    fontSize: 14,
  },
  smallLink: {
    fontFamily: FontFamily.body,
    fontSize: 12,
  },
});
