/**
 * ToggleSwitch — port of `~/bldesy-web/components/ui/toggle-switch.tsx`.
 *
 * Brand toggle switch — teal (default) or indigo for the enterprise portal.
 * Track `h-6 w-11` (sm) / `h-7 w-12` (md), white thumb inset 2px that slides
 * 20px, `bg-border` off / accent on, 40% opacity when disabled. The thumb and
 * track colour animate over 200ms like the web's `transition-*` classes.
 */
import { useEffect } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import Animated, {
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { Colors, Radius, Shadows } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export type ToggleAccent = 'primary' | 'indigo';
export type ToggleSize = 'sm' | 'md';

const TRACK: Record<ToggleSize, { width: number; height: number }> = {
  sm: { width: 44, height: 24 },
  md: { width: 48, height: 28 },
};
const THUMB: Record<ToggleSize, number> = { sm: 20, md: 24 };
const THUMB_INSET = 2;
/** web `translate-x-5` */
const THUMB_TRAVEL = 20;
const DURATION_MS = 200;

export interface ToggleSwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  accent?: ToggleAccent;
  size?: ToggleSize;
  accessibilityLabel?: string;
}

export function ToggleSwitch({
  checked,
  onChange,
  disabled = false,
  accent = 'primary',
  size = 'sm',
  accessibilityLabel,
}: ToggleSwitchProps) {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];
  const onColor = accent === 'indigo' ? c.indigo : c.primary;
  const offColor = c.border;

  const progress = useSharedValue(checked ? 1 : 0);
  useEffect(() => {
    progress.value = withTiming(checked ? 1 : 0, { duration: DURATION_MS });
  }, [checked, progress]);

  const trackStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(progress.value, [0, 1], [offColor, onColor]),
  }));
  const thumbStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: progress.value * THUMB_TRAVEL }],
  }));

  const track = TRACK[size];
  const thumb = THUMB[size];

  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityState={{ checked, disabled }}
      accessibilityLabel={accessibilityLabel}
      disabled={disabled}
      hitSlop={6}
      onPress={() => {
        if (!disabled) onChange(!checked);
      }}
      style={[styles.pressable, disabled && styles.disabled]}
    >
      <Animated.View
        style={[styles.track, { width: track.width, height: track.height }, trackStyle]}
      >
        <Animated.View
          style={[
            styles.thumb,
            Shadows.sm,
            { width: thumb, height: thumb, borderRadius: thumb / 2 },
            thumbStyle,
          ]}
        />
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressable: {
    flexShrink: 0,
  },
  disabled: {
    opacity: 0.4,
  },
  track: {
    borderRadius: Radius.full,
    justifyContent: 'center',
  },
  thumb: {
    position: 'absolute',
    left: THUMB_INSET,
    top: THUMB_INSET,
    backgroundColor: '#ffffff',
  },
});
