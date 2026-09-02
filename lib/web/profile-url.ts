// AUTO-SYNCED from ~/bldesy-web/lib/profile-url.ts by scripts/sync-web-libs.mjs — DO NOT EDIT HERE.
// Change the website original, then run: npm run sync:web

import { getTradeBySlug, pluralSlugFor, SINGULAR_SLUGS } from "@/lib/web/trades";
import { slugify } from "@/lib/web/slug";

/**
 * Public URL builders for the SEO route tree.
 *
 * Profile URLs are /{trade}/{suburb}/{slug} (trade `builder` lands on the
 * static /builder segment — same shape, served by app/builder/[id]/[slug]).
 * When any ingredient is missing or invalid the LEGACY /builder/<uuid> path
 * is returned instead: that route is a permanent 301 handler, so the
 * fallback always resolves and can never build a broken or looping URL.
 */
export function builderProfilePath(b: {
  user_id: string;
  slug?: string | null;
  trade_category?: string | null;
  suburb?: string | null;
}): string {
  const suburbSlug = slugify(b.suburb);
  if (b.slug && suburbSlug && b.trade_category && SINGULAR_SLUGS.has(b.trade_category)) {
    return `/${b.trade_category}/${suburbSlug}/${b.slug}`;
  }
  return `/builder/${b.user_id}`;
}

/** Category landing URL: /{plural} or /{plural}/{suburb-slug}. */
export function categoryPath(tradeSlug: string, suburbSlug?: string | null): string {
  const trade = getTradeBySlug(tradeSlug);
  const plural = trade ? pluralSlugFor(trade) : tradeSlug;
  return suburbSlug ? `/${plural}/${suburbSlug}` : `/${plural}`;
}
