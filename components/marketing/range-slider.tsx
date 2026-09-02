/**
 * RangeSlider — a dependency-free `<input type="range">` for the /for-tradies
 * ROI calculator. Drag or tap anywhere on the track; the thumb snaps to
 * `step`. Exposed to assistive tech as an adjustable with increment/decrement
 * actions, mirroring the native slider role.
 */
import { useState } from 'react';
import { StyleSheet, View, type GestureResponderEvent, type StyleProp, type ViewStyle } from 'react-native';

interface RangeSliderProps {
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
  accessibilityLabel: string;
  trackColor: string;
  fillColor: string;
  thumbColor?: string;
  style?: StyleProp<ViewStyle>;
}

const THUMB = 24;

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}

export function RangeSlider({
  value,
  min,
  max,
  step,
  onChange,
  accessibilityLabel,
  trackColor,
  fillColor,
  thumbColor = '#ffffff',
  style,
}: RangeSliderProps) {
  const [width, setWidth] = useState(0);
  const ratio = max > min ? (clamp(value, min, max) - min) / (max - min) : 0;

  function valueAt(x: number): number {
    if (width <= 0) return value;
    const raw = min + clamp(x / width, 0, 1) * (max - min);
    return clamp(Math.round(raw / step) * step, min, max);
  }

  function handle(e: GestureResponderEvent) {
    const next = valueAt(e.nativeEvent.locationX);
    if (next !== value) onChange(next);
  }

  return (
    <View
      style={[styles.hit, style]}
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      onStartShouldSetResponder={() => true}
      onMoveShouldSetResponder={() => true}
      onResponderGrant={handle}
      onResponderMove={handle}
      onResponderTerminationRequest={() => false}
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel={accessibilityLabel}
      accessibilityValue={{ min, max, now: value }}
      accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
      onAccessibilityAction={(e) => {
        if (e.nativeEvent.actionName === 'increment') onChange(clamp(value + step, min, max));
        if (e.nativeEvent.actionName === 'decrement') onChange(clamp(value - step, min, max));
      }}
    >
      <View style={[styles.track, { backgroundColor: trackColor }]}>
        <View style={[styles.fill, { backgroundColor: fillColor, width: `${ratio * 100}%` }]} />
      </View>
      <View
        pointerEvents="none"
        style={[
          styles.thumb,
          {
            backgroundColor: thumbColor,
            borderColor: fillColor,
            left: ratio * Math.max(0, width - THUMB),
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  hit: {
    height: 40,
    justifyContent: 'center',
  },
  track: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 3,
  },
  thumb: {
    position: 'absolute',
    top: (40 - THUMB) / 2,
    width: THUMB,
    height: THUMB,
    borderRadius: THUMB / 2,
    borderWidth: 3,
    shadowColor: '#0f172a',
    shadowOpacity: 0.15,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
});
