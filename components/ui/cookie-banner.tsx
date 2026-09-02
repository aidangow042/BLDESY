/**
 * Cookie consent banner — mirrors `~/bldesy-web/components/layout/cookie-banner.tsx`:
 * shown once, the decision persisted locally (AsyncStorage `bldesy_cookie_consent`)
 * and recorded fire-and-forget through the website's `/api/consent/cookies` audit
 * endpoint. Floats 12px above the tab bar (or the safe area) like the web card.
 * Mounted once in the root layout.
 */
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as WebBrowser from 'expo-web-browser';

import { Colors, FontFamily, Radius, Shadows, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useGlobalTabBar } from '@/hooks/use-global-tab-bar';
import { api } from '@/lib/api';
import { WEB_PAGES } from '@/lib/routes';

const STORAGE_KEY = 'bldesy_cookie_consent';

type Decision = 'accepted' | 'declined';

export function CookieBanner() {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];
  const { windowBottomInset } = useGlobalTabBar();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((value) => {
        if (!value) setVisible(true);
      })
      .catch(() => {});
  }, []);

  function decide(decision: Decision) {
    setVisible(false);
    AsyncStorage.setItem(STORAGE_KEY, decision).catch(() => {});
    // Fire-and-forget server-side audit record. Never blocks the UI and never
    // surfaces errors — local storage remains the source of truth for whether
    // the banner shows.
    api.post('/api/consent/cookies', { decision }).catch(() => {});
  }

  if (!visible) return null;

  return (
    // box-none so the full-width wrapper doesn't block taps beside the card
    <View pointerEvents="box-none" style={[styles.wrap, { bottom: windowBottomInset }]}>
      <View
        accessibilityRole="alert"
        style={[styles.card, Shadows.lg, { backgroundColor: c.surface, borderColor: c.border }]}
      >
        <Text style={[styles.copy, { color: c.textSecondary }]}>
          We use essential cookies to keep BLDESY running and optional cookies to improve your
          experience.{' '}
          <Text
            accessibilityRole="link"
            onPress={() => WebBrowser.openBrowserAsync(WEB_PAGES.cookies).catch(() => {})}
            style={[styles.link, { color: c.primary }]}
          >
            Cookie Policy
          </Text>
        </Text>
        <View style={styles.actions}>
          <Pressable
            accessibilityRole="button"
            onPress={() => decide('declined')}
            style={({ pressed }) => [
              styles.declineBtn,
              { borderColor: c.border },
              pressed && { backgroundColor: c.canvas },
            ]}
          >
            <Text style={[styles.declineText, { color: c.textSecondary }]}>Decline</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            onPress={() => decide('accepted')}
            style={({ pressed }) => [
              styles.acceptBtn,
              { backgroundColor: pressed ? c.primaryDark : c.primary },
            ]}
          >
            <Text style={styles.acceptText}>Accept</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    padding: Spacing.md, // web p-3
    zIndex: 60,
  },
  card: {
    width: '100%',
    maxWidth: 672, // web max-w-2xl
    alignSelf: 'center',
    borderRadius: Radius.xl,
    borderWidth: 1,
    padding: Spacing.lg,
  },
  copy: {
    fontFamily: FontFamily.body,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: Spacing.md,
  },
  link: {
    fontFamily: FontFamily.bodyMedium,
    fontWeight: '500',
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: Spacing.sm,
  },
  declineBtn: {
    borderRadius: Radius.full,
    borderWidth: 1,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
  },
  declineText: {
    fontFamily: FontFamily.bodySemiBold,
    fontWeight: '600',
    fontSize: 12,
  },
  acceptBtn: {
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
  },
  acceptText: {
    color: '#ffffff',
    fontFamily: FontFamily.bodyBold,
    fontWeight: '700',
    fontSize: 12,
  },
});
