// Canonical trade list for the builder edit-profile "add trade" picker.
//
// Display names are sourced from app/all-trades.tsx (the canonical browse
// list). Each is paired with its STABLE slug — the same slug used as the key
// in lib/trade-specialisations.ts (builder_profiles.specialisations) and in
// lib/trade-licence-map.ts. We can't derive these slugs from the display name
// via `.toLowerCase()` because multi-word trades (e.g. "Air Conditioning /
// HVAC" → "air-conditioning-hvac") don't round-trip; so we keep an explicit
// map here, grouped to mirror the all-trades.tsx categories.

export interface CatalogueTrade {
  /** Stored slug — written into builder_profiles.trade_categories. */
  slug: string;
  /** Display label shown in the picker and on chips. */
  name: string;
}

export interface CatalogueGroup {
  title: string;
  trades: readonly CatalogueTrade[];
}

export const TRADE_CATALOGUE: readonly CatalogueGroup[] = [
  {
    title: 'Building & Construction',
    trades: [
      { slug: 'builder', name: 'Builder' },
      { slug: 'carpenter', name: 'Carpenter' },
      { slug: 'concreter', name: 'Concreter' },
      { slug: 'bricklayer', name: 'Bricklayer' },
      { slug: 'demolition', name: 'Demolition' },
      { slug: 'scaffolder', name: 'Scaffolder' },
      { slug: 'surveyor', name: 'Surveyor' },
      { slug: 'drafting-design', name: 'Drafting / Design' },
      { slug: 'handyman', name: 'Handyman' },
      { slug: 'structural-engineer', name: 'Structural Engineer' },
    ],
  },
  {
    title: 'Electrical & Solar',
    trades: [
      { slug: 'electrician', name: 'Electrician' },
      { slug: 'solar-installer', name: 'Solar Installer' },
      { slug: 'air-conditioning-hvac', name: 'Air Conditioning / HVAC' },
      { slug: 'data-communications', name: 'Data & Communications' },
      { slug: 'security-systems', name: 'Security Systems' },
    ],
  },
  {
    title: 'Plumbing & Gas',
    trades: [
      { slug: 'plumber', name: 'Plumber' },
      { slug: 'gas-fitter', name: 'Gas Fitter' },
      { slug: 'drainage', name: 'Drainage' },
      { slug: 'hot-water-systems', name: 'Hot Water Systems' },
    ],
  },
  {
    title: 'Outdoor & Landscaping',
    trades: [
      { slug: 'landscaper', name: 'Landscaper' },
      { slug: 'fencer', name: 'Fencer' },
      { slug: 'pool-builder', name: 'Pool Builder' },
      { slug: 'paving', name: 'Paving' },
      { slug: 'irrigation', name: 'Irrigation' },
      { slug: 'tree-services', name: 'Tree Services' },
      { slug: 'retaining-walls', name: 'Retaining Walls' },
    ],
  },
  {
    title: 'Interior & Finishing',
    trades: [
      { slug: 'painter', name: 'Painter' },
      { slug: 'tiler', name: 'Tiler' },
      { slug: 'plasterer', name: 'Plasterer' },
      { slug: 'cabinet-maker', name: 'Cabinet Maker' },
      { slug: 'flooring', name: 'Flooring' },
      { slug: 'glazier', name: 'Glazier' },
      { slug: 'renderer', name: 'Renderer' },
      { slug: 'wallpapering', name: 'Wallpapering' },
      { slug: 'curtains-blinds', name: 'Curtains & Blinds' },
    ],
  },
  {
    title: 'Roofing & Exterior',
    trades: [
      { slug: 'roofer', name: 'Roofer' },
      { slug: 'waterproofer', name: 'Waterproofer' },
      { slug: 'guttering', name: 'Guttering' },
      { slug: 'cladding', name: 'Cladding' },
      { slug: 'insulation', name: 'Insulation' },
    ],
  },
  {
    title: 'Specialist',
    trades: [
      { slug: 'locksmith', name: 'Locksmith' },
      { slug: 'pest-control', name: 'Pest Control' },
      { slug: 'asbestos-removal', name: 'Asbestos Removal' },
      { slug: 'cleaner', name: 'Cleaner' },
      { slug: 'rubbish-removal', name: 'Rubbish Removal' },
      { slug: 'stonemasonry', name: 'Stonemasonry' },
      { slug: 'welding', name: 'Welding' },
      { slug: 'antenna-tv', name: 'Antenna & TV' },
    ],
  },
];

/** Flat slug → display name lookup across every catalogue group. */
const TRADE_NAME_BY_SLUG: Record<string, string> = Object.fromEntries(
  TRADE_CATALOGUE.flatMap((g) => g.trades.map((t) => [t.slug, t.name])),
);

/**
 * Display name for a stored trade slug. Falls back to a Title-Cased version of
 * the slug for anything not in the catalogue (e.g. legacy free-text values),
 * so a trade chip always renders something readable.
 */
export function tradeDisplayName(slug: string): string {
  if (TRADE_NAME_BY_SLUG[slug]) return TRADE_NAME_BY_SLUG[slug];
  return slug
    .split(/[-\s]+/)
    .map((w) => (w ? w.charAt(0).toUpperCase() + w.slice(1) : w))
    .join(' ');
}
