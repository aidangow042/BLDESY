/**
 * The waitlist surface's FORCED-LIGHT palette — the literal hexes the website's
 * /waitlist page, WaitlistForm, WaitlistFlow and WaitlistReferralCard use
 * (`text-[#14231D]`, `bg-[#1D8A63]`, …). The web form is not theme-aware, so
 * the app renders it the same way and hosts it on a white card wherever the
 * surrounding screen is themed (see components/coverage/homeowner-waitlist.tsx).
 *
 * The one token that IS a design token: the submit button is `bg-cta`
 * (homeowner conversion amber) — taken from the theme so it can never drift
 * from the website's `--color-cta`.
 */
import { Colors } from '@/constants/theme';

export const WL = {
  /* Ink */
  ink: '#14231D',
  muted: '#5C6B63',
  muted2: '#6B7A72',
  chipText: '#3E4A44',
  placeholder: '#8A8378',

  /* Surfaces + lines */
  white: '#FFFFFF',
  cream: '#FBF1E9',
  pill: '#F2E9DF',
  border: '#DCCFC2',
  cardBorder: '#E8DCD0',
  dashOff: '#EAE0D5',

  /* Brand green (the /search treatment) */
  green: '#1D8A63',
  greenDark: '#17724F',
  mint: '#E7F3EC',
  mintBorder: '#C9E4D5',
  deepGreen: '#0F5138',

  /* Hero band */
  heroBand: '#17563F',
  heroChip: '#124732',
  heroChipText: '#C9EDDC',
  heroSub: '#9FD9BE',

  /* Draw pill + account-blocked notice */
  amber: '#EF9F27',
  amberText: '#412402',
  amberBg: '#FFF6E8',
  amberBorder: 'rgba(239, 159, 39, 0.4)',
  amberMuted: '#6B5A3E',

  /* Errors (the web's text-error) */
  error: '#dc2626',

  /* Conversion CTA — the theme token, never a local hex */
  cta: Colors.light.cta,
  ctaDark: Colors.light.ctaDark,
} as const;
