import React, { useState, useCallback } from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { withLayoutContext } from 'expo-router';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import type { MaterialTopTabBarProps } from '@react-navigation/material-top-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';

import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors, Spacing, Shadows } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

const { Navigator } = createMaterialTopTabNavigator();
const TopTabs = withLayoutContext(Navigator);

// Shared flag so BottomTabBar can tell TabLayout to skip animation
let disableAnimation: (() => void) | null = null;

function BottomTabBar({ state, descriptors, navigation }: MaterialTopTabBarProps) {
  const colorScheme = useColorScheme();
  const theme = colorScheme === 'dark' ? 'dark' : 'light';
  const colors = Colors[theme];
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.tabBar,
        {
          backgroundColor: colors.canvas,
          borderTopColor: colors.border,
          paddingBottom: insets.bottom,
          height: 48 + insets.bottom,
          ...Shadows.sm,
        },
      ]}
    >
      {state.routes.map((route, index) => {
        const { options } = descriptors[route.key];

        // Skip hidden screens
        if ((options as any).href === null) return null;

        const isFocused = state.index === index;
        const color = isFocused ? colors.teal : '#3A3A4A';
        const icon = options.tabBarIcon?.({ color, focused: isFocused } as any);

        const onPress = () => {
          if (process.env.EXPO_OS === 'ios') {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          }
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });
          if (!isFocused && !event.defaultPrevented) {
            // Temporarily disable animation for instant switch
            disableAnimation?.();
            navigation.navigate(route.name);
          }
        };

        return (
          <Pressable
            key={route.key}
            onPress={onPress}
            style={styles.tabItem}
          >
            {icon}
          </Pressable>
        );
      })}
    </View>
  );
}

export default function TabLayout() {
  const [animationEnabled, setAnimationEnabled] = useState(true);

  disableAnimation = useCallback(() => {
    setAnimationEnabled(false);
    // Re-enable after the navigation completes so swipes still animate
    setTimeout(() => setAnimationEnabled(true), 50);
  }, []);

  return (
    <TopTabs
      tabBarPosition="bottom"
      tabBar={(props) => <BottomTabBar {...props} />}
      screenOptions={{
        swipeEnabled: true,
        lazy: true,
        animationEnabled,
      }}
    >
      <TopTabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color }: { color: string }) => (
            <IconSymbol size={26} name="house" color={color} />
          ),
        }}
      />

      <TopTabs.Screen
        name="ai"
        options={{
          title: 'AI Assist',
          tabBarIcon: ({ color }: { color: string }) => (
            <IconSymbol size={26} name="sparkles" color={color} />
          ),
        }}
      />

      <TopTabs.Screen
        name="map"
        options={{
          title: 'Map',
          swipeEnabled: false,
          tabBarIcon: ({ color }: { color: string }) => (
            <IconSymbol size={26} name="map" color={color} />
          ),
        }}
      />

      <TopTabs.Screen
        name="saved"
        options={{
          title: 'Saved',
          tabBarIcon: ({ color }: { color: string }) => (
            <IconSymbol size={26} name="bookmark" color={color} />
          ),
        }}
      />

      {/* Hidden screens — keep in route tree but not in tab bar */}
      <TopTabs.Screen name="portal" options={{ href: null }} />
      <TopTabs.Screen name="explore" options={{ href: null }} />
    </TopTabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    flexDirection: 'row',
    borderTopWidth: 1,
    paddingTop: Spacing.sm,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
