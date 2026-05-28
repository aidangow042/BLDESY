/**
 * FadeIn — animates children in on mount (opacity 0→1 + 12px slide up).
 * Mirrors web's IntersectionObserver-driven `components/ui/fade-in.tsx`, but
 * in RN we just fire on mount since list items are virtualised.
 */

import { useEffect } from 'react';
import { type ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';

import { Duration, easeOut } from '@/constants/motion';

interface FadeInProps {
  children: React.ReactNode;
  /** Delay before the animation begins, in ms. */
  delay?: number;
  /** Total animation duration, in ms. */
  duration?: number;
  /** Initial Y offset (positive = slides up). */
  offset?: number;
  style?: ViewStyle;
}

export function FadeIn({
  children,
  delay = 0,
  duration = Duration.slow,
  offset = 12,
  style,
}: FadeInProps) {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(offset);

  useEffect(() => {
    opacity.value = withDelay(delay, withTiming(1, { duration, easing: easeOut }));
    translateY.value = withDelay(delay, withTiming(0, { duration, easing: easeOut }));
  }, [delay, duration, opacity, translateY]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  return <Animated.View style={[animatedStyle, style]}>{children}</Animated.View>;
}
