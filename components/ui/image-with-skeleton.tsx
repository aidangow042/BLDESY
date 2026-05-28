/**
 * ImageWithSkeleton — image that shows a pulsing skeleton until loaded, then
 * fades in. Mirrors web `components/ui/image-with-skeleton.tsx`.
 */

import { useState } from 'react';
import { StyleSheet, View, type ImageSourcePropType, type ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { Image } from 'expo-image';

import { Skeleton } from './skeleton';
import { Duration, easeOut } from '@/constants/motion';

interface Props {
  source: ImageSourcePropType | string | null;
  /** Aspect ratio of the placeholder (defaults to 16/9). */
  aspectRatio?: number;
  /** Optional border radius applied to both image + skeleton. */
  borderRadius?: number;
  /** Image alt text. */
  accessibilityLabel?: string;
  style?: ViewStyle;
}

export function ImageWithSkeleton({
  source,
  aspectRatio = 16 / 9,
  borderRadius,
  accessibilityLabel,
  style,
}: Props) {
  const [loaded, setLoaded] = useState(false);
  const opacity = useSharedValue(0);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  function handleLoad() {
    setLoaded(true);
    opacity.value = withTiming(1, { duration: Duration.base, easing: easeOut });
  }

  const uri = typeof source === 'string' ? source : null;
  const wrapStyle = [{ aspectRatio, borderRadius, overflow: 'hidden' as const }, style];

  return (
    <View style={wrapStyle}>
      {!loaded ? (
        <Skeleton variant="image" style={{ ...StyleSheet.absoluteFillObject, borderRadius }} />
      ) : null}
      <Animated.View style={[StyleSheet.absoluteFill, animatedStyle]}>
        <Image
          source={uri ? { uri } : (source as ImageSourcePropType)}
          accessibilityLabel={accessibilityLabel}
          contentFit="cover"
          onLoad={handleLoad}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>
    </View>
  );
}
