/**
 * The edit-profile page's form atoms, in the website's Tailwind sizes:
 *   inputCls  = h-12 rounded-2xl border border-border bg-surface px-4 text-sm
 *   labelCls  = text-sm font-medium text-text-secondary mb-1.5
 * plus the pill / remove / dashed-tile buttons and the success / error banners.
 */
import type { ReactNode } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View, type TextInputProps, type TextStyle, type ViewStyle } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

import { Colors, FontFamily, Radius, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export function FieldLabel({ children }: { children: ReactNode }) {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];
  return <Text style={[styles.label, { color: c.textSecondary }]}>{children}</Text>;
}

export function HelperText({ children, style }: { children: ReactNode; style?: TextStyle }) {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];
  return <Text style={[styles.helper, { color: c.textSecondary }, style]}>{children}</Text>;
}

export function FormInput(props: TextInputProps) {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];
  return (
    <TextInput
      placeholderTextColor={c.textSecondary + '80'}
      {...props}
      style={[styles.input, { backgroundColor: c.surface, borderColor: c.border, color: c.textPrimary }, props.style]}
    />
  );
}

export function FormTextarea({ rows = 4, ...props }: TextInputProps & { rows?: number }) {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];
  return (
    <TextInput
      placeholderTextColor={c.textSecondary + '80'}
      multiline
      textAlignVertical="top"
      {...props}
      style={[
        styles.textarea,
        { minHeight: 24 * rows + 24, backgroundColor: c.surface, borderColor: c.border, color: c.textPrimary },
        props.style,
      ]}
    />
  );
}

/** `rounded-full bg-primary/10 px-4 py-1.5 text-sm font-semibold text-primary` */
export function SoftPillButton({ label, onPress, disabled }: { label: string; onPress: () => void; disabled?: boolean }) {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={[styles.softPill, { backgroundColor: c.primary + '1A', opacity: disabled ? 0.5 : 1 }]}
      accessibilityRole="button"
    >
      <Text style={[styles.softPillText, { color: c.primary }]}>{label}</Text>
    </Pressable>
  );
}

/** `rounded-full border border-border px-4 py-1.5 text-xs font-semibold text-text-secondary` */
export function OutlinePillButton({
  label,
  onPress,
  disabled,
  busy,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  busy?: boolean;
}) {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || busy}
      style={[styles.outlinePill, { borderColor: c.border, opacity: disabled || busy ? 0.5 : 1 }]}
      accessibilityRole="button"
      accessibilityState={{ disabled: disabled || busy, busy }}
    >
      {busy ? <ActivityIndicator size="small" color={c.primary} /> : null}
      <Text style={[styles.outlinePillText, { color: c.textSecondary }]}>{label}</Text>
    </Pressable>
  );
}

/** The round `bg-error/10 text-error` × button. */
export function RemoveButton({
  onPress,
  accessibilityLabel,
  size = 28,
  style,
}: {
  onPress: () => void;
  accessibilityLabel: string;
  size?: number;
  style?: ViewStyle;
}) {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];
  return (
    <Pressable
      onPress={onPress}
      hitSlop={6}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={[styles.remove, { width: size, height: size, borderRadius: size / 2, backgroundColor: c.error + '1A' }, style]}
    >
      <MaterialIcons name="close" size={Math.round(size * 0.55)} color={c.error} />
    </Pressable>
  );
}

/** Small solid × over a thumbnail (`bg-error/90 text-white`). */
export function ThumbRemoveButton({ onPress, accessibilityLabel }: { onPress: () => void; accessibilityLabel: string }) {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];
  return (
    <Pressable
      onPress={onPress}
      hitSlop={6}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={[styles.thumbRemove, { backgroundColor: c.error + 'E6' }]}
    >
      <MaterialIcons name="close" size={12} color="#fff" />
    </Pressable>
  );
}

/** The dashed "Add photo" / "Add image" / "Add video" tile. */
export function DashedTile({
  width,
  height,
  label,
  icon = 'add',
  busy,
  busyLabel,
  onPress,
}: {
  width: number;
  height: number;
  label: string;
  icon?: 'add' | 'videocam';
  busy?: boolean;
  busyLabel?: string;
  onPress: () => void;
}) {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];
  return (
    <Pressable
      onPress={onPress}
      disabled={busy}
      style={[styles.dashed, { width, height, borderColor: c.border }]}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ busy }}
    >
      {busy ? (
        <>
          <ActivityIndicator size="small" color={c.primary} />
          {busyLabel ? <Text style={[styles.dashedText, { color: c.textSecondary + '66' }]}>{busyLabel}</Text> : null}
        </>
      ) : (
        <>
          <MaterialIcons name={icon} size={20} color={c.textSecondary + '66'} />
          <Text style={[styles.dashedText, { color: c.textSecondary + '66' }]}>{label}</Text>
        </>
      )}
    </Pressable>
  );
}

export function Banner({ tone, children }: { tone: 'success' | 'error'; children: ReactNode }) {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];
  const color = tone === 'success' ? c.success : c.error;
  const bg = tone === 'success' ? c.successBg : c.error + '0D';
  return (
    <View style={[styles.banner, { borderColor: color + '4D', backgroundColor: bg }]} accessibilityRole="alert">
      {tone === 'success' ? <MaterialIcons name="check" size={16} color={color} /> : null}
      <Text style={[styles.bannerText, { color, fontFamily: tone === 'success' ? FontFamily.bodyMedium : FontFamily.body }]}>
        {children}
      </Text>
    </View>
  );
}

/** `h-5 w-1 rounded-full bg-primary` bar + `text-lg font-bold` heading. */
export function SectionHeading({ title }: { title: string }) {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];
  return (
    <View style={styles.sectionHeading}>
      <View style={[styles.sectionBar, { backgroundColor: c.primary }]} />
      <Text style={[styles.sectionTitle, { color: c.textPrimary }]} accessibilityRole="header">
        {title}
      </Text>
    </View>
  );
}

export function EmptyNote({ children }: { children: ReactNode }) {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];
  return <Text style={[styles.emptyNote, { color: c.textSecondary }]}>{children}</Text>;
}

const styles = StyleSheet.create({
  label: { fontSize: 14, fontFamily: FontFamily.bodyMedium, fontWeight: '500', marginBottom: 6 },
  helper: { fontSize: 12, lineHeight: 18, fontFamily: FontFamily.body },
  input: { height: 48, borderWidth: 1, borderRadius: Radius.xl, paddingHorizontal: Spacing.lg, fontSize: 14, fontFamily: FontFamily.body },
  textarea: { borderWidth: 1, borderRadius: Radius.xl, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, fontSize: 14, lineHeight: 20, fontFamily: FontFamily.body },
  softPill: { borderRadius: Radius.full, paddingHorizontal: Spacing.lg, paddingVertical: 6, minHeight: 36, justifyContent: 'center' },
  softPillText: { fontSize: 14, fontFamily: FontFamily.bodySemiBold, fontWeight: '600' },
  outlinePill: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', borderWidth: 1, borderRadius: Radius.full, paddingHorizontal: Spacing.lg, paddingVertical: 6, minHeight: 36, justifyContent: 'center' },
  outlinePillText: { fontSize: 12, fontFamily: FontFamily.bodySemiBold, fontWeight: '600' },
  remove: { alignItems: 'center', justifyContent: 'center' },
  thumbRemove: { position: 'absolute', top: 4, right: 4, width: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  dashed: { borderWidth: 2, borderStyle: 'dashed', borderRadius: Radius.lg, alignItems: 'center', justifyContent: 'center', gap: 2 },
  dashedText: { fontSize: 9, fontFamily: FontFamily.body },
  banner: { flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1, borderRadius: Radius.lg, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md },
  bannerText: { flex: 1, fontSize: 14, lineHeight: 20 },
  sectionHeading: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  sectionBar: { width: 4, height: 20, borderRadius: 2 },
  sectionTitle: { fontSize: 18, lineHeight: 28, fontFamily: FontFamily.bodyBold, fontWeight: '700' },
  emptyNote: { fontSize: 14, lineHeight: 20, fontFamily: FontFamily.body, textAlign: 'center', paddingVertical: Spacing['2xl'] },
});
