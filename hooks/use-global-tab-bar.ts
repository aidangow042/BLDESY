/**
 * Global bottom tab bar — where it is and whether the current route shows it.
 *
 * The website hides its mobile tab bar on `/portal`, `/enterprise` and
 * `/dashboard` because those shells render their own chrome
 * (`~/bldesy-web/components/layout/header.tsx`, bottom of the file). The app
 * applies the same rule by route SEGMENT so it keeps working the moment those
 * route groups land (`app/portal/**`, `app/enterprise/**`, `app/dashboard/**`).
 *
 * Overlays that sit above the bar (AI Assist launcher, cookie banner, footer
 * padding) read `useGlobalTabBar()` instead of hardcoding 64 + safe area.
 */
import { useSegments } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/** Web `h-16` — the bar's height before the bottom safe-area inset. */
export const TAB_BAR_HEIGHT = 64;

const OWN_SHELL_SEGMENTS: ReadonlySet<string> = new Set([
  'portal',
  '(portal)',
  'enterprise',
  '(enterprise)',
  'dashboard',
  '(dashboard)',
]);

function inOwnShell(segments: readonly string[]): boolean {
  return segments.some((segment) => OWN_SHELL_SEGMENTS.has(segment));
}

/** True on portal / enterprise / dashboard routes — those shells render their own bar. */
export function useHideGlobalTabBar(): boolean {
  const segments = useSegments() as string[];
  return inOwnShell(segments);
}

export interface GlobalTabBarInfo {
  /** The current route lives inside the `(tabs)` group — the only place the bar renders. */
  inTabs: boolean;
  /** The route hides the bar even inside `(tabs)` (own-shell segments). */
  hidden: boolean;
  /** The bar is actually on screen. */
  visible: boolean;
  /** Bar height including the safe-area inset when visible, else 0. */
  height: number;
  /**
   * Distance from the WINDOW's bottom edge to the top of whatever occupies it —
   * the bar when visible, otherwise just the safe area. For root-level overlays
   * (cookie banner) that are laid out over the whole window.
   */
  windowBottomInset: number;
  /**
   * Extra inset a SCREEN-level overlay needs above the screen's bottom edge. Inside
   * `(tabs)` the bar already pads the safe area and the screen ends where the bar
   * starts, so this is 0; on stack screens it is the safe-area inset.
   */
  contentBottomInset: number;
}

export function useGlobalTabBar(): GlobalTabBarInfo {
  const segments = useSegments() as string[];
  const insets = useSafeAreaInsets();
  const inTabs = segments[0] === '(tabs)';
  const hidden = inOwnShell(segments);
  const visible = inTabs && !hidden;
  return {
    inTabs,
    hidden,
    visible,
    height: visible ? TAB_BAR_HEIGHT + insets.bottom : 0,
    windowBottomInset: visible ? TAB_BAR_HEIGHT + insets.bottom : insets.bottom,
    contentBottomInset: visible ? 0 : insets.bottom,
  };
}
