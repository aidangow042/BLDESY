/**
 * Theme colours for the website's availability config
 * (~/bldesy-web/lib/availability.ts maps statuses to Tailwind classes —
 * bg-success / bg-warning / bg-error). The mirrored `getAvailability` gives
 * the label; this resolves the classes to theme tokens.
 */
import type { ThemeTokens } from '@/constants/theme';
import { getAvailability } from '@/lib/web/availability';

export interface AvailabilityTone {
  label: string;
  /** Dot / accent colour. */
  dot: string;
  /** Tinted pill background. */
  bg: string;
  /** Pill text colour. */
  text: string;
  /** Web `response` fallback ("Same day" / "This week" / "Unavailable"). */
  response: string;
}

export function availabilityTone(status: string, c: ThemeTokens): AvailabilityTone {
  const info = getAvailability(status);
  switch (info.dot) {
    case 'bg-warning':
      return { label: info.label, dot: c.warning, bg: c.warningBg, text: c.warning, response: info.response };
    case 'bg-error':
      return { label: info.label, dot: c.error, bg: c.errorBg, text: c.error, response: info.response };
    default:
      return { label: info.label, dot: c.success, bg: c.successBg, text: c.success, response: info.response };
  }
}
