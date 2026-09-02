/**
 * /dashboard/jobs — port of ~/bldesy-web/app/dashboard/jobs/page.tsx: the
 * homeowner's jobs (posting_kind = job) split into Active / Past with
 * applicant counts (numbers only, no names).
 */
import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useRouter, type Href } from 'expo-router';

import {
  countApplicationsByJob,
  jobsSubtitle,
  partitionJobs,
} from '@/components/customer-dashboard/applicant-counts';
import { DashboardJobCard } from '@/components/customer-dashboard/dashboard-job-card';
import { DashboardScreen } from '@/components/customer-dashboard/dashboard-screen';
import { Card, Skeleton } from '@/components/ui';
import { Colors, FontFamily, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useUser } from '@/lib/auth-context';
import { getJobsByCustomer } from '@/lib/data/jobs';
import { ROUTES } from '@/lib/routes';
import type { Job } from '@/types';

export default function DashboardJobsScreen() {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];
  const router = useRouter();
  const { authedUser } = useUser();
  const [jobs, setJobs] = useState<Job[] | null>(null);
  const [counts, setCounts] = useState<Map<string, number>>(new Map());
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!authedUser) return;
    const all = (await getJobsByCustomer(authedUser.id)).filter((j) => j.posting_kind === 'job');
    setJobs(all);
    // Applicant counts — numbers only, no names.
    setCounts(await countApplicationsByJob(all.map((j) => j.id)));
  }, [authedUser]);

  useEffect(() => {
    load();
  }, [load]);

  async function refresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  const { active, past } = partitionJobs(jobs ?? []);
  const amber = scheme === 'dark' ? c.cta : c.ctaDark;

  return (
    <DashboardScreen
      title="My Jobs"
      subtitle={jobs ? jobsSubtitle(active.length, past.length) : undefined}
      refreshing={refreshing}
      onRefresh={refresh}
    >
      {jobs === null ? (
        <View style={{ gap: Spacing.md }}>
          {[1, 2].map((i) => (
            <Card key={i} padding={Spacing.xl}>
              <Skeleton variant="text" style={{ width: '60%', marginBottom: 10 }} />
              <Skeleton variant="text" style={{ width: '35%', height: 12 }} />
            </Card>
          ))}
        </View>
      ) : (
        <>
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: c.textPrimary }]}>ACTIVE</Text>
            {active.length === 0 ? (
              <EmptyState>
                <Text style={[styles.emptyText, { color: c.textSecondary }]}>
                  No active jobs.{' '}
                  <Text
                    accessibilityRole="link"
                    onPress={() => router.push(ROUTES.postJob as Href)}
                    style={[styles.emptyLink, { color: amber }]}
                  >
                    Post a job
                  </Text>{' '}
                  to get quotes from tradies.
                </Text>
              </EmptyState>
            ) : (
              <View style={{ gap: Spacing.md }}>
                {active.map((job) => (
                  <DashboardJobCard key={job.id} job={job} applicants={counts.get(job.id) ?? 0} />
                ))}
              </View>
            )}
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: c.textPrimary }]}>PAST</Text>
            {past.length === 0 ? (
              <EmptyState>
                <Text style={[styles.emptyText, { color: c.textSecondary }]}>No past jobs yet.</Text>
              </EmptyState>
            ) : (
              <View style={{ gap: Spacing.md }}>
                {past.map((job) => (
                  <DashboardJobCard key={job.id} job={job} applicants={counts.get(job.id) ?? 0} />
                ))}
              </View>
            )}
          </View>
        </>
      )}
    </DashboardScreen>
  );
}

function EmptyState({ children }: { children: React.ReactNode }) {
  return (
    <Card padding={Spacing['2xl']} style={styles.emptyCard}>
      {children}
    </Card>
  );
}

const styles = StyleSheet.create({
  section: { gap: Spacing.md },
  sectionTitle: { fontSize: 14, fontFamily: FontFamily.bodyBold, fontWeight: '700', letterSpacing: 0.8 },
  emptyCard: { alignItems: 'center' },
  emptyText: { fontSize: 14, lineHeight: 20, fontFamily: FontFamily.body, textAlign: 'center' },
  emptyLink: { fontFamily: FontFamily.bodySemiBold, fontWeight: '600', textDecorationLine: 'underline' },
});
