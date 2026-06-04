/**
 * CountUp — animates a numeric value from 0 → `value` over `duration` ms.
 * Mirrors web's `components/ui/count-up.tsx` (cubic ease-out 1.5s default).
 */

import { useCallback, useEffect, useRef, useState } from 'react';
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

const defaultFormat = (n: number) => Math.round(n).toLocaleString('en-AU');

export function CountUp({
  value,
  duration = 1500,
  format = defaultFormat,
  style,
}: CountUpProps) {
  const progress = useSharedValue(0);
  const [display, setDisplay] = useState(() => format(0));

  // Stash format in a ref so the JS-side updater always reads the latest one
  // without invalidating the worklet on every render.
  const formatRef = useRef(format);
  useEffect(() => {
    formatRef.current = format;
  }, [format]);

  // JS-thread callback. Reanimated worklets can't call user-supplied JS
  // functions directly (that crashes the UI thread), so we marshal across
  // via runOnJS and do the formatting + setState here.
  const applyValue = useCallback((n: number) => {
    setDisplay(formatRef.current(n));
  }, []);

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
      'worklet';
      runOnJS(applyValue)(current);
    },
    [applyValue],
  );

  return <Text style={style}>{display}</Text>;
}
