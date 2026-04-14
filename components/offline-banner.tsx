import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNetInfo } from '@react-native-community/netinfo';
import { Ionicons } from '@expo/vector-icons';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors, Type } from '@/constants/theme';

/**
 * Global offline banner.
 * Slides in below the status bar when the device loses internet.
 * Uses a warm amber colour to indicate a warning (not a hard error).
 */
export function OfflineBanner() {
  const { isConnected } = useNetInfo();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  const translateY = useRef(new Animated.Value(-80)).current;

  const isOffline = isConnected === false;

  useEffect(() => {
    Animated.timing(translateY, {
      toValue: isOffline ? 0 : -80,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [isOffline, translateY]);

  // Always render so the animation can slide out smoothly
  return (
    <Animated.View
      style={[
        styles.container,
        {
          paddingTop: insets.top + 4,
          backgroundColor: colorScheme === 'dark' ? colors.warningLight : '#f59e0b',
          transform: [{ translateY }],
        },
      ]}
      accessibilityRole="alert"
      accessibilityLabel="No internet connection"
      pointerEvents="none"
    >
      <View style={styles.content}>
        <Ionicons
          name="cloud-offline-outline"
          size={16}
          color={colorScheme === 'dark' ? colors.warning : '#ffffff'}
          style={styles.icon}
        />
        <Text
          style={[
            styles.text,
            { color: colorScheme === 'dark' ? colors.warning : '#ffffff' },
          ]}
        >
          No internet connection
        </Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 9999,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    paddingHorizontal: 16,
  },
  icon: {
    marginRight: 6,
  },
  text: {
    ...Type.captionSemiBold,
  },
});
