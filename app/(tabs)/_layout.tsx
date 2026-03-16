import { Tabs } from 'expo-router';
import React from 'react';

import { HapticTab } from '@/components/haptic-tab';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors, Spacing, Shadows } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const theme = colorScheme === 'dark' ? 'dark' : 'light';
  const colors = Colors[theme];

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.tint,
        tabBarInactiveTintColor: colors.icon,
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarStyle: {
          backgroundColor: colors.background,
          borderTopWidth: 1,
          borderTopColor: colors.border,
          height: 88,
          paddingTop: Spacing.sm,
          paddingBottom: Spacing['3xl'],
          ...Shadows.sm,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          marginTop: Spacing.xs,
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
            <IconSymbol size={26} name="house.fill" color={color} />
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
        name="saved"
        options={{
          title: 'Saved',
          tabBarIcon: ({ color }: { color: string }) => (
            <IconSymbol size={26} name="bookmark.fill" color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="portal"
        options={{
          title: 'Portal',
          tabBarIcon: ({ color }: { color: string }) => (
            <IconSymbol size={26} name="person.crop.circle.fill" color={color} />
          ),
        }}
      />

      {/* Hide Explore if the file still exists */}
      <Tabs.Screen name="explore" options={{ href: null }} />

      {/* Pushed screens — hidden from tab bar */}
      <Tabs.Screen name="results" options={{ href: null }} />
      <Tabs.Screen name="post-job" options={{ href: null }} />
      <Tabs.Screen name="builder/[id]" options={{ href: null }} />
      <Tabs.Screen name="builder-signup" options={{ href: null }} />
      <Tabs.Screen name="pending-approval" options={{ href: null }} />
      <Tabs.Screen name="builder/jobs" options={{ href: null }} />
      <Tabs.Screen name="builder/job/[id]" options={{ href: null }} />
      <Tabs.Screen name="builder/applications" options={{ href: null }} />
      <Tabs.Screen name="builder/edit-profile" options={{ href: null }} />
      <Tabs.Screen name="my-jobs" options={{ href: null }} />
    </Tabs>
  );
}
