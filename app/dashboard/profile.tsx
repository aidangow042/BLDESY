/**
 * /dashboard/profile — port of ~/bldesy-web/app/dashboard/profile/page.tsx:
 * the opt-in customer trust profile (customer_profiles), with the verified
 * email / phone badges derived from the auth user.
 */
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { CustomerProfileSection } from '@/components/customer-dashboard/customer-profile-section';
import { DashboardScreen } from '@/components/customer-dashboard/dashboard-screen';
import { ErrorBanner } from '@/components/jobs/error-banner';
import { Colors, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useUser } from '@/lib/auth-context';
import { getOwnCustomerProfile, type CustomerProfile } from '@/lib/data/customers';

/** The web page's `defaultFirstName`: first token of full_name / name metadata. */
export function defaultFirstNameFor(metadata: Record<string, unknown> | undefined): string {
  const full = metadata?.full_name;
  const name = metadata?.name;
  return (
    (typeof full === 'string' ? full.split(' ')[0] : '') ||
    (typeof name === 'string' ? name.split(' ')[0] : '') ||
    ''
  );
}

export default function DashboardProfileScreen() {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];
  const { authedUser } = useUser();
  const [profile, setProfile] = useState<CustomerProfile | null | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!authedUser) return;
    try {
      setProfile(await getOwnCustomerProfile(authedUser.id));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong. Please try again.');
      setProfile(null);
    }
  }, [authedUser]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <DashboardScreen title="Profile" subtitle="A little about you builds trust with tradies before they quote.">
      {error ? <ErrorBanner message={error} onDismiss={() => setError(null)} /> : null}
      {!authedUser || profile === undefined ? (
        <View style={styles.loading}>
          <ActivityIndicator color={c.cta} />
        </View>
      ) : (
        <CustomerProfileSection
          key={authedUser.id}
          profile={profile}
          userId={authedUser.id}
          email={authedUser.email ?? ''}
          phoneLinked={Boolean(authedUser.phone)}
          memberSince={authedUser.created_at}
          defaultFirstName={defaultFirstNameFor(authedUser.user_metadata)}
          onSaved={setProfile}
        />
      )}
    </DashboardScreen>
  );
}

const styles = StyleSheet.create({
  loading: { paddingVertical: Spacing['4xl'], alignItems: 'center' },
});
