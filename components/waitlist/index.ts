/**
 * Homeowner waitlist surface — the website's components/waitlist/* ported.
 * `WaitlistForm` is the shared capture; the search empty state imports
 * `WaitlistSearchFallback`, the coverage page hosts the form on a white card.
 */
export { LaunchBadge } from './launch-badge';
export { LiveBadge } from './live-badge';
export { WaitlistSearchFallback, type WaitlistSearchFallbackProps } from './search-fallback';
export { WaitlistFlow, type WaitlistFlowProps } from './waitlist-flow';
export { WaitlistForm, type WaitlistFormProps, type WaitlistJoinedResult } from './waitlist-form';
export { WaitlistReferralCard } from './waitlist-referral-card';
export { WhatYouGet } from './what-you-get';
