import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import { AppShell } from '@/components/layout';
import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui';
import { Colors, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { openWebOnboarding } from '@/lib/web-onboarding';

/**
 * Builder signup is handled on the website (richer form, document uploads,
 * AI credential checks — maintained in one place). This screen is a thin
 * hand-off: it opens the web registration in an in-app browser with the
 * user's session already passed across, so there's no second login.
 */
export default function BuilderSignupScreen() {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];
  const [busy, setBusy] = useState(false);
  const launched = useRef(false);

  const open = useCallback(async () => {
    setBusy(true);
    try {
      await openWebOnboarding('builder');
    } finally {
      setBusy(false);
    }
  }, []);

  // Auto-open once so the tap that brought the user here feels seamless. The
  // screen stays behind as a fallback if they dismiss the browser.
  useEffect(() => {
    if (launched.current) return;
    launched.current = true;
    open();
  }, [open]);

  return (
    <AppShell title="Become a tradie" showBack>
      <View style={styles.body}>
        <View style={[styles.iconWrap, { backgroundColor: c.primary + '14' }]}>
          <Ionicons name="construct-outline" size={34} color={c.primary} />
        </View>
        <ThemedText type="title" style={styles.title}>
          Finish on the web
        </ThemedText>
        <ThemedText style={[styles.bodyText, { color: c.textSecondary }]}>
          Setting up your tradie profile — trade details, licences and insurance
          — is quickest on our website. We&apos;ll take you there now, already
          signed in. When you&apos;re done, head back to the app.
        </ThemedText>

        <Button
          variant="primary"
          size="lg"
          fullWidth
          onPress={open}
          disabled={busy}
          leadingIcon={busy ? <ActivityIndicator color="#fff" size="small" /> : null}
          style={styles.cta}
        >
          {busy ? 'Opening…' : 'Continue to registration'}
        </Button>
      </View>
    </AppShell>
  );
}

const styles = StyleSheet.create({
  body: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
    gap: Spacing.lg,
  },
  iconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    textAlign: 'center',
  },
  bodyText: {
    textAlign: 'center',
    fontSize: 15,
    lineHeight: 22,
  },
  cta: {
    marginTop: Spacing.md,
  },
});
