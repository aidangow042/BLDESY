/**
 * PingDot — the website's `animate-ping` status dot (a solid dot with an
 * expanding, fading ring) used inside the launch/live badges, the founding
 * pill and the pricing eyebrow. Honours the OS reduce-motion setting by
 * rendering the solid dot only.
 */
import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, StyleSheet, View } from 'react-native';

interface PingDotProps {
  color: string;
  size?: number;
}

export function PingDot({ color, size = 8 }: PingDotProps) {
  const progress = useRef(new Animated.Value(0)).current;
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    let cancelled = false;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((enabled) => {
        if (!cancelled) setReduceMotion(enabled);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (reduceMotion) return;
    const loop = Animated.loop(
      Animated.timing(progress, {
        toValue: 1,
        duration: 1000,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    );
    loop.start();
    return () => loop.stop();
  }, [progress, reduceMotion]);

  const scale = progress.interpolate({ inputRange: [0, 1], outputRange: [1, 2.2] });
  const opacity = progress.interpolate({ inputRange: [0, 1], outputRange: [0.8, 0] });
  const dot = { width: size, height: size, borderRadius: size / 2, backgroundColor: color };

  return (
    <View
      style={{ width: size, height: size }}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      {!reduceMotion ? (
        <Animated.View style={[StyleSheet.absoluteFill, dot, { transform: [{ scale }], opacity }]} />
      ) : null}
      <View style={[StyleSheet.absoluteFill, dot]} />
    </View>
  );
}
