/**
 * ReferralCodeCard — port of `~/bldesy-web/components/referrals/referral-code-card.tsx`.
 *
 * The one referral surface, reused on the pending page (variant "onboarding"),
 * the portal dashboard (dismissible) and the Refer & Earn page. Renders nothing
 * until the summary loads and nothing at all pre-verification (no code yet) —
 * codes are minted lazily by the summary fetch itself.
 */
import { useEffect, useRef, useState } from 'react';
import { Platform, Pressable, Share, StyleSheet, Text, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import * as WebBrowser from 'expo-web-browser';
import Ionicons from '@expo/vector-icons/Ionicons';

import { Card } from '@/components/ui';
import { Colors, FontFamily, Radius, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import {
  buildReferralSharePayload,
  formatCents,
  getMyReferralSummary,
  type ReferralSummary,
} from '@/lib/data/referrals';
import { WEB_PAGES } from '@/lib/routes';
import { REWARD_CAP_PER_YEAR, REWARD_LABEL } from '@/lib/web/referrals/config';

interface ReferralCodeCardProps {
  /** Tunes chrome only — content is identical everywhere. */
  variant: 'onboarding' | 'dashboard' | 'page';
  /** Pre-fetched summary (refer page). Omit to self-fetch. */
  initial?: ReferralSummary | null;
  /** Dashboard variant renders a dismiss X when provided. */
  onDismiss?: () => void;
}

export function ReferralCodeCard({ variant, initial, onDismiss }: ReferralCodeCardProps) {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];
  const [summary, setSummary] = useState<ReferralSummary | null>(initial ?? null);
  const [copied, setCopied] = useState<'code' | 'link' | null>(null);
  const copiedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (initial) {
      setSummary(initial);
      return;
    }
    let cancelled = false;
    getMyReferralSummary().then((data) => {
      if (!cancelled && data) setSummary(data);
    });
    return () => {
      cancelled = true;
    };
  }, [initial]);

  useEffect(
    () => () => {
      if (copiedTimer.current) clearTimeout(copiedTimer.current);
    },
    [],
  );

  if (!summary?.code || !summary.shareUrl) return null;
  const { code, shareUrl } = summary;

  async function copyText(text: string, kind: 'code' | 'link') {
    try {
      await Clipboard.setStringAsync(text);
      setCopied(kind);
      if (copiedTimer.current) clearTimeout(copiedTimer.current);
      copiedTimer.current = setTimeout(() => setCopied(null), 2000);
    } catch {
      // Clipboard unavailable — nothing sensible to do.
    }
  }

  async function handleShare() {
    const payload = buildReferralSharePayload(code, shareUrl);
    try {
      await Share.share({
        message: Platform.OS === 'ios' ? payload.text : `${payload.text} ${payload.url}`,
        url: payload.url,
      });
      return;
    } catch {
      // Share sheet dismissed or unavailable — fall through to copy.
    }
    void copyText(shareUrl, 'link');
  }

  const counter = `${summary.matesJoined} ${summary.matesJoined === 1 ? 'mate' : 'mates'} joined · ${summary.verifiedCount} verified · ${formatCents(summary.earnedCents)} earned`;

  return (
    <Card padding={Spacing.xl} style={styles.card}>
      {onDismiss ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Dismiss referral card"
          onPress={onDismiss}
          hitSlop={6}
          style={styles.close}
        >
          <Ionicons name="close" size={16} color={c.textSecondary} />
        </Pressable>
      ) : null}

      <View style={styles.row}>
        <View style={[styles.icon, { backgroundColor: c.primary + '1A' }]}>
          <Ionicons name="gift-outline" size={20} color={c.primary} />
        </View>
        <View style={[styles.body, onDismiss && styles.bodyWithClose]}>
          <Text style={[styles.title, { color: c.textPrimary }]}>
            Know a good tradie? Get {REWARD_LABEL} when they join.
          </Text>
          <Text style={[styles.sub, { color: c.textSecondary }]}>
            Credited when they&apos;re verified. Up to {REWARD_CAP_PER_YEAR} mates a year.{' '}
            <Text
              accessibilityRole="link"
              onPress={() => void WebBrowser.openBrowserAsync(WEB_PAGES.referralTerms)}
              style={styles.underline}
            >
              Refer &amp; Earn terms
            </Text>
          </Text>
        </View>
      </View>

      <View style={styles.codeRow}>
        <View style={[styles.codeBox, { borderColor: c.primary + '66', backgroundColor: c.primary + '0D' }]}>
          <Text selectable style={[styles.code, { color: c.primary }]}>
            {code}
          </Text>
        </View>
        <View style={styles.buttons}>
          <Pressable
            accessibilityRole="button"
            onPress={() => void copyText(code, 'code')}
            style={[styles.button, { backgroundColor: c.primary }]}
          >
            <Text style={[styles.buttonText, { color: '#ffffff' }]}>
              {copied === 'code' ? 'Copied!' : 'Copy code'}
            </Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            onPress={() => void handleShare()}
            style={[styles.button, styles.buttonOutline, { borderColor: c.border }]}
          >
            <Text style={[styles.buttonText, { color: c.textPrimary }]}>
              {copied === 'link' ? 'Link copied!' : 'Share'}
            </Text>
          </Pressable>
        </View>
      </View>

      {variant !== 'onboarding' ? (
        <Text style={[styles.counter, { color: c.textSecondary }]}>{counter}</Text>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    position: 'relative',
  },
  close: {
    position: 'absolute',
    top: Spacing.md,
    right: Spacing.md,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.md,
  },
  icon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    flex: 1,
    minWidth: 0,
  },
  bodyWithClose: {
    paddingRight: Spacing['3xl'],
  },
  title: {
    fontSize: 16,
    lineHeight: 24,
    fontFamily: FontFamily.bodyBold,
    fontWeight: '700',
  },
  sub: {
    marginTop: Spacing.xs,
    fontSize: 12,
    lineHeight: 18,
    fontFamily: FontFamily.body,
  },
  underline: {
    textDecorationLine: 'underline',
  },
  codeRow: {
    marginTop: Spacing.lg,
    gap: Spacing.sm,
  },
  codeBox: {
    height: 44,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderStyle: 'dashed',
    paddingHorizontal: Spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  code: {
    fontSize: 18,
    lineHeight: 24,
    letterSpacing: 2,
    fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }),
    fontWeight: '700',
  },
  buttons: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  button: {
    flex: 1,
    height: 44,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonOutline: {
    borderWidth: 1,
  },
  buttonText: {
    fontSize: 14,
    lineHeight: 20,
    fontFamily: FontFamily.bodyBold,
    fontWeight: '700',
  },
  counter: {
    marginTop: Spacing.md,
    fontSize: 12,
    lineHeight: 16,
    fontFamily: FontFamily.bodySemiBold,
    fontWeight: '600',
  },
});
