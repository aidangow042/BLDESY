// AUTO-SYNCED from ~/bldesy-web/lib/trades.ts by scripts/sync-web-libs.mjs — DO NOT EDIT HERE.
// Change the website original, then run: npm run sync:web

export interface Trade {
  name: string;
  slug: string;
  description: string;
}

/**
 * Plural forms for the SEO category URLs (/plumbers/surry-hills). Trades not
 * listed here pluralise as themselves — service nouns like "drainage" or
 * "hot-water-systems" read naturally either way, and the URL grammar
 * disambiguates by segment count (2 segments = category, 3 = profile).
 */
const PLURAL_OVERRIDES: Record<string, { slug: string; name: string }> = {
  builder: { slug: "builders", name: "Builders" },
  "commercial-builder": { slug: "commercial-builders", name: "Commercial Builders" },
  carpenter: { slug: "carpenters", name: "Carpenters" },
  concreter: { slug: "concreters", name: "Concreters" },
  bricklayer: { slug: "bricklayers", name: "Bricklayers" },
  scaffolder: { slug: "scaffolders", name: "Scaffolders" },
  surveyor: { slug: "surveyors", name: "Surveyors" },
  handyman: { slug: "handymen", name: "Handymen" },
  "structural-engineer": { slug: "structural-engineers", name: "Structural Engineers" },
  electrician: { slug: "electricians", name: "Electricians" },
  "solar-installer": { slug: "solar-installers", name: "Solar Installers" },
  plumber: { slug: "plumbers", name: "Plumbers" },
  "gas-fitter": { slug: "gas-fitters", name: "Gas Fitters" },
  landscaper: { slug: "landscapers", name: "Landscapers" },
  fencer: { slug: "fencers", name: "Fencers" },
  "pool-builder": { slug: "pool-builders", name: "Pool Builders" },
  painter: { slug: "painters", name: "Painters" },
  tiler: { slug: "tilers", name: "Tilers" },
  plasterer: { slug: "plasterers", name: "Plasterers" },
  "cabinet-maker": { slug: "cabinet-makers", name: "Cabinet Makers" },
  glazier: { slug: "glaziers", name: "Glaziers" },
  renderer: { slug: "renderers", name: "Renderers" },
  roofer: { slug: "roofers", name: "Roofers" },
  waterproofer: { slug: "waterproofers", name: "Waterproofers" },
  locksmith: { slug: "locksmiths", name: "Locksmiths" },
  cleaner: { slug: "cleaners", name: "Cleaners" },
};

export interface TradeCategory {
  name: string;
  slug: string;
  trades: Trade[];
}

export const TRADE_CATEGORIES: TradeCategory[] = [
  {
    name: "Building & Construction",
    slug: "building-construction",
    trades: [
      { name: "Builder", slug: "builder", description: "Licensed builders for new homes, renovations, and extensions" },
      { name: "Commercial Builder", slug: "commercial-builder", description: "Licensed commercial contractors for office fit-outs, retail, and multi-storey builds" },
      { name: "Carpenter", slug: "carpenter", description: "Skilled woodworkers for framing, decks, pergolas, and custom joinery" },
      { name: "Concreter", slug: "concreter", description: "Concrete slabs, driveways, paths, and decorative concrete finishes" },
      { name: "Bricklayer", slug: "bricklayer", description: "Brick and block laying for walls, facades, and retaining structures" },
      { name: "Demolition", slug: "demolition", description: "Safe removal of structures, walls, and site clearing" },
      { name: "Scaffolder", slug: "scaffolder", description: "Temporary scaffolding systems for construction and maintenance access" },
      { name: "Surveyor", slug: "surveyor", description: "Land and building surveys for construction and property boundaries" },
      { name: "Drafting & Design", slug: "drafting-design", description: "Architectural drafting, building design, and plan preparation" },
      { name: "Handyman", slug: "handyman", description: "General repairs, odd jobs, and small maintenance tasks around the home" },
      { name: "Structural Engineer", slug: "structural-engineer", description: "Engineering assessments, structural certifications, and design solutions" },
    ],
  },
  {
    name: "Commercial & Infrastructure",
    slug: "commercial-infrastructure",
    trades: [
      { name: "Civil Construction", slug: "civil-construction", description: "Civil contractors for site works, foundations, and structural civil packages" },
      { name: "Earthworks & Excavation", slug: "earthworks-excavation", description: "Bulk earthworks, excavation, site cut and fill for commercial projects" },
      { name: "Infrastructure & Roads", slug: "infrastructure-roads", description: "Roads, kerbs, drainage, and public infrastructure construction" },
      { name: "Industrial Fit-out", slug: "industrial-fit-out", description: "Warehouse, factory, and industrial-scale fit-out construction" },
      { name: "Data Centre Construction", slug: "data-centre-construction", description: "Specialist construction for data centre and mission-critical facilities" },
    ],
  },
  {
    name: "Electrical & Solar",
    slug: "electrical-solar",
    trades: [
      { name: "Electrician", slug: "electrician", description: "Licensed professionals for residential and commercial electrical work" },
      { name: "Solar Installer", slug: "solar-installer", description: "Solar panel systems, battery storage, and renewable energy solutions" },
      { name: "Air Conditioning & HVAC", slug: "air-conditioning-hvac", description: "Installation, repair, and servicing of heating and cooling systems" },
      { name: "Data & Communications", slug: "data-communications", description: "Network cabling, data points, phone lines, and smart home wiring" },
      { name: "Security Systems", slug: "security-systems", description: "CCTV, alarm systems, intercom, and access control installation" },
    ],
  },
  {
    name: "Plumbing & Gas",
    slug: "plumbing-gas",
    trades: [
      { name: "Plumber", slug: "plumber", description: "Licensed plumbers for pipes, taps, toilets, and water systems" },
      { name: "Gas Fitter", slug: "gas-fitter", description: "Gas appliance installation, repairs, and gas line work" },
      { name: "Drainage", slug: "drainage", description: "Stormwater, sewer, and drainage system installation and repair" },
      { name: "Hot Water Systems", slug: "hot-water-systems", description: "Installation and repair of electric, gas, solar, and heat pump hot water" },
    ],
  },
  {
    name: "Outdoor & Landscaping",
    slug: "outdoor-landscaping",
    trades: [
      { name: "Landscaper", slug: "landscaper", description: "Garden design, planting, turf, and complete outdoor transformations" },
      { name: "Fencer", slug: "fencer", description: "Timber, Colorbond, pool, and security fencing installation" },
      { name: "Pool Builder", slug: "pool-builder", description: "Swimming pool construction, renovation, and equipment installation" },
      { name: "Paving", slug: "paving", description: "Brick, stone, and concrete paving for driveways, paths, and patios" },
      { name: "Irrigation", slug: "irrigation", description: "Sprinkler systems, drip irrigation, and automated watering solutions" },
      { name: "Tree Services", slug: "tree-services", description: "Tree removal, pruning, stump grinding, and arborist reports" },
      { name: "Retaining Walls", slug: "retaining-walls", description: "Timber, block, and stone retaining wall construction" },
    ],
  },
  {
    name: "Interior & Finishing",
    slug: "interior-finishing",
    trades: [
      { name: "Painter", slug: "painter", description: "Interior and exterior painting, wallpaper removal, and surface prep" },
      { name: "Tiler", slug: "tiler", description: "Floor and wall tiling for bathrooms, kitchens, and living areas" },
      { name: "Plasterer", slug: "plasterer", description: "Plastering, rendering, and plasterboard installation and repairs" },
      { name: "Cabinet Maker", slug: "cabinet-maker", description: "Custom cabinetry, wardrobes, kitchens, and built-in furniture" },
      { name: "Flooring", slug: "flooring", description: "Timber, laminate, vinyl, and hybrid flooring installation" },
      { name: "Glazier", slug: "glazier", description: "Glass cutting, window replacement, mirrors, and glass balustrades" },
      { name: "Renderer", slug: "renderer", description: "Cement, acrylic, and texture rendering for interior and exterior walls" },
      { name: "Wallpapering", slug: "wallpapering", description: "Wallpaper installation, removal, and feature wall creation" },
      { name: "Curtains & Blinds", slug: "curtains-blinds", description: "Supply and installation of curtains, blinds, shutters, and awnings" },
    ],
  },
  {
    name: "Roofing & Exterior",
    slug: "roofing-exterior",
    trades: [
      { name: "Roofer", slug: "roofer", description: "Roof repairs, re-roofing, new roofs, and leak detection" },
      { name: "Waterproofer", slug: "waterproofer", description: "Waterproofing membranes for bathrooms, balconies, and basements" },
      { name: "Guttering", slug: "guttering", description: "Gutter installation, replacement, cleaning, and leaf guard systems" },
      { name: "Cladding", slug: "cladding", description: "External wall cladding in timber, metal, and composite materials" },
      { name: "Insulation", slug: "insulation", description: "Ceiling, wall, and underfloor insulation for energy efficiency" },
    ],
  },
  {
    name: "Specialist",
    slug: "specialist",
    trades: [
      { name: "Locksmith", slug: "locksmith", description: "Lock installation, rekeying, emergency lockouts, and security upgrades" },
      { name: "Pest Control", slug: "pest-control", description: "Termite inspections, pest treatments, and ongoing prevention plans" },
      { name: "Asbestos Removal", slug: "asbestos-removal", description: "Licensed asbestos testing, removal, and safe disposal" },
      { name: "Cleaner", slug: "cleaner", description: "End-of-lease, builders, and deep cleaning for homes and offices" },
      { name: "Rubbish Removal", slug: "rubbish-removal", description: "Skip bins, waste collection, and green waste disposal services" },
      { name: "Stonemasonry", slug: "stonemasonry", description: "Stone cutting, installation, and restoration for walls and features" },
      { name: "Welding", slug: "welding", description: "Custom metalwork, repairs, gates, balustrades, and fabrication" },
      { name: "Antenna & TV", slug: "antenna-tv", description: "TV antenna installation, repair, and wall-mounting services" },
    ],
  },
];

/** Find a single trade by its slug across all categories */
export function getTradeBySlug(slug: string): Trade | undefined {
  for (const category of TRADE_CATEGORIES) {
    const trade = category.trades.find((t) => t.slug === slug);
    if (trade) return trade;
  }
  return undefined;
}

/** Flat array of every trade */
export function getAllTrades(): Trade[] {
  return TRADE_CATEGORIES.flatMap((c) => c.trades);
}

/** Format a trade slug (with hyphens or underscores) into readable text */
export function formatTradeName(slug: string): string {
  return slug.replace(/[-_]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Get the parent category for a given trade slug */
export function getTradeCategory(tradeSlug: string): TradeCategory | undefined {
  return TRADE_CATEGORIES.find((c) => c.trades.some((t) => t.slug === tradeSlug));
}

/** Plural slug for a trade — the first segment of category URLs. */
export function pluralSlugFor(trade: Trade): string {
  return PLURAL_OVERRIDES[trade.slug]?.slug ?? trade.slug;
}

/** Plural display name ("Plumbers", "Drainage"). */
export function pluralNameFor(trade: Trade): string {
  return PLURAL_OVERRIDES[trade.slug]?.name ?? trade.name;
}

const BY_PLURAL_SLUG: ReadonlyMap<string, Trade> = new Map(
  getAllTrades().map((t) => [pluralSlugFor(t), t]),
);

/** Resolve a category-URL first segment (plural) back to its trade. */
export function getTradeByPluralSlug(slug: string): Trade | undefined {
  return BY_PLURAL_SLUG.get(slug);
}

/** Every singular trade slug — profile-URL first segments. */
export const SINGULAR_SLUGS: ReadonlySet<string> = new Set(
  getAllTrades().map((t) => t.slug),
);

/** Every plural trade slug — category-URL first segments. */
export const PLURAL_SLUGS: ReadonlySet<string> = new Set(BY_PLURAL_SLUG.keys());
