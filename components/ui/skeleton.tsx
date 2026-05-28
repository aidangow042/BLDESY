/**
 * Skeleton — pulse-animated placeholder. Mirrors web `components/ui/skeleton.tsx`.
 */

import { useEffect } from 'react';
import { type ViewStyle } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { Colors, Radius } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export type SkeletonVariant = 'text' | 'card' | 'avatar' | 'image';

interface SkeletonProps {
  variant?: SkeletonVariant;
  style?: ViewStyle;
}

const VARIANT: Record<SkeletonVariant, ViewStyle> = {
  text:   { height: 16, width: '100%', borderRadius: 4 },
  card:   { height: 192, width: '100%', borderRadius: Radius.xl },
  avatar: { height: 48, width: 48, borderRadius: Radius.full },
  image:  { height: 160, width: '100%', borderRadius: Radius.xl },
};

export function Skeleton({ variant = 'text', style }: SkeletonProps) {
  const scheme = useColorScheme() ?? 'light';
  const opacity = useSharedValue(0.6);

  useEffect(() => {
    opacity.value = withRepeat(
      withTiming(0.3, { duration: 800, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    );
    return () => cancelAnimation(opacity);
  }, [opacity]);

  const animatedStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Animated.View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[
        VARIANT[variant],
        { backgroundColor: Colors[scheme].border },
        animatedStyle,
        style,
      ]}
    />
  );
}

