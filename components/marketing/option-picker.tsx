/**
 * OptionPicker — the native stand-in for the website's `<select>` on the
 * marketing forms (trade pickers, the callback qualifier). A field that looks
 * like an input opens a bottom sheet listing the options; long lists get a
 * filter box. `allowClear` offers the placeholder as a row, mirroring the
 * web's `<option value="">` "none" choice.
 *
 * Themed by default; pass `palette` to host it inside a forced-light surface
 * (the waitlist form).
 */
import { useMemo, useState } from 'react';
import {
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Colors, FontFamily, Radius, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export interface PickerOption {
  value: string;
  label: string;
}

export interface OptionPickerPalette {
  fieldBg: string;
  fieldBorder: string;
  text: string;
  placeholder: string;
  accent: string;
  sheetBg: string;
  divider: string;
  muted: string;
}

interface OptionPickerProps {
  value: string;
  options: readonly PickerOption[];
  onChange: (value: string) => void;
  placeholder: string;
  /** Sheet heading; defaults to the placeholder. */
  title?: string;
  accessibilityLabel?: string;
  /** Offer the placeholder as a selectable "none" row. */
  allowClear?: boolean;
  /** Show a filter box — defaults to on for lists longer than 12. */
  searchable?: boolean;
  palette?: Partial<OptionPickerPalette>;
  style?: StyleProp<ViewStyle>;
  /** 44pt field (the web's py-2.5) instead of 52pt. */
  compact?: boolean;
}

export function OptionPicker({
  value,
  options,
  onChange,
  placeholder,
  title,
  accessibilityLabel,
  allowClear = true,
  searchable,
  palette,
  style,
  compact = false,
}: OptionPickerProps) {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState('');

  const p: OptionPickerPalette = {
    fieldBg: c.surface,
    fieldBorder: c.border,
    text: c.textPrimary,
    placeholder: c.textSecondary + '99',
    accent: c.primary,
    sheetBg: c.surface,
    divider: c.border,
    muted: c.textSecondary,
    ...palette,
  };

  const selected = options.find((o) => o.value === value);
  const showFilter = searchable ?? options.length > 12;
  const visible = useMemo(() => {
    const q = filter.trim().toLowerCase();
    const list = q ? options.filter((o) => o.label.toLowerCase().includes(q)) : [...options];
    return allowClear && !q ? [{ value: '', label: placeholder }, ...list] : list;
  }, [allowClear, filter, options, placeholder]);

  function choose(v: string) {
    onChange(v);
    setOpen(false);
    setFilter('');
  }

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel ?? placeholder}
        accessibilityValue={{ text: selected?.label ?? placeholder }}
        onPress={() => setOpen(true)}
        style={[
          styles.field,
          { backgroundColor: p.fieldBg, borderColor: p.fieldBorder, height: compact ? 44 : 52 },
          style,
        ]}
      >
        <Text
          numberOfLines={1}
          style={[styles.fieldText, { color: selected ? p.text : p.placeholder }]}
        >
          {selected?.label ?? placeholder}
        </Text>
        <Ionicons name="chevron-down" size={16} color={p.muted} />
      </Pressable>

      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <View style={styles.backdropWrap}>
          <Pressable
            accessibilityLabel="Close"
            accessibilityRole="button"
            style={styles.backdrop}
            onPress={() => setOpen(false)}
          />
          <View
            style={[
              styles.sheet,
              { backgroundColor: p.sheetBg, paddingBottom: Math.max(insets.bottom, Spacing.lg) },
            ]}
          >
            <View style={[styles.sheetHeader, { borderBottomColor: p.divider }]}>
              <Text style={[styles.sheetTitle, { color: p.text }]}>{title ?? placeholder}</Text>
              <Pressable accessibilityRole="button" accessibilityLabel="Close" onPress={() => setOpen(false)} hitSlop={8}>
                <Ionicons name="close" size={22} color={p.muted} />
              </Pressable>
            </View>
            {showFilter ? (
              <TextInput
                value={filter}
                onChangeText={setFilter}
                placeholder="Type to filter"
                placeholderTextColor={p.placeholder}
                autoCorrect={false}
                accessibilityLabel="Filter options"
                style={[
                  styles.filter,
                  { borderColor: p.fieldBorder, color: p.text, backgroundColor: p.fieldBg },
                ]}
              />
            ) : null}
            <FlatList
              data={visible}
              keyExtractor={(o) => o.value || '__none'}
              keyboardShouldPersistTaps="handled"
              style={styles.list}
              renderItem={({ item }) => {
                const isSelected = item.value === value;
                return (
                  <Pressable
                    accessibilityRole="menuitem"
                    accessibilityState={{ selected: isSelected }}
                    onPress={() => choose(item.value)}
                    style={({ pressed }) => [
                      styles.option,
                      { borderBottomColor: p.divider },
                      pressed && { backgroundColor: p.accent + '14' },
                    ]}
                  >
                    <Text
                      style={[
                        styles.optionText,
                        { color: item.value ? p.text : p.muted },
                        isSelected && { fontFamily: FontFamily.bodySemiBold, fontWeight: '600' },
                      ]}
                    >
                      {item.label}
                    </Text>
                    {isSelected ? <Ionicons name="checkmark" size={18} color={p.accent} /> : null}
                  </Pressable>
                );
              }}
              ListEmptyComponent={
                <Text style={[styles.empty, { color: p.muted }]}>No matches</Text>
              }
            />
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.sm,
    borderWidth: 1,
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing.md,
  },
  fieldText: {
    flex: 1,
    fontFamily: FontFamily.body,
    fontSize: 14,
  },
  backdropWrap: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
  },
  sheet: {
    maxHeight: '75%',
    borderTopLeftRadius: Radius['2xl'],
    borderTopRightRadius: Radius['2xl'],
    paddingTop: Spacing.sm,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  sheetTitle: {
    fontFamily: FontFamily.bodyBold,
    fontWeight: '700',
    fontSize: 16,
  },
  filter: {
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.md,
    height: 44,
    borderWidth: 1,
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing.md,
    fontFamily: FontFamily.body,
    fontSize: 16,
  },
  list: {
    marginTop: Spacing.sm,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.xl,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  optionText: {
    flex: 1,
    fontFamily: FontFamily.body,
    fontSize: 15,
  },
  empty: {
    padding: Spacing.xl,
    textAlign: 'center',
    fontFamily: FontFamily.body,
    fontSize: 14,
  },
});
