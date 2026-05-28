/**
 * Builder Dashboard tokens. Re-aligned to mirror the website's portal — same
 * `canvas` / `surface` / `primary` / `text-*` tokens used by every other
 * screen. The dashboard used to ship its own dark-teal palette; that's gone.
 *
 * Existing dashboard components still import `DashboardColors`/`DashboardFonts`/
 * `DashboardShadows`, so the shape is preserved — only the values change. No
 * component rewrites needed.
 *
 * If a dashboard component needs a fresh primitive (Card, Button, Badge),
 * grab it from `@/components/ui` like every other screen.
 */

import { Platform } from 'react-native';

import { Colors, FontFamily } from './theme';

/* The dashboard reads light-mode values directly. Dark mode is rare in this
   surface (the portal is on-the-clock work), but if you need dark support
   switch to `Colors[useColorScheme() ?? 'light']` inline at the call site. */
const c = Colors.light;

export const DashboardColors = {
  // Backgrounds — page canvas + cards
  base: c.canvas,
  surface: c.surface,
  surfaceLight: c.canvas,

  // Accent — primary brand teal
  accent: c.primary,
  accentLight: c.primary,
  accentDim: c.primaryBg,

  // Text
  textPrimary: c.textPrimary,
  textSecondary: c.textSecondary,
  textMuted: c.textSecondary + '99', // ~60% alpha

  // Borders & dividers
  border: c.border,
  borderLight: c.borderLight,

  // Semantic
  positive: c.success,
  negative: c.error,
  warning: c.warning,

  // Badges & indicators
  badgeRed: c.error,
  onlineDot: c.success,
} as const;

export const DashboardFonts = {
  regular:  FontFamily.body,
  medium:   FontFamily.bodyMedium,
  semiBold: FontFamily.bodySemiBold,
  bold:     FontFamily.bodyBold,
} as const;

export const DashboardShadows = {
  card: Platform.select({
    ios: {
      shadowColor: '#0f172a',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.08,
      shadowRadius: 6,
    },
    android: { elevation: 3 },
    default: {},
  }) as Record<string, any>,
  subtle: Platform.select({
    ios: {
      shadowColor: '#0f172a',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 2,
    },
    android: { elevation: 1 },
    default: {},
  }) as Record<string, any>,
};
