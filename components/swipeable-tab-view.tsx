import React, { useRef, type ReactNode } from 'react';
import { Animated, Dimensions, PanResponder, StyleSheet } from 'react-native';
import { usePathname, useRouter } from 'expo-router';

const TAB_PATHS = ['/', '/ai', '/map', '/saved'];
const SWIPE_THRESHOLD = 80;
const SCREEN_WIDTH = Dimensions.get('window').width;
const SLIDE_DURATION = 200;

interface Props {
  children: ReactNode;
}

export function SwipeableTabView({ children }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const pathnameRef = useRef(pathname);
  pathnameRef.current = pathname;

  const routerRef = useRef(router);
  routerRef.current = router;

  const translateX = useRef(new Animated.Value(0)).current;
  const isAnimating = useRef(false);

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_evt, gs) => {
        if (isAnimating.current) return false;
        return Math.abs(gs.dx) > 15 && Math.abs(gs.dx) > Math.abs(gs.dy) * 1.5;
      },
      onMoveShouldSetPanResponderCapture: () => false,
      onPanResponderMove: (_evt, gs) => {
        const idx = TAB_PATHS.indexOf(pathnameRef.current);
        // Clamp so you can't swipe past first/last tab
        if (gs.dx > 0 && idx === 0) {
          translateX.setValue(gs.dx * 0.2); // rubber band
        } else if (gs.dx < 0 && idx === TAB_PATHS.length - 1) {
          translateX.setValue(gs.dx * 0.2);
        } else {
          translateX.setValue(gs.dx);
        }
      },
      onPanResponderRelease: (_evt, gs) => {
        const idx = TAB_PATHS.indexOf(pathnameRef.current);
        const shouldGoLeft = gs.dx > SWIPE_THRESHOLD && idx > 0;
        const shouldGoRight = gs.dx < -SWIPE_THRESHOLD && idx < TAB_PATHS.length - 1;

        if (shouldGoLeft || shouldGoRight) {
          const target = shouldGoLeft ? SCREEN_WIDTH : -SCREEN_WIDTH;
          isAnimating.current = true;

          Animated.timing(translateX, {
            toValue: target,
            duration: SLIDE_DURATION,
            useNativeDriver: true,
          }).start(() => {
            const nextIdx = shouldGoLeft ? idx - 1 : idx + 1;
            routerRef.current.replace(TAB_PATHS[nextIdx] as any);
            // Reset instantly — the new screen mounts at 0
            translateX.setValue(0);
            isAnimating.current = false;
          });
        } else {
          // Snap back
          Animated.spring(translateX, {
            toValue: 0,
            useNativeDriver: true,
            tension: 120,
            friction: 10,
          }).start();
        }
      },
      onPanResponderTerminate: () => {
        Animated.spring(translateX, {
          toValue: 0,
          useNativeDriver: true,
          tension: 120,
          friction: 10,
        }).start();
      },
    }),
  ).current;

  return (
    <Animated.View
      style={[styles.fill, { transform: [{ translateX }] }]}
      {...panResponder.panHandlers}
    >
      {children}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
});
