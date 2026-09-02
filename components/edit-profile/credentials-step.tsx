/**
 * Step 2 "Credentials" — DECISION D2: ABN / licence / insurance verification is
 * NOT rebuilt natively. This step renders the current verified badges read-only
 * (the website's CredentialBadges + CredentialsDisclaimer) and hands off to the
 * website's Credentials step for changes (lib/web-onboarding.ts).
 */
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

import { CredentialBadges } from '@/components/builder/credential-badges';
import { CredentialsDisclaimer } from '@/components/builder/credentials-disclaimer';
import { Colors, FontFamily, Radius, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { openWebOnboarding } from '@/lib/web-onboarding';
import type { StepProps } from './types';

export function CredentialsStep({ form, profile, refreshProfile }: StepProps) {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];
  const [opening, setOpening] = useState(false);

  async function manageOnWeb() {
    setOpening(true);
    try {
      await openWebOnboarding('builder', 'portal/edit-profile?step=2');
      await refreshProfile();
    } finally {
      setOpening(false);
    }
  }

  return (
    <View style={styles.wrap}>
      <Text style={[styles.intro, { color: c.textSecondary }]}>
        Verify your ABN and licences to display trust badges on your public profile.
      </Text>

      <CredentialBadges
        credentialsVerified={profile.credentials_verified}
        legacyCredentials={profile.credentials}
        variant="list"
        tradeSlugs={form.selectedTrades}
      />

      <CredentialsDisclaimer />

      <Pressable
        onPress={manageOnWeb}
        disabled={opening}
        style={[styles.button, { backgroundColor: c.primary, opacity: opening ? 0.6 : 1 }]}
        accessibilityRole="button"
        accessibilityState={{ busy: opening }}
      >
        {opening ? <ActivityIndicator size="small" color="#fff" /> : <MaterialIcons name="open-in-new" size={16} color="#fff" />}
        <Text style={styles.buttonText}>Manage credentials on the web</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: Spacing['2xl'] },
  intro: { fontSize: 14, lineHeight: 20, fontFamily: FontFamily.body },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    alignSelf: 'flex-start',
    borderRadius: Radius.full,
    paddingHorizontal: Spacing['2xl'],
    paddingVertical: 10,
    minHeight: 44,
  },
  buttonText: { color: '#fff', fontSize: 14, fontFamily: FontFamily.bodyBold, fontWeight: '700' },
});
