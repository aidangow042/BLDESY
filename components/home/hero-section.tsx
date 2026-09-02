/**
 * HeroSection — ~/bldesy-web/components/home/hero-section.tsx, LAUNCH branch:
 *   • Looping background montage (expo-video, hero-mobile.mp4) over the still
 *     poster, with the forest-green washes, radial darkening behind the
 *     headline and the tall ramp into the cream canvas. Reduced-motion and
 *     metered / slow connections get the poster only, like the web.
 *   • "Tradies Checked by Us, Chosen by You", the sub-line, the frosted
 *     Licensed · Insured · ID checked pills and CHECKED_FIVE_WAYS.
 *   • The search card: "I need a tradie" / "I'm a tradie" tabs. Homeowner mode
 *     = the input (tap → full-screen search overlay) + amber "Find tradies";
 *     tradie mode = amber "Join as a tradie →" (web onboarding hand-off).
 *   • Secondary links, then "Free, no middleman."
 *
 * The overlay is a full-screen Modal holding the embedded SearchForm plus the
 * same fill as /search (HowItWorksTabs + TradieSignupBand).
 */
import { useEffect, useState } from 'react';
import { AccessibilityInfo, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, type Href } from 'expo-router';
import { VideoView, useVideoPlayer } from 'expo-video';
import * as WebBrowser from 'expo-web-browser';
import { useIsFocused } from '@react-navigation/native';
import { useNetInfo } from '@react-native-community/netinfo';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';
import Ionicons from '@expo/vector-icons/Ionicons';

import { HowItWorksTabs } from '@/components/home/how-it-works-tabs';
import { SearchForm } from '@/components/search/search-form';
import { TradieSignupBand } from '@/components/search/tradie-signup-band';
import { Colors, FontFamily, Radius, Shadows, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useRoles } from '@/lib/auth-context';
import { trackFunnelEvent } from '@/lib/data/tracking';
import { ROUTES, WEB_BASE, WEB_PAGES } from '@/lib/routes';
import { openWebOnboarding } from '@/lib/web-onboarding';
import { CHECKED_FIVE_WAYS } from '@/lib/web/verification-copy';

type Mode = 'homeowner' | 'tradie';

/** Poster = the video's first frame; instant paint and the reduced-motion fallback. */
const HERO_POSTER = `${WEB_BASE}/hero-poster.jpg`;
/** The lighter phone encode (1080p @ ~1.4Mbps). ?v busts the cache when a montage is replaced. */
const HERO_VIDEO = `${WEB_BASE}/hero-mobile.mp4?v=3`;

/* Tailwind emerald-950 / emerald-50 / emerald-300, slate-100 / slate-500. */
const EMERALD_950 = '#022c22';
const EMERALD_50 = '#ecfdf5';
const EMERALD_300 = '#6ee7b7';
const SLATE_100 = '#f1f5f9';
const SLATE_500 = '#64748b';
/** The active tab's teal (hero-section.tsx text-[#0D7C66]). */
const TAB_TEAL = '#0D7C66';

const TEXT_SHADOW = {
  textShadowColor: 'rgba(15,23,42,0.45)',
  textShadowOffset: { width: 0, height: 2 },
  textShadowRadius: 12,
} as const;

export function HeroSection() {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isBuilder } = useRoles();
  const [mode, setMode] = useState<Mode>('homeowner');
  const [searchOpen, setSearchOpen] = useState(false);

  // An approved tradie lands in tradie mode, as on the web.
  useEffect(() => {
    if (isBuilder) setMode('tradie');
  }, [isBuilder]);

  // Decide once whether to load the background video: reduced motion and
  // metered / slow connections fall back to the still poster.
  const [reduceMotion, setReduceMotion] = useState<boolean | null>(null);
  useEffect(() => {
    let cancelled = false;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((v) => {
        if (!cancelled) setReduceMotion(v);
      })
      .catch(() => {
        if (!cancelled) setReduceMotion(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);
  const net = useNetInfo();
  const details = net.details as { isConnectionExpensive?: boolean; cellularGeneration?: string | null } | null;
  const saveData = details?.isConnectionExpensive === true;
  const slowNetwork = net.type === 'cellular' && ['2g', '3g'].includes(details?.cellularGeneration ?? '');
  const showVideo = reduceMotion === false && !saveData && !slowNetwork;

  function openSearch() {
    setSearchOpen(true);
  }
  function closeSearch() {
    setSearchOpen(false);
  }

  function joinAsTradie(via: 'hero_toggle' | 'hero_link') {
    trackFunnelEvent('tradie_signup_cta_tapped', { via });
    openWebOnboarding('builder').catch(() => {});
  }

  const placeholder = 'Suburb, postcode, or trade';

  return (
    <View style={styles.section}>
      {/* ── Background — montage over the poster, green washes, ramp ── */}
      <View style={StyleSheet.absoluteFill}>
        <Image
          source={{ uri: HERO_POSTER }}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          contentPosition={{ top: '55%', left: '50%' }}
          cachePolicy="memory-disk"
          accessibilityElementsHidden
        />
        {showVideo ? <HeroVideo /> : null}
        {/* Forest-green wash — lighter up top, deepening toward the search card. */}
        <LinearGradient
          colors={['rgba(6,78,59,0.62)', 'rgba(5,60,45,0.72)', 'rgba(2,44,34,0.88)']}
          locations={[0, 0.45, 1]}
          style={StyleSheet.absoluteFill}
        />
        {/* Horizontal balance — extra dark-green on the right only. */}
        <LinearGradient
          colors={['rgba(2,44,34,0)', 'rgba(2,44,34,0)', 'rgba(2,44,34,0.46)']}
          locations={[0, 0.3, 1]}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={StyleSheet.absoluteFill}
        />
        {/* Corner emerald hint + centre band behind the headline. */}
        <Svg style={StyleSheet.absoluteFill} width="100%" height="100%" pointerEvents="none">
          <Defs>
            <RadialGradient id="heroCorner" cx="0%" cy="0%" rx="70%" ry="60%" fx="0%" fy="0%">
              <Stop offset="0" stopColor="rgb(4,120,87)" stopOpacity={0.28} />
              <Stop offset="0.7" stopColor="rgb(4,120,87)" stopOpacity={0} />
            </RadialGradient>
            <RadialGradient id="heroBand" cx="50%" cy="33%" rx="60%" ry="42%" fx="50%" fy="33%">
              <Stop offset="0" stopColor="rgb(2,44,34)" stopOpacity={0.5} />
              <Stop offset="0.7" stopColor="rgb(2,44,34)" stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Rect width="100%" height="100%" fill="url(#heroCorner)" />
          <Rect width="100%" height="100%" fill="url(#heroBand)" />
        </Svg>
        {/* Hand-off to the cream section — a tall continuous ramp, no plateau. */}
        <LinearGradient
          colors={['rgba(2,44,34,0)', 'rgba(2,44,34,0.85)', 'rgba(2,44,34,1)', c.canvas]}
          locations={[0, 0.78, 0.94, 1]}
          style={styles.ramp}
        />
      </View>

      {/* ── Content over the video ────────────────────────────── */}
      <View style={styles.content}>
        <View style={styles.headline}>
          <Text accessibilityRole="header" style={[styles.h1, TEXT_SHADOW]}>
            Tradies Checked by Us, Chosen by You
          </Text>
          <Text style={[styles.subline, TEXT_SHADOW]}>
            Know exactly who&apos;s turning up at your door — so the tradie you pick is the right one, not a gamble.
          </Text>

          <View style={styles.pills}>
            {['Licensed', 'Insured', 'ID checked'].map((label) => (
              <View key={label} style={styles.pill}>
                <Ionicons name="checkmark" size={14} color={EMERALD_300} />
                <Text style={styles.pillText}>{label}</Text>
              </View>
            ))}
          </View>
          <Text style={[styles.fiveWays, TEXT_SHADOW]}>{CHECKED_FIVE_WAYS}</Text>
        </View>

        {/* Search card */}
        <View style={[styles.card, Shadows['2xl'], { backgroundColor: c.surface + 'F2' }]}>
          <View accessibilityRole="tablist" accessibilityLabel="Search mode" style={styles.tabs}>
            {(['homeowner', 'tradie'] as const).map((m) => {
              const active = mode === m;
              return (
                <Pressable
                  key={m}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: active }}
                  onPress={() => setMode(m)}
                  style={[styles.tab, active && [styles.tabActive, Shadows.sm]]}
                >
                  <Text style={[styles.tabText, { color: active ? TAB_TEAL : SLATE_500 }]}>
                    {m === 'homeowner' ? 'I need a tradie' : "I'm a tradie"}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {mode === 'tradie' ? (
            <Pressable
              accessibilityRole="link"
              onPress={() => joinAsTradie('hero_toggle')}
              style={({ pressed }) => [styles.ctaBtn, Shadows.md, { backgroundColor: pressed ? c.ctaDark : c.cta }]}
            >
              <Text style={styles.ctaText}>Join as a tradie →</Text>
            </Pressable>
          ) : (
            <View style={styles.searchRow}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={placeholder}
                onPress={openSearch}
                style={[styles.inputLike, { backgroundColor: c.canvas, borderColor: c.border }]}
              >
                <Ionicons name="search-outline" size={20} color={c.textSecondary} />
                <Text style={[styles.inputPlaceholder, { color: c.textSecondary + '99' }]} numberOfLines={1}>
                  {placeholder}
                </Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                onPress={openSearch}
                style={({ pressed }) => [styles.ctaBtn, Shadows.md, { backgroundColor: pressed ? c.ctaDark : c.cta }]}
              >
                <Text style={styles.ctaText}>Find tradies</Text>
              </Pressable>
            </View>
          )}

          {/* Secondary links — the demo walk-through, plus the other door for the current mode. */}
          {!isBuilder ? (
            <Text style={[styles.secondary, { color: c.textSecondary }]}>
              <Text
                accessibilityRole="link"
                onPress={() => WebBrowser.openBrowserAsync(WEB_PAGES.demo).catch(() => {})}
                style={[styles.secondaryLink, { color: c.primary }]}
              >
                See how it works →
              </Text>
              <Text style={{ color: c.border }}> · </Text>
              {mode === 'tradie' ? (
                <>
                  Already on BLDESY?{' '}
                  <Text
                    accessibilityRole="link"
                    onPress={() => router.push(ROUTES.jobs as Href)}
                    style={[styles.secondaryLink, { color: c.primary }]}
                  >
                    Browse jobs →
                  </Text>
                </>
              ) : (
                <>
                  New to BLDESY?{' '}
                  <Text
                    accessibilityRole="link"
                    onPress={() => joinAsTradie('hero_link')}
                    style={[styles.secondaryLink, { color: c.primary }]}
                  >
                    Sign up as a tradie →
                  </Text>
                </>
              )}
            </Text>
          ) : null}
        </View>

        <Text style={[styles.freeLine, TEXT_SHADOW]}>Free, no middleman.</Text>
      </View>

      {/* ── Search overlay — the /search form over the page ─────── */}
      <Modal visible={searchOpen} animationType="slide" presentationStyle="fullScreen" onRequestClose={closeSearch}>
        <View style={[styles.overlay, { backgroundColor: c.canvas }]}>
          <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: insets.bottom }}>
            <View style={{ height: insets.top, backgroundColor: '#17563F' }} />
            <SearchForm onBeforeSubmit={closeSearch} embedded />
            <HowItWorksTabs />
            <TradieSignupBand />
          </ScrollView>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close search"
            onPress={closeSearch}
            style={[styles.closeBtn, Shadows.md, { top: insets.top + Spacing.lg, backgroundColor: c.surface, borderColor: c.border }]}
          >
            <Ionicons name="close" size={20} color={c.textSecondary} />
          </Pressable>
        </View>
      </Modal>
    </View>
  );
}

/**
 * The looping montage. Mounted only when the hero decided motion is OK; fades
 * in on first frame (a missing file just leaves the poster showing), pauses
 * while the tab isn't focused, and breathes with the web's 16s Ken Burns zoom.
 */
function HeroVideo() {
  const isFocused = useIsFocused();
  const opacity = useSharedValue(0);
  const scale = useSharedValue(1);

  const player = useVideoPlayer(HERO_VIDEO, (p) => {
    p.loop = true;
    p.muted = true;
    p.play();
  });

  useEffect(() => {
    if (isFocused) player.play();
    else player.pause();
  }, [isFocused, player]);

  useEffect(() => {
    scale.value = withRepeat(withTiming(1.08, { duration: 16000, easing: Easing.inOut(Easing.ease) }), -1, true);
  }, [scale]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={[StyleSheet.absoluteFill, animatedStyle]} pointerEvents="none">
      <VideoView
        player={player}
        style={StyleSheet.absoluteFill}
        contentFit="cover"
        nativeControls={false}
        allowsPictureInPicture={false}
        onFirstFrameRender={() => {
          opacity.value = withTiming(1, { duration: 700 });
        }}
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  section: {
    backgroundColor: EMERALD_950,
    overflow: 'hidden',
  },
  ramp: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 128,
  },
  content: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing['6xl'],
  },
  headline: {
    alignItems: 'center',
  },
  h1: {
    fontFamily: FontFamily.display,
    fontSize: 36,
    lineHeight: 39,
    letterSpacing: -0.5,
    color: '#ffffff',
    textAlign: 'center',
  },
  subline: {
    marginTop: Spacing.lg,
    fontFamily: FontFamily.bodyMedium,
    fontWeight: '500',
    fontSize: 16,
    lineHeight: 24,
    color: EMERALD_50,
    textAlign: 'center',
    maxWidth: 512,
  },
  pills: {
    marginTop: Spacing['2xl'],
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'center',
    columnGap: 6,
    rowGap: Spacing.sm,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: Spacing.md,
    paddingVertical: 4,
  },
  pillText: {
    fontFamily: FontFamily.bodyBold,
    fontWeight: '700',
    fontSize: 12,
    color: '#ffffff',
  },
  fiveWays: {
    marginTop: Spacing.sm,
    fontFamily: FontFamily.bodyMedium,
    fontWeight: '500',
    fontSize: 12,
    lineHeight: 16,
    color: 'rgba(236,253,245,0.9)',
    textAlign: 'center',
  },
  card: {
    marginTop: Spacing['3xl'],
    borderRadius: Radius.xl,
    padding: Spacing.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  tabs: {
    flexDirection: 'row',
    gap: 4,
    borderRadius: Radius.full,
    backgroundColor: SLATE_100,
    padding: 4,
    marginBottom: Spacing.md,
  },
  tab: {
    flex: 1,
    height: 40,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabActive: {
    backgroundColor: '#ffffff',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  tabText: {
    fontFamily: FontFamily.bodyBold,
    fontWeight: '700',
    fontSize: 14,
  },
  searchRow: {
    gap: Spacing.sm,
  },
  inputLike: {
    height: 48,
    borderRadius: Radius.lg,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingHorizontal: Spacing.lg,
  },
  inputPlaceholder: {
    flex: 1,
    fontFamily: FontFamily.body,
    fontSize: 16,
  },
  ctaBtn: {
    height: 48,
    borderRadius: Radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing['2xl'],
  },
  ctaText: {
    fontFamily: FontFamily.bodyBold,
    fontWeight: '700',
    fontSize: 16,
    color: '#ffffff',
  },
  secondary: {
    marginTop: Spacing.md,
    fontFamily: FontFamily.body,
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
  },
  secondaryLink: {
    fontFamily: FontFamily.bodySemiBold,
    fontWeight: '600',
  },
  freeLine: {
    marginTop: Spacing.lg,
    fontFamily: FontFamily.bodySemiBold,
    fontWeight: '600',
    fontSize: 14,
    color: 'rgba(236,253,245,0.9)',
    textAlign: 'center',
  },
  overlay: {
    flex: 1,
  },
  closeBtn: {
    position: 'absolute',
    right: Spacing.lg,
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
