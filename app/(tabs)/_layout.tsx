import { Tabs } from 'expo-router';
import React from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { HapticTab } from '@/components/haptic-tab';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors, Spacing, Shadows } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const theme = colorScheme === 'dark' ? 'dark' : 'light';
  const colors = Colors[theme];
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.teal,
        tabBarInactiveTintColor: '#3A3A4A',
        tabBarShowLabel: false,
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarStyle: {
          backgroundColor: colors.canvas,
          borderTopWidth: 1,
          borderTopColor: colors.border,
          height: 48 + insets.bottom,
          paddingTop: Spacing.sm,
          paddingBottom: insets.bottom,
          ...Shadows.sm,
        },
        tabBarIconStyle: {
          marginTop: Spacing.xs,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color }: { color: string }) => (
            <IconSymbol size={26} name="house" color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="ai"
        options={{
          title: 'AI Assist',
          tabBarIcon: ({ color }: { color: string }) => (
            <IconSymbol size={26} name="sparkles" color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="map"
        options={{
          title: 'Map',
          tabBarIcon: ({ color }: { color: string }) => (
            <IconSymbol size={26} name="map" color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="saved"
        options={{
          title: 'Saved',
          tabBarIcon: ({ color }: { color: string }) => (
            <IconSymbol size={26} name="bookmark" color={color} />
          ),
        }}
      />

      {/* Portal is now a pushed screen — hide from tab bar */}
      <Tabs.Screen name="portal" options={{ href: null }} />
      {/* Hide Explore if the file still exists */}
      <Tabs.Screen name="explore" options={{ href: null }} />
    </Tabs>
  );
}
