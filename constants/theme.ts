/**
 * Premium color palette — slate grays, soft whites, indigo accent.
 * WCAG AA compliant text contrast.
 */

import { Platform } from 'react-native';

export const Colors = {
  light: {
    text: '#0f172a',          // slate-900
    textSecondary: '#64748b', // slate-500
    background: '#ffffff',
    surface: '#f8fafc',       // slate-50 — card / section backgrounds
    border: '#e2e8f0',        // slate-200
    borderLight: '#f1f5f9',   // slate-100
    tint: '#4f46e5',          // indigo-600
    tintLight: '#eef2ff',     // indigo-50
    tintMuted: '#818cf8',     // indigo-400
    icon: '#94a3b8',          // slate-400
    tabIconDefault: '#94a3b8',
    tabIconSelected: '#4f46e5',

    // Brand teal (builder profiles, CTAs)
    teal: '#0d9488',          // teal-600
    tealDark: '#0f766e',      // teal-700
    tealLight: '#ccfbf1',     // teal-100
    tealBg: '#f0fdfa',        // teal-50
    tealMuted: '#5eead4',     // teal-300

    // Semantic
    success: '#059669',       // emerald-600
    successLight: '#ecfdf5',  // emerald-50
    warning: '#d97706',       // amber-600
    warningLight: '#fffbeb',  // amber-50
    error: '#dc2626',         // red-600
    errorLight: '#fef2f2',    // red-50
  },
  dark: {
    text: '#f1f5f9',          // slate-100
    textSecondary: '#94a3b8', // slate-400
    background: '#0f172a',    // slate-900
    surface: '#1e293b',       // slate-800
    border: '#334155',        // slate-700
    borderLight: '#1e293b',   // slate-800
    tint: '#818cf8',          // indigo-400
    tintLight: '#1e1b4b',     // indigo-950
    tintMuted: '#6366f1',     // indigo-500
    icon: '#64748b',          // slate-500
    tabIconDefault: '#64748b',
    tabIconSelected: '#818cf8',

    // Brand teal (builder profiles, CTAs)
    teal: '#2dd4bf',          // teal-400
    tealDark: '#14b8a6',      // teal-500
    tealLight: '#042f2e',     // teal-950
    tealBg: '#0f2a2a',        // custom dark teal bg
    tealMuted: '#5eead4',     // teal-300

    // Semantic
    success: '#34d399',       // emerald-400
    successLight: '#064e3b',  // emerald-900
    warning: '#fbbf24',       // amber-400
    warningLight: '#78350f',  // amber-900
    error: '#f87171',         // red-400
    errorLight: '#7f1d1d',    // red-900
  },
};

/** Spacing scale (4px base) */
export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  '3xl': 32,
  '4xl': 40,
  '5xl': 48,
} as const;

/** Border radius scale */
export const Radius = {
  sm: 6,
  md: 10,
  lg: 14,
  xl: 20,
  full: 9999,
} as const;

/** Shadow presets (iOS + Android) */
export const Shadows = {
  sm: Platform.select({
    ios: {
      shadowColor: '#0f172a',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.04,
      shadowRadius: 2,
    },
    android: { elevation: 1 },
    default: {},
  }) as Record<string, any>,
  md: Platform.select({
    ios: {
      shadowColor: '#0f172a',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.06,
      shadowRadius: 6,
    },
    android: { elevation: 3 },
    default: {},
  }) as Record<string, any>,
  lg: Platform.select({
    ios: {
      shadowColor: '#0f172a',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.08,
      shadowRadius: 12,
    },
    android: { elevation: 6 },
    default: {},
  }) as Record<string, any>,
};

export const Fonts = Platform.select({
  ios: {
    sans: 'system-ui',
    serif: 'ui-serif',
    rounded: 'ui-rounded',
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});
