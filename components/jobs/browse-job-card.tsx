/**
 * BrowseJobCard — one result on /jobs. Port of the job card in
 * ~/bldesy-web/app/jobs/page.tsx: photos, title, Project/Contract + trade +
 * urgency pills, meta, description, enterprise detail chips, and the
 * "View Company" / "View & Apply" actions (the latter opens the portal job page).
 */
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter, type Href } from 'expo-router';

import { Badge, Card } from '@/components/ui';
import { Colors, FontFamily, Radius, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { ROUTES } from '@/lib/routes';
import { formatTradeName } from '@/lib/web/trades';
import type { Job } from '@/types';

import { formatBudget, formatShortDate, relativeTime, urgencyConfig } from './job-format';
import { JobPhotoStrip } from './job-photo-strip';

export function BrowseJobCard({ job }: { job: Job }) {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];
  const router = useRouter();
  const isEnterprise = job.poster_type === 'enterprise';
  const isContract = job.posting_kind === 'contract';
  const urg = urgencyConfig(job.urgency);
  const accent = isEnterprise ? c.indigo : c.primary;

  return (
    <Card style={isEnterprise ? { borderLeftWidth: 4, borderLeftColor: c.indigo } : undefined}>
      <View style={styles.body}>
        {job.photo_urls && job.photo_urls.length > 0 ? (
          <View style={{ marginBottom: Spacing.md }}>
            <JobPhotoStrip urls={job.photo_urls} max={3} width={144} height={96} />
          </View>
        ) : null}

        <Text style={[styles.title, { color: c.textPrimary }]}>{job.title}</Text>

        <View style={styles.pills}>
          {isEnterprise ? (
            <View style={[styles.indigoPill, { backgroundColor: c.indigo + '1A' }]}>
              <Text style={[styles.indigoPillText, { color: c.indigo }]}>{isContract ? 'Contract' : 'Project'}</Text>
            </View>
          ) : null}
          <Badge variant="trade">{formatTradeName(job.trade_category)}</Badge>
          <Badge variant={urg.variant}>{urg.label}</Badge>
        </View>

        <View style={styles.meta}>
          <Text style={[styles.metaText, { color: c.textSecondary }]}>
            {job.suburb}, {job.postcode}
          </Text>
          {job.budget ? <Text style={[styles.metaText, { color: c.textSecondary }]}>{formatBudget(job.budget)}</Text> : null}
          <Text style={[styles.metaText, { color: c.textSecondary }]}>{relativeTime(job.created_at)}</Text>
        </View>

        <Text style={[styles.description, { color: c.textSecondary }]} numberOfLines={2}>
          {job.description}
        </Text>

        {/* Enterprise details */}
        {isEnterprise ? (
          <View style={styles.chips}>
            {job.workers_needed > 1 ? <DetailChip label={`${job.workers_needed} workers`} c={c} /> : null}
            {job.day_rate ? <DetailChip label={job.day_rate} c={c} /> : null}
            {job.contract_duration ? <DetailChip label={job.contract_duration} c={c} /> : null}
            {job.start_date ? <DetailChip label={`Start: ${formatShortDate(job.start_date)}`} c={c} /> : null}
          </View>
        ) : null}

        <View style={[styles.footer, { borderTopColor: c.border }]}>
          {isEnterprise ? (
            <Pressable
              accessibilityRole="link"
              onPress={() => router.push(ROUTES.companyProfile(job.customer_id) as Href)}
              style={({ pressed }) => [
                styles.companyBtn,
                { borderColor: c.indigo, backgroundColor: pressed ? c.indigo + '0D' : 'transparent' },
              ]}
            >
              <Text style={[styles.companyText, { color: c.indigo }]}>View Company</Text>
            </Pressable>
          ) : null}
          <Pressable
            accessibilityRole="link"
            // The web links every viewer to the portal job page.
            onPress={() => router.push(ROUTES.portalJob(job.id) as Href)}
            style={({ pressed }) => [styles.applyBtn, { backgroundColor: accent, opacity: pressed ? 0.9 : 1 }]}
          >
            <Text style={styles.applyText}>View &amp; Apply</Text>
          </Pressable>
        </View>
      </View>
    </Card>
  );
}

function DetailChip({ label, c }: { label: string; c: Record<string, string> }) {
  return (
    <View style={[styles.detailChip, { backgroundColor: c.indigo + '0D' }]}>
      <Text style={[styles.detailChipText, { color: c.indigo }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  body: { padding: Spacing.xl },
  title: { fontSize: 18, fontFamily: FontFamily.bodyBold, fontWeight: '700' },
  pills: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: Spacing.sm, marginTop: Spacing.sm },
  indigoPill: { borderRadius: Radius.full, paddingHorizontal: 10, paddingVertical: 2 },
  indigoPillText: { fontSize: 12, fontFamily: FontFamily.bodyBold, fontWeight: '700' },
  meta: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: Spacing.md, marginTop: Spacing.sm },
  metaText: { fontSize: 14, fontFamily: FontFamily.body },
  description: { fontSize: 14, lineHeight: 20, fontFamily: FontFamily.body, marginTop: Spacing.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginTop: Spacing.sm },
  detailChip: { borderRadius: Radius.full, paddingHorizontal: 10, paddingVertical: 4 },
  detailChipText: { fontSize: 12, fontFamily: FontFamily.bodyMedium, fontWeight: '500' },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginTop: Spacing.lg,
    paddingTop: Spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  companyBtn: { borderWidth: 1, borderRadius: Radius.full, paddingHorizontal: Spacing.lg, paddingVertical: 6 },
  companyText: { fontSize: 12, fontFamily: FontFamily.bodySemiBold, fontWeight: '600' },
  applyBtn: { borderRadius: Radius.full, paddingHorizontal: Spacing.xl, paddingVertical: 6 },
  applyText: { color: '#ffffff', fontSize: 12, fontFamily: FontFamily.bodyBold, fontWeight: '700' },
});
