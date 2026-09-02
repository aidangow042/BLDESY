// AUTO-SYNCED from ~/bldesy-web/__tests__/builder-scoring.test.ts by scripts/sync-web-libs.mjs — DO NOT EDIT HERE.
// Change the website original, then run: npm run sync:web

import { describe, it, expect } from "vitest";
import {
  scoreBuilder,
  RESPONSE_TIME_POINTS,
  PRIMARY_COVERAGE_FLOOR,
  COVER_COVERAGE_FLOOR,
  type ScorableBuilder,
  type ScoreContext,
} from "@/lib/web/builder-scoring";
import { verifiedCredentialFlags } from "@/lib/web/credentials";
import { inferStateForPoint } from "@/lib/web/service-areas";

/** 2026-07-01T00:00:00Z — fixed clock for next_available_date maths. */
const NOW = Date.UTC(2026, 6, 1);
const SYDNEY = { latitude: -33.8688, longitude: 151.2093 };

function ctx(overrides: Partial<ScoreContext> = {}): ScoreContext {
  return {
    searchCoords: null,
    searchState: null,
    keywords: [],
    specialisations: [],
    now: NOW,
    ...overrides,
  };
}

function builder(overrides: Partial<ScorableBuilder> = {}): ScorableBuilder {
  return {
    business_name: "Test Trades",
    trade_category: "roofer",
    availability: "available",
    ...overrides,
  };
}

/* ── credentials helper ──────────────────────────────────────────── */

describe("verifiedCredentialFlags", () => {
  it("prefers the API-verified JSONB over legacy flags", () => {
    const flags = verifiedCredentialFlags({
      credentials_verified: { licences: [{ verified: true }], abn: { verified: false } },
      credentials: { license_verified: false, abn_verified: true },
    });
    expect(flags.licence).toBe(true); // new format wins
    expect(flags.abn).toBe(false); // new format present → legacy true ignored
    expect(flags.count).toBe(1);
  });

  it("falls back to legacy flags when the new format is absent", () => {
    const flags = verifiedCredentialFlags({
      credentials: { license_verified: true, abn_verified: true, insurance_verified: true },
    });
    expect(flags).toMatchObject({ licence: true, abn: true, insurance: true, count: 3, any: true });
  });

  it("an empty licences array in the new format means NOT verified (no legacy rescue)", () => {
    const flags = verifiedCredentialFlags({
      credentials_verified: { licences: [] },
      credentials: { license_verified: true },
    });
    expect(flags.licence).toBe(false);
  });

  it("nothing verified → any=false, count=0", () => {
    expect(verifiedCredentialFlags({})).toMatchObject({ any: false, count: 0 });
  });
});

/* ── denominator honesty ─────────────────────────────────────────── */

describe("scoreBuilder — components only count when in play", () => {
  it("a perfect always-in-play builder hits the 99 cap on a bare browse", () => {
    // timing 12+8 + creds 10 + reputation 8+6 = 44/44
    const result = scoreBuilder(
      builder({
        response_time: "Within 1 hour",
        credentials: { license_verified: true, abn_verified: true, insurance_verified: true },
        bldesy_score: 100,
      }),
      ctx(),
      { average: 5, count: 20 },
    );
    expect(result.percent).toBe(99); // 100 capped at 99
  });

  it("no-trade browse is NOT deflated by the trade component", () => {
    const result = scoreBuilder(builder(), ctx());
    // avail 12 + rt 0 + creds 0 + neutral reputation 7 = 19/44
    expect(result.percent).toBe(Math.round((19 / 44) * 100));
    expect(result.details.find((d) => d.label === "Related trade")).toBeUndefined();
  });

  it("searching a trade brings 30 trade points into the denominator", () => {
    const result = scoreBuilder(builder(), ctx({ trade: "roofer" }));
    // + primary 30 → 49/74
    expect(result.percent).toBe(Math.round((49 / 74) * 100));
    expect(result.details.some((d) => d.label === "Primary trade")).toBe(true);
  });

  it("secondary trade scores 20/30", () => {
    const result = scoreBuilder(
      builder({ trade_category: "builder", trade_categories: ["roofer"] }),
      ctx({ trade: "roofer" }),
    );
    expect(result.details.some((d) => d.label === "Secondary trade")).toBe(true);
    expect(result.percent).toBe(Math.round((39 / 74) * 100));
  });

  it("a trade param of only commas counts as no trade searched", () => {
    const a = scoreBuilder(builder(), ctx({ trade: ",," }));
    const b = scoreBuilder(builder(), ctx());
    expect(a.percent).toBe(b.percent);
  });
});

/* ── distance ────────────────────────────────────────────────────── */

describe("scoreBuilder — distance", () => {
  it("uses the fixed 30km yardstick, not the builder's radius", () => {
    const nearby = builder({ latitude: -33.8688, longitude: 151.2093 }); // 0km
    const result = scoreBuilder(nearby, ctx({ searchCoords: SYDNEY }));
    const dist = result.details.find((d) => d.label.endsWith("km away"));
    expect(dist?.points).toBe(15);
  });

  it("same distance = same points regardless of declared radius (inflation buys nothing)", () => {
    // ~0.135° lat ≈ 15km north of Sydney
    const at15km = { latitude: -33.7337, longitude: 151.2093 };
    const modest = scoreBuilder(
      builder({ ...at15km, service_areas: ["radius:15"] }),
      ctx({ searchCoords: SYDNEY }),
    );
    const inflated = scoreBuilder(
      builder({ ...at15km, service_areas: ["radius:500"] }),
      ctx({ searchCoords: SYDNEY }),
    );
    expect(modest.percent).toBe(inflated.percent);
  });

  it("state coverage earns the primary-area bump when the state hint is set", () => {
    // A whole-state claim counts as PRIMARY, not Can cover — it's an existing
    // commitment, which is what lets pre-split rows upgrade with no backfill.
    const brisbaneHQ = builder({
      latitude: -27.4698,
      longitude: 153.0251,
      service_areas: ["state:NSW"],
    });
    const result = scoreBuilder(
      brisbaneHQ,
      ctx({ searchCoords: SYDNEY, searchState: "NSW" }),
    );
    const distance = result.details.find((d) => d.maxPoints === 15);
    expect(distance?.label).toBe("Your primary area");
    expect(distance?.points).toBe(PRIMARY_COVERAGE_FLOOR);
  });

  it("a cover:-only claim earns the lower Can cover bump", () => {
    const brisbaneHQ = builder({
      latitude: -27.4698,
      longitude: 153.0251,
      service_areas: ["cover:Inner City / CBD"],
    });
    const result = scoreBuilder(
      brisbaneHQ,
      ctx({ searchCoords: SYDNEY, searchState: "NSW" }),
    );
    const distance = result.details.find((d) => d.maxPoints === 15);
    expect(distance?.label).toBe("Covers your area");
    expect(distance?.points).toBe(COVER_COVERAGE_FLOOR);
  });

  it("no location searched → no distance component at all", () => {
    const result = scoreBuilder(builder({ latitude: -33.8, longitude: 151.2 }), ctx());
    expect(result.details.some((d) => d.maxPoints === 15)).toBe(false);
  });
});

describe("inferStateForPoint", () => {
  it("infers NSW for a Sydney point", () => {
    expect(inferStateForPoint(SYDNEY.latitude, SYDNEY.longitude)).toBe("NSW");
  });
  it("returns null deep in the outback (>150km from any listed city)", () => {
    expect(inferStateForPoint(-25.0, 129.0)).toBeNull();
  });
});

/* ── keywords ────────────────────────────────────────────────────── */

describe("scoreBuilder — keywords", () => {
  it("matches at word starts, including plurals/-ing suffixes", () => {
    const b = builder({ bio: "We do roof tiling and decking repairs" });
    const result = scoreBuilder(b, ctx({ keywords: ["tile", "deck"] }));
    // "tile" → prefix of... "tiling" does NOT start with "tile"? t-i-l-i-n-g — no.
    // "deck" → prefix of "decking" ✓
    expect(result.details.some((d) => d.label === "Keyword: deck")).toBe(true);
  });

  it("does not match inside words — 'tile' never hits 'textile'", () => {
    const b = builder({ bio: "Wholesale textile importer" });
    const result = scoreBuilder(b, ctx({ keywords: ["tile"] }));
    expect(result.details.some((d) => d.label === "Keyword: tile")).toBe(false);
  });

  it("null project fields don't create phantom 'undefined' matches", () => {
    const b = builder({ projects: [{ title: null, description: null }] });
    const result = scoreBuilder(b, ctx({ keywords: ["undefined"] }));
    expect(result.details.some((d) => d.label.startsWith("Keyword:"))).toBe(false);
  });

  it("regex metacharacters in keywords are treated literally", () => {
    const b = builder({ bio: "c++ specialists (somehow)" });
    expect(() => scoreBuilder(b, ctx({ keywords: ["c++", "(somehow)"] }))).not.toThrow();
  });
});

/* ── timing ──────────────────────────────────────────────────────── */

describe("scoreBuilder — availability & response time", () => {
  it("covers every current edit-profile option plus the legacy value on live rows", () => {
    for (const value of [
      "Within 1 hour", "Within 2 hours", "Within 4 hours",
      "Within 24 hours", "Within 2 days", "Within a week",
    ]) {
      expect(RESPONSE_TIME_POINTS[value], value).toBeGreaterThan(0);
    }
  });

  it("ASAP: an unavailable builder back within 3 days beats a limited one", () => {
    const backSoon = scoreBuilder(
      builder({ availability: "unavailable", next_available_date: "2026-07-03" }),
      ctx({ urgency: "asap" }),
    );
    const limited = scoreBuilder(
      builder({ availability: "limited" }),
      ctx({ urgency: "asap" }),
    );
    expect(backSoon.percent).toBeGreaterThan(limited.percent);
    expect(backSoon.details.some((d) => d.label.startsWith("Available from"))).toBe(true);
  });

  it("ASAP: back in a month scores nothing extra", () => {
    const result = scoreBuilder(
      builder({ availability: "unavailable", next_available_date: "2026-08-01" }),
      ctx({ urgency: "asap" }),
    );
    expect(result.details.some((d) => d.label.startsWith("Available from"))).toBe(false);
  });

  it("this_week: back within 7 days scores like limited (8)", () => {
    const back = scoreBuilder(
      builder({ availability: "unavailable", next_available_date: "2026-07-06" }),
      ctx({ urgency: "this_week" }),
    );
    const limited = scoreBuilder(builder({ availability: "limited" }), ctx({ urgency: "this_week" }));
    expect(back.percent).toBe(limited.percent);
  });
});

/* ── reputation ──────────────────────────────────────────────────── */

describe("scoreBuilder — reputation", () => {
  it("no reviews and hidden score = neutral, not zero", () => {
    const none = scoreBuilder(builder(), ctx());
    const midRated = scoreBuilder(builder(), ctx(), { average: 3, count: 10 });
    expect(none.percent).toBe(midRated.percent); // 3.0★ ≡ neutral
  });

  it("good reviews lift, bad reviews drop below neutral", () => {
    const great = scoreBuilder(builder(), ctx(), { average: 5, count: 10 });
    const none = scoreBuilder(builder(), ctx());
    const poor = scoreBuilder(builder(), ctx(), { average: 1, count: 10 });
    expect(great.percent).toBeGreaterThan(none.percent);
    expect(poor.percent).toBeLessThan(none.percent);
  });

  it("one 5★ review can't outrank twenty 4.8★ reviews", () => {
    const single = scoreBuilder(builder(), ctx(), { average: 5, count: 1 });
    const veteran = scoreBuilder(builder(), ctx(), { average: 4.8, count: 20 });
    expect(veteran.percent).toBeGreaterThan(single.percent);
  });

  it("displaying a strong BLDESY score beats hiding it; a weak one scores below neutral", () => {
    const strong = scoreBuilder(builder({ bldesy_score: 90 }), ctx());
    const hidden = scoreBuilder(builder(), ctx());
    const weak = scoreBuilder(builder({ bldesy_score: 20 }), ctx());
    expect(strong.percent).toBeGreaterThan(hidden.percent);
    expect(weak.percent).toBeLessThan(hidden.percent);
  });

  it("poor ratings never render as a positive chip", () => {
    const result = scoreBuilder(builder(), ctx(), { average: 1.5, count: 8 });
    expect(result.details.some((d) => d.label.startsWith("★"))).toBe(false);
  });

  it("strong ratings render the star chip", () => {
    const result = scoreBuilder(builder(), ctx(), { average: 4.9, count: 12 });
    expect(result.details.some((d) => d.label === "★ 4.9 (12 reviews)")).toBe(true);
  });
});

/* ── output invariants ───────────────────────────────────────────── */

describe("scoreBuilder — invariants", () => {
  it("percent stays within [10, 99] at the extremes", () => {
    const worst = scoreBuilder(
      builder({ availability: "unavailable", trade_category: "x" }),
      ctx({ trade: "roofer", keywords: ["zzz"], specialisations: ["zzz"], searchCoords: SYDNEY }),
      { average: 1, count: 50 },
    );
    expect(worst.percent).toBeGreaterThanOrEqual(10);
    const best = scoreBuilder(
      builder({
        latitude: SYDNEY.latitude,
        longitude: SYDNEY.longitude,
        bio: "colorbond roofing",
        response_time: "Within 1 hour",
        credentials: { license_verified: true, abn_verified: true, insurance_verified: true },
        bldesy_score: 100,
        specialisations: { roofer: ["colorbond-metal-roofing"] },
      }),
      ctx({
        trade: "roofer",
        keywords: ["colorbond"],
        specialisations: ["colorbond-metal-roofing"],
        searchCoords: SYDNEY,
      }),
      { average: 5, count: 50 },
    );
    expect(best.percent).toBe(99);
  });

  it("only matched details are returned (display chips are all positive)", () => {
    const result = scoreBuilder(builder(), ctx({ keywords: ["nope"] }));
    expect(result.details.every((d) => d.matched)).toBe(true);
  });
});
