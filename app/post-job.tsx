/**
 * /post-job — port of ~/bldesy-web/app/post-job/page.tsx: the centred page
 * header above the JobWizard. Guests can fill the wizard; they sign in on
 * submit (see components/jobs/job-wizard.tsx).
 */
import { StyleSheet, Text, View } from 'react-native';

import { JobWizard } from '@/components/jobs/job-wizard';
import { AppShell } from '@/components/layout';
import { Colors, FontFamily, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function PostJobScreen() {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];

  return (
    <AppShell showBack>
      <JobWizard
        header={
          <View style={styles.header}>
            <Text accessibilityRole="header" style={[styles.h1, { color: c.textPrimary }]}>
              Post a Job
            </Text>
            <Text style={[styles.sub, { color: c.textSecondary }]}>
              Describe what you need and we&apos;ll connect you with local tradies.
            </Text>
          </View>
        }
      />
    </AppShell>
  );
}

const styles = StyleSheet.create({
  header: {
    alignItems: 'center',
    paddingTop: Spacing.lg,
    gap: 4,
  },
  h1: {
    fontSize: 24,
    fontFamily: FontFamily.bodyBold,
    fontWeight: '700',
    textAlign: 'center',
  },
  sub: {
    fontSize: 16,
    lineHeight: 24,
    fontFamily: FontFamily.body,
    textAlign: 'center',
  },
});
