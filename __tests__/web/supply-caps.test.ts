// AUTO-SYNCED from ~/bldesy-web/__tests__/supply-caps.test.ts by scripts/sync-web-libs.mjs — DO NOT EDIT HERE.
// Change the website original, then run: npm run sync:web

import { describe, it, expect } from "vitest";
import {
  DEFAULT_ZONE_CAP,
  TRADE_CAP_OVERRIDES,
  capForTrade,
  primaryZonesCovered,
  coverZonesCovered,
  tallyPrimary,
  tallyCover,
  spotsFromTally,
} from "@/lib/web/supply-caps";
import { FOUNDING_ZONES } from "@/lib/web/service-areas";

describe("capForTrade", () => {
  it("returns the default cap for un-overridden trades", () => {
    expect(capForTrade("electrician")).toBe(DEFAULT_ZONE_CAP);
  });

  it("honours per-trade overrides", () => {
    TRADE_CAP_OVERRIDES.__test_trade = 3;
    try {
      expect(capForTrade("__test_trade")).toBe(3);
    } finally {
      delete TRADE_CAP_OVERRIDES.__test_trade;
    }
  });
});

describe("primaryZonesCovered", () => {
  it("matches a region: entry naming a founding zone", () => {
    const zones = primaryZonesCovered(["region:Lower North Shore"]);
    expect(zones.map((z) => z.slug)).toEqual(["lower-north-shore"]);
  });

  it("matches region names case-insensitively", () => {
    const zones = primaryZonesCovered(["region:lower north shore"]);
    expect(zones.map((z) => z.slug)).toEqual(["lower-north-shore"]);
  });

  it("does NOT infer a zone from a plain base-suburb entry", () => {
    // The pre-split zonesCovered() counted this as coverage, so a tradie's
    // home suburb silently consumed a ceiling spot. Primary is explicit only.
    expect(primaryZonesCovered(["Newtown"])).toEqual([]);
  });

  it("ignores cover: entries — those are not Primary", () => {
    expect(primaryZonesCovered(["cover:Lower Inner West"])).toEqual([]);
  });

  it("ignores non-founding regions, states, and unknown suburbs", () => {
    expect(
      primaryZonesCovered(["region:Melbourne", "state:VIC", "Wagga Wagga"]),
    ).toEqual([]);
  });

  it("dedupes a zone claimed twice", () => {
    const zones = primaryZonesCovered([
      "region:Inner City / CBD",
      "region:inner city / cbd",
      "Surry Hills",
    ]);
    expect(zones.map((z) => z.slug)).toEqual(["inner-city-cbd"]);
  });

  it("handles null and empty", () => {
    expect(primaryZonesCovered(null)).toEqual([]);
    expect(primaryZonesCovered([])).toEqual([]);
  });
});

describe("coverZonesCovered", () => {
  it("matches a cover: entry naming a founding zone", () => {
    const zones = coverZonesCovered(["cover:Upper Inner West"]);
    expect(zones.map((z) => z.slug)).toEqual(["upper-inner-west"]);
  });

  it("ignores region: entries — those are Primary", () => {
    expect(coverZonesCovered(["region:Upper Inner West"])).toEqual([]);
  });

  it("drops a zone that is also claimed as Primary", () => {
    // parseServiceAreas resolves the overlap in Primary's favour so a
    // hand-edited row can never be counted on both sides.
    expect(
      coverZonesCovered(["region:Upper Eastern", "cover:Upper Eastern"]),
    ).toEqual([]);
  });

  it("handles null and empty", () => {
    expect(coverZonesCovered(null)).toEqual([]);
    expect(coverZonesCovered([])).toEqual([]);
  });
});

describe("tallyPrimary", () => {
  it("counts a tradie once per trade per Primary zone", () => {
    const taken = tallyPrimary([
      {
        trade_category: "plumber",
        trade_categories: ["plumber", "gasfitter"],
        service_areas: ["region:Upper Eastern", "region:Lower Inner West"],
      },
    ]);
    // Primary trade deduped against trade_categories; two zones covered.
    expect(taken.get("plumber")?.get("upper-eastern")).toBe(1);
    expect(taken.get("plumber")?.get("lower-inner-west")).toBe(1);
    expect(taken.get("gasfitter")?.get("upper-eastern")).toBe(1);
  });

  it("does not count Can Cover zones against the ceiling", () => {
    const taken = tallyPrimary([
      {
        trade_category: "plumber",
        trade_categories: null,
        service_areas: ["region:Upper Eastern", "cover:Lower Inner West"],
      },
    ]);
    expect(taken.get("plumber")?.get("upper-eastern")).toBe(1);
    expect(taken.get("plumber")?.get("lower-inner-west")).toBeUndefined();
  });

  it("skips rows with no trades, no Primary zones, or base suburb only", () => {
    const taken = tallyPrimary([
      { trade_category: null, trade_categories: null, service_areas: ["region:Upper Eastern"] },
      { trade_category: "plumber", trade_categories: [], service_areas: ["state:VIC"] },
      { trade_category: "plumber", trade_categories: [], service_areas: ["Newtown"] },
      { trade_category: "plumber", trade_categories: [], service_areas: ["cover:Upper Eastern"] },
    ]);
    expect(taken.size).toBe(0);
  });

  it("accumulates across rows", () => {
    const row = {
      trade_category: "electrician",
      trade_categories: null,
      service_areas: ["region:Upper Inner West"],
    };
    const taken = tallyPrimary([row, row, row]);
    expect(taken.get("electrician")?.get("upper-inner-west")).toBe(3);
  });
});

describe("tallyCover", () => {
  it("counts Can Cover zones only", () => {
    const taken = tallyCover([
      {
        trade_category: "plumber",
        trade_categories: null,
        service_areas: ["region:Upper Eastern", "cover:Lower Inner West"],
      },
    ]);
    expect(taken.get("plumber")?.get("lower-inner-west")).toBe(1);
    expect(taken.get("plumber")?.get("upper-eastern")).toBeUndefined();
  });
});

describe("spotsFromTally", () => {
  it("returns every founding zone with remaining = cap - taken, floored at 0", () => {
    const row = {
      trade_category: "electrician",
      trade_categories: null,
      service_areas: ["region:Inner City / CBD"],
    };
    const taken = tallyPrimary(Array.from({ length: DEFAULT_ZONE_CAP + 5 }, () => row));
    const spots = spotsFromTally(taken, "electrician");

    expect(spots).toHaveLength(FOUNDING_ZONES.length);
    const cbd = spots.find((s) => s.zoneSlug === "inner-city-cbd");
    expect(cbd?.taken).toBe(DEFAULT_ZONE_CAP + 5);
    expect(cbd?.remaining).toBe(0);
    const untouched = spots.find((s) => s.zoneSlug === "upper-eastern");
    expect(untouched?.taken).toBe(0);
    expect(untouched?.remaining).toBe(DEFAULT_ZONE_CAP);
  });
});
