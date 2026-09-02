/**
 * /jobs — port of ~/bldesy-web/app/jobs/page.tsx: the public job browse with
 * keyword / trade / location search, type + urgency pills, result count,
 * cards and pagination. Every card's "View & Apply" opens the portal job page,
 * as the web does for every viewer.
 */
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import { BrowseJobCard } from '@/components/jobs/browse-job-card';
import { ErrorBanner } from '@/components/jobs/error-banner';
import {
  INITIAL_BROWSE_STATE,
  POSTER_TYPE_PILLS,
  URGENCY_PILLS,
  isIndigoPoster,
  pageLabel,
  resultsCountLabel,
  toSearchFilters,
  totalPages,
  type JobBrowseState,
} from '@/components/jobs/job-filters';
import { SelectSheet } from '@/components/jobs/select-sheet';
import { ALL_TRADE_OPTIONS } from '@/components/jobs/trade-options';
import { AppShell } from '@/components/layout';
import { Button, Card, Input } from '@/components/ui';
import { Colors, FontFamily, Radius, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { searchJobs, type SearchJobsResult } from '@/lib/data/jobs';
import type { Job } from '@/types';

export default function JobsBrowseScreen() {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];
  const listRef = useRef<FlatList<Job>>(null);

  // The search form is staged until "Search" (a GET form on the web); pills apply immediately.
  const [draft, setDraft] = useState({ keywords: '', trade: '', location: '' });
  const [state, setState] = useState<JobBrowseState>(INITIAL_BROWSE_STATE);
  const [result, setResult] = useState<SearchJobsResult | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    searchJobs(toSearchFilters(state)).then((res) => {
      if (cancelled) return;
      setResult(res);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [state]);

  function applySearch() {
    setState((s) => ({ ...s, ...draft, page: 1 }));
  }

  function goToPage(page: number) {
    setState((s) => ({ ...s, page }));
    listRef.current?.scrollToOffset({ offset: 0, animated: true });
  }

  const total = result?.total ?? 0;
  const pages = totalPages(total);
  const jobs = result?.jobs ?? [];

  return (
    <AppShell showBack>
      <FlatList
        ref={listRef}
        data={loading ? [] : jobs}
        keyExtractor={(job) => job.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        ItemSeparatorComponent={() => <View style={{ height: Spacing.lg }} />}
        renderItem={({ item }) => <BrowseJobCard job={item} />}
        ListHeaderComponent={
          <View style={styles.header}>
            <View>
              <Text accessibilityRole="header" style={[styles.h1, { color: c.textPrimary }]}>
                Find Jobs
              </Text>
              <Text style={[styles.sub, { color: c.textSecondary }]}>Browse project and home job opportunities</Text>
            </View>

            {/* Search + Filters */}
            <Card padding={Spacing.xl} style={{ gap: Spacing.lg }}>
              <View style={{ gap: Spacing.md }}>
                <Input
                  value={draft.keywords}
                  onChangeText={(t) => setDraft((d) => ({ ...d, keywords: t }))}
                  placeholder="Search by keyword, trade, or location..."
                  returnKeyType="search"
                  onSubmitEditing={applySearch}
                  accessibilityLabel="Search keywords"
                />
                <SelectSheet
                  value={draft.trade}
                  onChange={(v) => setDraft((d) => ({ ...d, trade: v }))}
                  placeholder="All trades"
                  title="Trade category"
                  options={ALL_TRADE_OPTIONS}
                  allowEmpty
                  accessibilityLabel="Trade category"
                />
                <Input
                  value={draft.location}
                  onChangeText={(t) => setDraft((d) => ({ ...d, location: t }))}
                  placeholder="Suburb or postcode"
                  returnKeyType="search"
                  onSubmitEditing={applySearch}
                  accessibilityLabel="Location"
                />
                <Button onPress={applySearch} fullWidth>
                  Search
                </Button>
              </View>

              {/* Type + Urgency filters */}
              <View style={styles.pills}>
                {POSTER_TYPE_PILLS.map((t) => {
                  const active = state.type === t.value;
                  const activeBg = isIndigoPoster(t.value) ? c.indigo : c.primary;
                  return (
                    <Pill
                      key={t.value}
                      label={t.label}
                      active={active}
                      activeBg={activeBg}
                      c={c}
                      onPress={() => setState((s) => ({ ...s, type: t.value, page: 1 }))}
                    />
                  );
                })}
                <View style={[styles.pillDivider, { backgroundColor: c.border }]} />
                {URGENCY_PILLS.map((u) => (
                  <Pill
                    key={u.value || 'any'}
                    label={u.label}
                    active={state.urgency === u.value}
                    activeBg={c.primary}
                    c={c}
                    small
                    onPress={() => setState((s) => ({ ...s, urgency: u.value, page: 1 }))}
                  />
                ))}
              </View>
            </Card>

            {/* Results count */}
            {!loading ? (
              <Text style={[styles.count, { color: c.textSecondary }]}>{resultsCountLabel(total, state.keywords)}</Text>
            ) : null}

            {/* Error */}
            {result?.error ? <ErrorBanner message={result.error} /> : null}

            {loading ? (
              <View style={styles.loading}>
                <ActivityIndicator color={c.primary} />
              </View>
            ) : jobs.length === 0 ? (
              <Card padding={Spacing['5xl']} style={styles.empty}>
                <Ionicons name="briefcase-outline" size={48} color={c.textSecondary + '4D'} />
                <Text accessibilityRole="header" style={[styles.emptyTitle, { color: c.textPrimary }]}>
                  No jobs found
                </Text>
                <Text style={[styles.emptyBody, { color: c.textSecondary }]}>
                  Try broadening your search or check back later.
                </Text>
              </Card>
            ) : null}
          </View>
        }
        ListFooterComponent={
          !loading && pages > 1 ? (
            <View style={styles.pagination}>
              {state.page > 1 ? (
                <Button variant="ghost" size="sm" onPress={() => goToPage(state.page - 1)}>
                  Previous
                </Button>
              ) : (
                <View />
              )}
              <Text style={[styles.pageLabel, { color: c.textSecondary }]}>{pageLabel(state.page, pages)}</Text>
              {state.page < pages ? (
                <Button variant="ghost" size="sm" onPress={() => goToPage(state.page + 1)}>
                  Next
                </Button>
              ) : (
                <View />
              )}
            </View>
          ) : null
        }
      />
    </AppShell>
  );
}

function Pill({
  label,
  active,
  activeBg,
  c,
  onPress,
  small = false,
}: {
  label: string;
  active: boolean;
  activeBg: string;
  c: Record<string, string>;
  onPress: () => void;
  small?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={[
        styles.pill,
        small && styles.pillSmall,
        active
          ? { backgroundColor: activeBg, borderColor: activeBg }
          : { backgroundColor: c.canvas, borderColor: c.border },
      ]}
    >
      <Text style={[styles.pillText, small && styles.pillTextSmall, { color: active ? '#ffffff' : c.textSecondary }]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  list: { padding: Spacing.lg, paddingBottom: Spacing['5xl'] },
  header: { gap: Spacing['2xl'], paddingTop: Spacing.lg, marginBottom: Spacing.lg },
  h1: { fontSize: 30, fontFamily: FontFamily.bodyBold, fontWeight: '700' },
  sub: { fontSize: 16, lineHeight: 24, fontFamily: FontFamily.body, marginTop: Spacing.sm },
  pills: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: Spacing.sm },
  pillDivider: { width: 1, height: 24, marginHorizontal: 4 },
  pill: { borderWidth: 1, borderRadius: Radius.full, paddingHorizontal: Spacing.lg, paddingVertical: 6 },
  pillSmall: { paddingHorizontal: 12 },
  pillText: { fontSize: 14, fontFamily: FontFamily.bodySemiBold, fontWeight: '600' },
  pillTextSmall: { fontSize: 12 },
  count: { fontSize: 14, fontFamily: FontFamily.body },
  loading: { paddingVertical: Spacing['4xl'], alignItems: 'center' },
  empty: { alignItems: 'center', gap: Spacing.xs },
  emptyTitle: { fontSize: 18, fontFamily: FontFamily.bodyBold, fontWeight: '700', marginTop: Spacing.md },
  emptyBody: { fontSize: 14, lineHeight: 20, fontFamily: FontFamily.body, textAlign: 'center' },
  pagination: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.sm,
    marginTop: Spacing['3xl'],
  },
  pageLabel: { fontSize: 14, fontFamily: FontFamily.body },
});
