/**
 * ErrorCard — empty/error state with optional retry button.
 * Mirrors web `components/ui/error-card.tsx`.
 */

import { StyleSheet, Text, View } from 'react-native';

import { Button } from './button';
import { Colors, FontFamily, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

interface ErrorCardProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  compact?: boolean;
}

export function ErrorCard({
  title = 'Something went wrong',
  message = "We couldn't load this content. Check your connection and try again.",
  onRetry,
  compact = false,
}: ErrorCardProps) {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];

  const iconSize = compact ? 40 : 56;

  return (
    <View style={[styles.wrap, { paddingVertical: compact ? 24 : 48 }]}>
      <View
        style={[
          styles.iconWrap,
          {
            width: iconSize,
            height: iconSize,
            borderRadius: iconSize / 2,
            backgroundColor: c.errorBg,
          },
        ]}
      >
        <Text style={[styles.iconGlyph, { color: c.error, fontSize: compact ? 18 : 26 }]}>!</Text>
      </View>
      <Text
        style={[
          styles.title,
          { color: c.textPrimary, fontSize: compact ? 14 : 16 },
        ]}
      >
        {title}
      </Text>
      <Text
        style={[
          styles.message,
          { color: c.textSecondary, fontSize: compact ? 12 : 14 },
        ]}
      >
        {message}
      </Text>
      {onRetry ? (
        <View style={{ marginTop: Spacing.lg }}>
          <Button variant="secondary" size={compact ? 'sm' : 'md'} onPress={onRetry}>
            Try again
          </Button>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  iconGlyph: {
    fontFamily: FontFamily.bodyBold,
    fontWeight: '800',
  },
  title: {
    fontFamily: FontFamily.bodyBold,
    fontWeight: '700',
    textAlign: 'center',
  },
  message: {
    marginTop: 4,
    maxWidth: 320,
    textAlign: 'center',
    fontFamily: FontFamily.body,
  },
});
