/**
 * Builder Dashboard — dark teal premium theme.
 * Separate from the customer-facing theme in theme.ts.
 */

import { Platform } from 'react-native';

export const DashboardColors = {
  // Backgrounds
  base: '#0A3D2F',
  surface: '#0F4F3E',
  surfaceLight: '#145C4A',

  // Accent
  accent: '#1D9E75',
  accentLight: '#2BB88A',
  accentDim: 'rgba(29,158,117,0.15)',

  // Text
  textPrimary: '#FFFFFF',
  textSecondary: 'rgba(255,255,255,0.65)',
  textMuted: 'rgba(255,255,255,0.4)',

  // Borders & dividers
  border: 'rgba(255,255,255,0.08)',
  borderLight: 'rgba(255,255,255,0.12)',

  // Semantic
  positive: '#34D399',
  negative: '#F87171',
  warning: '#FBBF24',

  // Badges & indicators
  badgeRed: '#EF4444',
  onlineDot: '#22C55E',
} as const;

export const DashboardFonts = {
  regular: 'DMSans_400Regular',
  medium: 'DMSans_500Medium',
  semiBold: 'DMSans_600SemiBold',
  bold: 'DMSans_700Bold',
} as const;

export const DashboardShadows = {
  card: Platform.select({
    ios: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.3,
      shadowRadius: 6,
    },
    android: { elevation: 4 },
    default: {},
  }) as Record<string, any>,
  subtle: Platform.select({
    ios: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.2,
      shadowRadius: 3,
    },
    android: { elevation: 2 },
    default: {},
  }) as Record<string, any>,
};
