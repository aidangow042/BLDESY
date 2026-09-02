// AUTO-SYNCED from ~/bldesy-web/__tests__/founding-zones.test.ts by scripts/sync-web-libs.mjs — DO NOT EDIT HERE.
// Change the website original, then run: npm run sync:web

import { describe, it, expect } from "vitest";
import {
  FOUNDING_ZONES,
  FOUNDING_SUBURBS,
  getFoundingZone,
  parseServiceAreas,
  buildServiceAreas,
  regionsCoverPoint,
  coverageKeysForPoint,
  coverageIncludesPoint,
  zoneCoverageKind,
  describeCoverage,
  describeCanCover,
  isWithinLaunchBaseRadius,
  MAX_BASE_DISTANCE_KM,
} from "@/lib/web/service-areas";

// Real-world coordinates for representative suburbs (one per zone plus
// edge-of-zone members) — deliberately NOT sourced from au-locations.json,
// which mislocates several inner-city names (e.g. "potts point").
const KNOWN_POINTS: Array<{ suburb: string; zone: string; lat: number; lng: number }> = [
  { suburb: "Surry Hills", zone: "Inner City / CBD", lat: -33.8845, lng: 151.2122 },
  { suburb: "Camperdown", zone: "Inner City / CBD", lat: -33.8897, lng: 151.1767 },
  { suburb: "Potts Point", zone: "Inner City / CBD", lat: -33.8679, lng: 151.2254 },
  { suburb: "Bondi Beach", zone: "Upper Eastern", lat: -33.8908, lng: 151.2743 },
  { suburb: "Watsons Bay", zone: "Upper Eastern", lat: -33.8438, lng: 151.2811 },
  { suburb: "Maroubra", zone: "Lower Eastern + South", lat: -33.9500, lng: 151.2362 },
  { suburb: "La Perouse", zone: "Lower Eastern + South", lat: -33.9870, lng: 151.2320 },
  { suburb: "Redfern", zone: "Lower Eastern + South", lat: -33.8930, lng: 151.2040 },
  { suburb: "Marrickville", zone: "Lower Inner West", lat: -33.9110, lng: 151.1550 },
  { suburb: "Croydon Park", zone: "Lower Inner West", lat: -33.8988, lng: 151.1021 },
  { suburb: "Balmain", zone: "Upper Inner West", lat: -33.8581, lng: 151.1795 },
  { suburb: "Rhodes", zone: "Upper Inner West", lat: -33.8284, lng: 151.0888 },
  { suburb: "Strathfield", zone: "Upper Inner West", lat: -33.8791, lng: 151.0824 },
  { suburb: "Homebush West", zone: "Upper Inner West", lat: -33.8655, lng: 151.0664 },
  { suburb: "Mosman", zone: "Lower North Shore", lat: -33.8283, lng: 151.2442 },
  { suburb: "Lane Cove", zone: "Lower North Shore", lat: -33.8136, lng: 151.1664 },
  { suburb: "Longueville", zone: "Lower North Shore", lat: -33.8305, lng: 151.1668 },
  { suburb: "Chatswood", zone: "Upper North Shore", lat: -33.7961, lng: 151.1832 },
  { suburb: "Killara", zone: "Upper North Shore", lat: -33.7663, lng: 151.1621 },
  { suburb: "Gladesville", zone: "Northern Suburbs", lat: -33.8340, lng: 151.1250 },
  { suburb: "West Ryde", zone: "Northern Suburbs", lat: -33.8074, lng: 151.0881 },
  { suburb: "Woolwich", zone: "Northern Suburbs", lat: -33.8412, lng: 151.1712 },
  { suburb: "Manly", zone: "Northern Beaches", lat: -33.7971, lng: 151.2857 },
  { suburb: "Seaforth", zone: "Northern Beaches", lat: -33.7995, lng: 151.2450 },
];

describe("FOUNDING_ZONES data", () => {
  it("has 9 zones totalling 179 suburbs with the agreed per-zone counts", () => {
    expect(FOUNDING_ZONES).toHaveLength(9);
    const counts = Object.fromEntries(FOUNDING_ZONES.map((z) => [z.name, z.suburbs.length]));
    expect(counts).toEqual({
      // 19 from the spreadsheet + "Sydney" (the dataset's name for the CBD
      // locality, needed so the typeahead can offer it) + Darlington (map-hole
      // fix — it was the one unclaimed suburb inside the launch footprint).
      "Inner City / CBD": 21,
      "Upper Eastern": 20,
      "Lower Eastern + South": 28,
      "Lower Inner West": 19,
      "Upper Inner West": 30,
      "Lower North Shore": 28,
      "Upper North Shore": 14,
      "Northern Suburbs": 13,
      "Northern Beaches": 6,
    });
    expect(FOUNDING_SUBURBS.size).toBe(179);
  });

  it("has no duplicate suburbs across zones", () => {
    const all = FOUNDING_ZONES.flatMap((z) => z.suburbs.map((s) => s.toLowerCase()));
    expect(new Set(all).size).toBe(all.length);
  });

  it("has unique names and slugs", () => {
    expect(new Set(FOUNDING_ZONES.map((z) => z.name)).size).toBe(9);
    expect(new Set(FOUNDING_ZONES.map((z) => z.slug)).size).toBe(9);
  });

  it("getFoundingZone is case-insensitive and misses cleanly", () => {
    expect(getFoundingZone("lower inner west")?.name).toBe("Lower Inner West");
    expect(getFoundingZone(" Upper Eastern ")?.name).toBe("Upper Eastern");
    expect(getFoundingZone("Sydney")).toBeUndefined();
  });
});

describe("zone circles cover their suburbs", () => {
  for (const p of KNOWN_POINTS) {
    it(`${p.suburb} sits inside the ${p.zone} circle`, () => {
      expect(regionsCoverPoint([p.zone], p.lat, p.lng)).toBe(true);
    });
  }

  it("a zone does not cover far-away points", () => {
    // Penrith — well outside every founding zone.
    for (const z of FOUNDING_ZONES) {
      expect(regionsCoverPoint([z.name], -33.751, 150.694)).toBe(false);
    }
  });
});

describe("service_areas integration", () => {
  it("zone entries round-trip through parse/build unchanged", () => {
    const areas = ["Newtown", "region:Lower Inner West", "radius:30", "state:NSW"];
    const cov = parseServiceAreas(areas);
    expect(cov.regions).toEqual(["Lower Inner West"]);
    // buildServiceAreas orders suburbs → radius → regions → cover → states.
    expect(buildServiceAreas(cov)).toEqual([
      "Newtown",
      "radius:30",
      "region:Lower Inner West",
      "state:NSW",
    ]);
  });

  it("cover: entries round-trip and never leak into suburbs", () => {
    // The fallthrough branch of parseServiceAreas treats any unrecognised
    // entry as a suburb name — a cover: entry landing there would be read as
    // a suburb called "cover:Upper Inner West". This is the regression guard.
    const areas = [
      "Newtown",
      "region:Lower Inner West",
      "cover:Upper Inner West",
      "cover:Lower North Shore",
    ];
    const cov = parseServiceAreas(areas);
    expect(cov.suburbs).toEqual(["Newtown"]);
    expect(cov.regions).toEqual(["Lower Inner West"]);
    expect(cov.coverRegions).toEqual(["Upper Inner West", "Lower North Shore"]);
    expect(buildServiceAreas(cov)).toEqual(areas);
  });

  it("parses cover: case-insensitively and dedupes", () => {
    const cov = parseServiceAreas([
      "COVER:Upper Eastern",
      "cover:upper eastern",
    ]);
    expect(cov.coverRegions).toEqual(["Upper Eastern"]);
    expect(cov.suburbs).toEqual([]);
  });

  it("resolves a zone claimed as both Primary and Can cover in Primary's favour", () => {
    const cov = parseServiceAreas([
      "region:Upper Eastern",
      "cover:Upper Eastern",
      "cover:Lower North Shore",
    ]);
    expect(cov.regions).toEqual(["Upper Eastern"]);
    expect(cov.coverRegions).toEqual(["Lower North Shore"]);
  });

  it("coverageKeysForPoint includes the containing zone (and still the metro/state keys)", () => {
    // Bondi Beach → Upper Eastern zone + Sydney metro + NSW.
    const keys = coverageKeysForPoint(-33.8908, 151.2743);
    expect(keys).toContain("region:Upper Eastern");
    expect(keys).toContain("region:Sydney");
    expect(keys).toContain("state:NSW");
    expect(keys).not.toContain("region:Lower Inner West");
  });

  it("coverageKeysForPoint emits a cover: key beside every region: key", () => {
    // Without this the single DB array-overlap filter would never find a
    // tradie whose only claim on the searched area is Can cover.
    const keys = coverageKeysForPoint(-33.8908, 151.2743);
    expect(keys).toContain("cover:Upper Eastern");
    expect(keys).toContain("cover:Sydney");
    expect(keys).not.toContain("cover:Lower Inner West");
  });

  it("coverageKeysForPoint outside all zones returns no zone keys", () => {
    const keys = coverageKeysForPoint(-33.751, 150.694); // Penrith
    for (const z of FOUNDING_ZONES) {
      expect(keys).not.toContain(`region:${z.name}`);
      expect(keys).not.toContain(`cover:${z.name}`);
    }
  });
});

describe("base-suburb radius (where a tradie LIVES, not where they work)", () => {
  // Real coordinates from lib/au-locations.json, distances measured from the
  // Sydney CBD anchor. The named towns are the ones the 120km call was made on.
  const IN: Array<[string, number, number]> = [
    ["Sydney CBD", -33.8688, 151.2093],
    ["Blacktown (30km)", -33.7688, 150.9063],
    ["Penrith (51km)", -33.751, 150.694],
    ["Campbelltown (54km)", -34.0650, 150.8142],
    ["Gosford — Central Coast (60km)", -33.4254, 151.3418],
    ["Wollongong (69km)", -34.4278, 150.8931],
    ["Katoomba — Blue Mountains (72km)", -33.7125, 150.3119],
    ["Newcastle (117km)", -32.9283, 151.7817],
  ];
  const OUT: Array<[string, number, number]> = [
    ["Nowra (143km)", -34.8846, 150.6006],
    ["Bathurst (160km)", -33.4193, 149.5775],
    ["Wagga Wagga (376km)", -35.1082, 147.3598],
    ["Albury (450km)", -36.0737, 146.9135],
    ["Byron Bay (622km)", -28.6474, 153.6020],
    ["Broken Hill (943km)", -31.9560, 141.4650],
    ["Melbourne (714km)", -37.8136, 144.9631],
  ];

  for (const [name, lat, lng] of IN) {
    it(`allows ${name}`, () => {
      expect(isWithinLaunchBaseRadius(lat, lng)).toBe(true);
    });
  }
  for (const [name, lat, lng] of OUT) {
    it(`rejects ${name}`, () => {
      expect(isWithinLaunchBaseRadius(lat, lng)).toBe(false);
    });
  }

  it("is a much tighter gate than 'has a NSW postcode'", () => {
    // The first attempt gated on state, which let every one of these through.
    for (const [, lat, lng] of OUT.slice(0, 6)) {
      expect(isWithinLaunchBaseRadius(lat, lng)).toBe(false);
    }
    expect(MAX_BASE_DISTANCE_KM).toBe(120);
  });

  it("is independent of the founding zones — being in range is not coverage", () => {
    // Newcastle is inside the base radius but inside no founding zone. Living
    // in range lets you sign up; it never implies you cover anywhere.
    expect(isWithinLaunchBaseRadius(-32.9283, 151.7817)).toBe(true);
    for (const z of FOUNDING_ZONES) {
      expect(regionsCoverPoint([z.name], -32.9283, 151.7817)).toBe(false);
    }
  });
});

describe("zoneCoverageKind", () => {
  // Bondi Beach sits in Upper Eastern; Marrickville in Lower Inner West.
  const bondi = { latitude: -33.8908, longitude: 151.2743 };
  const marrickville = { latitude: -33.911, longitude: 151.155 };

  it("returns primary for a region: match", () => {
    const cov = parseServiceAreas(["region:Upper Eastern"]);
    expect(zoneCoverageKind(cov, bondi)).toBe("primary");
  });

  it("returns cover for a cover:-only match", () => {
    const cov = parseServiceAreas(["cover:Upper Eastern"]);
    expect(zoneCoverageKind(cov, bondi)).toBe("cover");
  });

  it("prefers primary when a tradie holds both kinds covering the point", () => {
    const cov = parseServiceAreas(["region:Sydney", "cover:Upper Eastern"]);
    expect(zoneCoverageKind(cov, bondi)).toBe("primary");
  });

  it("treats whole-state coverage as primary", () => {
    const cov = parseServiceAreas(["state:NSW"]);
    expect(zoneCoverageKind(cov, bondi, "NSW")).toBe("primary");
  });

  it("returns null when neither kind reaches the point", () => {
    const cov = parseServiceAreas(["region:Upper Eastern", "cover:Lower North Shore"]);
    expect(zoneCoverageKind(cov, marrickville)).toBeNull();
  });

  it("does not treat a plain base-suburb entry as coverage", () => {
    const cov = parseServiceAreas(["Bondi Beach"]);
    expect(zoneCoverageKind(cov, bondi)).toBeNull();
  });

  it("coverageIncludesPoint stays true for Can cover — it is the eligibility gate", () => {
    // Ranking demotes Can cover; the filter must never exclude it, or those
    // tradies vanish from results instead of ranking lower.
    const cov = parseServiceAreas(["cover:Upper Eastern"]);
    expect(coverageIncludesPoint(cov, bondi)).toBe(true);
    expect(coverageIncludesPoint(cov, marrickville)).toBe(false);
  });
});

describe("coverage display", () => {
  it("describeCoverage summarises Primary only; describeCanCover the rest", () => {
    const cov = parseServiceAreas([
      "region:Lower Inner West",
      "cover:Upper Inner West",
      "state:NSW",
    ]);
    expect(describeCoverage(cov)).toBe("Lower Inner West · all of NSW");
    expect(describeCanCover(cov)).toBe("Upper Inner West");
  });

  it("both return null when nothing is set", () => {
    const cov = parseServiceAreas(["Newtown"]);
    expect(describeCoverage(cov)).toBeNull();
    expect(describeCanCover(cov)).toBeNull();
  });
});
