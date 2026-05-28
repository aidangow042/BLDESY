/**
 * Input — text field primitive. Mirrors the web's `<input>` Tailwind pattern:
 *   `h-12 w-full rounded-2xl border border-border bg-surface px-3 text-sm
 *    text-text-primary placeholder:text-text-secondary/60
 *    focus:border-primary focus:ring-2 focus:ring-primary/30`
 *
 * Supports optional label + helper/error text + leading/trailing slots.
 * 16pt minimum font size on iOS (prevents auto-zoom on focus).
 */

import { forwardRef, useState } from 'react';
import {
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';

import { Colors, FontFamily, Radius } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export interface InputProps extends TextInputProps {
  label?: string;
  /** Helper text shown below the input. Use `error` for error styling. */
  helper?: string;
  /** Error message (when set, overrides helper and tints the field red). */
  error?: string;
  /** Rendered to the left of the text input (e.g. icon). */
  leading?: React.ReactNode;
  /** Rendered to the right of the text input (e.g. clear button). */
  trailing?: React.ReactNode;
  /** Wrapper style override. */
  containerStyle?: ViewStyle;
}

export const Input = forwardRef<TextInput, InputProps>(function Input(
  {
    label,
    helper,
    error,
    leading,
    trailing,
    containerStyle,
    onFocus,
    onBlur,
    style,
    ...rest
  },
  ref,
) {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];
  const [focused, setFocused] = useState(false);

  const borderColor = error ? c.error : focused ? c.primary : c.border;

  return (
    <View style={containerStyle}>
      {label ? (
        <Text style={[styles.label, { color: c.textSecondary }]}>{label}</Text>
      ) : null}
      <View
        style={[
          styles.field,
          {
            backgroundColor: c.surface,
            borderColor,
          },
          focused && { borderWidth: 2 },
        ]}
      >
        {leading ? <View style={styles.slot}>{leading}</View> : null}
        <TextInput
          ref={ref}
          placeholderTextColor={c.textSecondary + '99'}
          selectionColor={c.primary}
          accessibilityLabel={label ?? rest.accessibilityLabel}
          accessibilityHint={error ? `Error: ${error}` : helper}
          style={[
            styles.input,
            {
              color: c.textPrimary,
              fontFamily: FontFamily.body,
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
        {trailing ? <View style={styles.slot}>{trailing}</View> : null}
      </View>
      {error ? (
        <Text style={[styles.helper, { color: c.error }]}>{error}</Text>
      ) : helper ? (
        <Text style={[styles.helper, { color: c.textSecondary }]}>{helper}</Text>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  label: {
    fontSize: 12,
    fontWeight: '700',
    fontFamily: FontFamily.bodyBold,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 4,
  },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 48,
    borderWidth: 1,
    borderRadius: Radius.xl, // rounded-2xl
    paddingHorizontal: 12,
    gap: 8,
  },
  input: {
    flex: 1,
    fontSize: 16, // iOS auto-zoom guard
    paddingVertical: 12,
  },
  slot: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  helper: {
    fontSize: 12,
    marginTop: 6,
    fontFamily: FontFamily.body,
  },
});
