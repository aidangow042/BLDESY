import { Tabs } from 'expo-router';
import React from 'react';

import { HapticTab } from '@/components/haptic-tab';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function TabLayout() {
  const colorScheme = useColorScheme();

  return (
    <Tabs
      screenOptions={{
       tabBarActiveTintColor:
  Colors[(colorScheme === 'dark' ? 'dark' : 'light')].tint,

        headerShown: false,
        tabBarButton: HapticTab,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color }: { color: string }) => (

            <IconSymbol size={28} name="house.fill" color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="ai"
        options={{
          title: 'AI Assist',
          tabBarIcon: ({ color }: { color: string }) => (

            <IconSymbol size={28} name="sparkles" color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="saved"
        options={{
          title: 'Saved',
          tabBarIcon: ({ color }: { color: string }) => (

            <IconSymbol size={28} name="bookmark.fill" color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="portal"
        options={{
          title: 'Portal',
          tabBarIcon: ({ color }: { color: string }) => (

            <IconSymbol size={28} name="person.crop.circle.fill" color={color} />
          ),
        }}
      />

      {/* Hide Explore if the file still exists */}
      <Tabs.Screen name="explore" options={{ href: null }} />
    </Tabs>
  );
}
