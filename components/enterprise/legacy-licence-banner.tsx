/**
 * LegacyLicenceBanner — port of ~/bldesy-web/components/builder/legacy-licence-banner.tsx
 * for the enterprise account kind.
 *
 * Shown to accounts that pre-date the multi-state licence migration: a
 * non-null legacy `enterprise_profiles.licence_number` but no rows in
 * `enterprise_licences`. Dismissable per-user (AsyncStorage stands in for the
 * web's localStorage) — the banner stays gone until the user actually adds
 * licences (next visit silently re-checks the table).
 */
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';

import { FontFamily, Radius, Spacing } from '@/constants/theme';
import { ENTERPRISE_EDIT_PROFILE_HREF, toHref } from '@/lib/enterprise-hub/nav';
import { db } from '@/lib/supabase';

const DISMISS_KEY_PREFIX = 'bldesy_dismissed_legacy_licence_banner_';

// Tailwind amber-300/60 · amber-50 · amber-700 · amber-900.
const AMBER_BORDER = 'rgba(252,211,77,0.6)';
const AMBER_BG = '#fffbeb';
const AMBER_ICON = '#b45309';
const AMBER_TEXT = '#78350f';

export function LegacyLicenceBanner({ userId }: { userId: string }) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    (async () => {
      try {
        if (await AsyncStorage.getItem(DISMISS_KEY_PREFIX + userId)) return;
      } catch {
        /* storage unavailable — check the tables anyway */
      }
      const [{ data: profile }, { data: rows }] = await Promise.all([
        db.from('enterprise_profiles').select('licence_number').eq('user_id', userId).maybeSingle(),
        db.from('enterprise_licences').select('id').eq('enterprise_user_id', userId).limit(1),
      ]);
      if (cancelled) return;
      const hasLegacy = !!profile?.licence_number;
      const hasNewRows = (rows ?? []).length > 0;
      if (hasLegacy && !hasNewRows) setShow(true);
    })().catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [userId]);

  if (!show) return null;

  return (
    <View style={styles.banner} accessibilityRole="alert">
      <Ionicons name="warning-outline" size={20} color={AMBER_ICON} style={{ marginTop: 2 }} />
      <View style={{ flex: 1 }}>
        <Text style={styles.title}>We&apos;ve upgraded licence verification</Text>
        <Text style={styles.body}>
          Please re-enter your trade licences so they keep showing on your public profile. You can now add licences
          for multiple states.{' '}
          <Text
            accessibilityRole="link"
            onPress={() => router.navigate(toHref(ENTERPRISE_EDIT_PROFILE_HREF))}
            style={styles.link}
          >
            Update licences
          </Text>
        </Text>
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Dismiss notice"
        hitSlop={8}
        onPress={() => {
          AsyncStorage.setItem(DISMISS_KEY_PREFIX + userId, '1').catch(() => {});
          setShow(false);
        }}
        style={styles.dismiss}
      >
        <Ionicons name="close" size={16} color={AMBER_ICON} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.md,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: AMBER_BORDER,
    backgroundColor: AMBER_BG,
    padding: Spacing.lg,
  },
  title: {
    color: AMBER_TEXT,
    fontSize: 14,
    fontFamily: FontFamily.bodySemiBold,
    fontWeight: '600',
  },
  body: {
    marginTop: 2,
    color: AMBER_TEXT,
    fontSize: 12,
    lineHeight: 18,
    fontFamily: FontFamily.body,
  },
  link: {
    fontFamily: FontFamily.bodyBold,
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
  dismiss: {
    padding: 4,
    borderRadius: Radius.full,
  },
});
