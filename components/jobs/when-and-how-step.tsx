/**
 * "When and how" step — employment terms + capability requirements, shown to
 * enterprises only. Pure controlled component (the post wizard owns state).
 * RN port of ~/bldesy-web/components/jobs/step-when-how.tsx (indigo — the
 * enterprise accent), using the native date/time picker and a bottom-sheet
 * select for pay type / public liability. All fields optional.
 */
import { useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import Ionicons from '@expo/vector-icons/Ionicons';

import { Input } from '@/components/ui';
import { Colors, FontFamily, Radius, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import {
  CAPABILITY_GROUPS,
  EMPLOYMENT_TYPES,
  PAY_TYPES,
  PUBLIC_LIABILITY_OPTIONS,
  WORK_DAYS,
  WORK_DAY_LABELS,
  type CapabilityKey,
  type EmploymentType,
  type PayType,
  type RequirementLevel,
  type WorkDay,
} from '@/lib/web/capabilities';

import { FieldLabel } from './field-label';
import { SelectSheet } from './select-sheet';

export interface WhenAndHowFields {
  employmentType: EmploymentType | '';
  startDate: string;
  endDate: string;
  isOngoing: boolean;
  dailyStartTime: string;
  dailyFinishTime: string;
  workDays: WorkDay[];
  payType: PayType | '';
  payRateMin: string;
  payRateMax: string;
  requiredCapabilities: Partial<Record<CapabilityKey, RequirementLevel>>;
  minPublicLiability: number | null;
}

export const INITIAL_WHEN_AND_HOW: WhenAndHowFields = {
  employmentType: '',
  startDate: '',
  endDate: '',
  isOngoing: false,
  dailyStartTime: '',
  dailyFinishTime: '',
  workDays: [],
  payType: '',
  payRateMin: '',
  payRateMax: '',
  requiredCapabilities: {},
  minPublicLiability: null,
};

/* ── date/time string <-> Date helpers ──────────────────────────────────── */

export function parseDateStr(s: string): Date {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
  if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 12, 0, 0);
  return new Date();
}

export function toDateStr(d: Date): string {
  const y = d.getFullYear();
  const mo = String(d.getMonth() + 1).padStart(2, '0');
  const da = String(d.getDate()).padStart(2, '0');
  return `${y}-${mo}-${da}`;
}

export function parseTimeStr(s: string): Date {
  const m = /^(\d{1,2}):(\d{2})/.exec(s);
  const d = new Date();
  if (m) d.setHours(Number(m[1]), Number(m[2]), 0, 0);
  return d;
}

export function toTimeStr(d: Date): string {
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

/** "12 Mar 2026" — accepts 'YYYY-MM-DD' or ISO timestamps. */
export function formatDateNice(value: string): string {
  try {
    return new Date(value).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch {
    return value;
  }
}

/** "7:30 AM" — accepts 'HH:MM' or 'HH:MM:SS'. */
export function formatTimeNice(value: string): string {
  const match = /^(\d{1,2}):(\d{2})/.exec(value);
  if (!match) return value;
  const hour24 = parseInt(match[1], 10);
  const min = match[2];
  const ampm = hour24 >= 12 ? 'PM' : 'AM';
  const hour12 = ((hour24 + 11) % 12) + 1;
  return `${hour12}:${min} ${ampm}`;
}

/** The web's dynamic pay-rate label. */
export function payRateLabel(payType: PayType | ''): string {
  return payType === 'hourly'
    ? '$ / hour'
    : payType === 'daily'
      ? '$ / day'
      : payType === 'fixed_contract'
        ? 'Total $'
        : '$ amount';
}

const PAY_TYPE_OPTIONS = PAY_TYPES.map((p) => ({ value: p.value, label: p.label }));
const LIABILITY_OPTIONS = PUBLIC_LIABILITY_OPTIONS.filter((o) => o.value != null).map((o) => ({
  value: String(o.value),
  label: o.label,
}));
const LIABILITY_NONE_LABEL = PUBLIC_LIABILITY_OPTIONS.find((o) => o.value == null)?.label ?? 'Not required';

interface StepWhenAndHowProps {
  values: WhenAndHowFields;
  onChange: (next: WhenAndHowFields) => void;
}

export function StepWhenAndHow({ values, onChange }: StepWhenAndHowProps) {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];
  const accent = c.indigo;

  const set = <K extends keyof WhenAndHowFields>(key: K, value: WhenAndHowFields[K]) =>
    onChange({ ...values, [key]: value });

  function toggleDay(day: WorkDay) {
    const next = values.workDays.includes(day)
      ? values.workDays.filter((d) => d !== day)
      : [...values.workDays, day];
    onChange({ ...values, workDays: next });
  }

  function setRequirement(key: CapabilityKey, level: RequirementLevel | null) {
    const next = { ...values.requiredCapabilities };
    if (level == null) delete next[key];
    else next[key] = level;
    onChange({ ...values, requiredCapabilities: next });
  }

  const payLabel = payRateLabel(values.payType);
  const payDisabled = values.payType === 'negotiable';

  return (
    <View style={{ gap: Spacing['3xl'] }}>
      <View>
        <Text style={[styles.h2, { color: c.textPrimary }]}>When and how</Text>
        <Text style={[styles.sub, { color: c.textSecondary }]}>
          Set the employment terms and what you need from applicants. All fields optional.
        </Text>
      </View>

      {/* ── Section A — Employment terms ── */}
      <View style={{ gap: Spacing.xl }}>
        <SectionHeader title="Employment terms" accent={accent} c={c} />

        <View>
          <FieldLabel small>Employment type</FieldLabel>
          <View style={styles.chipRow}>
            {EMPLOYMENT_TYPES.map((t) => {
              const active = values.employmentType === t.value;
              return (
                <Chip
                  key={t.value}
                  label={t.label}
                  active={active}
                  accent={accent}
                  c={c}
                  onPress={() => set('employmentType', active ? '' : t.value)}
                />
              );
            })}
          </View>
        </View>

        <View style={styles.row2}>
          <DateTimeField
            label="Start date"
            value={values.startDate}
            mode="date"
            accent={accent}
            onChange={(v) => set('startDate', v)}
          />
          <DateTimeField
            label="End date"
            value={values.endDate}
            mode="date"
            accent={accent}
            disabled={values.isOngoing}
            onChange={(v) => set('endDate', v)}
          />
        </View>

        <Pressable
          accessibilityRole="checkbox"
          accessibilityState={{ checked: values.isOngoing }}
          onPress={() =>
            onChange({ ...values, isOngoing: !values.isOngoing, endDate: !values.isOngoing ? '' : values.endDate })
          }
          style={styles.checkboxRow}
        >
          <View
            style={[
              styles.checkbox,
              {
                borderColor: values.isOngoing ? accent : c.border,
                backgroundColor: values.isOngoing ? accent : c.surface,
              },
            ]}
          >
            {values.isOngoing ? <Ionicons name="checkmark" size={12} color="#ffffff" /> : null}
          </View>
          <Text style={[styles.checkboxLabel, { color: c.textSecondary }]}>Ongoing — no fixed end date</Text>
        </Pressable>

        <View style={styles.row2}>
          <DateTimeField
            label="Daily start"
            value={values.dailyStartTime}
            mode="time"
            accent={accent}
            onChange={(v) => set('dailyStartTime', v)}
          />
          <DateTimeField
            label="Daily finish"
            value={values.dailyFinishTime}
            mode="time"
            accent={accent}
            onChange={(v) => set('dailyFinishTime', v)}
          />
        </View>

        <View>
          <FieldLabel small>Days of work</FieldLabel>
          <View style={styles.chipRow}>
            {WORK_DAYS.map((d) => (
              <Chip
                key={d}
                label={WORK_DAY_LABELS[d].short}
                active={values.workDays.includes(d)}
                accent={accent}
                c={c}
                onPress={() => toggleDay(d)}
                minWidth={56}
              />
            ))}
          </View>
          {values.workDays.length > 0 ? (
            <Text style={[styles.hint, { color: c.textSecondary }]}>
              {values.workDays.length} day{values.workDays.length !== 1 ? 's' : ''} per week
            </Text>
          ) : null}
        </View>

        <View style={{ gap: Spacing.lg }}>
          <View>
            <FieldLabel small>Pay type</FieldLabel>
            <SelectSheet
              value={values.payType}
              onChange={(v) => set('payType', v as PayType | '')}
              placeholder="Select pay type"
              options={PAY_TYPE_OPTIONS}
              allowEmpty
              accent={accent}
            />
          </View>
          <View style={styles.row2}>
            <View style={{ flex: 1 }}>
              <FieldLabel small>{`${payLabel} (min)`}</FieldLabel>
              <Input
                value={values.payRateMin}
                onChangeText={(t) => set('payRateMin', t.replace(/[^0-9.]/g, ''))}
                editable={!payDisabled}
                keyboardType="decimal-pad"
                placeholder="e.g. 45"
                containerStyle={payDisabled ? styles.disabled : undefined}
              />
            </View>
            <View style={{ flex: 1 }}>
              <FieldLabel small>{`${payLabel} (max)`}</FieldLabel>
              <Input
                value={values.payRateMax}
                onChangeText={(t) => set('payRateMax', t.replace(/[^0-9.]/g, ''))}
                editable={!payDisabled}
                keyboardType="decimal-pad"
                placeholder="e.g. 55"
                containerStyle={payDisabled ? styles.disabled : undefined}
              />
            </View>
          </View>
        </View>
      </View>

      <View style={[styles.divider, { backgroundColor: c.border }]} />

      {/* ── Section B — Requirements ── */}
      <View style={{ gap: Spacing.xl }}>
        <View style={{ gap: 4 }}>
          <SectionHeader title="What you need from them" accent={accent} c={c} />
          <Text style={[styles.helper, { color: c.textSecondary }]}>
            Tick <Text style={styles.helperStrong}>Required</Text> to filter applicants, or{' '}
            <Text style={styles.helperStrong}>Preferred</Text> for nice-to-haves. Tradies who don&apos;t
            have required items can still apply but will be flagged.
          </Text>
        </View>

        {Object.entries(CAPABILITY_GROUPS).map(([groupKey, group]) => (
          <View key={groupKey} style={{ gap: 6 }}>
            <FieldLabel small>{group.label}</FieldLabel>
            {group.items.map((item) => {
              const current = values.requiredCapabilities[item.key];
              return (
                <View
                  key={item.key}
                  style={[styles.capRow, { backgroundColor: c.surface, borderColor: c.border }]}
                >
                  <Text style={[styles.capLabel, { color: c.textPrimary }]} numberOfLines={1}>
                    {item.label}
                  </Text>
                  <View style={styles.capToggles}>
                    <RequirementToggle
                      label="Required"
                      active={current === 'required'}
                      tone="required"
                      accent={accent}
                      c={c}
                      onPress={() => setRequirement(item.key, current === 'required' ? null : 'required')}
                    />
                    <RequirementToggle
                      label="Preferred"
                      active={current === 'preferred'}
                      tone="preferred"
                      accent={accent}
                      c={c}
                      onPress={() => setRequirement(item.key, current === 'preferred' ? null : 'preferred')}
                    />
                  </View>
                </View>
              );
            })}
          </View>
        ))}

        <View>
          <FieldLabel small>Minimum public liability</FieldLabel>
          <SelectSheet
            value={values.minPublicLiability == null ? '' : String(values.minPublicLiability)}
            onChange={(v) => set('minPublicLiability', v === '' ? null : Number(v))}
            placeholder={LIABILITY_NONE_LABEL}
            options={LIABILITY_OPTIONS}
            allowEmpty
            accent={accent}
          />
        </View>
      </View>
    </View>
  );
}

/* ── sub-components ──────────────────────────────────────────────────────── */

function SectionHeader({ title, accent, c }: { title: string; accent: string; c: Record<string, string> }) {
  return (
    <View style={styles.sectionHeader}>
      <View style={[styles.sectionBar, { backgroundColor: accent }]} />
      <Text style={[styles.sectionTitle, { color: c.textPrimary }]}>{title.toUpperCase()}</Text>
    </View>
  );
}

export function Chip({
  label,
  active,
  accent,
  c,
  onPress,
  minWidth,
}: {
  label: string;
  active: boolean;
  accent: string;
  c: Record<string, string>;
  onPress: () => void;
  minWidth?: number;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      style={[
        styles.chip,
        minWidth != null && { minWidth },
        active
          ? { backgroundColor: accent, borderColor: accent }
          : { backgroundColor: c.surface, borderColor: c.border },
      ]}
    >
      <Text style={[styles.chipText, { color: active ? '#ffffff' : c.textSecondary }]}>{label}</Text>
    </Pressable>
  );
}

function RequirementToggle({
  label,
  active,
  tone,
  accent,
  c,
  onPress,
}: {
  label: string;
  active: boolean;
  tone: 'required' | 'preferred';
  accent: string;
  c: Record<string, string>;
  onPress: () => void;
}) {
  // Web: required = indigo; preferred = amber-100 / amber-800.
  const activeStyle =
    tone === 'required'
      ? { backgroundColor: accent, borderColor: accent, color: '#ffffff' }
      : { backgroundColor: '#FEF3C7', borderColor: '#FCD34D', color: '#92400E' };
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      style={[
        styles.reqToggle,
        active
          ? { backgroundColor: activeStyle.backgroundColor, borderColor: activeStyle.borderColor }
          : { backgroundColor: c.canvas, borderColor: c.border },
      ]}
    >
      <Text style={[styles.reqToggleText, { color: active ? activeStyle.color : c.textSecondary }]}>
        {label.toUpperCase()}
      </Text>
    </Pressable>
  );
}

interface DateTimeFieldProps {
  label: string;
  value: string;
  mode: 'date' | 'time';
  onChange: (v: string) => void;
  accent?: string;
  disabled?: boolean;
  /** Skip the uppercase small label (the contract-role editor renders its own). */
  hideLabel?: boolean;
  compact?: boolean;
}

/** Native date/time picker behind a field-shaped trigger. Exported for the contract roles editor. */
export function DateTimeField({ label, value, mode, onChange, accent, disabled, hideLabel, compact }: DateTimeFieldProps) {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];
  const tint = accent ?? c.primary;
  const [show, setShow] = useState(false);
  const dateValue =
    mode === 'date' ? (value ? parseDateStr(value) : new Date()) : value ? parseTimeStr(value) : new Date();
  const display = value ? (mode === 'date' ? formatDateNice(value) : formatTimeNice(value)) : '';

  function handleChange(e: DateTimePickerEvent, selected?: Date) {
    if (Platform.OS !== 'ios') setShow(false);
    if (e.type === 'set' && selected) {
      onChange(mode === 'date' ? toDateStr(selected) : toTimeStr(selected));
    }
  }

  return (
    <View style={{ flex: 1 }}>
      {!hideLabel ? <FieldLabel small>{label}</FieldLabel> : null}
      <View style={styles.dateRow}>
        <Pressable
          disabled={disabled}
          accessibilityRole="button"
          accessibilityLabel={label}
          accessibilityValue={{ text: display || (mode === 'date' ? 'No date' : 'No time') }}
          onPress={() => setShow(true)}
          style={[
            styles.dateField,
            compact && styles.dateFieldCompact,
            { backgroundColor: c.surface, borderColor: c.border },
            disabled && styles.disabled,
          ]}
        >
          <Ionicons
            name={mode === 'date' ? 'calendar-outline' : 'time-outline'}
            size={16}
            color={c.textSecondary}
          />
          <Text
            style={[styles.dateText, { color: display ? c.textPrimary : c.textSecondary + '99' }]}
            numberOfLines={1}
          >
            {display || (mode === 'date' ? 'dd/mm/yyyy' : '--:--')}
          </Text>
        </Pressable>
        {value && !disabled ? (
          <Pressable
            onPress={() => onChange('')}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={`Clear ${label.toLowerCase()}`}
            style={styles.clearBtn}
          >
            <Ionicons name="close-circle" size={18} color={c.textSecondary} />
          </Pressable>
        ) : null}
      </View>
      {show ? (
        <View>
          <DateTimePicker
            value={dateValue}
            mode={mode}
            is24Hour={false}
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={handleChange}
            accentColor={tint}
          />
          {Platform.OS === 'ios' ? (
            <Pressable onPress={() => setShow(false)} style={styles.doneBtn} accessibilityRole="button">
              <Text style={[styles.doneText, { color: tint }]}>Done</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  h2: { fontFamily: FontFamily.bodyBold, fontSize: 20, fontWeight: '700' },
  sub: { fontFamily: FontFamily.body, fontSize: 14, marginTop: 4, lineHeight: 20 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sectionBar: { width: 4, height: 20, borderRadius: 2 },
  sectionTitle: { fontFamily: FontFamily.bodyBold, fontSize: 13, fontWeight: '700', letterSpacing: 0.8 },
  helper: { fontFamily: FontFamily.body, fontSize: 12, lineHeight: 18 },
  helperStrong: { fontFamily: FontFamily.bodyBold, fontWeight: '700' },
  hint: { fontFamily: FontFamily.body, fontSize: 11, marginTop: 6 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  chip: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: 9,
    borderRadius: Radius.full,
    borderWidth: 1,
    alignItems: 'center',
  },
  chipText: { fontFamily: FontFamily.bodySemiBold, fontSize: 14, fontWeight: '600' },
  row2: { flexDirection: 'row', gap: Spacing.md },
  checkboxRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxLabel: { fontFamily: FontFamily.body, fontSize: 14 },
  dateRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dateField: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    height: 48,
    borderRadius: Radius.lg,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
  },
  dateFieldCompact: { height: 40 },
  dateText: { flex: 1, fontFamily: FontFamily.body, fontSize: 14 },
  clearBtn: { padding: 2 },
  disabled: { opacity: 0.5 },
  divider: { height: 1 },
  capRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.sm,
    borderRadius: Radius.lg,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    paddingVertical: 8,
  },
  capLabel: { fontFamily: FontFamily.body, fontSize: 14, flex: 1 },
  capToggles: { flexDirection: 'row', gap: 6, flexShrink: 0 },
  reqToggle: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: Radius.full, borderWidth: 1 },
  reqToggleText: { fontFamily: FontFamily.bodyBold, fontSize: 10, fontWeight: '700', letterSpacing: 0.4 },
  doneBtn: { alignSelf: 'flex-end', paddingVertical: 6, paddingHorizontal: 8 },
  doneText: { fontFamily: FontFamily.bodyBold, fontSize: 14, fontWeight: '700' },
});
