/**
 * SelectSheet — the native twin of the website's `<select>` fields in the job
 * wizard and settings forms. A field-shaped trigger (rounded-2xl, 48px) opens
 * a bottom sheet of options, optionally grouped (the web's `<optgroup>`).
 *
 * Lives under components/jobs (homeowner-surface ownership) and is reused by
 * components/customer-dashboard; nothing here is job-specific.
 */
import { useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Colors, FontFamily, Radius, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export interface SelectOption<T extends string> {
  value: T;
  label: string;
}

export interface SelectGroup<T extends string> {
  label: string;
  options: SelectOption<T>[];
}

interface SelectSheetProps<T extends string> {
  value: T | '';
  onChange: (value: T | '') => void;
  /** Shown in the field when nothing is selected (the web's first `<option value="">`). */
  placeholder: string;
  options?: SelectOption<T>[];
  groups?: SelectGroup<T>[];
  /** Sheet heading; defaults to the placeholder. */
  title?: string;
  /** Offer the placeholder as a selectable "clear" row (the web's empty option). */
  allowEmpty?: boolean;
  disabled?: boolean;
  error?: string;
  /** Colour of the selected row / check (primary by default, indigo for enterprise). */
  accent?: string;
  accessibilityLabel?: string;
  /** 40px field like the web's `h-10` inputs inside compact editors. */
  compact?: boolean;
}

export function SelectSheet<T extends string>({
  value,
  onChange,
  placeholder,
  options,
  groups,
  title,
  allowEmpty = false,
  disabled = false,
  error,
  accent,
  accessibilityLabel,
  compact = false,
}: SelectSheetProps<T>) {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false);
  const tint = accent ?? c.primary;

  const resolvedGroups = useMemo<SelectGroup<T>[]>(
    () => groups ?? [{ label: '', options: options ?? [] }],
    [groups, options],
  );

  const selectedLabel = useMemo(() => {
    for (const g of resolvedGroups) {
      const hit = g.options.find((o) => o.value === value);
      if (hit) return hit.label;
    }
    return null;
  }, [resolvedGroups, value]);

  function pick(next: T | '') {
    onChange(next);
    setOpen(false);
  }

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel ?? placeholder}
        accessibilityValue={{ text: selectedLabel ?? placeholder }}
        accessibilityState={{ disabled, expanded: open }}
        disabled={disabled}
        onPress={() => setOpen(true)}
        style={[
          styles.field,
          compact && styles.fieldCompact,
          {
            backgroundColor: c.surface,
            borderColor: error ? c.error : c.border,
          },
          disabled && styles.disabled,
        ]}
      >
        <Text
          numberOfLines={1}
          style={[styles.fieldText, { color: selectedLabel ? c.textPrimary : c.textSecondary + '99' }]}
        >
          {selectedLabel ?? placeholder}
        </Text>
        <Ionicons name="chevron-down" size={18} color={c.textSecondary} />
      </Pressable>
      {error ? <Text style={[styles.error, { color: c.error }]}>{error}</Text> : null}

      <Modal
        visible={open}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setOpen(false)}
      >
        <View style={styles.modalRoot}>
          <Pressable
            accessibilityLabel="Close"
            style={StyleSheet.absoluteFill}
            onPress={() => setOpen(false)}
          />
          <View
            style={[
              styles.sheet,
              { backgroundColor: c.surface, paddingBottom: insets.bottom + Spacing.md },
            ]}
          >
            <View style={[styles.grabber, { backgroundColor: c.border }]} />
            <View style={styles.sheetHeader}>
              <Text style={[styles.sheetTitle, { color: c.textPrimary }]}>{title ?? placeholder}</Text>
              <Pressable onPress={() => setOpen(false)} hitSlop={10} accessibilityLabel="Close">
                <Ionicons name="close" size={22} color={c.textSecondary} />
              </Pressable>
            </View>

            <ScrollView style={styles.sheetScroll} showsVerticalScrollIndicator={false}>
              {allowEmpty ? (
                <OptionRow
                  label={placeholder}
                  selected={value === ''}
                  tint={tint}
                  c={c}
                  onPress={() => pick('')}
                  muted
                />
              ) : null}
              {resolvedGroups.map((group, gi) => (
                <View key={group.label || `group-${gi}`}>
                  {group.label ? (
                    <Text style={[styles.groupLabel, { color: c.textSecondary }]}>
                      {group.label.toUpperCase()}
                    </Text>
                  ) : null}
                  {group.options.map((opt) => (
                    <OptionRow
                      key={opt.value}
                      label={opt.label}
                      selected={opt.value === value}
                      tint={tint}
                      c={c}
                      onPress={() => pick(opt.value)}
                    />
                  ))}
                </View>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
}

function OptionRow({
  label,
  selected,
  tint,
  c,
  onPress,
  muted = false,
}: {
  label: string;
  selected: boolean;
  tint: string;
  c: Record<string, string>;
  onPress: () => void;
  muted?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="menuitem"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.option,
        selected && { backgroundColor: tint + '14' },
        pressed && { backgroundColor: c.canvas },
      ]}
    >
      <Text
        style={[
          styles.optionText,
          { color: selected ? tint : muted ? c.textSecondary : c.textPrimary },
          selected && styles.optionTextSelected,
        ]}
      >
        {label}
      </Text>
      {selected ? <Ionicons name="checkmark" size={18} color={tint} /> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.sm,
    minHeight: 48,
    borderWidth: 1,
    borderRadius: Radius.xl,
    paddingHorizontal: 12,
  },
  fieldCompact: {
    minHeight: 40,
    borderRadius: Radius.lg,
  },
  fieldText: {
    flex: 1,
    fontSize: 14,
    fontFamily: FontFamily.body,
  },
  disabled: {
    opacity: 0.5,
  },
  error: {
    fontSize: 12,
    marginTop: 6,
    fontFamily: FontFamily.body,
  },
  modalRoot: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  sheet: {
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
    maxHeight: '82%',
  },
  grabber: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    marginBottom: Spacing.md,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  sheetTitle: {
    fontSize: 17,
    fontFamily: FontFamily.bodyBold,
    fontWeight: '700',
  },
  sheetScroll: {
    flexGrow: 0,
  },
  groupLabel: {
    fontSize: 11,
    fontFamily: FontFamily.bodyBold,
    fontWeight: '700',
    letterSpacing: 0.6,
    marginTop: Spacing.md,
    marginBottom: Spacing.xs,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.sm,
    paddingVertical: 12,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.md,
  },
  optionText: {
    flex: 1,
    fontSize: 15,
    fontFamily: FontFamily.body,
  },
  optionTextSelected: {
    fontFamily: FontFamily.bodySemiBold,
    fontWeight: '600',
  },
});
