// AUTO-SYNCED from ~/bldesy-web/lib/service-areas.ts by scripts/sync-web-libs.mjs — DO NOT EDIT HERE.
// Change the website original, then run: npm run sync:web

/**
 * Region-level service coverage shared by profiles, matching and display.
 *
 * builder_profiles.service_areas is a text[] using a prefix convention:
 *   - "Surry Hills"      plain suburb name
 *   - "radius:30"        travel radius (km) from the home-base lat/lng
 *   - "region:Sydney"    PRIMARY coverage — a city/metro or founding zone the
 *                        tradie actively wants work in. MULTIPLE entries
 *                        allowed, so a big builder can cover Sydney AND
 *                        Newcastle.
 *   - "cover:Balmain"    CAN COVER — same namespace and same circle test as
 *                        `region:`, but flagged as "I'll take work here, it's
 *                        just not my focus". Ranks below a `region:` match and
 *                        never counts toward a trade × zone ceiling.
 *   - "state:QLD"        whole-state coverage (counts as PRIMARY)
 *
 * The `region:` / `cover:` split is the storage half of the Base suburb /
 * Primary areas / Can cover model. Base suburb is the scalar
 * builder_profiles.suburb column — it is NOT a coverage claim and never
 * belongs in this array.
 *
 * (Pre-existing rows may hold a single free-text "region:" entry from the old
 * "general location" field — parse keeps any unknown region name so nothing
 * is lost on display.)
 *
 * Isomorphic on purpose: no JSON databases or server-only imports, so both
 * the client job feed and server matching can use the same coverage test.
 */

export const AU_STATES = [
  "NSW",
  "VIC",
  "QLD",
  "WA",
  "SA",
  "TAS",
  "ACT",
  "NT",
] as const;
export type AuState = (typeof AU_STATES)[number];

export interface CityRegion {
  name: string;
  state: AuState;
  latitude: number;
  longitude: number;
  /** Metro radius (km) a "covers this city" claim implies. */
  radiusKm: number;
}

// Mirrors lib/locations.ts MAJOR_LOCATIONS, with centre coords + metro radius
// so coverage is geo-testable. Capitals get a wider metro than regional hubs.
export const CITY_REGIONS: CityRegion[] = [
  { name: "Sydney", state: "NSW", latitude: -33.8688, longitude: 151.2093, radiusKm: 50 },
  { name: "Newcastle", state: "NSW", latitude: -32.9283, longitude: 151.7817, radiusKm: 35 },
  { name: "Wollongong", state: "NSW", latitude: -34.4278, longitude: 150.8931, radiusKm: 30 },
  { name: "Central Coast", state: "NSW", latitude: -33.4267, longitude: 151.3417, radiusKm: 30 },
  { name: "Parramatta", state: "NSW", latitude: -33.815, longitude: 151.0, radiusKm: 20 },
  { name: "Penrith", state: "NSW", latitude: -33.751, longitude: 150.694, radiusKm: 20 },
  { name: "Liverpool", state: "NSW", latitude: -33.9203, longitude: 150.9213, radiusKm: 20 },
  { name: "Coffs Harbour", state: "NSW", latitude: -30.2963, longitude: 153.1135, radiusKm: 30 },
  { name: "Wagga Wagga", state: "NSW", latitude: -35.1082, longitude: 147.3598, radiusKm: 30 },
  { name: "Albury", state: "NSW", latitude: -36.0737, longitude: 146.9135, radiusKm: 30 },
  { name: "Melbourne", state: "VIC", latitude: -37.8136, longitude: 144.9631, radiusKm: 50 },
  { name: "Geelong", state: "VIC", latitude: -38.1499, longitude: 144.3617, radiusKm: 30 },
  { name: "Ballarat", state: "VIC", latitude: -37.5622, longitude: 143.8503, radiusKm: 30 },
  { name: "Bendigo", state: "VIC", latitude: -36.7570, longitude: 144.2794, radiusKm: 30 },
  { name: "Frankston", state: "VIC", latitude: -38.1413, longitude: 145.1225, radiusKm: 20 },
  { name: "Dandenong", state: "VIC", latitude: -37.9874, longitude: 145.2149, radiusKm: 20 },
  { name: "Brisbane", state: "QLD", latitude: -27.4698, longitude: 153.0251, radiusKm: 50 },
  { name: "Gold Coast", state: "QLD", latitude: -28.0167, longitude: 153.4000, radiusKm: 35 },
  { name: "Sunshine Coast", state: "QLD", latitude: -26.6500, longitude: 153.0667, radiusKm: 35 },
  { name: "Townsville", state: "QLD", latitude: -19.2590, longitude: 146.8169, radiusKm: 30 },
  { name: "Cairns", state: "QLD", latitude: -16.9186, longitude: 145.7781, radiusKm: 30 },
  { name: "Toowoomba", state: "QLD", latitude: -27.5598, longitude: 151.9507, radiusKm: 30 },
  { name: "Ipswich", state: "QLD", latitude: -27.6171, longitude: 152.7636, radiusKm: 25 },
  { name: "Mackay", state: "QLD", latitude: -21.1411, longitude: 149.1860, radiusKm: 30 },
  { name: "Rockhampton", state: "QLD", latitude: -23.3786, longitude: 150.5089, radiusKm: 30 },
  { name: "Perth", state: "WA", latitude: -31.9523, longitude: 115.8613, radiusKm: 50 },
  { name: "Fremantle", state: "WA", latitude: -32.0560, longitude: 115.7471, radiusKm: 20 },
  { name: "Mandurah", state: "WA", latitude: -32.5269, longitude: 115.7217, radiusKm: 25 },
  { name: "Bunbury", state: "WA", latitude: -33.3271, longitude: 115.6414, radiusKm: 30 },
  { name: "Geraldton", state: "WA", latitude: -28.7744, longitude: 114.6089, radiusKm: 30 },
  { name: "Adelaide", state: "SA", latitude: -34.9285, longitude: 138.6007, radiusKm: 40 },
  { name: "Mount Gambier", state: "SA", latitude: -37.8284, longitude: 140.7807, radiusKm: 30 },
  { name: "Whyalla", state: "SA", latitude: -33.0328, longitude: 137.5610, radiusKm: 30 },
  { name: "Hobart", state: "TAS", latitude: -42.8821, longitude: 147.3272, radiusKm: 35 },
  { name: "Launceston", state: "TAS", latitude: -41.4391, longitude: 147.1358, radiusKm: 30 },
  { name: "Devonport", state: "TAS", latitude: -41.1801, longitude: 146.3503, radiusKm: 25 },
  { name: "Canberra", state: "ACT", latitude: -35.2809, longitude: 149.1300, radiusKm: 35 },
  { name: "Darwin", state: "NT", latitude: -12.4634, longitude: 130.8456, radiusKm: 35 },
  { name: "Alice Springs", state: "NT", latitude: -23.6980, longitude: 133.8807, radiusKm: 30 },
];

const CITY_BY_NAME: Record<string, CityRegion> = Object.fromEntries(
  CITY_REGIONS.map((c) => [c.name.toLowerCase(), c]),
);

export function getCityRegion(name: string): CityRegion | undefined {
  return CITY_BY_NAME[name.trim().toLowerCase()];
}

/* ── founding zones (inner-Sydney launch beachhead) ──────────────── */

export interface FoundingZone {
  /** Display name — stored verbatim in service_areas as `region:<name>`. */
  name: string;
  /** Stable key for UI state / query params. */
  slug: string;
  /** Zone circle used by the geo coverage tests, like a CityRegion's metro. */
  latitude: number;
  longitude: number;
  radiusKm: number;
  /** The member suburbs a zone claim covers (display + typeahead filter). */
  suburbs: string[];
}

// The 175-suburb inner-Sydney beachhead — the only areas selectable during
// onboarding while BLDESY launches. Expanding coverage = adding zones here.
// Circles are hand-set from real geography (the bundled au-locations dataset
// mislocates several inner-city names, e.g. "potts point"), sized to enclose
// every member suburb with ~1km of buffer; slight overlap into neighbouring
// suburbs is deliberate generosity, matching how metro CITY_REGIONS behave.
export const FOUNDING_ZONES: FoundingZone[] = [
  {
    name: "Inner City / CBD",
    slug: "inner-city-cbd",
    latitude: -33.876,
    longitude: 151.207,
    radiusKm: 4,
    suburbs: [
      // "Sydney" is the au-locations dataset's name for the CBD locality —
      // without it the typeahead (filtered to FOUNDING_SUBURBS) can never
      // offer a CBD-based tradie their own home suburb. "CBD" stays for the
      // zone display card.
      "Sydney", "CBD", "Haymarket", "The Rocks", "Dawes Point", "Millers Point",
      "Barangaroo", "Pyrmont", "Ultimo", "Chippendale", "Darlington", "Glebe",
      "Forest Lodge", "Camperdown", "Darlinghurst", "Surry Hills",
      "Potts Point", "Woolloomooloo", "Elizabeth Bay", "Rushcutters Bay",
      "Kings Cross",
    ],
  },
  {
    name: "Upper Eastern",
    slug: "upper-eastern",
    latitude: -33.883,
    longitude: 151.257,
    radiusKm: 6,
    suburbs: [
      "Edgecliff", "Darling Point", "Point Piper", "Double Bay",
      "Bellevue Hill", "Woollahra", "Paddington", "Centennial Park",
      "Queens Park", "Rose Bay", "Vaucluse", "Watsons Bay", "Dover Heights",
      "North Bondi", "Bondi", "Bondi Beach", "Bondi Junction", "Tamarama",
      "Bronte", "Waverley",
    ],
  },
  {
    name: "Lower Eastern + South",
    slug: "lower-eastern-south",
    latitude: -33.938,
    longitude: 151.221,
    radiusKm: 7,
    suburbs: [
      "Redfern", "Waterloo", "Zetland", "Rosebery", "Alexandria",
      "Beaconsfield", "Eveleigh", "Moore Park", "Kensington", "Kingsford",
      "Randwick", "Clovelly", "Coogee", "South Coogee", "Maroubra",
      "Pagewood", "Hillsdale", "Eastgardens", "Daceyville", "Chifley",
      "Malabar", "Little Bay", "La Perouse", "Matraville", "Mascot",
      "Botany", "Banksmeadow", "Eastlakes",
    ],
  },
  {
    name: "Lower Inner West",
    slug: "lower-inner-west",
    latitude: -33.905,
    longitude: 151.146,
    radiusKm: 6,
    suburbs: [
      "Erskineville", "Newtown", "Enmore", "Stanmore", "Petersham",
      "Lewisham", "Marrickville", "Dulwich Hill", "Tempe", "St Peters",
      "Sydenham", "Summer Hill", "Ashfield", "Ashbury", "Hurlstone Park",
      "Canterbury", "Earlwood", "Croydon", "Croydon Park",
    ],
  },
  {
    name: "Upper Inner West",
    slug: "upper-inner-west",
    latitude: -33.868,
    longitude: 151.126,
    radiusKm: 7,
    suburbs: [
      "Annandale", "Leichhardt", "Lilyfield", "Rozelle", "Balmain",
      "Balmain East", "Birchgrove", "Haberfield", "Five Dock", "Russell Lea",
      "Wareemba", "Abbotsford", "Chiswick", "Drummoyne", "Rodd Point",
      "Canada Bay", "Concord", "Concord West", "Cabarita", "Mortlake",
      "Breakfast Point", "Rhodes", "Strathfield", "Strathfield South",
      "North Strathfield", "Burwood", "Burwood Heights", "Homebush",
      "Homebush West", "Enfield",
    ],
  },
  {
    name: "Lower North Shore",
    slug: "lower-north-shore",
    latitude: -33.822,
    longitude: 151.2,
    radiusKm: 6,
    suburbs: [
      "Kirribilli", "Milsons Point", "McMahons Point", "Lavender Bay",
      "North Sydney", "Waverton", "Wollstonecraft", "Crows Nest",
      "St Leonards", "Naremburn", "Cammeray", "Northbridge", "Greenwich",
      "Artarmon", "Lane Cove", "Lane Cove North", "Lane Cove West",
      "Longueville", "Northwood", "Riverview", "Linley Point", "Cremorne",
      "Cremorne Point", "Neutral Bay", "Kurraba Point", "Mosman",
      "Balmoral", "Beauty Point",
    ],
  },
  {
    name: "Upper North Shore",
    slug: "upper-north-shore",
    latitude: -33.783,
    longitude: 151.18,
    radiusKm: 6,
    suburbs: [
      "Chatswood", "Chatswood West", "Willoughby", "Willoughby East",
      "North Willoughby", "Castlecrag", "Castle Cove", "Middle Cove",
      "Roseville", "Roseville Chase", "Lindfield", "East Lindfield",
      "Killara", "West Pymble",
    ],
  },
  {
    name: "Northern Suburbs",
    slug: "northern-suburbs",
    latitude: -33.815,
    longitude: 151.125,
    radiusKm: 6,
    suburbs: [
      "Ryde", "East Ryde", "North Ryde", "West Ryde", "Meadowbank",
      "Putney", "Tennyson Point", "Gladesville", "Henley",
      "Huntleys Point", "Hunters Hill", "Woolwich", "Boronia Park",
    ],
  },
  {
    name: "Northern Beaches",
    slug: "northern-beaches",
    latitude: -33.8,
    longitude: 151.265,
    radiusKm: 4,
    suburbs: [
      "Manly", "Fairlight", "Balgowlah", "Balgowlah Heights", "Seaforth",
      "Clontarf",
    ],
  },
];

const ZONE_BY_NAME: Record<string, FoundingZone> = Object.fromEntries(
  FOUNDING_ZONES.map((z) => [z.name.toLowerCase(), z]),
);

export function getFoundingZone(name: string): FoundingZone | undefined {
  return ZONE_BY_NAME[name.trim().toLowerCase()];
}

/** Lowercased names of every founding-zone suburb (typeahead filtering). */
export const FOUNDING_SUBURBS: ReadonlySet<string> = new Set(
  FOUNDING_ZONES.flatMap((z) => z.suburbs.map((s) => s.toLowerCase())),
);

/**
 * Lowercased name → the canonical spelling in the lists above.
 *
 * Those names are hand-written, so they carry casing no rule can derive:
 * "McMahons Point" is the one that proves it, and both Postgres `initcap()`
 * and a naive title-caser flatten it to "Mcmahons Point". Anything reconciling
 * a user-typed suburb to a display form should consult this FIRST — see
 * canonicaliseSuburb() in lib/suburbs.ts.
 */
export const FOUNDING_SUBURB_NAMES: ReadonlyMap<string, string> = new Map(
  FOUNDING_ZONES.flatMap((z) => z.suburbs.map((s) => [s.toLowerCase(), s] as const)),
);

/* ── coverage claim (marketing copy) ──────────────────────────────── */

const ZONE_COUNT_WORDS = [
  "zero", "one", "two", "three", "four", "five", "six",
  "seven", "eight", "nine", "ten", "eleven", "twelve",
] as const;

/**
 * THE coverage claim for prose — every "nine zones, 175+ suburbs" on the site
 * renders from here, so expanding FOUNDING_ZONES updates the copy everywhere
 * at once. Suburb count rounds DOWN to the nearest 5 ("175+" stays true even
 * while the exact number wobbles with zone edits).
 */
export const COVERAGE = (() => {
  const zones = FOUNDING_ZONES.length;
  const suburbs = `${Math.floor(FOUNDING_SUBURBS.size / 5) * 5}+`;
  const zonesWord = ZONE_COUNT_WORDS[zones] ?? String(zones);
  return {
    zones,
    zonesWord,
    suburbs,
    /** e.g. "nine zones, 175+ suburbs" */
    line: `${zonesWord} zones, ${suburbs} suburbs`,
  } as const;
})();

/* ── base-suburb radius (where a tradie LIVES) ────────────────────── */

/**
 * Sydney CBD — the anchor for the base-suburb radius. Same coordinates as the
 * "Sydney" CITY_REGIONS entry.
 */
export const LAUNCH_BASE_ORIGIN = { latitude: -33.8688, longitude: 151.2093 };

/**
 * How far from the CBD a tradie may be BASED. Nothing to do with where they
 * WORK — that's the founding zones, which stay inner-Sydney and are enforced
 * by the zone picker requiring at least one Primary area.
 *
 * 120km is the commuter belt: it takes in the whole Sydney metro, the Central
 * Coast (60km), the Blue Mountains through Lithgow (72–100km), the Illawarra
 * (69–96km) and Newcastle (117km), while excluding Bathurst (160km), Nowra
 * (143km) and regional NSW proper — Wagga (376km), Albury (450km), Byron
 * (622km), Broken Hill (943km). 1,525 of the dataset's 16,220 localities.
 *
 * A plain NSW check was the first attempt and was far too loose: every one of
 * those regional towns has a NSW postcode.
 */
export const MAX_BASE_DISTANCE_KM = 120;

/**
 * Is this home base close enough to the launch area to be plausible?
 *
 * Callers should treat an unresolvable location as ALLOWED rather than
 * blocking a real signup on a gap in the bundled dataset — the quality gate
 * and human review are the backstop.
 */
export function isWithinLaunchBaseRadius(
  latitude: number,
  longitude: number,
): boolean {
  return (
    haversineKm(
      LAUNCH_BASE_ORIGIN.latitude,
      LAUNCH_BASE_ORIGIN.longitude,
      latitude,
      longitude,
    ) <= MAX_BASE_DISTANCE_KM
  );
}

/* ── service_areas array parse/build ─────────────────────────────── */

export interface ServiceCoverage {
  /** Plain suburb names. */
  suburbs: string[];
  /** Travel radius (km) from home base, when set. */
  radiusKm: number | null;
  /**
   * PRIMARY coverage names from `region:` entries — founding zones, metro
   * cities, or legacy free text. These are the areas the tradie actively
   * wants work in, and the only ones counted against a trade × zone ceiling.
   */
  regions: string[];
  /** CAN COVER names from `cover:` entries — same namespace, lower priority. */
  coverRegions: string[];
  /** State codes from `state:` entries. Treated as PRIMARY coverage. */
  states: AuState[];
}

/** Which side of the Primary / Can cover split a coverage match came from. */
export type CoverageKind = "primary" | "cover";

function pushUnique(list: string[], name: string): void {
  if (name && !list.some((r) => r.toLowerCase() === name.toLowerCase())) {
    list.push(name);
  }
}

export function parseServiceAreas(areas: string[] | null | undefined): ServiceCoverage {
  const out: ServiceCoverage = {
    suburbs: [],
    radiusKm: null,
    regions: [],
    coverRegions: [],
    states: [],
  };
  for (const raw of areas ?? []) {
    const entry = (raw ?? "").trim();
    if (!entry) continue;
    const lower = entry.toLowerCase();
    if (lower.startsWith("radius:")) {
      const n = parseInt(entry.slice("radius:".length), 10);
      if (Number.isFinite(n) && n > 0) out.radiusKm = n;
    } else if (lower.startsWith("region:")) {
      pushUnique(out.regions, entry.slice("region:".length).trim());
    } else if (lower.startsWith("cover:")) {
      // MUST stay ahead of the unprefixed fallthrough below — otherwise a
      // `cover:` entry is silently read as a suburb name called "cover:...".
      pushUnique(out.coverRegions, entry.slice("cover:".length).trim());
    } else if (lower.startsWith("state:")) {
      const code = entry.slice("state:".length).trim().toUpperCase();
      if ((AU_STATES as readonly string[]).includes(code) && !out.states.includes(code as AuState)) {
        out.states.push(code as AuState);
      }
    } else {
      out.suburbs.push(entry);
    }
  }
  // A zone claimed as both Primary and Can cover is Primary — the pickers make
  // the two mutually exclusive, but a hand-edited row must not double-count.
  out.coverRegions = out.coverRegions.filter(
    (c) => !out.regions.some((r) => r.toLowerCase() === c.toLowerCase()),
  );
  return out;
}

export function buildServiceAreas(coverage: ServiceCoverage): string[] {
  return [
    ...coverage.suburbs,
    ...(coverage.radiusKm ? [`radius:${coverage.radiusKm}`] : []),
    ...coverage.regions.map((r) => `region:${r}`),
    ...coverage.coverRegions.map((r) => `cover:${r}`),
    ...coverage.states.map((s) => `state:${s}`),
  ];
}

/* ── geo coverage tests ──────────────────────────────────────────── */

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** True if the point sits inside any covered city's metro (or founding
 * zone's) radius. Zone names live in the same `region:` namespace. */
export function regionsCoverPoint(
  regions: string[],
  latitude: number,
  longitude: number,
): boolean {
  return regions.some((name) => {
    const area = getCityRegion(name) ?? getFoundingZone(name);
    if (!area) return false;
    return haversineKm(area.latitude, area.longitude, latitude, longitude) <= area.radiusKm;
  });
}

/**
 * Which side of the Primary / Can cover split covers this point, or null when
 * neither does. Primary wins whenever both would match.
 *
 * This is the one helper ranking and job-alert ordering both read, so the
 * homeowner search score and the alert fan-out can never disagree about
 * whether a tradie treats an area as their focus.
 */
export function zoneCoverageKind(
  coverage: ServiceCoverage,
  point: { latitude: number; longitude: number },
  pointState?: AuState | null,
): CoverageKind | null {
  if (pointState && coverage.states.includes(pointState)) return "primary";
  if (regionsCoverPoint(coverage.regions, point.latitude, point.longitude)) {
    return "primary";
  }
  if (regionsCoverPoint(coverage.coverRegions, point.latitude, point.longitude)) {
    return "cover";
  }
  return null;
}

/**
 * Full coverage test: covered when the job's state is covered, or the point
 * sits inside a covered city/zone circle — Primary OR Can cover, since this is
 * the *eligibility* gate (search refine, job-match filter). Excluding
 * `cover:` here would filter Can Cover tradies out of results entirely
 * instead of merely ranking them lower. Suburb-name matching stays with
 * callers, as does the travel-radius test.
 */
export function coverageIncludesPoint(
  coverage: ServiceCoverage,
  point: { latitude: number; longitude: number },
  pointState?: AuState | null,
): boolean {
  return zoneCoverageKind(coverage, point, pointState) !== null;
}

/**
 * State of the nearest listed city within 150km, or null when the point is
 * too remote. Metro-centric but good enough as the fallback state hint when
 * the searched text isn't a postcode — shared by the DB-level search filter
 * (via coverageKeysForPoint) and the JS-side refine/scoring so all three
 * agree on whether a `state:` coverage claim includes the point.
 */
export function inferStateForPoint(
  latitude: number,
  longitude: number,
): AuState | null {
  let nearest: { state: AuState; dist: number } | null = null;
  for (const city of CITY_REGIONS) {
    const d = haversineKm(city.latitude, city.longitude, latitude, longitude);
    if (d <= 150 && (!nearest || d < nearest.dist)) {
      nearest = { state: city.state, dist: d };
    }
  }
  return nearest?.state ?? null;
}

/**
 * The `service_areas` entries that would make a profile cover this point:
 * every city/zone whose circle contains it under BOTH the `region:` (Primary)
 * and `cover:` (Can cover) prefixes, plus its state. Used to extend DB-level
 * search filters (`service_areas && keys`) past the home-base bounding box.
 *
 * Emitting both prefixes is what keeps that filter a single array overlap —
 * Can Cover tradies stay eligible with no query restructuring, and ranking
 * sorts out the priority afterwards via zoneCoverageKind(). Dropping the
 * `cover:` keys here would make Can Cover zones invisible to search.
 *
 * When the state isn't supplied, it's inferred from the nearest city within
 * 150km (good enough — region coverage is metro-centric anyway).
 */
export function coverageKeysForPoint(
  latitude: number,
  longitude: number,
  state?: AuState | null,
): string[] {
  const keys: string[] = [];
  const addArea = (name: string) => {
    keys.push(`region:${name}`, `cover:${name}`);
  };
  for (const city of CITY_REGIONS) {
    const d = haversineKm(city.latitude, city.longitude, latitude, longitude);
    if (d <= city.radiusKm) addArea(city.name);
  }
  for (const zone of FOUNDING_ZONES) {
    const d = haversineKm(zone.latitude, zone.longitude, latitude, longitude);
    if (d <= zone.radiusKm) addArea(zone.name);
  }
  const st = state ?? inferStateForPoint(latitude, longitude);
  if (st) keys.push(`state:${st}`);
  return keys;
}

/* ── postcode → state ────────────────────────────────────────────── */

/** Australian postcode ranges per state (4-digit, as used on job posts). */
export function stateForPostcode(postcode: string | null | undefined): AuState | null {
  const pc = parseInt((postcode ?? "").trim(), 10);
  if (!Number.isFinite(pc)) return null;
  // ACT carve-outs sit inside the NSW band, so test them first.
  if ((pc >= 2600 && pc <= 2618) || (pc >= 2900 && pc <= 2920) || (pc >= 200 && pc <= 299)) return "ACT";
  if ((pc >= 1000 && pc <= 2599) || (pc >= 2619 && pc <= 2899) || (pc >= 2921 && pc <= 2999)) return "NSW";
  if ((pc >= 3000 && pc <= 3999) || (pc >= 8000 && pc <= 8999)) return "VIC";
  if ((pc >= 4000 && pc <= 4999) || (pc >= 9000 && pc <= 9999)) return "QLD";
  if (pc >= 5000 && pc <= 5999) return "SA";
  if (pc >= 6000 && pc <= 6999) return "WA";
  if (pc >= 7000 && pc <= 7999) return "TAS";
  if (pc >= 800 && pc <= 999) return "NT";
  return null;
}

/* ── display ─────────────────────────────────────────────────────── */

export const STATE_LABELS: Record<AuState, string> = {
  NSW: "New South Wales",
  VIC: "Victoria",
  QLD: "Queensland",
  WA: "Western Australia",
  SA: "South Australia",
  TAS: "Tasmania",
  ACT: "ACT",
  NT: "Northern Territory",
};

/**
 * "Sydney · Newcastle · all of QLD" style summary of PRIMARY areas; null when
 * nothing set. Can cover areas are summarised separately by describeCanCover
 * so the two never read as one undifferentiated list.
 */
export function describeCoverage(coverage: ServiceCoverage): string | null {
  const parts: string[] = [...coverage.regions];
  const stateBit = coverage.states.length
    ? `all of ${coverage.states.join(", ")}`
    : null;
  if (stateBit) parts.push(stateBit);
  return parts.length ? parts.join(" · ") : null;
}

/** "Balmain · Rozelle" style summary of CAN COVER areas; null when none. */
export function describeCanCover(coverage: ServiceCoverage): string | null {
  return coverage.coverRegions.length ? coverage.coverRegions.join(" · ") : null;
}
