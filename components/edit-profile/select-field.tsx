/**
 * A native stand-in for the edit-profile page's `<select>` (inputCls: h-12
 * rounded-2xl border bg-surface px-4 text-sm): a trigger showing the current
 * label that opens a bottom sheet of options.
 */
import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Colors, FontFamily, Radius, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export interface SelectOption {
  value: string;
  label: string;
}

interface SelectFieldProps {
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
  /** Sheet heading; defaults to the accessibility label. */
  title?: string;
  accessibilityLabel: string;
}

export function SelectField({ value, options, onChange, title, accessibilityLabel }: SelectFieldProps) {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false);
  const current = options.find((o) => o.value === value) ?? options[0];

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        style={[styles.trigger, { backgroundColor: c.surface, borderColor: c.border }]}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        accessibilityValue={{ text: current?.label }}
      >
        <Text style={[styles.triggerText, { color: current?.value === '' ? c.textSecondary : c.textPrimary }]} numberOfLines={1}>
          {current?.label ?? ''}
        </Text>
        <MaterialIcons name="expand-more" size={20} color={c.textSecondary} />
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <View style={styles.modalRoot}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setOpen(false)} accessibilityLabel="Close" />
          <View style={[styles.sheet, { backgroundColor: c.surface, paddingBottom: insets.bottom + Spacing.md }]}>
            <View style={[styles.grabber, { backgroundColor: c.border }]} />
            <View style={styles.header}>
              <Text style={[styles.title, { color: c.textPrimary }]}>{title ?? accessibilityLabel}</Text>
              <Pressable onPress={() => setOpen(false)} hitSlop={10} accessibilityLabel="Close">
                <MaterialIcons name="close" size={22} color={c.textSecondary} />
              </Pressable>
            </View>
            <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
              {options.map((opt) => {
                const selected = opt.value === value;
                return (
                  <Pressable
                    key={opt.value || '__empty'}
                    onPress={() => {
                      onChange(opt.value);
                      setOpen(false);
                    }}
                    style={[styles.option, { borderBottomColor: c.border }]}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                  >
                    <Text style={[styles.optionText, { color: selected ? c.primary : c.textPrimary }]}>{opt.label}</Text>
                    {selected ? <MaterialIcons name="check" size={18} color={c.primary} /> : null}
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 48,
    borderWidth: 1,
    borderRadius: Radius.xl,
    paddingHorizontal: Spacing.lg,
    gap: Spacing.sm,
  },
  triggerText: { flex: 1, fontSize: 14, fontFamily: FontFamily.body },
  modalRoot: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.45)' },
  sheet: { borderTopLeftRadius: Radius.xl, borderTopRightRadius: Radius.xl, paddingHorizontal: Spacing.lg, paddingTop: Spacing.sm, maxHeight: '70%' },
  grabber: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, marginBottom: Spacing.md },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing.sm },
  title: { fontSize: 17, fontFamily: FontFamily.bodyBold, fontWeight: '700' },
  scroll: { flexGrow: 0 },
  option: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, minHeight: 48, borderBottomWidth: StyleSheet.hairlineWidth },
  optionText: { fontSize: 15, fontFamily: FontFamily.body },
});
