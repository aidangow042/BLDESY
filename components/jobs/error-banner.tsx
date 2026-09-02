/**
 * ErrorBanner — the website's `rounded-2xl border border-error/30 bg-error/5
 * px-4 py-3 text-sm text-error` alert block (my-jobs page-level banner, wizard
 * server error, profile editor error). Optional dismiss ✕ ("Dismiss error").
 */
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import { Colors, FontFamily, Radius, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

interface ErrorBannerProps {
  message: string;
  onDismiss?: () => void;
  /** Success tone for confirmation lines (e.g. "Password updated successfully."). */
  tone?: 'error' | 'success' | 'warning';
}

export function ErrorBanner({ message, onDismiss, tone = 'error' }: ErrorBannerProps) {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];
  const fg = tone === 'success' ? c.success : tone === 'warning' ? c.warning : c.error;
  const bg = tone === 'success' ? c.successBg : tone === 'warning' ? c.warningBg : c.errorBg;
  const border = tone === 'success' ? c.successBorder : tone === 'warning' ? c.warningBorder : c.errorBorder;

  return (
    <View
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
      style={[styles.banner, { backgroundColor: bg, borderColor: border }]}
    >
      <Text style={[styles.text, { color: fg }]}>{message}</Text>
      {onDismiss ? (
        <Pressable
          onPress={onDismiss}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Dismiss error"
          style={styles.dismiss}
        >
          <Ionicons name="close" size={16} color={fg} />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.md,
    borderWidth: 1,
    borderRadius: Radius.xl,
    paddingHorizontal: Spacing.lg,
    paddingVertical: 12,
  },
  text: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
    fontFamily: FontFamily.body,
  },
  dismiss: {
    padding: 4,
    borderRadius: Radius.sm,
  },
});
