/**
 * Button — primary UI primitive. Mirrors `~/bldesy-web/components/ui/button.tsx`.
 *
 * Variants: primary (gradient) | secondary (outline) | ghost | danger | indigo
 * Sizes: sm | md | lg
 *
 * Built-in press animation: scale → 0.98 via Reanimated.
 */

import { forwardRef, useMemo } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  type PressableProps,
  type ViewStyle,
  type TextStyle,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';

import { Colors, FontFamily, Radius } from '@/constants/theme';
import { PRESS_SCALE, pressSpring } from '@/constants/motion';
import { useColorScheme } from '@/hooks/use-color-scheme';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'indigo';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends Omit<PressableProps, 'children' | 'style'> {
  /** Button label. */
  children: React.ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Stretch to fill parent width. */
  fullWidth?: boolean;
  /** Optional icon rendered to the left of `children`. */
  leadingIcon?: React.ReactNode;
  /** Optional icon rendered to the right of `children`. */
  trailingIcon?: React.ReactNode;
  /** Loading state — disables interaction and dims the label. */
  loading?: boolean;
  /** Wrapper style override (rarely needed). */
  style?: ViewStyle;
}

const SIZE_HEIGHT: Record<ButtonSize, number> = { sm: 36, md: 44, lg: 48 };
const SIZE_PADDING: Record<ButtonSize, number> = { sm: 12, md: 16, lg: 24 };
const SIZE_GAP: Record<ButtonSize, number> = { sm: 6, md: 8, lg: 8 };
const SIZE_TEXT: Record<ButtonSize, number> = { sm: 12, md: 14, lg: 14 };

export const Button = forwardRef<View, ButtonProps>(function Button(
  {
    children,
    variant = 'primary',
    size = 'md',
    fullWidth = false,
    leadingIcon,
    trailingIcon,
    loading = false,
    disabled,
    style,
    onPressIn,
    onPressOut,
    ...rest
  },
  ref,
) {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const isDisabled = disabled || loading;

  const variantStyle = useMemo<{ container: ViewStyle; text: TextStyle; gradient?: [string, string] }>(() => {
    switch (variant) {
      case 'primary':
        return {
          container: { backgroundColor: c.primary },
          text: { color: '#ffffff' },
          gradient: [c.primary, c.primaryDark],
        };
      case 'indigo':
        return {
          container: { backgroundColor: c.indigo },
          text: { color: '#ffffff' },
          gradient: [c.indigo, c.indigoDark],
        };
      case 'secondary':
        return {
          container: {
            backgroundColor: 'transparent',
            borderWidth: 2,
            borderColor: c.primary,
          },
          text: { color: c.primary },
        };
      case 'ghost':
        return {
          container: { backgroundColor: 'transparent' },
          text: { color: c.textSecondary },
        };
      case 'danger':
        return {
          container: {
            backgroundColor: 'transparent',
            borderWidth: 2,
            borderColor: c.error + '4D', // 30% alpha
          },
          text: { color: c.error },
        };
    }
  }, [variant, c]);

  const inner = (
    <View
      style={[
        styles.row,
        {
          height: SIZE_HEIGHT[size],
          paddingHorizontal: SIZE_PADDING[size],
          gap: SIZE_GAP[size],
        },
      ]}
    >
      {leadingIcon}
      <Text
        style={[
          styles.label,
          { fontSize: SIZE_TEXT[size], color: variantStyle.text.color },
        ]}
      >
        {children}
      </Text>
      {trailingIcon}
    </View>
  );

  return (
    <Animated.View
      ref={ref}
      style={[
        animatedStyle,
        fullWidth ? styles.fullWidth : styles.shrink,
        isDisabled && styles.disabled,
        style,
      ]}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ disabled: isDisabled, busy: loading }}
        disabled={isDisabled}
        onPressIn={(e) => {
          scale.value = withSpring(PRESS_SCALE, pressSpring);
          onPressIn?.(e);
        }}
        onPressOut={(e) => {
          scale.value = withSpring(1, pressSpring);
          onPressOut?.(e);
        }}
        style={[styles.base, variantStyle.container]}
        {...rest}
      >
        {variantStyle.gradient ? (
          <LinearGradient
            colors={variantStyle.gradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
        ) : null}
        {inner}
      </Pressable>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  base: {
    borderRadius: Radius.lg, // rounded-xl (12)
    overflow: 'hidden',
  },
  shrink: {
    alignSelf: 'flex-start',
  },
  fullWidth: {
    alignSelf: 'stretch',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontFamily: FontFamily.bodyBold,
    fontWeight: '700',
    textAlign: 'center',
  },
  disabled: {
    opacity: 0.5,
  },
});
