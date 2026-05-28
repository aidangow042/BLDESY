/**
 * CountUp — animates a numeric value from 0 → `value` over `duration` ms.
 * Mirrors web's `components/ui/count-up.tsx` (cubic ease-out 1.5s default).
 */

import { useEffect, useState } from 'react';
import { Text, type TextStyle } from 'react-native';
import {
  cancelAnimation,
  Easing,
  runOnJS,
  useAnimatedReaction,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

interface CountUpProps {
  value: number;
  duration?: number;
  /** Number formatter (e.g. `Intl.NumberFormat`). */
  format?: (n: number) => string;
  style?: TextStyle | TextStyle[];
}

export function CountUp({
  value,
  duration = 1500,
  format = (n) => Math.round(n).toLocaleString('en-AU'),
  style,
}: CountUpProps) {
  const progress = useSharedValue(0);
  const [display, setDisplay] = useState(format(0));

  useEffect(() => {
    progress.value = 0;
    progress.value = withTiming(value, {
      duration,
      easing: Easing.out(Easing.cubic),
    });
    return () => cancelAnimation(progress);
  }, [value, duration, progress]);

  useAnimatedReaction(
    () => progress.value,
    (current) => {
      runOnJS(setDisplay)(format(current));
    },
    [format],
  );

  return <Text style={style}>{display}</Text>;
}
