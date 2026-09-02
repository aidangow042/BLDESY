/**
 * The portal feed card — one component behind the three website feeds:
 *   home     ~/bldesy-web/app/portal/jobs/residential/page.tsx  (primary accent)
 *   project  ~/bldesy-web/app/portal/jobs/commercial/page.tsx   (indigo; match + speciality pills)
 *   contract ~/bldesy-web/app/portal/jobs/contracts/page.tsx    (indigo; no urgency)
 * Every string is the website's. The hide control never deletes the job.
 */
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

import { Colors, FontFamily, Radius, Shadows, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import {
  formatPayCaption,
  jobMatchesSpeciality,
  type FeedKind,
  type Job,
  type SpecialisationsByTrade,
} from '@/lib/data/tradie-jobs';
import { relativeTime } from '@/lib/format';
import { EMPLOYMENT_TYPE_LABELS } from '@/lib/web/capabilities';
import { matchTier, type MatchResult } from '@/lib/web/match';
import { getSpecialisationName } from '@/lib/web/trade-specialisations';
import { formatTradeName } from '@/lib/web/trades';
import { JobCardPhoto } from './job-card-photo';
import { UrgencyPill, urgencyLabel } from './urgency-pill';

/** Tailwind amber-100 / amber-800 — the "Missing N" pill. */
const AMBER_PILL = { light: { bg: '#fef3c7', fg: '#92400e' }, dark: { bg: '#f59e0b26', fg: '#fde68a' } } as const;

export interface TradieJobCardProps {
  job: Job;
  kind: FeedKind;
  applied: boolean;
  /** Project Jobs: the viewer's capability match for this job. */
  match?: MatchResult | null;
  /** The viewer's per-trade specialisations (speciality chip + "Wants:" chips). */
  viewerSpecs?: SpecialisationsByTrade;
  onHide: () => void;
  onViewDetails: () => void;
  onQuickApply: () => void;
  onViewCompany?: () => void;
}

/** `$${Number(budget).toLocaleString("en-AU")}` — falls back to the raw text for non-numeric budgets. */
export function formatBudget(budget: string): string {
  const n = Number(budget);
  return Number.isFinite(n) ? `$${n.toLocaleString('en-AU')}` : budget;
}

export function formatStartDate(startDate: string): string {
  return `Start: ${new Date(startDate).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })}`;
}

export function TradieJobCard({
  job,
  kind,
  applied,
  match,
  viewerSpecs = {},
  onHide,
  onViewDetails,
  onQuickApply,
  onViewCompany,
}: TradieJobCardProps) {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];
  const accent = kind === 'home' ? c.primary : c.indigo;
  const accentBg = accent + '1A';
  const accentSoft = accent + '0D';
  const photos = job.photo_urls ?? [];
  const specMatch = jobMatchesSpeciality(job, viewerSpecs);
  const kindLabel = kind === 'home' ? 'Home' : kind === 'project' ? 'Project' : 'Contract';
  const hideLabel = kind === 'home' ? 'Hide job' : kind === 'project' ? 'Remove job' : 'Remove contract';
  const employmentLabel =
    kind === 'project' && job.employment_type ? EMPLOYMENT_TYPE_LABELS[job.employment_type] : null;
  const payCaption =
    kind === 'project' ? formatPayCaption(job.pay_type, job.pay_rate_min, job.pay_rate_max) : null;

  return (
    <View
      style={[
        styles.card,
        Shadows.sm,
        { backgroundColor: c.surface, borderColor: c.border, borderLeftColor: accent },
      ]}
    >
      <Pressable
        onPress={onHide}
        hitSlop={6}
        style={styles.hideBtn}
        accessibilityRole="button"
        accessibilityLabel={hideLabel}
      >
        <MaterialIcons
          name={kind === 'home' ? 'visibility-off' : 'delete-outline'}
          size={18}
          color={c.textSecondary + '66'}
        />
      </Pressable>

      {photos.length > 0 ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.photoRow}
          contentContainerStyle={styles.photoRowContent}
        >
          {photos.slice(0, 4).map((url, i) => (
            <JobCardPhoto key={`${url}-${i}`} url={url} index={i} />
          ))}
          {photos.length > 4 ? (
            <View style={[styles.morePhotos, { backgroundColor: accentSoft, borderColor: c.border }]}>
              <Text style={[styles.morePhotosText, { color: accent }]}>+{photos.length - 4} more</Text>
            </View>
          ) : null}
        </ScrollView>
      ) : null}

      <Text style={[styles.title, { color: c.textPrimary }]}>{job.title}</Text>

      <View style={styles.pillRow}>
        <View style={[styles.pill, { backgroundColor: accentBg }]}>
          <Text style={[styles.pillTextBold, { color: accent }]}>{kindLabel}</Text>
        </View>
        <View style={[styles.pill, { backgroundColor: accentBg }]}>
          <Text style={[styles.pillText, { color: accent }]}>{formatTradeName(job.trade_category)}</Text>
        </View>
        {kind === 'home' ? <UrgencyPill urgency={job.urgency} /> : null}
        {kind === 'project' ? (
          <View style={[styles.pill, { backgroundColor: accentBg }]}>
            <Text style={[styles.pillText, { color: accent }]}>{urgencyLabel(job.urgency)}</Text>
          </View>
        ) : null}
        {kind !== 'contract' && specMatch ? (
          <View style={[styles.pill, styles.pillIconRow, { backgroundColor: c.successBg }]}>
            <MaterialIcons name="star" size={12} color={c.success} />
            <Text style={[styles.pillTextBold, { color: c.success }]}>Matches your speciality</Text>
          </View>
        ) : null}
      </View>

      {kind === 'project' && (job.specialisations ?? []).length > 0 ? (
        <View style={styles.wantsRow}>
          <Text style={[styles.wantsLabel, { color: c.textSecondary + '99' }]}>WANTS:</Text>
          {(job.specialisations ?? []).map((slug) => {
            const matched = (viewerSpecs[job.trade_category] ?? []).includes(slug);
            return (
              <View
                key={slug}
                style={[
                  styles.wantChip,
                  matched
                    ? { backgroundColor: c.successBg, borderColor: c.successBg }
                    : { backgroundColor: c.canvas, borderColor: c.border },
                ]}
              >
                <Text style={[styles.wantChipText, { color: matched ? c.success : c.textSecondary }]}>
                  {getSpecialisationName(job.trade_category, slug) ?? slug}
                </Text>
              </View>
            );
          })}
        </View>
      ) : null}

      <View style={styles.metaRow}>
        <View style={styles.metaItem}>
          <MaterialIcons name="location-on" size={16} color={c.textSecondary} />
          <Text style={[styles.metaText, { color: c.textSecondary }]}>
            {job.suburb}, {job.postcode}
          </Text>
        </View>
        {kind !== 'contract' && job.budget ? (
          <Text style={[styles.metaText, { color: c.textSecondary }]}>{formatBudget(job.budget)}</Text>
        ) : null}
        <Text style={[styles.metaText, { color: c.textSecondary }]}>{relativeTime(job.created_at)}</Text>
      </View>

      <Text style={[styles.description, { color: c.textSecondary }]} numberOfLines={2}>
        {job.description}
      </Text>

      {employmentLabel || payCaption ? (
        <Text style={[styles.caption, { color: c.textSecondary }]}>
          {employmentLabel}
          {employmentLabel && payCaption ? ' · ' : ''}
          {payCaption}
        </Text>
      ) : null}

      {kind === 'project' && match && !match.hasNoRequirements ? (
        <View style={styles.matchRow}>
          <MatchPill match={match} />
        </View>
      ) : null}

      {job.workers_needed > 1 || job.day_rate || job.contract_duration || job.start_date ? (
        <View style={styles.detailRow}>
          {job.workers_needed > 1 ? (
            <View style={[styles.detailChip, styles.pillIconRow, { backgroundColor: accentSoft }]}>
              <MaterialIcons name="groups" size={14} color={accent} />
              <Text style={[styles.detailText, { color: accent }]}>{job.workers_needed} workers</Text>
            </View>
          ) : null}
          {job.day_rate ? (
            <View style={[styles.detailChip, { backgroundColor: accentSoft }]}>
              <Text style={[styles.detailText, { color: accent }]}>{job.day_rate}</Text>
            </View>
          ) : null}
          {job.contract_duration ? (
            <View style={[styles.detailChip, { backgroundColor: accentSoft }]}>
              <Text style={[styles.detailText, { color: accent }]}>{job.contract_duration}</Text>
            </View>
          ) : null}
          {job.start_date ? (
            <View style={[styles.detailChip, { backgroundColor: accentSoft }]}>
              <Text style={[styles.detailText, { color: accent }]}>{formatStartDate(job.start_date)}</Text>
            </View>
          ) : null}
        </View>
      ) : null}

      <View style={[styles.footer, { borderTopColor: c.border }]}>
        {kind !== 'home' && onViewCompany ? (
          <Pressable
            onPress={onViewCompany}
            style={[styles.outlineBtn, { borderColor: accent }]}
            accessibilityRole="button"
          >
            <Text style={[styles.outlineBtnText, { color: accent }]}>View Company</Text>
          </Pressable>
        ) : null}
        <Pressable
          onPress={onViewDetails}
          style={[styles.outlineBtn, { borderColor: accent }]}
          accessibilityRole="button"
        >
          <Text style={[styles.outlineBtnText, { color: accent }]}>View Details</Text>
        </Pressable>
        {applied ? (
          kind === 'home' ? (
            <View style={[styles.outlineBtn, styles.pillIconRow, { borderColor: accent }]}>
              <MaterialIcons name="check" size={16} color={accent} />
              <Text style={[styles.outlineBtnText, { color: accent }]}>Applied</Text>
            </View>
          ) : (
            <View style={[styles.appliedBtn, styles.pillIconRow, { backgroundColor: c.successBg }]}>
              <MaterialIcons name="check" size={16} color={c.success} />
              <Text style={[styles.outlineBtnText, { color: c.success }]}>Applied</Text>
            </View>
          )
        ) : (
          <Pressable
            onPress={onQuickApply}
            style={[styles.outlineBtn, { borderColor: accent }]}
            accessibilityRole="button"
          >
            <Text style={[styles.outlineBtnText, { color: accent }]}>Quick Apply</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

/** Small badge for the feed card. Green when fully matched, amber otherwise. */
export function MatchPill({ match }: { match: MatchResult }) {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];
  const tier = matchTier(match);
  if (tier === 'full') {
    return (
      <View style={[styles.pill, styles.pillIconRow, { backgroundColor: c.successBg }]}>
        <MaterialIcons name="check" size={12} color={c.success} />
        <Text style={[styles.matchText, { color: c.success }]}>You match</Text>
      </View>
    );
  }
  const missingCount =
    match.missingRequired.length +
    (match.publicLiabilityRequired != null && !match.publicLiabilityMet ? 1 : 0);
  const amber = AMBER_PILL[scheme];
  return (
    <View
      style={[styles.pill, styles.pillIconRow, { backgroundColor: amber.bg }]}
      accessibilityLabel={match.missingRequired.map((m) => m.label).join(', ') || undefined}
    >
      <MaterialIcons name="warning" size={12} color={amber.fg} />
      <Text style={[styles.matchText, { color: amber.fg }]}>Missing {missingCount}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    position: 'relative',
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderLeftWidth: 4,
    padding: Spacing.xl,
  },
  hideBtn: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  photoRow: { marginBottom: Spacing.md, marginHorizontal: -4 },
  photoRowContent: { gap: Spacing.sm, paddingHorizontal: 4, paddingBottom: 4 },
  morePhotos: {
    height: 112,
    width: 112,
    borderRadius: Radius.lg,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  morePhotosText: { fontSize: 12, fontFamily: FontFamily.bodyBold, fontWeight: '700' },
  title: {
    fontSize: 18,
    lineHeight: 26,
    fontFamily: FontFamily.bodyBold,
    fontWeight: '700',
    paddingRight: 32,
  },
  pillRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: Spacing.sm, marginTop: Spacing.sm },
  pill: { borderRadius: Radius.full, paddingHorizontal: 10, paddingVertical: 2 },
  pillIconRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  pillText: { fontSize: 12, lineHeight: 16, fontFamily: FontFamily.bodySemiBold, fontWeight: '600' },
  pillTextBold: { fontSize: 12, lineHeight: 16, fontFamily: FontFamily.bodyBold, fontWeight: '700' },
  wantsRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6, marginTop: Spacing.sm },
  wantsLabel: { fontSize: 10, fontFamily: FontFamily.bodyBold, fontWeight: '700', letterSpacing: 1 },
  wantChip: { borderRadius: Radius.full, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 2 },
  wantChipText: { fontSize: 11, fontFamily: FontFamily.bodySemiBold, fontWeight: '600' },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: Spacing.md, marginTop: Spacing.md },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontSize: 14, lineHeight: 20, fontFamily: FontFamily.body },
  description: { marginTop: Spacing.md, fontSize: 14, lineHeight: 20, fontFamily: FontFamily.body },
  caption: { marginTop: Spacing.sm, fontSize: 12, lineHeight: 16, fontFamily: FontFamily.body },
  matchRow: { marginTop: Spacing.sm, flexDirection: 'row' },
  matchText: { fontSize: 11, fontFamily: FontFamily.bodyBold, fontWeight: '700' },
  detailRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginTop: Spacing.md },
  detailChip: { borderRadius: Radius.full, paddingHorizontal: 10, paddingVertical: 4 },
  detailText: { fontSize: 12, fontFamily: FontFamily.bodyMedium, fontWeight: '500' },
  footer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: Spacing.md,
    marginTop: Spacing.lg,
    paddingTop: Spacing.lg,
    borderTopWidth: 1,
  },
  outlineBtn: {
    borderWidth: 1,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.lg,
    paddingVertical: 8,
    minHeight: 36,
    justifyContent: 'center',
  },
  appliedBtn: {
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.lg,
    paddingVertical: 8,
    minHeight: 36,
    justifyContent: 'center',
  },
  outlineBtnText: { fontSize: 12, fontFamily: FontFamily.bodySemiBold, fontWeight: '600' },
});
