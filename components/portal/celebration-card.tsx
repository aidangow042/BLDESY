/**
 * CelebrationCard — port of `~/bldesy-web/components/portal/celebration-card.tsx`.
 *
 * The verified celebration moment (P2.1): a one-off congratulations card on
 * the dashboard when a tradie first goes live. Shown while approval is
 * fresh (≤14 days) and until dismissed — dismissal is device-storage only
 * (a celebration is a nicety, not state worth a migration; worst case a
 * new device re-celebrates within the window).
 */
import { useEffect, useState } from 'react';
import { Platform, Pressable, Share, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Ionicons from '@expo/vector-icons/Ionicons';

import { Colors, FontFamily, Radius, Shadows, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useUser } from '@/lib/auth-context';
import { LAUNCH_MODE } from '@/lib/launch-flags';
import { ROUTES, WEB_BASE } from '@/lib/routes';
import { builderProfilePath } from '@/lib/web/profile-url';
import { REWARD_AMOUNT_AUD } from '@/lib/web/referrals/config';

import { usePortal } from './portal-context';

const DISMISS_KEY = 'bldesy_live_celebrated';
const FRESH_DAYS = 14;

export function CelebrationCard() {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];
  const router = useRouter();
  const { user } = useUser();
  const { profile } = usePortal();
  const [dismissed, setDismissed] = useState(true); // hidden until storage is read
  const [mountedAt, setMountedAt] = useState<number | null>(null);

  useEffect(() => {
    let active = true;
    setMountedAt(Date.now());
    AsyncStorage.getItem(DISMISS_KEY)
      .then((v) => {
        if (active) setDismissed(v === '1');
      })
      .catch(() => {
        if (active) setDismissed(false);
      });
    return () => {
      active = false;
    };
  }, []);

  if (!user || !profile || dismissed || mountedAt === null) return null;
  if (profile.status !== 'approved' && profile.status !== 'active') return null;
  if (profile.search_paused_at) return null;
  const approvedAt = profile.approved_at ? new Date(profile.approved_at).getTime() : null;
  if (!approvedAt || mountedAt - approvedAt > FRESH_DAYS * 86_400_000) return null;

  const waitlist = LAUNCH_MODE === 'waitlist';
  const profilePath = builderProfilePath(profile);

  function dismiss() {
    AsyncStorage.setItem(DISMISS_KEY, '1').catch(() => {});
    setDismissed(true);
  }

  async function shareProfile() {
    const url = `${WEB_BASE}${profilePath}`;
    const text = 'Find me on BLDESY — checked tradies, yours to choose.';
    try {
      await Share.share({
        title: profile?.business_name ?? 'My BLDESY profile',
        message: Platform.OS === 'ios' ? text : `${text} ${url}`,
        url,
      });
    } catch {
      /* dismissed the share sheet */
    }
  }

  return (
    <View style={[styles.card, Shadows.sm, { borderColor: c.success + '66', backgroundColor: c.successBg }]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Dismiss"
        onPress={dismiss}
        hitSlop={6}
        style={styles.close}
      >
        <Ionicons name="close" size={16} color={c.textSecondary + '80'} />
      </Pressable>

      <View style={styles.row}>
        <Text style={styles.emoji} aria-hidden>
          🎉
        </Text>
        <View style={styles.body}>
          <Text style={[styles.title, { color: c.textPrimary }]}>
            {waitlist
              ? "You're verified — and on the launch roster"
              : `You're live${profile.suburb ? ` in ${profile.suburb}` : ''}!`}
          </Text>
          <Text style={[styles.detail, { color: c.textSecondary }]}>
            {waitlist
              ? 'Your credentials checked out. Homeowners see your profile the day your area switches on — get your link out there in the meantime.'
              : 'Your credentials checked out and homeowners can now find you in search.'}
          </Text>

          <View style={styles.actions}>
            <Pressable
              accessibilityRole="button"
              onPress={() => void shareProfile()}
              style={[styles.pill, { backgroundColor: c.primary }]}
            >
              <Text style={[styles.pillText, { color: '#ffffff' }]}>Share your profile</Text>
            </Pressable>
            <Pressable
              accessibilityRole="link"
              onPress={() => router.push(ROUTES.builderProfile(profile.user_id))}
              style={[styles.pill, styles.pillOutline, { borderColor: c.primary }]}
            >
              <Text style={[styles.pillText, { color: c.primary, fontFamily: FontFamily.bodySemiBold }]}>
                View public profile
              </Text>
            </Pressable>
          </View>

          <Text style={[styles.footer, { color: c.textSecondary }]}>
            Know a good tradie?{' '}
            <Text
              accessibilityRole="link"
              onPress={() => router.push(ROUTES.portalRefer)}
              style={[styles.footerLink, { color: c.primary }]}
            >
              Get ${REWARD_AMOUNT_AUD} when they&apos;re verified
            </Text>
            .
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    position: 'relative',
    borderRadius: Radius.xl,
    borderWidth: 1,
    padding: Spacing.xl,
    overflow: 'hidden',
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
    gap: Spacing.lg,
  },
  emoji: {
    fontSize: 30,
    lineHeight: 34,
  },
  body: {
    flex: 1,
    minWidth: 0,
    paddingRight: Spacing['2xl'],
  },
  title: {
    fontSize: 16,
    lineHeight: 24,
    fontFamily: FontFamily.bodyBold,
    fontWeight: '700',
  },
  detail: {
    marginTop: Spacing.xs,
    fontSize: 14,
    lineHeight: 22,
    fontFamily: FontFamily.body,
  },
  actions: {
    marginTop: Spacing.lg,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    alignItems: 'center',
  },
  pill: {
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.sm,
    minHeight: 36,
    justifyContent: 'center',
  },
  pillOutline: {
    borderWidth: 1,
    paddingHorizontal: Spacing.lg,
  },
  pillText: {
    fontSize: 12,
    lineHeight: 16,
    fontFamily: FontFamily.bodyBold,
    fontWeight: '700',
  },
  footer: {
    marginTop: Spacing.md,
    fontSize: 12,
    lineHeight: 18,
    fontFamily: FontFamily.body,
  },
  footerLink: {
    fontFamily: FontFamily.bodySemiBold,
    fontWeight: '600',
  },
});
