/**
 * Enterprise Hub form controls — the website's `h-12 w-full rounded-2xl border
 * border-border bg-surface px-4 text-sm … focus:border-indigo` inputs, the
 * `mb-1.5 block text-sm font-semibold` labels, the step / kind tab strips, the
 * removable chips and the "type + Add" chip input. Indigo focus + selection.
 */
import { useState, type ReactNode } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import { FontFamily, Radius, Spacing } from '@/constants/theme';

import { useHubTheme } from './hub-primitives';

/* ── Labels + inputs ────────────────────────────────────────────────── */

export function FieldLabel({ children, hint }: { children: ReactNode; hint?: string }) {
  const c = useHubTheme();
  return (
    <View style={{ marginBottom: 6 }}>
      <Text style={[styles.label, { color: c.textPrimary }]}>{children}</Text>
      {hint ? <Text style={[styles.hint, { color: c.textSecondary }]}>{hint}</Text> : null}
    </View>
  );
}

export interface HubInputProps extends TextInputProps {
  label?: string;
  hint?: string;
  /** Renders a taller multi-line field (`rows`). */
  rows?: number;
  containerStyle?: StyleProp<ViewStyle>;
}

/** Single-line (`h-12`) or multi-line (`rows`) text field. */
export function HubInput({ label, hint, rows, containerStyle, style, onFocus, onBlur, ...rest }: HubInputProps) {
  const c = useHubTheme();
  const [focused, setFocused] = useState(false);
  const multiline = !!rows && rows > 1;
  return (
    <View style={containerStyle}>
      {label ? <FieldLabel hint={hint}>{label}</FieldLabel> : null}
      <TextInput
        placeholderTextColor={c.textSecondary + '80'}
        selectionColor={c.indigo}
        multiline={multiline}
        textAlignVertical={multiline ? 'top' : 'center'}
        accessibilityLabel={label ?? rest.accessibilityLabel}
        style={[
          styles.input,
          {
            backgroundColor: c.surface,
            borderColor: focused ? c.indigo : c.border,
            borderWidth: focused ? 2 : 1,
            color: c.textPrimary,
            minHeight: multiline ? 24 * (rows ?? 1) + 24 : 48,
            paddingVertical: multiline ? Spacing.md : 0,
          },
          style,
        ]}
        onFocus={(e) => {
          setFocused(true);
          onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          onBlur?.(e);
        }}
        {...rest}
      />
    </View>
  );
}

/* ── Tab strips ─────────────────────────────────────────────────────── */

export interface SegmentOption<K extends string> {
  key: K;
  label: string;
}

/**
 * The edit-profile step tabs: `rounded-xl border bg-surface p-1` with the
 * active tab `bg-indigo text-white shadow-sm`. Scrolls horizontally when the
 * labels overflow. (The shared ui/segmented-control primitive is not in the
 * tree yet — this is the hub-local twin.)
 */
export function Segmented<K extends string>({
  options,
  value,
  onChange,
  scroll = false,
  style,
}: {
  options: readonly SegmentOption<K>[];
  value: K;
  onChange: (key: K) => void;
  scroll?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const c = useHubTheme();
  const items = options.map((o) => {
    const active = o.key === value;
    return (
      <Pressable
        key={o.key}
        accessibilityRole="tab"
        accessibilityState={{ selected: active }}
        onPress={() => onChange(o.key)}
        style={[styles.segment, active && { backgroundColor: c.indigo }, !scroll && { flex: 1 }]}
      >
        <Text numberOfLines={1} style={[styles.segmentLabel, { color: active ? '#ffffff' : c.textSecondary }]}>
          {o.label}
        </Text>
      </Pressable>
    );
  });
  const track = [styles.segmentTrack, { backgroundColor: c.surface, borderColor: c.border }, style];
  if (scroll) {
    return (
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={track} contentContainerStyle={{ gap: 4 }}>
        {items}
      </ScrollView>
    );
  }
  return (
    <View accessibilityRole="tablist" style={[...track, { flexDirection: 'row', gap: 4 }]}>
      {items}
    </View>
  );
}

/** The jobs page's `border-b` Jobs / Contracts tabs (active: indigo text + 2px underline). */
export function UnderlineTabs<K extends string>({
  options,
  value,
  onChange,
}: {
  options: readonly SegmentOption<K>[];
  value: K;
  onChange: (key: K) => void;
}) {
  const c = useHubTheme();
  return (
    <View accessibilityRole="tablist" style={[styles.underlineTrack, { borderBottomColor: c.border }]}>
      {options.map((o) => {
        const active = o.key === value;
        return (
          <Pressable
            key={o.key}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            onPress={() => onChange(o.key)}
            style={[styles.underlineTab, active && { borderBottomColor: c.indigo, borderBottomWidth: 2, marginBottom: -1 }]}
          >
            <Text style={[styles.underlineLabel, { color: active ? c.indigo : c.textSecondary }]}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/** Rounded-full filter pills (analytics sort, period picker on a light ground). */
export function PillTabs<K extends string>({
  options,
  value,
  onChange,
  onDark = false,
}: {
  options: readonly SegmentOption<K>[];
  value: K;
  onChange: (key: K) => void;
  /** Inside the gradient header: white active pill on `bg-white/10`. */
  onDark?: boolean;
}) {
  const c = useHubTheme();
  return (
    <View style={[styles.pillTabs, onDark && styles.pillTabsDark]}>
      {options.map((o) => {
        const active = o.key === value;
        const bg = onDark ? (active ? '#ffffff' : 'transparent') : active ? c.indigo + '26' : 'transparent';
        const fg = onDark ? (active ? c.indigoDark : 'rgba(255,255,255,0.6)') : active ? c.indigo : c.textSecondary;
        return (
          <Pressable
            key={o.key}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            onPress={() => onChange(o.key)}
            style={[styles.pillTab, { backgroundColor: bg }]}
          >
            <Text style={[styles.pillTabLabel, { color: fg }]}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/* ── Chips ──────────────────────────────────────────────────────────── */

/** `rounded-full bg-indigo/10 px-3 py-1 text-xs font-medium text-indigo` with an × to remove. */
export function Chip({
  label,
  onRemove,
  tone = 'indigo',
}: {
  label: string;
  onRemove?: () => void;
  tone?: 'indigo' | 'primary';
}) {
  const c = useHubTheme();
  const fg = tone === 'primary' ? c.primary : c.indigo;
  return (
    <View style={[styles.chip, { backgroundColor: fg + '1A' }]}>
      <Text style={[styles.chipLabel, { color: fg }]}>{label}</Text>
      {onRemove ? (
        <Pressable accessibilityRole="button" accessibilityLabel={`Remove ${label}`} onPress={onRemove} hitSlop={8}>
          <Ionicons name="close" size={12} color={fg} />
        </Pressable>
      ) : null}
    </View>
  );
}

/** Outline suggestion chip: `+ Sydney`. */
export function SuggestChip({ label, onPress }: { label: string; onPress: () => void }) {
  const c = useHubTheme();
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.suggestChip,
        { borderColor: pressed ? c.indigo + '66' : c.border, backgroundColor: c.surface },
      ]}
    >
      {({ pressed }) => (
        <Text style={[styles.suggestLabel, { color: pressed ? c.indigo : c.textSecondary }]}>+ {label}</Text>
      )}
    </Pressable>
  );
}

/** "type — press Enter to add" input + indigo Add button, then the chips underneath. */
export function ChipInput({
  label,
  hint,
  placeholder,
  values,
  onAdd,
  onRemove,
  chipTone = 'indigo',
  children,
}: {
  label: string;
  hint?: string;
  placeholder: string;
  values: readonly string[];
  onAdd: (value: string) => void;
  onRemove: (value: string) => void;
  chipTone?: 'indigo' | 'primary';
  /** Rendered between the input and the chips (one-tap suggestions). */
  children?: ReactNode;
}) {
  const c = useHubTheme();
  const [input, setInput] = useState('');
  function submit() {
    if (!input.trim()) return;
    onAdd(input);
    setInput('');
  }
  return (
    <View>
      <FieldLabel hint={hint}>{label}</FieldLabel>
      <View style={styles.chipInputRow}>
        <HubInput
          value={input}
          onChangeText={setInput}
          placeholder={placeholder}
          returnKeyType="done"
          onSubmitEditing={submit}
          blurOnSubmit={false}
          containerStyle={{ flex: 1 }}
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Add ${label}`}
          onPress={submit}
          style={({ pressed }) => [styles.addBtn, { backgroundColor: c.indigo, opacity: pressed ? 0.9 : 1 }]}
        >
          <Text style={styles.addBtnLabel}>Add</Text>
        </Pressable>
      </View>
      {children}
      {values.length > 0 ? (
        <View style={styles.chipWrap}>
          {values.map((v) => (
            <Chip key={v} label={v} onRemove={() => onRemove(v)} tone={chipTone} />
          ))}
        </View>
      ) : null}
    </View>
  );
}

/* ── Choice pills (the web's <select>) ──────────────────────────────── */

/** Radio-style pill row for short option lists (Company Size, Urgency). */
export function ChoicePills<K extends string>({
  options,
  value,
  onChange,
  allowClear = false,
}: {
  options: readonly SegmentOption<K>[];
  value: K | '';
  onChange: (key: K | '') => void;
  allowClear?: boolean;
}) {
  const c = useHubTheme();
  return (
    <View style={styles.choiceRow}>
      {options.map((o) => {
        const active = o.key === value;
        return (
          <Pressable
            key={o.key}
            accessibilityRole="radio"
            accessibilityState={{ selected: active }}
            onPress={() => onChange(active && allowClear ? '' : o.key)}
            style={[
              styles.choice,
              { borderColor: active ? c.indigo : c.border, backgroundColor: active ? c.indigo + '0D' : c.surface },
            ]}
          >
            <Text style={[styles.choiceLabel, { color: active ? c.indigo : c.textSecondary }]}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/* ── Switch ─────────────────────────────────────────────────────────── */

/**
 * Indigo on/off switch. The shared `components/ui/toggle-switch` primitive is
 * owned by the portal work and was not in the tree when the hub was built, so
 * this wraps the platform Switch with the enterprise accent.
 */
export function HubSwitch({
  value,
  onValueChange,
  disabled,
  accessibilityLabel,
}: {
  value: boolean;
  onValueChange: (next: boolean) => void;
  disabled?: boolean;
  accessibilityLabel?: string;
}) {
  const c = useHubTheme();
  return (
    <Switch
      value={value}
      onValueChange={onValueChange}
      disabled={disabled}
      accessibilityLabel={accessibilityLabel}
      trackColor={{ true: c.indigo, false: c.border }}
      thumbColor="#ffffff"
      ios_backgroundColor={c.border}
      style={disabled ? { opacity: 0.4 } : undefined}
    />
  );
}

const styles = StyleSheet.create({
  label: {
    fontSize: 14,
    fontFamily: FontFamily.bodySemiBold,
    fontWeight: '600',
  },
  hint: {
    marginTop: 2,
    fontSize: 12,
    lineHeight: 16,
    fontFamily: FontFamily.body,
  },
  input: {
    borderRadius: Radius.xl,
    paddingHorizontal: Spacing.lg,
    fontSize: 16,
    fontFamily: FontFamily.body,
  },
  segmentTrack: {
    borderRadius: Radius.lg,
    borderWidth: 1,
    padding: 4,
  },
  segment: {
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentLabel: {
    fontSize: 12,
    fontFamily: FontFamily.bodyMedium,
    fontWeight: '500',
  },
  underlineTrack: {
    flexDirection: 'row',
    gap: Spacing.sm,
    borderBottomWidth: 1,
  },
  underlineTab: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
  },
  underlineLabel: {
    fontSize: 14,
    fontFamily: FontFamily.bodySemiBold,
    fontWeight: '600',
  },
  pillTabs: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  pillTabsDark: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: Radius.full,
    padding: 4,
  },
  pillTab: {
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
  },
  pillTabLabel: {
    fontSize: 12,
    fontFamily: FontFamily.bodySemiBold,
    fontWeight: '600',
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: 4,
  },
  chipLabel: {
    fontSize: 12,
    fontFamily: FontFamily.bodyMedium,
    fontWeight: '500',
  },
  suggestChip: {
    borderRadius: Radius.full,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    paddingVertical: 4,
  },
  suggestLabel: {
    fontSize: 12,
    fontFamily: FontFamily.bodyMedium,
    fontWeight: '500',
  },
  chipInputRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
  },
  addBtn: {
    height: 48,
    paddingHorizontal: Spacing.lg,
    borderRadius: Radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addBtnLabel: {
    color: '#ffffff',
    fontSize: 14,
    fontFamily: FontFamily.bodyBold,
    fontWeight: '700',
  },
  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  choiceRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  choice: {
    flexGrow: 1,
    borderWidth: 1,
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    alignItems: 'center',
  },
  choiceLabel: {
    fontSize: 12,
    fontFamily: FontFamily.bodySemiBold,
    fontWeight: '600',
  },
});
