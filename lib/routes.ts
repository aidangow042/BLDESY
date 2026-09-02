/**
 * Central route table.
 *
 * App routes mirror website paths (CLAUDE.md §5) so push `data.route` deep
 * links map 1:1. While legacy screens are still being replaced, some entries
 * point at the OLD file-based routes — when a new screen lands, flip the entry
 * here and nothing else needs to change. Keep this the only place a route
 * string for another screen is spelled out.
 */
export const ROUTES = {
  home: '/(tabs)',
  search: '/search',
  ai: '/(tabs)/ai',
  map: '/(tabs)/map',
  trades: '/all-trades', // → '/trades' (Phase 3)
  postJob: '/post-job',
  myJobs: '/my-jobs',
  jobs: '/builder-jobs', // → '/jobs' (Phase 5)
  saved: '/(tabs)/saved', // → '/saved' (Phase 5)
  messages: '/messages',
  settings: '/settings',
  welcome: '/welcome',
  login: '/(auth)/login',
  signup: '/(auth)/signup',
  forgotPassword: '/(auth)/forgot-password',
  dashboard: '/(tabs)', // → '/dashboard/profile' (Phase 5)
  portal: '/(tabs)/portal', // → '/portal' (Phase 6)
  portalPending: '/(tabs)/portal', // legacy portal screen renders its own pending state → '/portal/pending' (Phase 6)
  enterprise: '/enterprise-dashboard', // → '/enterprise' (Phase 7)
  enterprisePending: '/pending-approval', // → '/enterprise/pending' (Phase 7)
  forTradies: '/for-tradies',
  help: '/help',
  about: '/about',
  builderProfile: (userId: string) => `/builder-profile?id=${userId}`, // → `/builder/${userId}` (Phase 3)
  companyProfile: (id: string) => `/company/${id}`,
  conversation: (conversationId: string) => `/messages?c=${conversationId}`,
} as const;

/** Website URLs opened in the in-app browser (legal, blog, demo, tradie onboarding hand-offs). */
export const WEB_BASE = process.env.EXPO_PUBLIC_API_BASE_URL ?? 'https://www.bldesy.com.au';
export const WEB_PAGES = {
  terms: `${WEB_BASE}/legal/terms`,
  privacy: `${WEB_BASE}/legal/privacy`,
  cookies: `${WEB_BASE}/legal/cookies`,
  referralTerms: `${WEB_BASE}/legal/referral-terms`,
  drawTerms: `${WEB_BASE}/legal/draw-terms`,
  blog: `${WEB_BASE}/blog`,
  demo: `${WEB_BASE}/demo`,
  forHomeownersCoverage: `${WEB_BASE}/for-homeowners`,
} as const;
