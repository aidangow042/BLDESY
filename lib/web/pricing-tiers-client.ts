// AUTO-SYNCED from ~/bldesy-web/lib/pricing-tiers-client.ts by scripts/sync-web-libs.mjs — DO NOT EDIT HERE.
// Change the website original, then run: npm run sync:web

/**
 * Client-safe tier-based pricing — the new model proposed in
 * docs/pricing-strategy-v1 (May 2026). Replaces the trade-band pricing
 * in lib/pricing-client.ts. Old band code stays in place as a rollback
 * surface and for legacy consumers (billing pages, webhook reverse-lookup)
 * until the migration is sequenced through.
 *
 * Contains NO process.env references — safe to import in client components.
 * The server-only file at lib/pricing-tiers.ts adds the Stripe price ID
 * mapping on top of this shape.
 */

import { FIVE_CHECKS_LIST } from "@/lib/web/verification-copy";

export type TradieTierKey = "handyman" | "trade" | "specialist" | "commercial";
export type EnterpriseTierKey = "single_post" | "builder" | "contractor";

export type BillingInterval = "monthly" | "annual";

export interface TradieTier {
  key: TradieTierKey;
  name: string;
  /** One-line positioning under the name. */
  tagline: string;
  /** Who this tier is built for — used in card subtitle + comparison messaging. */
  bestFor: string;
  monthly: number;
  annual: number;
  badge?: "most_popular" | "best_value";
  /** Short anchor against a competitor for the card. Keep neutral, not vendor-bashing. */
  competitorNote?: string;
  features: string[];
}

export interface EnterpriseTier {
  key: EnterpriseTierKey;
  name: string;
  tagline: string;
  bestFor: string;
  /** Subscription tiers have monthly/annual. Single-post is one-off. */
  monthly?: number;
  annual?: number;
  pricePerPost?: number;
  badge?: "most_popular" | "best_value";
  competitorNote?: string;
  features: string[];
}

// Feature lists describe what the product actually does today — every line
// must exist in-code before it ships here (audit 2026-07-21: the original
// aspirational lists advertised unbuilt features). Tiers are sized by trade
// coverage (pickTierForTrades below); the platform features are the same on
// every tier.
export const TRADIE_TIERS: readonly TradieTier[] = [
  {
    key: "handyman",
    name: "Handyman",
    tagline: "Small jobs onramp",
    bestFor: "Solo handymen, gardeners, cleaners — jobs under $500",
    monthly: 19,
    annual: 190,
    features: [
      "Covers 1 trade from the small-jobs list (handyman, cleaning, gardening + similar)",
      "Unlimited enquiries & applications — never a per-lead fee",
      "ABN verified live against the ABR",
      "Job alerts for your trade & service area",
      "Profile & application analytics",
      "Photo & video portfolio",
      "Direct messaging with homeowners",
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
    competitorNote: "Lead-credit platforms run $200–$600/mo plus $30–$80 per lead",
    features: [
      "Covers 1 licensed trade",
      "Unlimited enquiries & applications — never a per-lead fee",
      "Licence verified with NSW Fair Trading + AI-checked insurance badge",
      "Job alerts for your trade & service area",
      "Profile & application analytics",
      "Photo & video portfolio",
      "Direct messaging with homeowners",
    ],
  },
  {
    key: "specialist",
    name: "Specialist",
    tagline: "For multi-trade businesses",
    bestFor: "Renovators, multi-trade firms — projects $10,000–$100,000",
    monthly: 69,
    annual: 690,
    badge: "best_value",
    competitorNote: "Trade directories charge $66+/mo just to be listed",
    features: [
      "Covers 2–3 licensed trades",
      "Unlimited enquiries & applications — never a per-lead fee",
      "Licence, ABN & insurance verification badges",
      "Job alerts across all your trades",
      "Profile & application analytics",
      "Photo & video portfolio",
      "Direct messaging with homeowners",
    ],
  },
  {
    key: "commercial",
    name: "Commercial",
    tagline: "For building companies",
    bestFor: "Building companies + larger multi-trade operations",
    monthly: 129,
    annual: 1290,
    features: [
      "Unlimited trade categories",
      "Unlimited enquiries & applications — never a per-lead fee",
      "Licence, ABN & insurance verification badges",
      "Job alerts across all your trades",
      "Profile & application analytics",
      "Photo & video portfolio",
      "Direct messaging with homeowners",
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
    competitorNote: "Job-board ads cost $275+ for a single 30-day listing",
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
      `Verified credential filtering (${FIVE_CHECKS_LIST})`,
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
      "Featured employer badge",
      "Priority placement in tradie job feeds",
      "Direct contact access to the full tradie network without posting",
      "Bulk shortlist management and tradie pool building",
      "Phone support during business hours",
      "Quarterly hiring analytics report",
    ],
  },
];

/**
 * Annual billing saves $monthly × 12 - $annual. Every tradie tier is a flat
 * 2-months-free deal (annual = monthly × 10, ~17% saving). Enterprise tiers
 * discount 19%–23%.
 */
export function annualSavings(monthly: number, annual: number): number {
  return monthly * 12 - annual;
}

/** % saving when paying annually vs monthly × 12. */
export function annualSavingsPercent(monthly: number, annual: number): number {
  const full = monthly * 12;
  if (full === 0) return 0;
  return Math.round(((full - annual) / full) * 100);
}

/** Lookup helpers — handy in the page, the eventual checkout flow, and tests. */
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

// ---------------------------------------------------------------------------
// Trade → tier mapping
//
// Single source of truth for "given the trades a tradie picked at signup,
// which tier do they belong on?". Used by the post-signup tier picker on
// /portal/pending so the user sees ONE matched tier instead of all four
// options. Upgrades/downgrades happen later via /portal/billing/upgrade.
//
// Resolution order (highest wins):
//   1. Any builder-umbrella trade (residential, commercial, civil, fit-out,
//      data-centre, infrastructure, plus structural engineering) →
//      Commercial. These are construction-company tier customers regardless
//      of how many trades they ticked.
//   2. 4+ trades → Commercial. The Specialist tier caps at 3 licensed
//      categories so 4+ multi-trade firms need the unlimited Commercial.
//   3. 2-3 trades → Specialist. Multi-trade renovators / firms.
//   4. 1 trade from the restricted unlicensed list (handyman, cleaner,
//      gardening, etc.) → Handyman. Small-job onramp.
//   5. 1 licensed trade → Trade. The default for most solo tradies.
//   6. fallback (no trades) → Trade.
// ---------------------------------------------------------------------------

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

  // Construction companies always land on Commercial — picking any builder-
  // umbrella trade signals "I run a building business", regardless of
  // whether they also ticked carpenter / plumber / etc.
  if (list.some((t) => COMMERCIAL_TIER_TRADES.has(t))) return "commercial";

  // Multi-trade businesses
  if (list.length >= 4) return "commercial";
  if (list.length >= 2) return "specialist";

  // Single-trade tradies — handyman-restricted list → Handyman tier,
  // everything else → Trade.
  const only = list[0];
  if (HANDYMAN_TIER_TRADES.has(only)) return "handyman";
  return "trade";
}
