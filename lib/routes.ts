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
  trades: '/trades',
  postJob: '/post-job',
  myJobs: '/my-jobs',
  jobs: '/jobs',
  job: (jobId: string) => `/jobs/${jobId}`,
  saved: '/saved',
  messages: '/messages',
  settings: '/settings',
  welcome: '/welcome',
  login: '/(auth)/login',
  signup: '/(auth)/signup',
  forgotPassword: '/(auth)/forgot-password',
  dashboard: '/dashboard/profile',
  dashboardJobs: '/dashboard/jobs',
  dashboardSaved: '/dashboard/saved',
  dashboardMessages: '/dashboard/messages',
  portal: '/portal',
  portalPending: '/portal/pending',
  portalEditProfile: '/portal/edit-profile',
  /** Edit-profile wizard deep link — the website's `/portal/edit-profile?step=N` (completeness + status-card checklists). */
  portalEditProfileStep: (step: number) => `/portal/edit-profile?step=${step}`,
  portalAvailability: '/portal/availability',
  portalProfileVisibility: '/portal/profile-visibility',
  portalAnalytics: '/portal/analytics',
  portalRefer: '/portal/refer',
  portalBilling: '/portal/billing',
  portalBillingUpgrade: '/portal/billing/upgrade',
  portalSettings: '/portal/settings',
  portalJobsResidential: '/portal/jobs/residential',
  portalJobsCommercial: '/portal/jobs/commercial',
  portalJobsContracts: '/portal/jobs/contracts',
  portalJob: (jobId: string) => `/portal/jobs/${jobId}`,
  portalApplications: '/portal/applications',
  portalMessages: '/portal/messages',
  enterprise: '/enterprise',
  enterprisePending: '/enterprise/pending',
  enterpriseJobs: '/enterprise/jobs',
  enterpriseJob: (jobId: string) => `/enterprise/jobs/${jobId}`,
  forTradies: '/for-tradies',
  forHomeowners: '/for-homeowners',
  pricing: '/pricing',
  waitlist: '/waitlist',
  help: '/help',
  about: '/about',
  builderProfile: (userId: string) => `/builder/${userId}`,
  /** Trade landing (`/trades/plumbers`) — accepts the singular or plural slug. */
  tradeLanding: (slug: string) => `/trades/${slug}`,
  /** Trade × suburb landing (`/trades/plumbers/newtown`). */
  tradeSuburb: (slug: string, suburb: string) => `/trades/${slug}/${suburb}`,
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
