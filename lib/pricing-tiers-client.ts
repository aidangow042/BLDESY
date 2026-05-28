/**
 * Client-safe tier-based pricing — mirror of ~/bldesy-web/lib/pricing-tiers-client.ts.
 * Keep in sync with the website file. No process.env references.
 */

export type TradieTierKey = "handyman" | "trade" | "specialist" | "commercial";
export type EnterpriseTierKey = "single_post" | "builder" | "contractor";

export type BillingInterval = "monthly" | "annual";

export interface TradieTier {
  key: TradieTierKey;
  name: string;
  tagline: string;
  bestFor: string;
  monthly: number;
  annual: number;
  badge?: "most_popular" | "best_value";
  competitorNote?: string;
  features: string[];
}

export interface EnterpriseTier {
  key: EnterpriseTierKey;
  name: string;
  tagline: string;
  bestFor: string;
  monthly?: number;
  annual?: number;
  pricePerPost?: number;
  badge?: "most_popular" | "best_value";
  competitorNote?: string;
  features: string[];
}

export const TRADIE_TIERS: readonly TradieTier[] = [
  {
    key: "handyman",
    name: "Handyman",
    tagline: "Small jobs onramp",
    bestFor: "Solo handymen, gardeners, cleaners — jobs under $500",
    monthly: 19,
    annual: 190,
    features: [
      "1 trade from a restricted list (handyman, cleaner, gardener, lawn, basic repairs)",
      "Small jobs only — capped at $500",
      "20km service radius",
      "Basic profile with 3 portfolio photos",
      "Customer reviews",
      "Verified ABN badge",
    ],
  },
  {
    key: "trade",
    name: "Trade",
    tagline: "The default choice",
    bestFor: "Licensed solo tradies — residential work $500–$10,000",
    monthly: 39,
    annual: 390,
    badge: "most_popular",
    competitorNote: "Hipages charges $200–$600/mo plus $30–$80 per lead",
    features: [
      "1 licensed trade category",
      "Unlimited applications, any job size",
      "50km service radius",
      "Portfolio with up to 10 projects + team page",
      "Verified credential badges (licence, insurance, memberships)",
      "AI job matching with personalised recommendations",
      "Standard search placement",
    ],
  },
  {
    key: "specialist",
    name: "Specialist",
    tagline: "For multi-trade businesses",
    bestFor: "Renovators, multi-trade firms — projects $10,000–$100,000",
    monthly: 69,
    annual: 600,
    badge: "best_value",
    competitorNote: "Matches ServiceSeeking's $66/mo with materially more features",
    features: [
      "Up to 3 licensed trade categories",
      "Unlimited applications",
      "100km service radius",
      "Unlimited portfolio with before/after comparisons",
      "Featured in search results twice per week",
      "Visibility on the enterprise side (construction companies see you)",
      "Analytics dashboard — profile views, search appearances, application stats",
      "Priority email support",
    ],
  },
  {
    key: "commercial",
    name: "Commercial",
    tagline: "Premium placement",
    bestFor: "Building companies + larger residential builders — $100,000+ projects",
    monthly: 129,
    annual: 1290,
    features: [
      "Unlimited trade categories",
      "Nationwide service area",
      "Priority placement (top 3 in category)",
      "Elite verified badge — visible to consumers and enterprise buyers",
      "Direct invitations to enterprise jobs from construction companies",
      "Up to 3 team seats",
      "Full analytics dashboard",
      "Quarterly market reports for your trades and regions",
      "Dedicated email support with <24h response",
    ],
  },
];

export const ENTERPRISE_TIERS: readonly EnterpriseTier[] = [
  {
    key: "single_post",
    name: "Single Post",
    tagline: "One-off hires",
    bestFor: "One-off hires, occasional needs, or first-time trials",
    pricePerPost: 99,
    competitorNote: "SEEK Classic ads cost $275 for the same exposure",
    features: [
      "1 active job post, live for 30 days",
      "Unlimited applications from verified tradies",
      "Full applicant profiles incl. credentials and reviews",
      "Direct messaging with applicants",
      "No commitment, no recurring charge",
    ],
  },
  {
    key: "builder",
    name: "Builder",
    tagline: "Regular subbie needs",
    bestFor: "Small to mid-size firms with a few hires per quarter",
    monthly: 129,
    annual: 1200,
    badge: "most_popular",
    competitorNote: "Labour-hire agencies charge ~$5,000 per placement",
    features: [
      "5 active job posts at any time",
      "Unlimited applications across all posts",
      "2 team seats — for the owner and one project manager",
      "Verified credential filtering (licence, insurance, white card)",
      "Saved tradie shortlists for repeat hires",
      "Bulk messaging to shortlisted candidates",
      "Cancel anytime — no lock-in contract",
    ],
  },
  {
    key: "contractor",
    name: "Contractor",
    tagline: "Multi-site, high volume",
    bestFor: "Active firms hiring 5+ subbies per month across multiple sites",
    monthly: 299,
    annual: 2900,
    badge: "best_value",
    competitorNote: "Recruitment agencies charge 14–25% of annual salary per hire",
    features: [
      "Unlimited active job posts",
      "Unlimited applications",
      "5 team seats",
      "Featured employer badge — proven to increase application rates 30–50%",
      "Priority placement in tradie job feeds",
      "Direct contact access to the full tradie network without posting",
      "Bulk shortlist management and tradie pool building",
      "Phone support during business hours",
      "Quarterly hiring analytics report",
    ],
  },
];

export function annualSavings(monthly: number, annual: number): number {
  return monthly * 12 - annual;
}

export function annualSavingsPercent(monthly: number, annual: number): number {
  const full = monthly * 12;
  if (full === 0) return 0;
  return Math.round(((full - annual) / full) * 100);
}

export function tradieTier(key: TradieTierKey): TradieTier {
  const t = TRADIE_TIERS.find((tier) => tier.key === key);
  if (!t) throw new Error(`Unknown tradie tier: ${key}`);
  return t;
}

export function enterpriseTier(key: EnterpriseTierKey): EnterpriseTier {
  const t = ENTERPRISE_TIERS.find((tier) => tier.key === key);
  if (!t) throw new Error(`Unknown enterprise tier: ${key}`);
  return t;
}

const COMMERCIAL_TIER_TRADES: ReadonlySet<string> = new Set([
  "builder",
  "commercial-builder",
  "civil-construction",
  "earthworks-excavation",
  "infrastructure-roads",
  "industrial-fit-out",
  "data-centre-construction",
  "structural-engineer",
]);

const HANDYMAN_TIER_TRADES: ReadonlySet<string> = new Set([
  "handyman",
  "cleaner",
  "rubbish-removal",
  "tree-services",
  "irrigation",
  "paving",
  "wallpapering",
  "curtains-blinds",
  "insulation",
  "welding",
  "pest-control",
]);

export function pickTierForTrades(trades: readonly string[]): TradieTierKey {
  const list = trades.filter(Boolean);
  if (list.length === 0) return "trade";
  if (list.some((t) => COMMERCIAL_TIER_TRADES.has(t))) return "commercial";
  if (list.length >= 4) return "commercial";
  if (list.length >= 2) return "specialist";
  const only = list[0];
  if (HANDYMAN_TIER_TRADES.has(only)) return "handyman";
  return "trade";
}
