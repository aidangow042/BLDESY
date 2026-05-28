import { StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';

import { AppShell } from '@/components/layout';
import { Button, Card } from '@/components/ui';
import { ThemedText } from '@/components/themed-text';
import { Colors, FontFamily, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function PendingApprovalScreen() {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];
  const router = useRouter();

  return (
    <AppShell title="Pending approval">
      <View style={styles.container}>
        <Card
          padding={Spacing['3xl']}
          style={[
            styles.card,
            { backgroundColor: c.warningBg, borderColor: c.warning + '30' },
          ]}
        >
          <ThemedText style={styles.icon}>&#9203;</ThemedText>
          <ThemedText type="title" style={[styles.title, { color: c.textPrimary }]}>
            Application submitted
          </ThemedText>
          <ThemedText style={[styles.body, { color: c.textSecondary }]}>
            Thanks for signing up as a builder! We&apos;re reviewing your application and will approve you shortly.
          </ThemedText>
          <ThemedText style={[styles.body, { color: c.textSecondary }]}>
            Once approved, you&apos;ll get full access to the Builder Portal — browse jobs, apply, and manage your profile.
          </ThemedText>
        </Card>

        <Button variant="primary" size="lg" fullWidth onPress={() => router.replace('/(tabs)' as any)}>
          Back to home
        </Button>
      </View>
    </AppShell>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing['2xl'],
    gap: Spacing['3xl'],
  },
  card: {
    alignItems: 'center',
    gap: Spacing.lg,
    width: '100%',
  },
  icon: {
    fontSize: 48,
  },
  title: {
    textAlign: 'center',
    fontFamily: FontFamily.bodyBold,
    fontWeight: '700',
  },
  body: {
    textAlign: 'center',
    fontSize: 15,
    lineHeight: 22,
    fontFamily: FontFamily.body,
  },
});
