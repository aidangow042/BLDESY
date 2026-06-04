/**
 * "When and how" step — employment terms + capability requirements, shown to
 * enterprises only. Pure controlled component (the post wizard owns state).
 * RN port of ~/bldesy-web/components/jobs/step-when-how.tsx (teal), using the
 * native date/time picker. All fields optional.
 */
import { useState } from 'react';
import { Platform, Pressable, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';

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
} from '@/lib/capabilities';
import { formatDateNice, formatTimeNice } from '@/components/jobs/when-and-how-block';

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

function parseDateStr(s: string): Date {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
  if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 12, 0, 0);
  return new Date();
}
function toDateStr(d: Date): string {
  const y = d.getFullYear();
  const mo = String(d.getMonth() + 1).padStart(2, '0');
  const da = String(d.getDate()).padStart(2, '0');
  return `${y}-${mo}-${da}`;
}
function parseTimeStr(s: string): Date {
  const m = /^(\d{1,2}):(\d{2})/.exec(s);
  const d = new Date();
  if (m) d.setHours(Number(m[1]), Number(m[2]), 0, 0);
  return d;
}
function toTimeStr(d: Date): string {
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

interface StepWhenAndHowProps {
  values: WhenAndHowFields;
  onChange: (next: WhenAndHowFields) => void;
}

export function StepWhenAndHow({ values, onChange }: StepWhenAndHowProps) {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];

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

  const payLabel =
    values.payType === 'hourly'
      ? '$ / hour'
      : values.payType === 'daily'
        ? '$ / day'
        : values.payType === 'fixed_contract'
          ? 'Total $'
          : '$ amount';
  const payDisabled = values.payType === 'negotiable';

  return (
    <View style={{ gap: Spacing['2xl'] }}>
      <View>
        <Text style={[styles.h2, { color: c.textPrimary }]}>When and how</Text>
        <Text style={[styles.sub, { color: c.textSecondary }]}>
          Set the employment terms and what you need from applicants. All fields optional.
        </Text>
      </View>

      {/* ── Section A — Employment terms ── */}
      <View style={{ gap: Spacing.lg }}>
        <SectionHeader title="Employment terms" c={c} />

        {/* Employment type */}
        <View>
          <Text style={[styles.label, { color: c.textSecondary }]}>EMPLOYMENT TYPE</Text>
          <View style={styles.chipRow}>
            {EMPLOYMENT_TYPES.map((t) => {
              const active = values.employmentType === t.value;
              return (
                <Chip
                  key={t.value}
                  label={t.label}
                  active={active}
                  c={c}
                  onPress={() => set('employmentType', active ? '' : t.value)}
                />
              );
            })}
          </View>
        </View>

        {/* Dates */}
        <View style={styles.row2}>
          <DateTimeField label="START DATE" value={values.startDate} mode="date" c={c}
            placeholder="Pick a date" onChange={(v) => set('startDate', v)} />
          <DateTimeField label="END DATE" value={values.endDate} mode="date" c={c}
            placeholder="Pick a date" disabled={values.isOngoing} onChange={(v) => set('endDate', v)} />
        </View>
        <View style={[styles.toggleRow, { borderColor: c.border, backgroundColor: c.surface }]}>
          <Text style={[styles.toggleLabel, { color: c.textPrimary }]}>Ongoing — no fixed end date</Text>
          <Switch
            value={values.isOngoing}
            onValueChange={(on) => onChange({ ...values, isOngoing: on, endDate: on ? '' : values.endDate })}
            trackColor={{ true: c.primary, false: c.border }}
            thumbColor="#fff"
          />
        </View>

        {/* Daily hours */}
        <View style={styles.row2}>
          <DateTimeField label="DAILY START" value={values.dailyStartTime} mode="time" c={c}
            placeholder="Pick a time" onChange={(v) => set('dailyStartTime', v)} />
          <DateTimeField label="DAILY FINISH" value={values.dailyFinishTime} mode="time" c={c}
            placeholder="Pick a time" onChange={(v) => set('dailyFinishTime', v)} />
        </View>

        {/* Work days */}
        <View>
          <Text style={[styles.label, { color: c.textSecondary }]}>DAYS OF WORK</Text>
          <View style={styles.chipRow}>
            {WORK_DAYS.map((d) => (
              <Chip
                key={d}
                label={WORK_DAY_LABELS[d].short}
                active={values.workDays.includes(d)}
                c={c}
                onPress={() => toggleDay(d)}
              />
            ))}
          </View>
          {values.workDays.length > 0 ? (
            <Text style={[styles.hint, { color: c.textSecondary }]}>
              {values.workDays.length} day{values.workDays.length !== 1 ? 's' : ''} per week
            </Text>
          ) : null}
        </View>

        {/* Pay */}
        <View>
          <Text style={[styles.label, { color: c.textSecondary }]}>PAY TYPE</Text>
          <View style={styles.chipRow}>
            {PAY_TYPES.map((p) => {
              const active = values.payType === p.value;
              return (
                <Chip
                  key={p.value}
                  label={p.label}
                  active={active}
                  c={c}
                  onPress={() => set('payType', active ? '' : p.value)}
                />
              );
            })}
          </View>
          <View style={[styles.row2, { marginTop: Spacing.md }]}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.label, { color: c.textSecondary }]}>{`${payLabel} (MIN)`}</Text>
              <TextInput
                value={values.payRateMin}
                onChangeText={(t) => set('payRateMin', t.replace(/[^0-9.]/g, ''))}
                editable={!payDisabled}
                keyboardType="decimal-pad"
                placeholder="e.g. 45"
                placeholderTextColor={c.textSecondary}
                style={[styles.input, styles.inputText, { backgroundColor: c.surface, borderColor: c.border, color: c.textPrimary }, payDisabled && { opacity: 0.5 }]}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.label, { color: c.textSecondary }]}>{`${payLabel} (MAX)`}</Text>
              <TextInput
                value={values.payRateMax}
                onChangeText={(t) => set('payRateMax', t.replace(/[^0-9.]/g, ''))}
                editable={!payDisabled}
                keyboardType="decimal-pad"
                placeholder="e.g. 55"
                placeholderTextColor={c.textSecondary}
                style={[styles.input, styles.inputText, { backgroundColor: c.surface, borderColor: c.border, color: c.textPrimary }, payDisabled && { opacity: 0.5 }]}
              />
            </View>
          </View>
        </View>
      </View>

      <View style={[styles.divider, { backgroundColor: c.border }]} />

      {/* ── Section B — Requirements ── */}
      <View style={{ gap: Spacing.lg }}>
        <View>
          <SectionHeader title="What you need from them" c={c} />
          <Text style={[styles.hint, { color: c.textSecondary, marginTop: 4 }]}>
            Tick Required to flag applicants who don&apos;t have it, or Preferred for nice-to-haves.
          </Text>
        </View>

        {Object.entries(CAPABILITY_GROUPS).map(([groupKey, group]) => (
          <View key={groupKey} style={{ gap: Spacing.sm }}>
            <Text style={[styles.label, { color: c.textSecondary }]}>{group.label.toUpperCase()}</Text>
            {group.items.map((item) => {
              const current = values.requiredCapabilities[item.key];
              return (
                <View key={item.key} style={[styles.capRow, { backgroundColor: c.surface, borderColor: c.border }]}>
                  <Text style={[styles.capLabel, { color: c.textPrimary }]} numberOfLines={1}>{item.label}</Text>
                  <View style={styles.capToggles}>
                    <ReqToggle
                      label="Required"
                      active={current === 'required'}
                      tone="required"
                      c={c}
                      onPress={() => setRequirement(item.key, current === 'required' ? null : 'required')}
                    />
                    <ReqToggle
                      label="Preferred"
                      active={current === 'preferred'}
                      tone="preferred"
                      c={c}
                      onPress={() => setRequirement(item.key, current === 'preferred' ? null : 'preferred')}
                    />
                  </View>
                </View>
              );
            })}
          </View>
        ))}

        {/* Public liability */}
        <View>
          <Text style={[styles.label, { color: c.textSecondary }]}>MINIMUM PUBLIC LIABILITY</Text>
          <View style={styles.chipRow}>
            {PUBLIC_LIABILITY_OPTIONS.map((opt) => {
              const active = (values.minPublicLiability ?? null) === opt.value;
              return (
                <Chip
                  key={String(opt.value ?? 'none')}
                  label={opt.label}
                  active={active}
                  c={c}
                  onPress={() => set('minPublicLiability', opt.value)}
                />
              );
            })}
          </View>
        </View>
      </View>
    </View>
  );
}

/* ── sub-components ──────────────────────────────────────────────────────── */

function SectionHeader({ title, c }: { title: string; c: any }) {
  return (
    <View style={styles.sectionHeader}>
      <View style={[styles.sectionBar, { backgroundColor: c.primary }]} />
      <Text style={[styles.sectionTitle, { color: c.textPrimary }]}>{title.toUpperCase()}</Text>
    </View>
  );
}

function Chip({ label, active, c, onPress }: { label: string; active: boolean; c: any; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.chip,
        active ? { backgroundColor: c.primary, borderColor: c.primary } : { backgroundColor: c.surface, borderColor: c.border },
      ]}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
    >
      <Text style={[styles.chipText, { color: active ? '#fff' : c.textSecondary }]}>{label}</Text>
    </Pressable>
  );
}

function ReqToggle({
  label,
  active,
  tone,
  c,
  onPress,
}: {
  label: string;
  active: boolean;
  tone: 'required' | 'preferred';
  c: any;
  onPress: () => void;
}) {
  const activeStyle =
    tone === 'required'
      ? { backgroundColor: c.primary, borderColor: c.primary, color: '#fff' }
      : { backgroundColor: '#FEF3C7', borderColor: '#FCD34D', color: '#92400E' };
  return (
    <Pressable
      onPress={onPress}
      style={[styles.reqToggle, active ? { backgroundColor: activeStyle.backgroundColor, borderColor: activeStyle.borderColor } : { backgroundColor: c.canvas, borderColor: c.border }]}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
    >
      <Text style={[styles.reqToggleText, { color: active ? activeStyle.color : c.textSecondary }]}>{label}</Text>
    </Pressable>
  );
}

function DateTimeField({
  label,
  value,
  mode,
  placeholder,
  disabled,
  c,
  onChange,
}: {
  label: string;
  value: string;
  mode: 'date' | 'time';
  placeholder: string;
  disabled?: boolean;
  c: any;
  onChange: (v: string) => void;
}) {
  const [show, setShow] = useState(false);
  const dateValue = mode === 'date'
    ? (value ? parseDateStr(value) : new Date())
    : (value ? parseTimeStr(value) : new Date());
  const display = value ? (mode === 'date' ? formatDateNice(value) : formatTimeNice(value)) : placeholder;

  return (
    <View style={{ flex: 1 }}>
      <Text style={[styles.label, { color: c.textSecondary }]}>{label}</Text>
      <Pressable
        disabled={disabled}
        onPress={() => setShow(true)}
        style={[styles.input, { backgroundColor: c.surface, borderColor: c.border }, disabled && { opacity: 0.5 }]}
      >
        <Text style={[styles.inputText, { color: value ? c.textPrimary : c.textSecondary }]} numberOfLines={1}>
          {display}
        </Text>
      </Pressable>
      {show ? (
        <>
          <DateTimePicker
            value={dateValue}
            mode={mode}
            is24Hour={false}
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={(e, selected) => {
              if (Platform.OS !== 'ios') setShow(false);
              if (e.type === 'set' && selected) {
                onChange(mode === 'date' ? toDateStr(selected) : toTimeStr(selected));
              }
            }}
          />
          {Platform.OS === 'ios' ? (
            <Pressable onPress={() => setShow(false)} style={styles.doneBtn}>
              <Text style={[styles.doneText, { color: c.primary }]}>Done</Text>
            </Pressable>
          ) : null}
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  h2: { fontFamily: FontFamily.bodyBold, fontSize: 20, fontWeight: '700' },
  sub: { fontFamily: FontFamily.body, fontSize: 13, marginTop: 4, lineHeight: 18 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sectionBar: { width: 4, height: 18, borderRadius: 2 },
  sectionTitle: { fontFamily: FontFamily.bodyBold, fontSize: 13, fontWeight: '700', letterSpacing: 0.6 },
  label: {
    fontFamily: FontFamily.bodyBold,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.6,
    marginBottom: 8,
  },
  hint: { fontFamily: FontFamily.body, fontSize: 11, marginTop: 6 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  chip: { paddingHorizontal: Spacing.md, paddingVertical: 9, borderRadius: Radius.full, borderWidth: 1 },
  chipText: { fontFamily: FontFamily.bodySemiBold, fontSize: 13, fontWeight: '600' },
  row2: { flexDirection: 'row', gap: Spacing.md },
  input: {
    height: 48,
    borderRadius: Radius.lg,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    justifyContent: 'center',
  },
  inputText: { fontFamily: FontFamily.body, fontSize: 14 },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: Radius.lg,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  toggleLabel: { fontFamily: FontFamily.bodyMedium, fontSize: 14, fontWeight: '500' },
  divider: { height: 1 },
  capRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.sm,
    borderRadius: Radius.lg,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
  },
  capLabel: { fontFamily: FontFamily.body, fontSize: 14, flex: 1 },
  capToggles: { flexDirection: 'row', gap: 6, flexShrink: 0 },
  reqToggle: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: Radius.full, borderWidth: 1 },
  reqToggleText: { fontFamily: FontFamily.bodyBold, fontSize: 10, fontWeight: '700', letterSpacing: 0.4 },
  doneBtn: { alignSelf: 'flex-end', paddingVertical: 6, paddingHorizontal: 8 },
  doneText: { fontFamily: FontFamily.bodyBold, fontSize: 14, fontWeight: '700' },
});
