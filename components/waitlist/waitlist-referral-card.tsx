/**
 * WaitlistReferralCard — port of
 * ~/bldesy-web/components/waitlist/waitlist-referral-card.tsx: the joiner's
 * MATE- code + share buttons. Clipboard copy with a 2s "Copied!" state; the
 * native share sheet with a copy-link fallback. Every mate who joins with the
 * code earns the owner a bonus draw entry, capped at REFERRAL_BONUS_CAP.
 * Forced-light like the rest of the waitlist surface.
 */
import { useEffect, useRef, useState } from 'react';
import { Pressable, Share, StyleSheet, Text, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';

import { FontFamily, Radius, Spacing } from '@/constants/theme';
import { trackFunnelEvent } from '@/lib/data/tracking';

import { WL } from './palette';
import { REFERRAL_BONUS_CAP, buildMateShareUrl } from './referral-codes';

interface WaitlistReferralCardProps {
  code: string;
  bonusEntries: number;
}

export function WaitlistReferralCard({ code, bonusEntries }: WaitlistReferralCardProps) {
  const [copied, setCopied] = useState<'code' | 'link' | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const shareUrl = buildMateShareUrl(code);
  const shareText = `I'm on the BLDESY waitlist — verified tradies, first in line at launch. Join with my code ${code}:`;

  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  async function copyText(text: string, kind: 'code' | 'link') {
    try {
      await Clipboard.setStringAsync(text);
      setCopied(kind);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setCopied(null), 2000);
      trackFunnelEvent('referral_share', { method: `copy_${kind}` });
    } catch {
      /* clipboard blocked — nothing to do */
    }
  }

  async function handleShare() {
    try {
      const outcome = await Share.share({ message: `${shareText} ${shareUrl}`, url: shareUrl });
      if (outcome.action === Share.sharedAction) {
        trackFunnelEvent('referral_share', { method: 'web_share' });
        return;
      }
      if (outcome.action === Share.dismissedAction) return;
    } catch {
      /* share sheet unavailable — fall through to copy */
    }
    await copyText(`${shareText} ${shareUrl}`, 'link');
  }

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Double your chances</Text>
      <Text style={styles.body}>
        Every mate who joins the waitlist with your code earns you a bonus draw entry — max{' '}
        {REFERRAL_BONUS_CAP}.{' '}
        <Text style={styles.strong}>
          {bonusEntries} of {REFERRAL_BONUS_CAP} earned.
        </Text>
      </Text>

      <View style={styles.actions}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Copy code ${code}`}
          onPress={() => copyText(code, 'code')}
          style={({ pressed }) => [styles.codeButton, pressed && { backgroundColor: '#d9ecdf' }]}
        >
          <Text style={styles.code}>{code}</Text>
          <Text style={styles.codeHint}>{copied === 'code' ? 'Copied!' : 'Copy'}</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          onPress={handleShare}
          style={({ pressed }) => [styles.shareButton, pressed && { backgroundColor: WL.greenDark }]}
        >
          <Text style={styles.shareLabel}>Share with a mate</Text>
        </Pressable>
        <Pressable accessibilityRole="button" onPress={() => copyText(shareUrl, 'link')} hitSlop={6}>
          <Text style={styles.linkLabel}>{copied === 'link' ? 'Link copied!' : 'Copy link'}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginTop: Spacing['2xl'],
    alignSelf: 'stretch',
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: WL.cardBorder,
    backgroundColor: WL.white,
    padding: Spacing.xl,
  },
  title: {
    fontFamily: FontFamily.display,
    fontSize: 18,
    lineHeight: 26,
    color: WL.ink,
  },
  body: {
    marginTop: Spacing.xs,
    fontFamily: FontFamily.body,
    fontSize: 14,
    lineHeight: 22,
    color: WL.muted,
  },
  strong: {
    fontFamily: FontFamily.bodySemiBold,
    fontWeight: '600',
    color: WL.ink,
  },
  actions: {
    marginTop: Spacing.lg,
    gap: Spacing.sm,
  },
  codeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: 'rgba(29, 138, 99, 0.5)',
    backgroundColor: WL.mint,
    paddingHorizontal: Spacing.lg,
    paddingVertical: 10,
  },
  code: {
    fontFamily: 'Menlo',
    fontWeight: '700',
    fontSize: 14,
    letterSpacing: 1,
    color: WL.green,
  },
  codeHint: {
    fontFamily: FontFamily.bodySemiBold,
    fontWeight: '600',
    fontSize: 12,
    color: WL.green,
  },
  shareButton: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.lg,
    backgroundColor: WL.green,
    paddingHorizontal: Spacing.xl,
    paddingVertical: 10,
  },
  shareLabel: {
    fontFamily: FontFamily.bodyBold,
    fontWeight: '700',
    fontSize: 14,
    color: WL.white,
  },
  linkLabel: {
    alignSelf: 'center',
    fontFamily: FontFamily.bodySemiBold,
    fontWeight: '600',
    fontSize: 14,
    color: WL.muted,
    textDecorationLine: 'underline',
  },
});
