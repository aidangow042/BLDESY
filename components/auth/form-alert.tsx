/**
 * FormAlert — the auth forms' inline alert. Mirrors the website's
 * `rounded-2xl border border-error/20 bg-error/5 px-4 py-3 text-sm text-error`
 * block (`role="alert"`), with a success twin for the reset-link banner.
 */
import { StyleSheet, Text, View, type ViewStyle } from 'react-native';

import { Colors, FontFamily, Radius, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

interface Props {
  children: React.ReactNode;
  variant?: 'error' | 'success';
  style?: ViewStyle;
}

export function FormAlert({ children, variant = 'error', style }: Props) {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];
  const tone = variant === 'error' ? c.error : c.success;

  return (
    <View
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
      style={[styles.box, { borderColor: tone + '33', backgroundColor: tone + '0D' }, style]}
    >
      <Text style={[styles.text, { color: tone }]}>{children}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    borderWidth: 1,
    borderRadius: Radius.xl,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  text: {
    fontSize: 14,
    lineHeight: 20,
    fontFamily: FontFamily.body,
  },
});
