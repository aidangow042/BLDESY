/**
 * Footer — the website footer (`~/bldesy-web/components/layout/footer.tsx`,
 * LIVE branch) for scroll pages: dark footer-bg, wordmark + "Find your tradie.
 * Fast.", link columns For Homeowners / For Tradies / Company, then
 * "© 2026 BLDESY! All rights reserved." and "Made in Australia 🇦🇺" (the flag
 * is on the web footer). Website-only pages (demo, blog, legal) open in the
 * in-app browser.
 *
 * Portal / enterprise / dashboard routes get the web's MinimalFooter (wordmark +
 * Terms · Privacy · ©) automatically; pass `variant` to force one.
 *
 * Mount it as the last child of a screen's ScrollView.
 */
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter, type Href } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps } from 'react';

import { Colors, FontFamily, Radius, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useGlobalTabBar, useHideGlobalTabBar } from '@/hooks/use-global-tab-bar';
import { ROUTES, WEB_PAGES } from '@/lib/routes';

type IoniconName = ComponentProps<typeof Ionicons>['name'];

type FooterLink =
  | { kind: 'route'; label: string; route: Href }
  | { kind: 'web'; label: string; url: string };

interface FooterColumn {
  title: string;
  links: FooterLink[];
}

/* Verbatim from the web footer (flag-off branch). No business column — the
   business side is not part of this launch. */
const FOOTER_COLUMNS: FooterColumn[] = [
  {
    title: 'For Homeowners',
    links: [
      { kind: 'route', label: 'Search Tradies', route: ROUTES.search },
      { kind: 'route', label: 'Post a Job', route: ROUTES.postJob },
      { kind: 'route', label: 'All Trades', route: ROUTES.trades },
      { kind: 'route', label: 'My Jobs', route: ROUTES.myJobs },
    ],
  },
  {
    title: 'For Tradies',
    links: [
      { kind: 'route', label: 'Join as a Tradie', route: ROUTES.forTradies },
      { kind: 'route', label: 'Tradie login', route: ROUTES.portal },
    ],
  },
  {
    title: 'Company',
    links: [
      { kind: 'web', label: 'What is BLDESY?', url: WEB_PAGES.demo },
      { kind: 'web', label: 'Blog', url: WEB_PAGES.blog },
      { kind: 'route', label: 'Help & Support', route: ROUTES.help },
      { kind: 'web', label: 'Terms', url: WEB_PAGES.terms },
      { kind: 'web', label: 'Privacy', url: WEB_PAGES.privacy },
      { kind: 'web', label: 'Cookies', url: WEB_PAGES.cookies },
    ],
  },
];

/* Social placeholders — "coming soon" on the web too (decorative, not links). */
const SOCIAL_PLACEHOLDERS: { name: string; icon: IoniconName }[] = [
  { name: 'Facebook', icon: 'logo-facebook' },
  { name: 'Instagram', icon: 'logo-instagram' },
  { name: 'LinkedIn', icon: 'logo-linkedin' },
];

const COPYRIGHT = '© 2026 BLDESY! All rights reserved.';

function openWebPage(url: string) {
  WebBrowser.openBrowserAsync(url).catch(() => {});
}

interface FooterProps {
  /** Defaults to `minimal` on portal / enterprise / dashboard routes, else `full`. */
  variant?: 'full' | 'minimal';
}

export function Footer({ variant }: FooterProps) {
  // Same three route prefixes the web uses to pick MinimalFooter.
  const ownShell = useHideGlobalTabBar();
  const resolved = variant ?? (ownShell ? 'minimal' : 'full');
  return resolved === 'minimal' ? <MinimalFooter /> : <FullFooter />;
}

function FullFooter() {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];
  const router = useRouter();
  const { contentBottomInset } = useGlobalTabBar();

  function open(link: FooterLink) {
    if (link.kind === 'web') openWebPage(link.url);
    else router.navigate(link.route);
  }

  return (
    <View
      style={[
        styles.footer,
        { backgroundColor: c.footerBg, paddingBottom: Spacing['5xl'] + contentBottomInset },
      ]}
    >
      {/* Brand column */}
      <View>
        <Text style={[styles.wordmark, { color: c.primary }]}>BLDESY!</Text>
        <Text style={styles.tagline}>Find your tradie. Fast.</Text>
        <View
          style={styles.social}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        >
          {SOCIAL_PLACEHOLDERS.map((item) => (
            <View key={item.name} style={styles.socialCircle}>
              <Ionicons name={item.icon} size={16} color="rgba(255,255,255,0.3)" />
            </View>
          ))}
        </View>
      </View>

      {/* Link columns */}
      {FOOTER_COLUMNS.map((column) => (
        <View key={column.title}>
          <Text accessibilityRole="header" style={styles.columnTitle}>
            {column.title}
          </Text>
          <View style={styles.columnLinks}>
            {column.links.map((link) => (
              <Pressable
                key={link.label}
                accessibilityRole="link"
                onPress={() => open(link)}
                hitSlop={{ top: 5, bottom: 5 }}
                style={({ pressed }) => pressed && styles.pressed}
              >
                <Text style={styles.link}>{link.label}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      ))}

      <View style={styles.bottomRow}>
        <Text style={styles.legal}>{COPYRIGHT}</Text>
        <Text style={styles.legal}>Made in Australia 🇦🇺</Text>
      </View>
    </View>
  );
}

/**
 * Minimal footer for the logged-in portal surfaces: a tradie inside their own
 * portal doesn't need the marketing columns — just the legal line.
 */
function MinimalFooter() {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];
  const { contentBottomInset } = useGlobalTabBar();

  return (
    <View
      style={[
        styles.minimal,
        { backgroundColor: c.footerBg, paddingBottom: Spacing['2xl'] + contentBottomInset },
      ]}
    >
      <Text style={[styles.wordmarkSmall, { color: c.primary }]}>BLDESY!</Text>
      <View style={styles.minimalLinks}>
        <Pressable
          accessibilityRole="link"
          onPress={() => openWebPage(WEB_PAGES.terms)}
          hitSlop={6}
          style={({ pressed }) => pressed && styles.pressed}
        >
          <Text style={styles.legal}>Terms</Text>
        </Pressable>
        <Pressable
          accessibilityRole="link"
          onPress={() => openWebPage(WEB_PAGES.privacy)}
          hitSlop={6}
          style={({ pressed }) => pressed && styles.pressed}
        >
          <Text style={styles.legal}>Privacy</Text>
        </Pressable>
        <Text style={styles.legal}>{COPYRIGHT}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  footer: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing['5xl'], // web py-12
    gap: Spacing['4xl'], // web gap-10 between grid cells
  },
  wordmark: {
    fontFamily: FontFamily.display,
    fontSize: 24,
    letterSpacing: -0.6,
  },
  tagline: {
    marginTop: Spacing.sm,
    fontFamily: FontFamily.body,
    fontSize: 14,
    lineHeight: 20,
    color: 'rgba(255,255,255,0.6)',
  },
  social: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginTop: Spacing.lg,
  },
  socialCircle: {
    width: 36,
    height: 36,
    borderRadius: Radius.full,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  columnTitle: {
    fontFamily: FontFamily.bodyBold,
    fontWeight: '700',
    fontSize: 12,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: 'rgba(255,255,255,0.5)',
  },
  columnLinks: {
    marginTop: Spacing.md,
    gap: 10, // web space-y-2.5
  },
  link: {
    fontFamily: FontFamily.body,
    fontSize: 14,
    lineHeight: 20,
    color: 'rgba(255,255,255,0.7)',
  },
  pressed: {
    opacity: 0.7,
  },
  bottomRow: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255,255,255,0.1)',
    paddingTop: Spacing['2xl'],
    alignItems: 'center',
    gap: Spacing.sm,
  },
  legal: {
    fontFamily: FontFamily.body,
    fontSize: 12,
    lineHeight: 16,
    color: 'rgba(255,255,255,0.4)',
  },
  minimal: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing['2xl'],
    alignItems: 'center',
    gap: Spacing.sm,
  },
  wordmarkSmall: {
    fontFamily: FontFamily.display,
    fontSize: 18,
    letterSpacing: -0.4,
  },
  minimalLinks: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.lg,
  },
});
