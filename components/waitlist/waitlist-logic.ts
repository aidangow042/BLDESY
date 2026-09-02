/**
 * Pure logic behind WaitlistForm — the validation rules, error strings, trade
 * ordering and copy switches of ~/bldesy-web/components/waitlist/waitlist-form.tsx,
 * lifted out of the component so they can be unit-tested in node
 * (__tests__/marketing/waitlist-logic.test.ts) and so the RN component stays
 * presentational. Every string here is the website's, verbatim.
 */
import type { WaitlistSource } from '@/lib/data/public-forms';
import { LAUNCH_TRADES } from '@/lib/web/launch-trades';
import { isValidAuMobile } from '@/lib/web/phone';
import { TRADE_CATEGORIES, type Trade } from '@/lib/web/trades';

export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** The step-1 smart field shows a phone icon while what's typed looks numeric. */
const PHONE_LIKE_REGEX = /^[+()0-9][\d\s()-]*$/;

export const WAITLIST_ERRORS = {
  missingContact: "Add an email or mobile — it's how we tell you when tradies go live.",
  badEmail: "That email doesn't look right.",
  neither: "That doesn't look like an email or an Australian mobile (e.g. 0400 000 000).",
  missingSuburb: 'Add your suburb so we know where to line up tradies.',
  badStep2Mobile: "That mobile number doesn't look right — Australian mobile, e.g. 0400 000 000.",
} as const;

export type ContactChannel = 'email' | 'phone';

export type ParsedContact =
  | { ok: true; channel: ContactChannel; email: string; phone: string }
  | { ok: false; error: string };

/**
 * One smart field: email or Australian mobile — whichever they typed. Mirrors
 * the branch order in the web's handleJoin exactly (empty → "@" present →
 * mobile → neither).
 */
export function parseContact(raw: string): ParsedContact {
  const contact = raw.trim();
  if (!contact) return { ok: false, error: WAITLIST_ERRORS.missingContact };
  if (contact.includes('@')) {
    if (!EMAIL_REGEX.test(contact)) return { ok: false, error: WAITLIST_ERRORS.badEmail };
    return { ok: true, channel: 'email', email: contact, phone: '' };
  }
  if (isValidAuMobile(contact)) return { ok: true, channel: 'phone', email: '', phone: contact };
  return { ok: false, error: WAITLIST_ERRORS.neither };
}

/** Which icon the smart field shows for what's typed so far. */
export function contactIcon(raw: string): 'phone' | 'mail' {
  return PHONE_LIKE_REGEX.test(raw.trim()) ? 'phone' : 'mail';
}

/** "email you" vs "text you" — whichever channel they gave. */
export function contactVerb(email: string): 'email' | 'text' {
  return email.trim() ? 'email' : 'text';
}

/**
 * Step 2 asks for whichever contact channel step 1 didn't capture; validate
 * only the one that applies. Null = fine.
 */
export function validateStep2(channel: ContactChannel | null, phone: string, email: string): string | null {
  const phoneTrimmed = channel === 'email' ? phone.trim() : '';
  const emailTrimmed = channel === 'phone' ? email.trim() : '';
  if (phoneTrimmed && !isValidAuMobile(phoneTrimmed)) return WAITLIST_ERRORS.badStep2Mobile;
  if (emailTrimmed && !EMAIL_REGEX.test(emailTrimmed)) return WAITLIST_ERRORS.badEmail;
  return null;
}

/**
 * The two sources that render on the /waitlist page itself, which already has a
 * hero above the card. Everything else is embedded in another surface and needs
 * its own heading.
 */
export const ON_WAITLIST_PAGE: ReadonlySet<WaitlistSource> = new Set<WaitlistSource>([
  'waitlist_page',
  'gated_redirect',
]);

/* Homeowner-facing trade order for the "What do you need done?" dropdown.
   Display-only — canonical trades data is untouched. The launch six lead, then
   the rest of the homeowner-relevant catalogue A–Z. Commercial/industrial trades
   belong to the business flows, not a homeowner dropdown.

   ORDERING HEAD ONLY: the list must keep offering EVERY homeowner trade,
   including the ones not stocked — a tiler request is exactly the signal that
   decides which trade gets recruited next. */
const PRIORITY_TRADE_SLUGS: readonly string[] = LAUNCH_TRADES;
export const NON_HOMEOWNER_TRADE_SLUGS: ReadonlySet<string> = new Set([
  'commercial-builder',
  'civil-construction',
  'earthworks-excavation',
  'infrastructure-roads',
  'industrial-fit-out',
  'data-centre-construction',
]);
const ALL_TRADES = TRADE_CATEGORIES.flatMap((c) => c.trades);
export const HOMEOWNER_TRADES: readonly Trade[] = [
  ...PRIORITY_TRADE_SLUGS.flatMap((slug) => ALL_TRADES.find((t) => t.slug === slug) ?? []),
  ...ALL_TRADES.filter(
    (t) => !PRIORITY_TRADE_SLUGS.includes(t.slug) && !NON_HOMEOWNER_TRADE_SLUGS.has(t.slug),
  ).sort((a, b) => a.name.localeCompare(b.name)),
];

export const URGENCY_OPTIONS = [
  ['asap', 'ASAP'],
  ['this_week', 'This week'],
  ['few_months', 'Next few months'],
  ['planning', 'Just planning'],
] as const;
export type UrgencyValue = (typeof URGENCY_OPTIONS)[number][0];

/** Heading + subtitle the form shows when it is NOT on the /waitlist page. */
export const DEFAULT_FORM_TITLE = 'Be first in line';
