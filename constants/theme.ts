/**
 * Design tokens — mirrored from the BLDESY website's tokens
 * (`~/bldesy-web/app/globals.css`). Treat the website as the source of truth.
 *
 * Web token name → app key:
 *   --color-primary           → primary
 *   --color-primary-dark      → primaryDark
 *   --color-primary-light     → primaryLight
 *   --color-primary-bg        → primaryBg
 *   --color-canvas            → canvas
 *   --color-surface           → surface
 *   --color-text-primary      → textPrimary
 *   --color-text-secondary    → textSecondary
 *   --color-border            → border
 *   --color-indigo            → indigo
 *   --color-success           → success (+ successBg / successBorder)
 *   --color-warning           → warning
 *   --color-error             → error
 *   --color-footer-bg         → footerBg
 *   --color-trade-{x}         → trade{X} / trade{X}Bg
 *
 * Legacy aliases (`tint`, `teal`, `text`, `background`, `borderLight`, `icon`,
 * `tabIcon*`) are kept so existing screens compile through the Phase 3/4/5
 * sweeps. They will be removed once nothing references them.
 */

import { Platform } from 'react-native';

/* ── Light + dark token objects ─────────────────────────────────────── */

const lightTokens = {
  /* Brand */
  primary: '#0D9B7A',
  primaryDark: '#0A8268',
  primaryLight: '#ccfbf1',
  primaryBg: '#e6f7f2',

  /* Canvas + surface */
  canvas: '#FFF8F0',
  surface: '#ffffff',
  surfaceMuted: '#f8fafc',

  /* Text */
  textPrimary: '#1a1a2e',
  textSecondary: '#64748b',

  /* Border */
  border: '#e8e4df',
  borderLight: '#f1f5f9',

  /* Accent */
  indigo: '#4f46e5',
  indigoDark: '#4338ca',
  indigoLight: '#6366f1',

  /* Status */
  success: '#059669',
  successBg: '#ecfdf5',
  successBorder: '#d1fae5',
  warning: '#d97706',
  warningBg: '#fffbeb',
  warningBorder: '#fef3c7',
  error: '#dc2626',
  errorBg: '#fef2f2',
  errorBorder: '#fecaca',

  /* Structural */
  footerBg: '#0f172a',

  /* Trade categories — mirror of web --color-trade-* */
  tradeBuilder: '#0D9B7A',
  tradeBuilderBg: '#e6f7f2',
  tradeElectrician: '#e67e22',
  tradeElectricianBg: '#fef3e2',
  tradePlumber: '#3b82f6',
  tradePlumberBg: '#e8f1fd',
  tradeCarpenter: '#22a55b',
  tradeCarpenterBg: '#e6f7ec',
  tradePainter: '#e74c6f',
  tradePainterBg: '#fde8ee',
  tradeLandscaper: '#4ade80',
  tradeLandscaperBg: '#ecfdf0',
  tradeRoofer: '#eab308',
  tradeRooferBg: '#fef9e7',
  tradeTiler: '#a855f7',
  tradeTilerBg: '#f3e8fe',

  /* Header gradient — light mode pair */
  gradientHeaderFrom: '#0D9B7A',
  gradientHeaderTo: '#0A8268',
} as const;

const darkTokens = {
  primary: '#2dd4bf',
  primaryDark: '#14b8a6',
  primaryLight: '#042f2e',
  primaryBg: '#0f2a2a',

  canvas: '#0f172a',
  surface: '#1e293b',
  surfaceMuted: '#1e293b',

  textPrimary: '#f1f5f9',
  textSecondary: '#94a3b8',

  border: '#334155',
  borderLight: '#1e293b',

  indigo: '#818cf8',
  indigoDark: '#6366f1',
  indigoLight: '#a5b4fc',

  success: '#34d399',
  successBg: '#042f2e',
  successBorder: '#065f46',
  warning: '#fbbf24',
  warningBg: '#78350f',
  warningBorder: '#92400e',
  error: '#f87171',
  errorBg: '#7f1d1d',
  errorBorder: '#991b1b',

  footerBg: '#020617',

  tradeBuilder: '#2dd4bf',
  tradeBuilderBg: '#0f2a2a',
  tradeElectrician: '#fbbf24',
  tradeElectricianBg: '#2a2009',
  tradePlumber: '#60a5fa',
  tradePlumberBg: '#0c1a2e',
  tradeCarpenter: '#4ade80',
  tradeCarpenterBg: '#0a2a14',
  tradePainter: '#fb7185',
  tradePainterBg: '#2a0a14',
  tradeLandscaper: '#86efac',
  tradeLandscaperBg: '#0a2a14',
  tradeRoofer: '#facc15',
  tradeRooferBg: '#2a2009',
  tradeTiler: '#c084fc',
  tradeTilerBg: '#1a0a2e',

  gradientHeaderFrom: '#2dd4bf',
  gradientHeaderTo: '#14b8a6',
} as const;

/* ── Legacy alias layer ─────────────────────────────────────────────── */
/* Keep old keys pointing at the closest new value. Existing screens keep
   rendering; new components should use the canonical names above. The
   `ThemeTokens` widening below typesall values as `string` rather than
   literal types so consumers can store + compare colours freely. */

export type ThemeTokens = Record<string, string>;

function withLegacyAliases(t: typeof lightTokens | typeof darkTokens): ThemeTokens {
  return {
    ...t,
    /* Legacy aliases — TODO: delete after Phase 4 sweep */
    text: t.textPrimary,
    background: t.surface,
    tint: t.indigo,
    tintLight: t.canvas,
    tintMuted: t.indigoLight,
    icon: t.textSecondary,
    tabIconDefault: t.textSecondary,
    tabIconSelected: t.primary,
    teal: t.primary,
    tealDark: t.primaryDark,
    tealLight: t.primaryLight,
    tealBg: t.primaryBg,
    tealMuted: t.primary,
    successLight: t.successBg,
    warningLight: t.warningBg,
    errorLight: t.errorBg,
  };
}

export const Colors: { light: ThemeTokens; dark: ThemeTokens } = {
  light: withLegacyAliases(lightTokens),
  dark: withLegacyAliases(darkTokens),
};

/* ── Trade-category helper ──────────────────────────────────────────── */
/* Replaces per-screen TRADE_CONFIG hardcoding. Accepts a trade slug, returns
   tint + bg pair from the current theme. Unknown slugs fall back to primary. */

export type TradeSlug =
  | 'builder' | 'electrician' | 'plumber' | 'carpenter'
  | 'painter' | 'landscaper' | 'roofer' | 'tiler';

export function tradeColors(slug: string, scheme: 'light' | 'dark' = 'light') {
  const c = Colors[scheme];
  const key = slug.toLowerCase() as TradeSlug;
  switch (key) {
    case 'electrician':  return { tint: c.tradeElectrician, bg: c.tradeElectricianBg };
    case 'plumber':      return { tint: c.tradePlumber,     bg: c.tradePlumberBg };
    case 'carpenter':    return { tint: c.tradeCarpenter,   bg: c.tradeCarpenterBg };
    case 'painter':      return { tint: c.tradePainter,     bg: c.tradePainterBg };
    case 'landscaper':   return { tint: c.tradeLandscaper,  bg: c.tradeLandscaperBg };
    case 'roofer':       return { tint: c.tradeRoofer,      bg: c.tradeRooferBg };
    case 'tiler':        return { tint: c.tradeTiler,       bg: c.tradeTilerBg };
    case 'builder':      return { tint: c.tradeBuilder,     bg: c.tradeBuilderBg };
    default:             return { tint: c.primary,          bg: c.primaryBg };
  }
}

/* ── Spacing scale (4px base, matches Tailwind defaults) ─────────────── */

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
  '6xl': 64,
} as const;

/* ── Border radius scale (matches Tailwind rounded-* tokens) ─────────── */

export const Radius = {
  sm: 6,    // rounded-md
  md: 10,   // ~rounded-lg
  lg: 12,   // rounded-xl
  xl: 16,   // rounded-2xl  (default card)
  '2xl': 24, // rounded-3xl
  full: 9999,
} as const;

/* ── Shadow presets — match the web shadow-sm → shadow-2xl ladder ────── */

export const Shadows = {
  sm: Platform.select({
    ios: {
      shadowColor: '#0f172a',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 2,
    },
    android: { elevation: 1 },
    default: {},
  }) as Record<string, any>,
  md: Platform.select({
    ios: {
      shadowColor: '#0f172a',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.08,
      shadowRadius: 6,
    },
    android: { elevation: 3 },
    default: {},
  }) as Record<string, any>,
  lg: Platform.select({
    ios: {
      shadowColor: '#0f172a',
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.1,
      shadowRadius: 15,
    },
    android: { elevation: 6 },
    default: {},
  }) as Record<string, any>,
  xl: Platform.select({
    ios: {
      shadowColor: '#0f172a',
      shadowOffset: { width: 0, height: 20 },
      shadowOpacity: 0.12,
      shadowRadius: 25,
    },
    android: { elevation: 10 },
    default: {},
  }) as Record<string, any>,
  '2xl': Platform.select({
    ios: {
      shadowColor: '#0f172a',
      shadowOffset: { width: 0, height: 25 },
      shadowOpacity: 0.25,
      shadowRadius: 50,
    },
    android: { elevation: 16 },
    default: {},
  }) as Record<string, any>,
};

/* ── Typography scale ───────────────────────────────────────────────── */
/* Sizes match Tailwind text-* tokens. fontFamily is filled in via the
   `useFont()` hook in components — keep this object size/weight only so
   fonts can be applied at render time after Geist Sans has loaded. */

export const Type = {
  /* Web Tailwind sizes */
  textXs:   { fontSize: 12, lineHeight: 16 },
  textSm:   { fontSize: 14, lineHeight: 20 },
  textBase: { fontSize: 16, lineHeight: 24 },
  textLg:   { fontSize: 18, lineHeight: 28 },
  textXl:   { fontSize: 20, lineHeight: 28 },
  text2xl:  { fontSize: 24, lineHeight: 32 },
  text3xl:  { fontSize: 30, lineHeight: 36 },
  text4xl:  { fontSize: 36, lineHeight: 40 },
  text5xl:  { fontSize: 48, lineHeight: 1 * 48 },
  text6xl:  { fontSize: 60, lineHeight: 1 * 60 },

  /* Legacy semantic names — kept for existing screens, point at nearest size */
  display:         { fontSize: 32, fontWeight: '800' as const, lineHeight: 38, letterSpacing: -0.8 },
  displayHero:     { fontSize: 48, fontWeight: '700' as const, lineHeight: 52, letterSpacing: -1.0 },
  h1:              { fontSize: 24, fontWeight: '700' as const, lineHeight: 30, letterSpacing: -0.5 },
  h2:              { fontSize: 20, fontWeight: '700' as const, lineHeight: 26, letterSpacing: -0.3 },
  h3:              { fontSize: 17, fontWeight: '600' as const, lineHeight: 22, letterSpacing: -0.2 },
  body:            { fontSize: 15, fontWeight: '400' as const, lineHeight: 22 },
  bodySemiBold:    { fontSize: 15, fontWeight: '600' as const, lineHeight: 22 },
  caption:         { fontSize: 13, fontWeight: '400' as const, lineHeight: 18 },
  captionSemiBold: { fontSize: 13, fontWeight: '600' as const, lineHeight: 18 },
  label:           { fontSize: 11, fontWeight: '700' as const, lineHeight: 14, letterSpacing: 0.8 },
  micro:           { fontSize: 10, fontWeight: '700' as const, lineHeight: 13, letterSpacing: 0.5 },
  btnPrimary:      { fontSize: 17, fontWeight: '700' as const, lineHeight: 22 },
  btnSecondary:    { fontSize: 15, fontWeight: '600' as const, lineHeight: 20 },
} as const;

/* ── Font family registry ───────────────────────────────────────────── */
/* Resolved at runtime once fonts have loaded. Body = Geist Sans (matches the
   website). Display = Russo One (wordmark). Phase 1.2 wires the loader. */

export const FontFamily = {
  body: 'Geist_400Regular',
  bodyMedium: 'Geist_500Medium',
  bodySemiBold: 'Geist_600SemiBold',
  bodyBold: 'Geist_700Bold',
  display: 'RussoOne_400Regular',
} as const;

/* ── Platform fallbacks ─────────────────────────────────────────────── */

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
