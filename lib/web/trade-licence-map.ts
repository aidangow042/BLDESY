// AUTO-SYNCED from ~/bldesy-web/lib/trade-licence-map.ts by scripts/sync-web-libs.mjs — DO NOT EDIT HERE.
// Change the website original, then run: npm run sync:web

/**
 * Maps each BLDESY trade to its required licences per Australian state.
 * Used to determine which licence badge to display after verification.
 */

export type VerificationSource =
  | "nsw_trades_api"
  | "nsw_security_api"
  | "nsw_asbestos_api"
  | "nsw_design_api"
  | "nsw_highrisk_api"
  | "nsw_whitecard_api"
  | "qbcc_register"
  | "admin";

/**
 * Coarse classification of a licence type. Drives badge wording on the public
 * profile and signup helper text on the licence-number input.
 *
 *   - 'trade'      — tradesperson licences (Plumber, Electrician, Carpenter…).
 *                    The default when not specified.
 *   - 'contractor' — NSW Contractor Licence with Builder class, or QBCC Builder
 *                    (Open / Low Rise / Medium Rise). Residential & commercial builders.
 *   - 'civil'      — Contractor Licence with civil-relevant class (Demolition,
 *                    Earthworks, Excavation, Infrastructure). Civil construction firms.
 *   - 'specialist' — Standalone specialist licences (Asbestos, High Risk Work,
 *                    Scaffolding, Surveyor, RPEQ, Security).
 */
export type LicenceClass = "trade" | "contractor" | "civil" | "specialist";

export interface LicenceRequirement {
  display_label: string;
  /** The licence category/class expected from the API or register */
  expected_categories: string[];
  source: VerificationSource;
  /** Classification of the licence type. Defaults to 'trade' when omitted. */
  licence_class?: LicenceClass;
}

export interface TradeLicenceEntry {
  nsw?: LicenceRequirement | null;
  qld?: LicenceRequirement | null;
}

/**
 * `null` means no licence required for that state.
 * Omitted state key means not yet mapped / same as null.
 */
export const TRADE_LICENCE_MAP: Record<string, TradeLicenceEntry> = {
  // ── Building & Construction ──
  builder: {
    nsw: {
      // NSW Fair Trading doesn't issue anything literally called a "Builder
      // Licence" — the legal authority is a Contractor Licence with a
      // Builder / General Building Work class. Label kept as the user-
      // facing "Builder Licence" for badge readability; the underlying
      // verification accepts any of the Builder-class variants.
      display_label: "NSW Builder Licence",
      expected_categories: [
        "Contractor - Builder",
        "General Building Work",
      ],
      source: "nsw_trades_api",
      licence_class: "contractor",
    },
    qld: {
      display_label: "QBCC Builder",
      expected_categories: ["Builder"],
      source: "qbcc_register",
      licence_class: "contractor",
    },
  },
  carpenter: {
    nsw: {
      display_label: "NSW Carpentry Licence",
      expected_categories: ["Contractor - Carpenter", "Tradesperson - Carpenter"],
      source: "nsw_trades_api",
    },
    qld: {
      display_label: "QBCC Carpentry",
      expected_categories: ["Carpentry"],
      source: "qbcc_register",
    },
  },
  concreter: {
    nsw: {
      display_label: "NSW Concreting Licence",
      expected_categories: ["Contractor - General Concretor"],
      source: "nsw_trades_api",
    },
    qld: {
      display_label: "QBCC Concreting",
      expected_categories: ["Concreting"],
      source: "qbcc_register",
    },
  },
  bricklayer: {
    nsw: {
      display_label: "NSW Bricklaying Licence",
      expected_categories: ["Contractor - Bricklayer"],
      source: "nsw_trades_api",
    },
    qld: {
      display_label: "QBCC Bricklaying",
      expected_categories: ["Bricklaying"],
      source: "qbcc_register",
    },
  },
  demolition: {
    nsw: {
      // PROVISIONAL — 2026-08-14: routed to nsw_trades_api (NSW Fair Trading
      // Contractor Licence, "Demolition" class) to match how the
      // civil-construction umbrella trade already checks this same licence
      // concept (see CIVIL_CLASS_ALIASES_NSW below, and
      // civil-construction/earthworks-excavation/infrastructure-roads
      // further down this file). Previously routed to nsw_asbestos_api
      // (the SafeWork asbestos register) — a different regulator/register
      // to a Contractor Licence Demolition class, and a real bug: it meant
      // a demolition licence holder passed verification signing up as
      // civil-construction but failed signing up as this standalone
      // `demolition` slug for the same licence. Still unconfirmed: whether
      // SafeWork NSW's restricted/unrestricted demolition licence is a
      // SEPARATE register that should be checked instead of, or in
      // addition to, the Contractor Licence class checked here. Do not
      // change again without confirming with SafeWork NSW / legal.
      display_label: "NSW Demolition Licence",
      expected_categories: ["Demolition"],
      source: "nsw_trades_api",
      licence_class: "civil",
    },
    qld: {
      display_label: "QBCC Demolition",
      expected_categories: ["Demolition"],
      source: "qbcc_register",
      licence_class: "civil",
    },
  },
  scaffolder: {
    nsw: {
      display_label: "High Risk Work Licence - Scaffolding",
      expected_categories: ["Scaffolding"],
      source: "nsw_highrisk_api",
      licence_class: "specialist",
    },
    qld: {
      display_label: "High Risk Work Licence - Scaffolding",
      expected_categories: ["Scaffolding"],
      source: "admin",
      licence_class: "specialist",
    },
  },
  surveyor: {
    nsw: {
      display_label: "Registered Surveyor",
      expected_categories: ["Registered Surveyor"],
      source: "admin",
      licence_class: "specialist",
    },
    qld: {
      display_label: "Registered Surveyor",
      expected_categories: ["Registered Surveyor"],
      source: "admin",
      licence_class: "specialist",
    },
  },
  "drafting-design": {
    nsw: {
      display_label: "Registered Design Practitioner",
      expected_categories: ["Registered Design Practitioner"],
      source: "nsw_design_api",
    },
    qld: {
      display_label: "QBCC Design",
      expected_categories: ["Design"],
      source: "admin",
    },
  },
  handyman: {
    nsw: null,
    qld: null,
  },
  "structural-engineer": {
    nsw: {
      display_label: "Registered Professional Engineer",
      expected_categories: ["Registered Professional Engineer"],
      source: "nsw_design_api",
      licence_class: "specialist",
    },
    qld: {
      display_label: "RPEQ",
      expected_categories: ["RPEQ"],
      source: "admin",
      licence_class: "specialist",
    },
  },

  // ── Electrical & Solar ──
  electrician: {
    nsw: {
      display_label: "NSW Electrical Licence",
      expected_categories: [
        "Contractor - Electrician",
        "Tradesperson - Electrician",
      ],
      source: "nsw_trades_api",
    },
    qld: {
      display_label: "QBCC Electrical",
      expected_categories: ["Electrical"],
      source: "qbcc_register",
    },
  },
  "solar-installer": {
    nsw: {
      display_label: "NSW Electrical Licence",
      expected_categories: [
        "Contractor - Electrician",
        "Tradesperson - Electrician",
      ],
      source: "nsw_trades_api",
    },
    qld: {
      display_label: "QBCC Electrical",
      expected_categories: ["Electrical"],
      source: "qbcc_register",
    },
  },
  "air-conditioning-hvac": {
    nsw: {
      display_label: "NSW HVAC Licence",
      expected_categories: [
        "Contractor - Air Conditioning",
        "Tradesperson - Air Conditioning",
        "Contractor - Refrigeration",
        "Tradesperson - Refrigeration",
      ],
      source: "nsw_trades_api",
    },
    qld: {
      display_label: "QBCC Air Conditioning & Refrigeration",
      expected_categories: ["Air Conditioning & Refrigeration"],
      source: "qbcc_register",
    },
  },
  "data-communications": {
    nsw: {
      display_label: "ACMA Open Cabler Registration",
      expected_categories: ["ACMA Open Cabler"],
      source: "admin",
    },
    qld: {
      display_label: "ACMA Open Cabler Registration",
      expected_categories: ["ACMA Open Cabler"],
      source: "admin",
    },
  },
  "security-systems": {
    nsw: {
      display_label: "NSW Security Licence",
      expected_categories: ["Security Licence"],
      source: "nsw_security_api",
      licence_class: "specialist",
    },
    qld: {
      display_label: "QLD Security Licence",
      expected_categories: ["Security Licence"],
      source: "admin",
      licence_class: "specialist",
    },
  },

  // ── Plumbing & Gas ──
  plumber: {
    nsw: {
      display_label: "NSW Plumbing Licence",
      expected_categories: [
        "Contractor - Plumber",
        "Tradesperson - Plumber",
        "Contractor - Water Plumber",
        "Tradesperson - Water Plumber",
        "Contractor - Plumber and Roof Plumber",
      ],
      source: "nsw_trades_api",
    },
    qld: {
      display_label: "QBCC Plumbing & Drainage",
      expected_categories: ["Plumbing & Drainage", "Plumbing"],
      source: "qbcc_register",
    },
  },
  "gas-fitter": {
    nsw: {
      display_label: "NSW Gas Fitting Licence",
      expected_categories: [
        "Contractor - Gasfitter",
        "Tradesperson - Gasfitter",
        "Contractor - LP Gasfitter",
        "Tradesperson - LP Gasfitter",
        "Contractor - Advanced LP Gasfitter",
      ],
      source: "nsw_trades_api",
    },
    qld: {
      display_label: "QBCC Gasfitting",
      expected_categories: ["Gasfitting"],
      source: "qbcc_register",
    },
  },
  drainage: {
    nsw: {
      display_label: "NSW Draining Licence",
      expected_categories: [
        "Contractor - Drainer",
        "Tradesperson - Drainer",
      ],
      source: "nsw_trades_api",
    },
    qld: {
      display_label: "QBCC Plumbing & Drainage",
      expected_categories: ["Plumbing & Drainage", "Plumbing"],
      source: "qbcc_register",
    },
  },
  "hot-water-systems": {
    nsw: {
      display_label: "NSW Plumbing Licence",
      expected_categories: ["Contractor - Plumber", "Tradesperson - Plumber"],
      source: "nsw_trades_api",
    },
    qld: {
      display_label: "QBCC Plumbing & Drainage",
      expected_categories: ["Plumbing & Drainage", "Plumbing"],
      source: "qbcc_register",
    },
  },

  // ── Outdoor & Landscaping ──
  landscaper: {
    nsw: {
      display_label: "NSW Structural Landscaping Licence",
      expected_categories: ["Contractor - Structural Landscaping"],
      source: "nsw_trades_api",
    },
    qld: {
      display_label: "QBCC Structural Landscaping",
      expected_categories: ["Structural Landscaping"],
      source: "qbcc_register",
    },
  },
  fencer: {
    nsw: {
      display_label: "NSW Fencing Licence",
      expected_categories: ["Contractor - Fencer"],
      source: "nsw_trades_api",
    },
    qld: {
      display_label: "QBCC Fencing",
      expected_categories: ["Fencing"],
      source: "qbcc_register",
    },
  },
  "pool-builder": {
    nsw: {
      display_label: "NSW Pool Building Licence",
      expected_categories: ["Contractor - Swimming Pool Builder"],
      source: "nsw_trades_api",
    },
    qld: {
      display_label: "QBCC Swimming Pool Construction",
      expected_categories: ["Swimming Pool Construction"],
      source: "qbcc_register",
    },
  },
  paving: {
    nsw: null,
    qld: null,
  },
  irrigation: {
    nsw: null,
    qld: null,
  },
  "tree-services": {
    nsw: null,
    qld: null,
  },
  "retaining-walls": {
    nsw: {
      display_label: "NSW Structural Landscaping Licence",
      expected_categories: [
        "Contractor - Structural Landscaping",
        "Contractor - Builder",
      ],
      source: "nsw_trades_api",
    },
    qld: {
      display_label: "QBCC Structural Landscaping",
      expected_categories: ["Structural Landscaping", "Builder"],
      source: "qbcc_register",
    },
  },

  // ── Interior & Finishing ──
  painter: {
    nsw: {
      display_label: "NSW Painting Licence",
      expected_categories: [
        "Contractor - Painter",
        "Tradesperson - Painter",
        "Contractor - Decorator",
        "Tradesperson - Decorator",
      ],
      source: "nsw_trades_api",
    },
    qld: {
      display_label: "QBCC Painting & Decorating",
      expected_categories: ["Painting & Decorating"],
      source: "qbcc_register",
    },
  },
  tiler: {
    nsw: {
      display_label: "NSW Tiling Licence",
      expected_categories: [
        "Contractor - Wall and Floor Tiler",
        "Tradesperson - Wall and Floor Tiler",
      ],
      source: "nsw_trades_api",
    },
    qld: {
      display_label: "QBCC Wall & Floor Tiling",
      expected_categories: ["Wall & Floor Tiling"],
      source: "qbcc_register",
    },
  },
  plasterer: {
    nsw: {
      display_label: "NSW Plastering Licence",
      expected_categories: [
        "Contractor - Wet Plasterer",
        "Tradesperson - Wet Plasterer",
        "Contractor - Dry Plasterer",
        "Tradesperson - Dry Plasterer",
      ],
      source: "nsw_trades_api",
    },
    qld: {
      display_label: "QBCC Plastering",
      expected_categories: ["Plastering"],
      source: "qbcc_register",
    },
  },
  "cabinet-maker": {
    nsw: {
      display_label: "NSW Joinery Licence",
      expected_categories: ["Contractor - Joiner"],
      source: "nsw_trades_api",
    },
    qld: {
      display_label: "QBCC Joinery",
      expected_categories: ["Joinery"],
      source: "qbcc_register",
    },
  },
  flooring: {
    nsw: null,
    qld: null,
  },
  glazier: {
    nsw: {
      display_label: "NSW Glazing Licence",
      expected_categories: ["Contractor - Glazier"],
      source: "nsw_trades_api",
    },
    qld: {
      display_label: "QBCC Glazing",
      expected_categories: ["Glazing"],
      source: "qbcc_register",
    },
  },
  renderer: {
    nsw: {
      display_label: "NSW Rendering Licence",
      expected_categories: ["Contractor - Wet Plasterer"],
      source: "nsw_trades_api",
    },
    qld: {
      display_label: "QBCC Plastering",
      expected_categories: ["Plastering"],
      source: "qbcc_register",
    },
  },
  // Wallpapering has no standalone NSW/QLD licence class — it falls under
  // the same Painting / Decorating trade work category as `painter` (Home
  // Building Act specialist work list), threshold-licensed above $5,000
  // labour+materials incl. GST like the rest of the threshold-licensed
  // trades. Mirrors `painter`'s routing exactly — 2026-08-14 audit follow-up.
  wallpapering: {
    nsw: {
      display_label: "NSW Painting Licence",
      expected_categories: [
        "Contractor - Painter",
        "Tradesperson - Painter",
        "Contractor - Decorator",
        "Tradesperson - Decorator",
      ],
      source: "nsw_trades_api",
    },
    qld: {
      display_label: "QBCC Painting & Decorating",
      expected_categories: ["Painting & Decorating"],
      source: "qbcc_register",
    },
  },
  "curtains-blinds": {
    nsw: null,
    qld: null,
  },

  // ── Roofing & Exterior ──
  roofer: {
    nsw: {
      display_label: "NSW Roofing Licence",
      expected_categories: [
        "Contractor - Roof Slater",
        "Contractor - Roof Tiler",
      ],
      source: "nsw_trades_api",
    },
    qld: {
      display_label: "QBCC Roof Tiling",
      expected_categories: ["Roof Tiling", "Roof Plumbing"],
      source: "qbcc_register",
    },
  },
  waterproofer: {
    nsw: {
      display_label: "NSW Waterproofing Licence",
      expected_categories: ["Contractor - Waterproofing Technician"],
      source: "nsw_trades_api",
    },
    qld: {
      display_label: "QBCC Waterproofing",
      expected_categories: ["Waterproofing"],
      source: "qbcc_register",
    },
  },
  guttering: {
    nsw: {
      display_label: "NSW Roof Plumbing Licence",
      expected_categories: [
        "Contractor - Roof Plumber",
        "Tradesperson - Roof Plumber",
      ],
      source: "nsw_trades_api",
    },
    qld: {
      display_label: "QBCC Roof Plumbing",
      expected_categories: ["Roof Plumbing"],
      source: "qbcc_register",
    },
  },
  cladding: {
    nsw: {
      display_label: "NSW Builder Licence",
      expected_categories: ["Contractor - Builder"],
      source: "nsw_trades_api",
    },
    qld: {
      display_label: "QBCC Builder",
      expected_categories: ["Builder"],
      source: "qbcc_register",
    },
  },
  insulation: {
    nsw: null,
    qld: null,
  },

  // ── Specialist ──
  locksmith: {
    nsw: {
      display_label: "NSW Security Licence - Locksmith",
      expected_categories: ["Security Licence - Locksmith"],
      source: "nsw_security_api",
    },
    qld: {
      display_label: "QLD Security Licence - Locksmith",
      expected_categories: ["Security Licence - Locksmith"],
      source: "admin",
    },
  },
  "pest-control": {
    nsw: {
      display_label: "NSW Pest Control Licence",
      expected_categories: ["Pest Control"],
      source: "admin",
    },
    qld: {
      display_label: "QLD Pest Management Licence",
      expected_categories: ["Pest Management"],
      source: "admin",
    },
  },
  "asbestos-removal": {
    nsw: {
      display_label: "Asbestos Removal Licence",
      expected_categories: ["Asbestos Removal"],
      source: "nsw_asbestos_api",
      licence_class: "specialist",
    },
    qld: {
      display_label: "QLD Asbestos Removal Licence",
      expected_categories: ["Asbestos Removal"],
      source: "admin",
      licence_class: "specialist",
    },
  },
  cleaner: {
    nsw: null,
    qld: null,
  },
  "rubbish-removal": {
    nsw: null,
    qld: null,
  },
  stonemasonry: {
    nsw: {
      display_label: "NSW Stonemasonry Licence",
      expected_categories: ["Contractor - Stonemason"],
      source: "nsw_trades_api",
    },
    qld: {
      display_label: "QBCC Stonemasonry",
      expected_categories: ["Stonemasonry"],
      source: "qbcc_register",
    },
  },
  welding: {
    nsw: null,
    qld: null,
  },
  "antenna-tv": {
    nsw: {
      display_label: "ACMA Open Cabler Registration",
      expected_categories: ["ACMA Open Cabler"],
      source: "admin",
    },
    qld: {
      display_label: "ACMA Open Cabler Registration",
      expected_categories: ["ACMA Open Cabler"],
      source: "admin",
    },
  },

  // ── Commercial & Infrastructure (builder umbrella) ──
  // Every trade in this group resolves to the SAME licence in NSW — a
  // Contractor Licence with a Builder / General Building Work class.
  // Construction companies hold this licence whether they brand themselves
  // as residential, commercial, civil, industrial, infrastructure, or
  // data-centre builders. Display labels are deliberately uniform so the
  // signup helper text, badges, and rejection messages all stay consistent.
  // `licence_class` stays as "contractor" or "civil" purely so the badge
  // layer can differentiate "Licensed Contractor — Builder" from
  // "Civil Contractor — Civil Construction" on the public profile.
  "commercial-builder": {
    nsw: {
      display_label: "NSW Contractor Licence",
      expected_categories: ["Contractor - Builder", "General Building Work"],
      source: "nsw_trades_api",
      licence_class: "contractor",
    },
    qld: {
      display_label: "QBCC Builder",
      expected_categories: ["Builder", "Builder Open", "Builder Medium Rise"],
      source: "qbcc_register",
      licence_class: "contractor",
    },
  },
  "civil-construction": {
    nsw: {
      display_label: "NSW Contractor Licence",
      expected_categories: [
        "Contractor - Builder",
        "General Building Work",
        "General Concretor",
        "Demolition",
        "Earthworks",
      ],
      source: "nsw_trades_api",
      licence_class: "civil",
    },
    qld: {
      display_label: "QBCC Builder",
      expected_categories: ["Builder", "Builder Open", "Demolition"],
      source: "qbcc_register",
      licence_class: "civil",
    },
  },
  "earthworks-excavation": {
    nsw: {
      display_label: "NSW Contractor Licence",
      expected_categories: [
        "Contractor - Builder",
        "General Building Work",
        "Demolition",
        "Earthworks",
        "Excavation",
      ],
      source: "nsw_trades_api",
      licence_class: "civil",
    },
    qld: {
      display_label: "QBCC Builder",
      expected_categories: ["Builder", "Builder Open", "Demolition"],
      source: "qbcc_register",
      licence_class: "civil",
    },
  },
  "infrastructure-roads": {
    nsw: {
      display_label: "NSW Contractor Licence",
      expected_categories: [
        "Contractor - Builder",
        "General Building Work",
        "General Concretor",
        "Earthworks",
        "Asphalt",
      ],
      source: "nsw_trades_api",
      licence_class: "civil",
    },
    qld: {
      display_label: "QBCC Builder",
      expected_categories: ["Builder", "Builder Open"],
      source: "qbcc_register",
      licence_class: "civil",
    },
  },
  "industrial-fit-out": {
    nsw: {
      display_label: "NSW Contractor Licence",
      expected_categories: ["Contractor - Builder", "General Building Work"],
      source: "nsw_trades_api",
      licence_class: "contractor",
    },
    qld: {
      display_label: "QBCC Builder",
      expected_categories: ["Builder", "Builder Open"],
      source: "qbcc_register",
      licence_class: "contractor",
    },
  },
  "data-centre-construction": {
    nsw: {
      display_label: "NSW Contractor Licence",
      expected_categories: ["Contractor - Builder", "General Building Work"],
      source: "nsw_trades_api",
      licence_class: "civil",
    },
    qld: {
      display_label: "QBCC Builder",
      expected_categories: ["Builder", "Builder Open", "Builder Medium Rise"],
      source: "qbcc_register",
      licence_class: "civil",
    },
  },
};

/**
 * Get the licence requirement for a trade in a given state.
 * Returns null if no licence is required, undefined if state not mapped.
 */
export function getLicenceRequirement(
  tradeSlug: string,
  state: string,
): LicenceRequirement | null | undefined {
  const entry = TRADE_LICENCE_MAP[tradeSlug];
  if (!entry) return undefined;

  const stateKey = state.toLowerCase() as "nsw" | "qld";
  return entry[stateKey];
}

/**
 * Resolve the licence class for a trade in a given state. Falls back to the
 * trade's NSW class when the state isn't mapped, then to the safe default
 * 'trade'. Used by the badge layer to differentiate "Licensed Plumber"
 * from "Civil Contractor — Demolition", and by the signup wizard to swap
 * helper-text per row.
 */
export function getLicenceClass(tradeSlug: string, state?: string): LicenceClass {
  if (state) {
    const req = getLicenceRequirement(tradeSlug, state);
    if (req && req.licence_class) return req.licence_class;
  }
  // Fall back to NSW so we get a class even when state is unknown (some
  // legacy callers don't carry state through).
  const nswReq = TRADE_LICENCE_MAP[tradeSlug]?.nsw;
  if (nswReq && nswReq.licence_class) return nswReq.licence_class;
  const qldReq = TRADE_LICENCE_MAP[tradeSlug]?.qld;
  if (qldReq && qldReq.licence_class) return qldReq.licence_class;
  return "trade";
}

/**
 * Check if a trade requires a licence in the given state.
 */
export function tradeRequiresLicence(
  tradeSlug: string,
  state: string,
): boolean {
  const req = getLicenceRequirement(tradeSlug, state);
  return req !== null && req !== undefined;
}

// ---------------------------------------------------------------------------
// Category tolerance
//
// NSW Fair Trading and QBCC each return their own classification string for a
// licence. The variants are surprisingly wide — a NSW business builder
// licence comes back as `Contractor`, `Contractor - Builder`, `Builder`, or
// `General Building Work` depending on the API endpoint and licence class;
// QBCC returns `Builder Open`, `Builder Low Rise`, `Builder Medium Rise`,
// `Builder - Project Management Services`, etc.
//
// Hard-matching against a single expected string was rejecting valid
// licences. Instead we keep a curated alias list per trade-state and accept
// any returned category whose normalised form contains one of the alias
// tokens. Adding a new alias is now a one-line change here, no migration.
// ---------------------------------------------------------------------------

function normaliseCategory(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/g, "");
}

// ---------------------------------------------------------------------------
// Construction-umbrella trades
//
// NSW Fair Trading issues a single authority — the Contractor Licence —
// with one or more "classes" recording what the holder is authorised to
// do (Builder, General Building Work, General Concretor, Demolition,
// Earthworks, etc.). For BLDESY signup we group trades into two umbrellas:
//
//   1. BUILDER_ONLY_UMBRELLA — building work that, under NSW Home Building
//      Act, legally requires a Builder / General Building Work class
//      (residential and commercial building, industrial fit-out, data
//      centres). A specialist-only licence (e.g. General Concretor) does
//      NOT cover this work.
//
//   2. CIVIL_UMBRELLA — civil construction work (roads, bridges, drainage,
//      earthworks, infrastructure). NSW does not require a Builder licence
//      for pure civil work; civil contractors typically hold class-
//      specific licences like General Concretor, Demolition, or Earthworks.
//      A Builder class also passes (the licence is broader than needed).
//
// `BUILDER_UMBRELLA_TRADES` is the union of both — useful for "needs a
// licence at all" UX gates (force the licence step open, mandatory
// verification for any construction-company signup).
// ---------------------------------------------------------------------------

export const BUILDER_ONLY_UMBRELLA: ReadonlySet<string> = new Set([
  "builder",
  "commercial-builder",
  "industrial-fit-out",
  "data-centre-construction",
]);

export const CIVIL_UMBRELLA: ReadonlySet<string> = new Set([
  "civil-construction",
  "earthworks-excavation",
  "infrastructure-roads",
]);

export const BUILDER_UMBRELLA_TRADES: ReadonlySet<string> = new Set([
  ...BUILDER_ONLY_UMBRELLA,
  ...CIVIL_UMBRELLA,
]);

export function isBuilderUmbrellaTrade(tradeSlug: string): boolean {
  return BUILDER_UMBRELLA_TRADES.has(tradeSlug);
}

export function isCivilUmbrellaTrade(tradeSlug: string): boolean {
  return CIVIL_UMBRELLA.has(tradeSlug);
}

// Builder-class aliases — every variant NSW Fair Trading / QBCC has been
// observed returning for a licence that authorises general building work.
// Already-normalised (lowercase, no spaces / punctuation). Includes
// restricted-builder strings via the `.includes()` matcher in
// `isCategoryAcceptable` — "Builder Restricted (project home builder)"
// normalises to `builderrestrictedprojecthomebuilder` which contains
// `builder` and passes.
//
// Important: we deliberately do NOT include the bare alias "contractor".
// The `.includes()` match would then accept any "Contractor - X" class
// (e.g. "Contractor - Electrician" → `contractorelectrician`) as a builder
// licence — a real false positive. Instead we list the specific authority
// string "Contractor Licence" → `contractorlicence`, which is safe.
const BUILDER_CLASS_ALIASES_NSW: readonly string[] = [
  "contractorlicence",
  "contractorbuilder",
  "builder",
  "buildingcontractor",
  "generalbuilding",
  "buildingwork",
  "generalbuildingwork",
];

const BUILDER_CLASS_ALIASES_QLD: readonly string[] = [
  "builder",
  "builderopen",
  "builderlowrise",
  "buildermediumrise",
  "builderprojectmanagementservices",
  "builderrestrictedtostructurallandscaping",
  "builderrestrictedtospecialclasses",
  "buildingcontractor",
  "buildingcontractoropen",
  "buildingcontractorlowrise",
  "buildingcontractormediumrise",
];

// Civil-class aliases — every variant a NSW civil contractor might hold
// on their Contractor Licence. Used by CIVIL_UMBRELLA trades in addition
// to the Builder-class aliases above. A real-world example: "Green Civil
// Australia Pty Ltd" holds a Contractor Licence with class
// "General Concretor" only — under NSW law this is sufficient for civil
// construction work (roads, bridges, infrastructure concreting) without
// needing a Builder class.
const CIVIL_CLASS_ALIASES_NSW: readonly string[] = [
  "generalconcretor",
  "concretor",
  "demolition",
  "earthworks",
  "excavation",
  "structurallandscaping",
  "asphalt",
  "drainer",
];

const CIVIL_CLASS_ALIASES_QLD: readonly string[] = [
  "demolition",
  "earthworks",
  "excavation",
  "concreting",
  "drainage",
];

/**
 * Aliases are listed as already-normalised strings (lowercase, no spaces,
 * no punctuation). `isCategoryAcceptable` normalises the returned category
 * the same way before checking.
 */
const CATEGORY_ALIASES: Record<string, Partial<Record<"NSW" | "QLD", string[]>>> = {
  builder: {
    NSW: [...BUILDER_CLASS_ALIASES_NSW],
    QLD: [...BUILDER_CLASS_ALIASES_QLD, "buildingdesigner"],
  },
  carpenter: {
    NSW: ["carpenter", "carpentry", "tradespersoncarpenter", "contractorcarpenter"],
    QLD: ["carpentry", "carpenter"],
  },
  concreter: {
    NSW: ["concretor", "concreter", "generalconcretor", "contractorgeneralconcretor"],
    QLD: ["concreting", "concretor"],
  },
  bricklayer: {
    NSW: ["bricklayer", "bricklaying", "contractorbricklayer"],
    QLD: ["bricklaying", "blocklaying"],
  },
  // Pure-specialist civil classes. Builder-umbrella trades no longer
  // accept these on their own — a Demolition or Asbestos licence with no
  // Builder class is insufficient for "Civil Construction" etc. Listing
  // them here lets `suggestTradeFromClasses` recover by pointing the user
  // at the right specialist trade.
  demolition: {
    NSW: ["demolition", "asbestosdemolition"],
    QLD: ["demolition"],
  },
  electrician: {
    NSW: ["electrician", "electrical", "contractorelectrician", "tradespersonelectrician"],
    QLD: ["electrical", "electrician"],
  },
  plumber: {
    NSW: [
      "plumber",
      "waterplumber",
      "plumberandroofplumber",
      "contractorplumber",
      "tradespersonplumber",
    ],
    QLD: ["plumbinganddrainage", "plumbing", "drainer", "drainage"],
  },
  "gas-fitter": {
    NSW: ["gasfitter", "lpgasfitter", "advancedlpgasfitter"],
    QLD: ["gasfitting", "gasfitter"],
  },
  drainage: {
    NSW: ["drainer", "drainage", "contractordrainer"],
    QLD: ["plumbinganddrainage", "drainage"],
  },
  "hot-water-systems": {
    NSW: ["plumber", "tradespersonplumber", "contractorplumber"],
    QLD: ["plumbinganddrainage", "plumbing"],
  },
  landscaper: {
    NSW: ["structurallandscaping", "contractorstructurallandscaping"],
    QLD: ["structurallandscaping"],
  },
  fencer: {
    NSW: ["fencer", "fencing", "contractorfencer"],
    QLD: ["fencing"],
  },
  "pool-builder": {
    NSW: ["swimmingpoolbuilder", "contractorswimmingpoolbuilder"],
    QLD: ["swimmingpoolconstruction"],
  },
  "retaining-walls": {
    NSW: ["structurallandscaping", "contractor", "builder"],
    QLD: ["structurallandscaping", "builder"],
  },
  painter: {
    NSW: ["painter", "decorator", "painting", "decorating"],
    QLD: ["paintinganddecorating", "painting", "decorating"],
  },
  // Same register/classes as `painter` — see the routing comment on the
  // `wallpapering` entry in TRADE_LICENCE_MAP above.
  wallpapering: {
    NSW: ["painter", "decorator", "painting", "decorating"],
    QLD: ["paintinganddecorating", "painting", "decorating"],
  },
  tiler: {
    NSW: ["wallandfloortiler", "tiler", "tiling"],
    QLD: ["wallfloortiling", "wallandfloortiling", "tiling"],
  },
  plasterer: {
    NSW: ["wetplasterer", "dryplasterer", "plastering"],
    QLD: ["plastering"],
  },
  "cabinet-maker": {
    NSW: ["joiner", "joinery", "cabinetmaker", "cabinetmaking"],
    QLD: ["joinery", "cabinetmaking"],
  },
  glazier: {
    NSW: ["glazier", "glazing"],
    QLD: ["glazing"],
  },
  renderer: {
    NSW: ["wetplasterer", "renderer", "rendering"],
    QLD: ["plastering"],
  },
  roofer: {
    NSW: ["roofslater", "rooftiler", "roofplumber", "roofing"],
    QLD: ["rooftiling", "roofplumbing"],
  },
  waterproofer: {
    NSW: ["waterproofingtechnician", "waterproofing"],
    QLD: ["waterproofing"],
  },
  guttering: {
    NSW: ["roofplumber", "tradespersonroofplumber"],
    QLD: ["roofplumbing"],
  },
  cladding: {
    NSW: ["contractor", "builder", "contractorbuilder"],
    QLD: ["builder", "builderopen", "builderlowrise", "buildermediumrise"],
  },
  stonemasonry: {
    NSW: ["stonemason", "stonemasonry"],
    QLD: ["stonemasonry"],
  },
  "solar-installer": {
    NSW: ["electrician", "electrical"],
    QLD: ["electrical"],
  },
  "air-conditioning-hvac": {
    NSW: ["airconditioning", "refrigeration"],
    QLD: ["airconditioningrefrigeration", "airconditioning"],
  },

  // ── Commercial & Infrastructure (builder umbrella) ──
  // All these trades share the same authority — a NSW Contractor Licence
  // with a Builder / General Building Work class, or a QBCC Builder licence.
  // Construction companies hold this licence whether they're framing a
  // suburban renovation or pouring a data-centre slab; the trade slug is
  // for job-matching, not licence-class enforcement. Specialist civil work
  // (pure Demolition / Earthworks / Concretor with no Builder class) maps
  // to the dedicated `demolition` / `concreter` / `earthworks-excavation`
  // specialist routes instead — those rejection paths still suggest the
  // right trade via `suggestTradeFromClasses`.
  "commercial-builder": {
    NSW: [...BUILDER_CLASS_ALIASES_NSW],
    QLD: [...BUILDER_CLASS_ALIASES_QLD],
  },
  // Civil umbrella trades accept BOTH Builder-class and civil-class
  // licences. NSW law doesn't require civil contractors to hold a Builder
  // class — a Contractor Licence with General Concretor / Demolition /
  // Earthworks alone is legitimate for civil work.
  "civil-construction": {
    NSW: [...BUILDER_CLASS_ALIASES_NSW, ...CIVIL_CLASS_ALIASES_NSW],
    QLD: [...BUILDER_CLASS_ALIASES_QLD, ...CIVIL_CLASS_ALIASES_QLD],
  },
  "earthworks-excavation": {
    NSW: [...BUILDER_CLASS_ALIASES_NSW, ...CIVIL_CLASS_ALIASES_NSW],
    QLD: [...BUILDER_CLASS_ALIASES_QLD, ...CIVIL_CLASS_ALIASES_QLD],
  },
  "infrastructure-roads": {
    NSW: [...BUILDER_CLASS_ALIASES_NSW, ...CIVIL_CLASS_ALIASES_NSW],
    QLD: [...BUILDER_CLASS_ALIASES_QLD, ...CIVIL_CLASS_ALIASES_QLD],
  },
  "industrial-fit-out": {
    NSW: [...BUILDER_CLASS_ALIASES_NSW],
    QLD: [...BUILDER_CLASS_ALIASES_QLD],
  },
  "data-centre-construction": {
    NSW: [...BUILDER_CLASS_ALIASES_NSW],
    QLD: [...BUILDER_CLASS_ALIASES_QLD],
  },
};

/**
 * Returns true when `returned` (the upstream category/class string) is an
 * acceptable variant for the given trade in the given state.
 *
 * When no aliases are mapped we fall back to checking the requirement's
 * `expected_categories` list with the same normalisation. If neither matches
 * the function returns false and the verifier will reject.
 */
export function isCategoryAcceptable(
  tradeSlug: string,
  state: string,
  returned: string,
): boolean {
  if (!returned) return false;
  const stateKey = state.toUpperCase() as "NSW" | "QLD";
  const aliases = CATEGORY_ALIASES[tradeSlug]?.[stateKey] ?? [];
  const normReturned = normaliseCategory(returned);
  if (normReturned.length === 0) return false;

  for (const alias of aliases) {
    if (normReturned === alias) return true;
    if (normReturned.includes(alias)) return true;
    if (alias.includes(normReturned) && normReturned.length >= 5) return true;
  }

  // Fallback: also accept anything that matches an `expected_categories`
  // entry on the requirement (the old strict list). Keeps existing trades
  // working even if we haven't added explicit aliases above.
  const requirement = getLicenceRequirement(tradeSlug, state);
  if (requirement && requirement !== null) {
    for (const expected of requirement.expected_categories) {
      if (normaliseCategory(expected) === normReturned) return true;
    }
  }

  return false;
}

/**
 * Reverse lookup: given the licence's authorised CLASSES (the API's
 * `classes` array — e.g. ["General Concretor"]), return the BLDESY trade
 * slug that those classes would accept under `isCategoryAcceptable`.
 *
 * Used to suggest the right trade in rejection messages. When a user
 * with a Concretor licence picks "Builder" as their trade, this lets us
 * say "this licence is for Concreter — switch your trade to Concreter
 * and try again" instead of a dead-end "doesn't match" error.
 *
 * Returns the first matching trade slug, or null if no trade in our
 * map accepts any of the given classes.
 */
export function suggestTradeFromClasses(
  classes: string[],
  state: string,
): string | null {
  if (!classes || classes.length === 0) return null;
  for (const tradeSlug of Object.keys(CATEGORY_ALIASES)) {
    for (const cls of classes) {
      if (isCategoryAcceptable(tradeSlug, state, cls)) {
        return tradeSlug;
      }
    }
  }
  return null;
}
