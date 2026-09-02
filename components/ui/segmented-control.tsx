/**
 * SegmentedControl — port of `~/bldesy-web/components/ui/segmented-control.tsx`.
 *
 * Radio-card group for small mutually-exclusive choices (e.g. the three
 * availability display modes). Same visual language as the settings page's
 * radio cards: selected = accent border + tint, custom radio dot. The web grid
 * stacks to one column on mobile (`grid-cols-1 sm:grid-cols-N`), so the native
 * port always stacks.
 */
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Colors, FontFamily, Radius, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export type SegmentedAccent = 'primary' | 'indigo';

export interface SegmentedOption<T extends string> {
  value: T;
  label: string;
  description?: string;
  icon?: ReactNode;
}

export interface SegmentedControlProps<T extends string> {
  value: T;
  options: SegmentedOption<T>[];
  onChange: (value: T) => void;
  accent?: SegmentedAccent;
  disabled?: boolean;
}

export function SegmentedControl<T extends string>({
  value,
  options,
  onChange,
  accent = 'primary',
  disabled = false,
}: SegmentedControlProps<T>) {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];
  const accentColor = accent === 'indigo' ? c.indigo : c.primary;
  // web: primary → bg-primary-bg · indigo → bg-indigo/[0.06]
  const selectedBg = accent === 'indigo' ? c.indigo + '0F' : c.primaryBg;

  return (
    <View accessibilityRole="radiogroup" style={styles.group}>
      {options.map((opt) => {
        const selected = opt.value === value;
        return (
          <Pressable
            key={opt.value}
            accessibilityRole="radio"
            accessibilityState={{ checked: selected, disabled }}
            accessibilityLabel={opt.label}
            accessibilityHint={opt.description}
            disabled={disabled}
            onPress={() => {
              if (!disabled) onChange(opt.value);
            }}
            style={({ pressed }) => [
              styles.card,
              {
                borderColor: selected ? accentColor : c.border,
                backgroundColor: selected ? selectedBg : pressed ? c.canvas : 'transparent',
              },
              disabled && styles.disabled,
            ]}
          >
            <View
              aria-hidden
              style={[styles.radio, { borderColor: selected ? accentColor : c.border }]}
            >
              {selected ? <View style={[styles.radioDot, { backgroundColor: accentColor }]} /> : null}
            </View>
            <View style={styles.body}>
              <View style={styles.labelRow}>
                {opt.icon}
                <Text style={[styles.label, { color: c.textPrimary }]}>{opt.label}</Text>
              </View>
              {opt.description ? (
                <Text style={[styles.description, { color: c.textSecondary }]}>{opt.description}</Text>
              ) : null}
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  group: {
    gap: 10, // web gap-2.5
  },
  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.md,
    borderRadius: Radius.lg, // rounded-xl
    borderWidth: 1,
    padding: Spacing.lg,
  },
  disabled: {
    opacity: 0.6,
  },
  radio: {
    marginTop: 2,
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  body: {
    flex: 1,
    minWidth: 0,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  label: {
    fontSize: 14,
    lineHeight: 20,
    fontFamily: FontFamily.bodySemiBold,
    fontWeight: '600',
  },
  description: {
    marginTop: 2,
    fontSize: 12,
    lineHeight: 18,
    fontFamily: FontFamily.body,
  },
});
