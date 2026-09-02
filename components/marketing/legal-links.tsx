/**
 * LegalLinks — the five legal documents from ~/bldesy-web/app/legal/page.tsx,
 * every one opening the LIVE website page in the in-app browser. The app no
 * longer ships its own legal text (it was six months stale), so this is the
 * single place a legal link is spelled out; Terms/Privacy in the footer still
 * come from WEB_PAGES the same way.
 *
 * `variant="cards"` is the legal index page's card list (icon, title,
 * description, chevron); `variant="rows"` is a compact link list for settings
 * and help screens.
 */
import type { ComponentProps } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import * as WebBrowser from 'expo-web-browser';

import { DRAW_TERMS_TITLE } from '@/components/waitlist/draw-prize';
import { Colors, FontFamily, Radius, Shadows, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { WEB_PAGES } from '@/lib/routes';

type IoniconName = ComponentProps<typeof Ionicons>['name'];

export interface LegalPage {
  key: 'terms' | 'privacy' | 'drawTerms' | 'referralTerms' | 'cookies';
  title: string;
  description: string;
  url: string;
  icon: IoniconName;
}

/** Labels + descriptions verbatim from the website's legal index, in its order. */
export const LEGAL_PAGES: readonly LegalPage[] = [
  {
    key: 'terms',
    title: 'Terms of Service',
    description:
      'How the BLDESY! platform works, including our role as a connector only, user responsibilities, disclaimers, and limits on our liability for user-to-user interactions.',
    url: WEB_PAGES.terms,
    icon: 'document-text-outline',
  },
  {
    key: 'privacy',
    title: 'Privacy Policy',
    description:
      'How we collect, use, store, and protect your personal information in accordance with the Australian Privacy Act 1988.',
    url: WEB_PAGES.privacy,
    icon: 'shield-checkmark-outline',
  },
  {
    key: 'drawTerms',
    title: DRAW_TERMS_TITLE,
    description:
      'Terms for the homeowner waitlist prize draw — who can enter, how entry works, the prize, and how the winner is drawn and notified.',
    url: WEB_PAGES.drawTerms,
    icon: 'gift-outline',
  },
  {
    key: 'referralTerms',
    title: 'Refer & Earn — Terms & Conditions',
    description:
      'Terms for the tradie referral program — who can take part, what counts as a valid referral, how the reward is capped, credited, and reversed.',
    url: WEB_PAGES.referralTerms,
    icon: 'people-outline',
  },
  {
    key: 'cookies',
    title: 'Cookie Policy',
    description:
      'Information about the cookies and similar technologies we use on our website and how to manage your preferences.',
    url: WEB_PAGES.cookies,
    icon: 'options-outline',
  },
];

/** Open a website legal page in the in-app browser. */
export function openLegalPage(url: string): void {
  WebBrowser.openBrowserAsync(url).catch(() => {});
}

interface LegalLinksProps {
  variant?: 'cards' | 'rows';
  /** Subset of pages to show (defaults to all five). */
  keys?: readonly LegalPage['key'][];
}

export function LegalLinks({ variant = 'cards', keys }: LegalLinksProps) {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];
  const pages = keys ? LEGAL_PAGES.filter((p) => keys.includes(p.key)) : LEGAL_PAGES;

  if (variant === 'rows') {
    return (
      <View style={[styles.rowsCard, { backgroundColor: c.surface, borderColor: c.border }]}>
        {pages.map((page, i) => (
          <Pressable
            key={page.key}
            accessibilityRole="link"
            onPress={() => openLegalPage(page.url)}
            style={({ pressed }) => [
              styles.row,
              i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.border },
              pressed && { backgroundColor: c.canvas },
            ]}
          >
            <View style={[styles.rowIcon, { backgroundColor: c.primaryBg }]}>
              <Ionicons name={page.icon} size={16} color={c.primary} />
            </View>
            <Text style={[styles.rowLabel, { color: c.textPrimary }]}>{page.title}</Text>
            <Ionicons name="open-outline" size={16} color={c.textSecondary} />
          </Pressable>
        ))}
      </View>
    );
  }

  return (
    <View style={styles.cards}>
      {pages.map((page) => (
        <Pressable
          key={page.key}
          accessibilityRole="link"
          onPress={() => openLegalPage(page.url)}
          style={({ pressed }) => [
            styles.card,
            Shadows.sm,
            { backgroundColor: c.surface, borderColor: pressed ? c.primary + '66' : c.border },
          ]}
        >
          <View style={[styles.cardIcon, { backgroundColor: c.primary + '1A' }]}>
            <Ionicons name={page.icon} size={28} color={c.primary} />
          </View>
          <View style={styles.cardBody}>
            <Text style={[styles.cardTitle, { color: c.textPrimary }]}>{page.title}</Text>
            <Text style={[styles.cardDescription, { color: c.textSecondary }]}>{page.description}</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={c.textSecondary + '66'} style={styles.cardChevron} />
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  cards: {
    gap: Spacing.lg,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.lg,
    borderRadius: Radius.xl,
    borderWidth: 1,
    padding: Spacing['2xl'],
  },
  cardIcon: {
    borderRadius: Radius.lg,
    padding: Spacing.md,
  },
  cardBody: {
    flex: 1,
    gap: Spacing.xs,
  },
  cardTitle: {
    fontFamily: FontFamily.bodySemiBold,
    fontWeight: '600',
    fontSize: 18,
    lineHeight: 26,
  },
  cardDescription: {
    fontFamily: FontFamily.body,
    fontSize: 14,
    lineHeight: 22,
  },
  cardChevron: {
    marginTop: Spacing.xs,
  },
  rowsCard: {
    borderRadius: Radius.xl,
    borderWidth: 1,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    minHeight: 52,
  },
  rowIcon: {
    width: 30,
    height: 30,
    borderRadius: Radius.sm + 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowLabel: {
    flex: 1,
    fontFamily: FontFamily.bodySemiBold,
    fontWeight: '600',
    fontSize: 15,
  },
});
