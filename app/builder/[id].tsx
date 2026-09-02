/**
 * /builder/[id] — the public tradie profile (~/bldesy-web/components/builder/
 * public-profile-page.tsx + builder-profile-view.tsx). `[id]` is the tradie's
 * `user_id`; a keyword-URL slug is accepted too and looked up by slug. The
 * record comes from the PII-safe view (approved/active only), reviews and
 * capabilities are fetched only when their sections are visible, and the
 * profile-view beacon fires on mount (self-views + dedup are server-side).
 */
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter, type Href } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BuilderProfileView, type BuilderProfileViewData } from '@/components/builder/builder-profile-view';
import { isBuilderVerified, isUuid } from '@/components/builder/profile-helpers';
import { STICKY_CTA_HEIGHT, StickyCTA } from '@/components/builder/sticky-cta';
import { AppShell } from '@/components/layout';
import { Button, Skeleton } from '@/components/ui';
import { Colors, FontFamily, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { emptyReviewsResult, getBuilderById, getBuilderBySlug, getBuilderReviews } from '@/lib/data/builders';
import { readCapabilitiesRows } from '@/lib/data/capabilities';
import { recordProfileView } from '@/lib/data/contact';
import { addRecentProfile } from '@/lib/recent-profiles';
import { ROUTES } from '@/lib/routes';
import { todayYmdSydney } from '@/lib/web/dates';
import { isSectionVisible } from '@/lib/web/profile-visibility';

type ScreenState = { status: 'loading' } | { status: 'not_found' } | { status: 'ready'; data: BuilderProfileViewData };

export default function BuilderProfileScreen() {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [state, setState] = useState<ScreenState>({ status: 'loading' });

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    setState({ status: 'loading' });
    (async () => {
      const builder = isUuid(id) ? await getBuilderById(id) : await getBuilderBySlug(id.toLowerCase());
      if (cancelled) return;
      if (!builder) {
        setState({ status: 'not_found' });
        return;
      }
      const uid = builder.user_id;
      // Hidden sections skip their fetch entirely.
      const visibility = builder.profile_visibility ?? {};
      const showReviews = isSectionVisible(visibility, 'reviews');
      const showCapabilities = isSectionVisible(visibility, 'capabilities');
      const [reviews, capabilities] = await Promise.all([
        showReviews ? getBuilderReviews(uid) : Promise.resolve(emptyReviewsResult()),
        showCapabilities
          ? readCapabilitiesRows([uid])
              .then((rows) => rows.get(uid) ?? null)
              .catch(() => null)
          : Promise.resolve(null),
      ]);
      if (cancelled) return;
      setState({
        status: 'ready',
        data: { builder, reviews, capabilities, todayYmd: todayYmdSydney(), isVerified: isBuilderVerified(builder) },
      });
      // Profile-view beacon (fire-and-forget) + the app's recently-viewed list.
      void recordProfileView(uid);
      void addRecentProfile({
        id: uid,
        business_name: builder.business_name,
        trade_category: builder.trade_category,
        suburb: builder.suburb,
        profile_photo_url: builder.profile_photo_url,
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (state.status === 'loading') {
    return (
      <AppShell showBack>
        <View style={styles.skeleton}>
          <Skeleton variant="image" style={{ height: 200 }} />
          <Skeleton variant="avatar" style={{ width: 96, height: 96, alignSelf: 'center', marginTop: -48 }} />
          <Skeleton variant="text" style={{ width: '60%', alignSelf: 'center', height: 22 }} />
          <Skeleton variant="text" style={{ width: '40%', alignSelf: 'center' }} />
          <Skeleton variant="card" />
        </View>
      </AppShell>
    );
  }

  if (state.status === 'not_found') {
    return (
      <AppShell showBack>
        <View style={styles.notFound}>
          <Text accessibilityRole="header" style={[styles.notFoundTitle, { color: c.textPrimary }]}>
            Builder Not Found
          </Text>
          <Button variant="primary" onPress={() => router.replace(ROUTES.search as Href)}>
            Search tradies
          </Button>
        </View>
      </AppShell>
    );
  }

  return (
    <AppShell showBack>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: STICKY_CTA_HEIGHT + insets.bottom + Spacing.lg }}
      >
        <BuilderProfileView data={state.data} />
      </ScrollView>
      <StickyCTA builderId={state.data.builder.user_id} />
    </AppShell>
  );
}

const styles = StyleSheet.create({
  skeleton: {
    padding: Spacing.lg,
    gap: Spacing.lg,
  },
  notFound: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.lg,
    padding: Spacing['2xl'],
  },
  notFoundTitle: {
    fontFamily: FontFamily.display,
    fontSize: 24,
  },
});
