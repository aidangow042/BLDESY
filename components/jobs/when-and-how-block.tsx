/**
 * Read-only "When and how" panel shown on the Project Job detail page when
 * the enterprise has filled in employment terms. Renders nothing if no terms
 * were set (e.g. legacy posts).
 * Port of ~/bldesy-web/components/jobs/when-and-how-block.tsx (indigo).
 * Props keep the jobs-row column names so a `Job` can be spread straight in.
 */
import { StyleSheet, Text, View } from 'react-native';

import { Colors, FontFamily, Radius, Shadows, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import {
  EMPLOYMENT_TYPE_LABELS,
  WORK_DAYS,
  WORK_DAY_LABELS,
  type EmploymentType,
  type PayType,
  type WorkDay,
} from '@/lib/web/capabilities';

export type WhenAndHowData = {
  employment_type: string | null;
  start_date: string | null;
  end_date: string | null;
  is_ongoing: boolean | null;
  daily_start_time: string | null;
  daily_finish_time: string | null;
  work_days: string[] | null;
  pay_type: string | null;
  pay_rate_min: number | null;
  pay_rate_max: number | null;
};

export function WhenAndHowBlock(props: WhenAndHowData) {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];

  const hasAny =
    props.employment_type ||
    props.start_date ||
    props.end_date ||
    props.is_ongoing ||
    props.daily_start_time ||
    props.daily_finish_time ||
    (props.work_days && props.work_days.length > 0) ||
    props.pay_type ||
    props.pay_rate_min != null ||
    props.pay_rate_max != null;

  if (!hasAny) return null;

  const employmentLabel = props.employment_type
    ? EMPLOYMENT_TYPE_LABELS[props.employment_type as EmploymentType] ?? props.employment_type
    : null;

  return (
    <View style={[styles.card, Shadows.sm, { backgroundColor: c.surface, borderColor: c.border }]}>
      <Text style={[styles.cardTitle, { color: c.textPrimary }]}>WHEN AND HOW</Text>

      <View style={styles.grid}>
        {employmentLabel ? (
          <Field label="Employment" color={c.textSecondary}>
            <View style={[styles.pill, { backgroundColor: c.indigo + '1A' }]}>
              <Text style={[styles.pillText, { color: c.indigo }]}>{employmentLabel}</Text>
            </View>
          </Field>
        ) : null}

        {props.start_date || props.end_date || props.is_ongoing ? (
          <Field label="Dates" color={c.textSecondary}>
            <Text style={[styles.value, { color: c.textPrimary }]}>
              {formatDateRange(props.start_date, props.end_date, !!props.is_ongoing)}
            </Text>
          </Field>
        ) : null}

        {props.daily_start_time || props.daily_finish_time ? (
          <Field label="Daily hours" color={c.textSecondary}>
            <Text style={[styles.value, { color: c.textPrimary }]}>
              {formatTimeRange(props.daily_start_time, props.daily_finish_time)}
            </Text>
          </Field>
        ) : null}

        {props.pay_type || props.pay_rate_min != null || props.pay_rate_max != null ? (
          <Field label="Pay" color={c.textSecondary}>
            <Text style={[styles.value, { color: c.textPrimary }]}>
              {formatPay(props.pay_type as PayType | null, props.pay_rate_min, props.pay_rate_max)}
            </Text>
          </Field>
        ) : null}

        {props.work_days && props.work_days.length > 0 ? (
          <Field label="Work days" color={c.textSecondary}>
            <View style={styles.dayRow}>
              {WORK_DAYS.map((d) => {
                const active = props.work_days!.includes(d);
                return (
                  <View
                    key={d}
                    style={[
                      styles.dayChip,
                      { backgroundColor: active ? c.indigo : c.canvas },
                    ]}
                  >
                    <Text
                      style={[
                        styles.dayChipText,
                        { color: active ? '#fff' : c.textSecondary + '80' },
                      ]}
                    >
                      {WORK_DAY_LABELS[d as WorkDay].short.toUpperCase()}
                    </Text>
                  </View>
                );
              })}
            </View>
          </Field>
        ) : null}
      </View>
    </View>
  );
}

function Field({ label, children, color }: { label: string; children: React.ReactNode; color: string }) {
  return (
    <View style={styles.field}>
      <Text style={[styles.fieldLabel, { color }]}>{label.toUpperCase()}</Text>
      {children}
    </View>
  );
}

/* ── Shared formatters (also used by the enterprise editor's value triggers) ── */

export function formatDateNice(value: string): string {
  // Accepts 'YYYY-MM-DD' or ISO timestamps.
  try {
    return new Date(value).toLocaleDateString('en-AU', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return value;
  }
}

export function formatDateRange(
  start: string | null,
  end: string | null,
  isOngoing: boolean,
): string {
  if (!start && !end && !isOngoing) return '—';
  const startStr = start ? `Starts ${formatDateNice(start)}` : 'Open start';
  if (isOngoing) return `${startStr} — Ongoing`;
  if (end) return `${startStr} — Ends ${formatDateNice(end)}`;
  return startStr;
}

export function formatTimeNice(value: string): string {
  // Accept 'HH:MM' or 'HH:MM:SS'. Render as 12-hour with AM/PM.
  const match = /^(\d{1,2}):(\d{2})/.exec(value);
  if (!match) return value;
  const hour24 = parseInt(match[1], 10);
  const min = match[2];
  const ampm = hour24 >= 12 ? 'PM' : 'AM';
  const hour12 = ((hour24 + 11) % 12) + 1;
  return `${hour12}:${min} ${ampm}`;
}

export function formatTimeRange(start: string | null, finish: string | null): string {
  if (!start && !finish) return '—';
  const s = start ? formatTimeNice(start) : '?';
  const f = finish ? formatTimeNice(finish) : '?';
  return `${s} – ${f}`;
}

export function formatPay(
  payType: PayType | null,
  min: number | null,
  max: number | null,
): string {
  if (payType === 'negotiable' || (!payType && min == null && max == null)) {
    return 'Negotiable';
  }
  const unit =
    payType === 'hourly'
      ? ' per hour'
      : payType === 'daily'
        ? ' per day'
        : payType === 'fixed_contract'
          ? ' total'
          : '';
  if (min != null && max != null && min !== max) {
    return `$${min.toLocaleString('en-AU')}–$${max.toLocaleString('en-AU')}${unit}`;
  }
  const single = min ?? max;
  if (single == null) return payType ? `${capitalise(payType)} rate` : '—';
  return `$${single.toLocaleString('en-AU')}${unit}`;
}

function capitalise(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1).replace(/_/g, ' ');
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Radius.xl,
    borderWidth: 1,
    padding: Spacing['2xl'],
  },
  cardTitle: {
    fontFamily: FontFamily.bodyBold,
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: Spacing.lg,
  },
  grid: { gap: Spacing.lg },
  field: { gap: 4 },
  fieldLabel: {
    fontFamily: FontFamily.bodyBold,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
  },
  value: {
    fontFamily: FontFamily.bodyMedium,
    fontSize: 14,
    fontWeight: '500',
  },
  pill: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 2,
    borderRadius: Radius.full,
  },
  pillText: {
    fontFamily: FontFamily.bodyBold,
    fontSize: 12,
    fontWeight: '700',
  },
  dayRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  dayChip: {
    minWidth: 40,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
    borderRadius: Radius.full,
  },
  dayChipText: {
    fontFamily: FontFamily.bodyBold,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
});
