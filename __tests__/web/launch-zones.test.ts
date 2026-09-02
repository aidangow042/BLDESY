// AUTO-SYNCED from ~/bldesy-web/__tests__/launch-zones.test.ts by scripts/sync-web-libs.mjs — DO NOT EDIT HERE.
// Change the website original, then run: npm run sync:web

import { describe, it, expect } from "vitest";
import {
  OPEN_ZONE_TRADES,
  supplyContextCore,
  supplyContextFor,
  type OpenZoneTrades,
} from "@/lib/web/launch-zones";
import { LAUNCH_TRADES, type LaunchTradeSlug } from "@/lib/web/launch-trades";
import { FOUNDING_ZONES, FOUNDING_SUBURBS } from "@/lib/web/service-areas";

/**
 * Two jobs here. First, prove the per-trade gate ships INERT — nothing on the
 * live site changes until Aidan opens a zone. Second, pin the open-world
 * behaviour through the injected core, so the day he does, it is already tested.
 */

describe("OPEN_ZONE_TRADES — the tripwire", () => {
  /**
   * ⚠️ THIS TEST FAILS ON PURPOSE THE DAY A ZONE OPENS. That is the feature:
   * opening a zone flips site copy, internal links and robots directives, so it
   * must be a deliberate reviewed commit rather than something that rides along.
   * When you open one, delete this assertion on purpose. Runbook: WAITLIST_MODE.md.
   */
  it("is empty — no zone is open yet", () => {
    expect(Object.keys(OPEN_ZONE_TRADES)).toEqual([]);
  });

  it("only ever names real zones and real launch trades", () => {
    // Vacuous today, load-bearing the day it isn't.
    const zoneSlugs = new Set(FOUNDING_ZONES.map((z) => z.slug));
    for (const [slug, trades] of Object.entries(OPEN_ZONE_TRADES)) {
      expect(zoneSlugs.has(slug), `unknown zone slug: ${slug}`).toBe(true);
      for (const trade of trades) {
        expect(LAUNCH_TRADES, `${slug} lists a non-launch trade`).toContain(trade);
      }
    }
  });
});

describe("supplyContextFor — inert with the real config", () => {
  it("returns prelaunch for every founding suburb × launch trade", () => {
    // ~1,050 cases. If any one of these came back "stocked" or "unstocked", a
    // live page would have swapped to post-open copy with nothing behind it.
    for (const suburb of FOUNDING_SUBURBS) {
      for (const trade of LAUNCH_TRADES) {
        expect(supplyContextFor(trade, suburb).state, `${trade} in ${suburb}`).toBe(
          "prelaunch",
        );
      }
    }
  });

  it("returns prelaunch for unstocked trades and unknown places too", () => {
    for (const [trade, suburb] of [
      ["tiler", "Newtown"],
      ["renderer", "Balmain"],
      ["plumber", "Ipswich"], // outside the beachhead entirely
      ["plumber", "2042"], // a postcode never resolves to a zone
      [undefined, "Newtown"],
      ["plumber", undefined],
      [undefined, undefined],
    ] as const) {
      expect(supplyContextFor(trade, suburb).state).toBe("prelaunch");
    }
  });
});

describe("supplyContextCore — open-world behaviour", () => {
  // Lower Inner West open with five of the six: plasterer deliberately absent.
  const OPEN: OpenZoneTrades = {
    "lower-inner-west": [
      "plumber",
      "electrician",
      "handyman",
      "carpenter",
      "painter",
    ] as readonly LaunchTradeSlug[],
  };
  const ctx = (trade: string | undefined, suburb: string | undefined) =>
    supplyContextCore(OPEN, trade, suburb);

  it("says stocked for a live trade in an open zone", () => {
    const r = ctx("plumber", "Newtown");
    expect(r.state).toBe("stocked");
    if (r.state !== "stocked") return;
    expect(r.zone.slug).toBe("lower-inner-west");
  });

  it("says unstocked for a missing trade, and lists what IS live", () => {
    const r = ctx("plasterer", "Newtown");
    expect(r.state).toBe("unstocked");
    if (r.state !== "unstocked") return;
    expect(r.zone.name).toBe("Lower Inner West");
    expect(r.liveTrades.map((t) => t.slug)).toEqual([
      "plumber",
      "electrician",
      "handyman",
      "carpenter",
      "painter",
    ]);
    expect(r.covered).toBeNull();
  });

  it("offers the sponge when the covering trade is live here", () => {
    // guttering -> handyman, and handyman IS live in this zone.
    const r = ctx("guttering", "Newtown");
    expect(r.state).toBe("unstocked");
    if (r.state !== "unstocked") return;
    expect(r.covered?.trade.slug).toBe("handyman");
    expect(r.covered?.partial).toBe("gutter cleaning — not replacing gutters or fascia");
  });

  /**
   * THE CASE THAT STOPS THE SPONGE LYING. COVERED_BY.renderer points at
   * plasterer, but plasterer is not live in this zone — so offering one would be
   * the same lie the wall exists to avoid, just in a new costume.
   */
  it("withholds the sponge when the covering trade is NOT live here", () => {
    const r = ctx("renderer", "Newtown");
    expect(r.state).toBe("unstocked");
    if (r.state !== "unstocked") return;
    expect(r.covered).toBeNull();
  });

  it("is per-zone, not site-wide", () => {
    // Manly is Northern Beaches and Balmain is UPPER Inner West — neither zone is
    // open in this config, so a suburb one zone over must stay pre-launch. This is
    // the whole point of gating per zone rather than per site.
    expect(ctx("plumber", "Manly").state).toBe("prelaunch");
    expect(ctx("plumber", "Balmain").state).toBe("prelaunch");
    expect(ctx("plumber", "Newtown").state).toBe("stocked");
  });

  it("resolves casing and stray whitespace the way the coverage map does", () => {
    expect(ctx("plumber", "newtown").state).toBe("stocked");
    expect(ctx("plumber", "  NEWTOWN  ").state).toBe("stocked");
  });

  it("treats an empty trade list as closed", () => {
    expect(supplyContextCore({ "lower-inner-west": [] }, "plumber", "Newtown").state).toBe(
      "prelaunch",
    );
  });
});
