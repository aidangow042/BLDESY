/**
 * HeroIcon — renders the website's inline Heroicons SVG paths verbatim so the
 * marketing pages carry the exact same glyphs as the web. Outline icons are a
 * 24×24 stroked path set; solid icons (the 20×20 `fill="currentColor"` ones)
 * pass `solid`.
 */
import Svg, { Path } from 'react-native-svg';
import type { StyleProp, ViewStyle } from 'react-native';

interface HeroIconProps {
  /** One or more `d` attributes, drawn in order. */
  d: string | readonly string[];
  size?: number;
  color: string;
  strokeWidth?: number;
  /** Solid (filled) icon — the 20×20 heroicons set. */
  solid?: boolean;
  viewBox?: string;
  style?: StyleProp<ViewStyle>;
}

export function HeroIcon({
  d,
  size = 20,
  color,
  strokeWidth = 1.5,
  solid = false,
  viewBox,
  style,
}: HeroIconProps) {
  const paths = typeof d === 'string' ? [d] : d;
  return (
    <Svg
      width={size}
      height={size}
      viewBox={viewBox ?? (solid ? '0 0 20 20' : '0 0 24 24')}
      style={style}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      {paths.map((path) => (
        <Path
          key={path}
          d={path}
          fill={solid ? color : 'none'}
          stroke={solid ? 'none' : color}
          strokeWidth={solid ? 0 : strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
          fillRule={solid ? 'evenodd' : undefined}
          clipRule={solid ? 'evenodd' : undefined}
        />
      ))}
    </Svg>
  );
}

/** The heroicons check-mark used on every "tick" list across the marketing pages. */
export const CHECK_PATH = 'M4.5 12.75l6 6 9-13.5';
/** Chevron-down for accordions. */
export const CHEVRON_DOWN_PATH = 'M19.5 8.25l-7.5 7.5-7.5-7.5';
/** Arrow-right (24px outline). */
export const ARROW_RIGHT_PATH = 'M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3';
/** Solid 20px star (founding programme pill, "2 months free" chip). */
export const STAR_SOLID_PATH =
  'M10 1.5l2.6 5.27 5.82.85-4.21 4.1.99 5.78L10 14.77l-5.2 2.73.99-5.78L1.58 7.62l5.82-.85L10 1.5z';
/** Solid 20px shield-check (pricing trust chips). */
export const SHIELD_SOLID_PATH =
  'M10 1.944l7 3.111v4.41c0 4.078-2.795 7.717-7 8.59-4.205-.873-7-4.512-7-8.59v-4.41l7-3.111zm3.36 6.197a.75.75 0 10-1.22-.872l-3.236 4.53-1.59-1.59a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.14-.094l3.716-5.284z';
/** Solid 20px bolt. */
export const BOLT_SOLID_PATH =
  'M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z';
/** Solid 20px tick used in the pricing feature lists. */
export const TICK_SOLID_PATH =
  'M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z';
/** Gift box (24px outline) — the draw pill. */
export const GIFT_PATH =
  'M21 11.25v8.25a1.5 1.5 0 01-1.5 1.5H4.5a1.5 1.5 0 01-1.5-1.5v-8.25M12 4.875A2.625 2.625 0 109.375 7.5H12m0-2.625V7.5m0-2.625A2.625 2.625 0 1114.625 7.5H12m0 0V21m-8.625-9.75h18c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125h-18c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z';
/** Shield-check (24px outline). */
export const SHIELD_CHECK_PATH =
  'M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z';
/** Sparkles (24px outline). */
export const SPARKLES_PATH =
  'M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456z';
/** Map pin (24px outline, two subpaths). */
export const MAP_PIN_PATHS = [
  'M15 10.5a3 3 0 11-6 0 3 3 0 016 0z',
  'M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z',
] as const;
/** Envelope (24px outline). */
export const MAIL_PATH =
  'M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75';
/** Phone handset (24px outline). */
export const PHONE_PATH =
  'M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z';
/** Magnifying glass (24px outline, two subpaths) — the coverage search. */
export const SEARCH_PATHS = ['M18 18a7 7 0 10-14 0 7 7 0 0014 0z', 'm20 20-3.5-3.5'] as const;
