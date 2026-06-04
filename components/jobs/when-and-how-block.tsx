/**
 * Read-only "When and how" panel — shown on the job-detail screen when an
 * enterprise has set employment terms. Renders nothing for legacy/empty posts.
 * RN port of ~/bldesy-web/components/jobs/when-and-how-block.tsx (teal).
 */
import { StyleSheet, Text, View } from 'react-native';

import { Colors, FontFamily, Radius, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import {
  EMPLOYMENT_TYPE_LABELS,
  WORK_DAYS,
  WORK_DAY_LABELS,
  type EmploymentType,
  type PayType,
  type WorkDay,
} from '@/lib/capabilities';

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

  return (
    <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }]}>
      <Text style={[styles.cardTitle, { color: c.textPrimary }]}>WHEN AND HOW</Text>

      <View style={styles.grid}>
        {props.employment_type ? (
          <Field label="Employment" c={c}>
            <View style={[styles.pill, { backgroundColor: c.tealBg }]}>
              <Text style={[styles.pillText, { color: c.primary }]}>
                {EMPLOYMENT_TYPE_LABELS[props.employment_type as EmploymentType] ?? props.employment_type}
              </Text>
            </View>
          </Field>
        ) : null}

        {props.start_date || props.end_date || props.is_ongoing ? (
          <Field label="Dates" c={c}>
            <Text style={[styles.value, { color: c.textPrimary }]}>
              {formatDateRange(props.start_date, props.end_date, !!props.is_ongoing)}
            </Text>
          </Field>
        ) : null}

        {props.daily_start_time || props.daily_finish_time ? (
          <Field label="Daily hours" c={c}>
            <Text style={[styles.value, { color: c.textPrimary }]}>
              {formatTimeRange(props.daily_start_time, props.daily_finish_time)}
            </Text>
          </Field>
        ) : null}

        {props.pay_type || props.pay_rate_min != null || props.pay_rate_max != null ? (
          <Field label="Pay" c={c}>
            <Text style={[styles.value, { color: c.textPrimary }]}>
              {formatPay(props.pay_type as PayType | null, props.pay_rate_min, props.pay_rate_max)}
            </Text>
          </Field>
        ) : null}

        {props.work_days && props.work_days.length > 0 ? (
          <Field label="Work days" c={c}>
            <View style={styles.dayRow}>
              {WORK_DAYS.map((d) => {
                const active = props.work_days!.includes(d);
                return (
                  <View
                    key={d}
                    style={[
                      styles.dayChip,
                      active
                        ? { backgroundColor: c.primary }
                        : { backgroundColor: c.canvas },
                    ]}
                  >
                    <Text style={[styles.dayChipText, { color: active ? '#fff' : c.textSecondary }]}>
                      {WORK_DAY_LABELS[d as WorkDay].short}
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

function Field({ label, children, c }: { label: string; children: React.ReactNode; c: any }) {
  return (
    <View style={styles.field}>
      <Text style={[styles.fieldLabel, { color: c.textSecondary }]}>{label.toUpperCase()}</Text>
      {children}
    </View>
  );
}

/* ── Shared formatters (also used by the editor's value triggers) ────────── */

export function formatDateNice(value: string): string {
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
    padding: Spacing.lg,
  },
  cardTitle: {
    fontFamily: FontFamily.bodyBold,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.6,
    marginBottom: Spacing.md,
  },
  grid: {
    gap: Spacing.md,
  },
  field: {
    gap: 4,
  },
  fieldLabel: {
    fontFamily: FontFamily.bodyBold,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.6,
  },
  value: {
    fontFamily: FontFamily.bodyMedium,
    fontSize: 14,
    fontWeight: '500',
  },
  pill: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: Radius.full,
  },
  pillText: {
    fontFamily: FontFamily.bodyBold,
    fontSize: 12,
    fontWeight: '700',
  },
  dayRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
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
