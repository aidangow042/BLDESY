// AUTO-SYNCED from ~/bldesy-web/__tests__/launch-trades.test.ts by scripts/sync-web-libs.mjs — DO NOT EDIT HERE.
// Change the website original, then run: npm run sync:web

import { describe, it, expect } from "vitest";
import {
  LAUNCH_TRADES,
  COVERED_BY,
  isLaunchTrade,
  launchTrades,
  coverFor,
  subtradeSlugsFor,
} from "@/lib/web/launch-trades";
import { getTradeBySlug } from "@/lib/web/trades";

/**
 * LAUNCH_TRADES is a hand mirror of the dashboard's v3 model — that side is
 * guarded by `npm run check:launch-trades`, which needs the sibling repo checked
 * out. These tests cover what can be checked from this repo alone: that the six
 * are real trades, and that the sponge map never claims cover it can't back up.
 */

describe("LAUNCH_TRADES", () => {
  it("is the six, and every one is a real trade", () => {
    expect(LAUNCH_TRADES).toHaveLength(6);
    for (const slug of LAUNCH_TRADES) {
      expect(getTradeBySlug(slug), `unknown trade slug: ${slug}`).toBeTruthy();
    }
  });

  it("has no duplicates", () => {
    expect(new Set(LAUNCH_TRADES).size).toBe(LAUNCH_TRADES.length);
  });

  it("launchTrades() resolves all six, in LAUNCH_TRADES order", () => {
    expect(launchTrades().map((t) => t.slug)).toEqual([...LAUNCH_TRADES]);
  });

  it("isLaunchTrade is true for the six and false for anything else", () => {
    expect(isLaunchTrade("plumber")).toBe(true);
    expect(isLaunchTrade("plasterer")).toBe(true);
    // Post-open deferred and the reserve are NOT launch trades.
    expect(isLaunchTrade("cleaner")).toBe(false);
    expect(isLaunchTrade("landscaper")).toBe(false);
    expect(isLaunchTrade("tiler")).toBe(false);
    expect(isLaunchTrade("not-a-trade")).toBe(false);
  });
});

describe("COVERED_BY — the sponge", () => {
  it("only ever points at a launch trade", () => {
    for (const [slug, cover] of Object.entries(COVERED_BY)) {
      expect(isLaunchTrade(cover.trade), `${slug} -> ${cover.trade}`).toBe(true);
    }
  });

  it("never covers a trade with itself", () => {
    // A launch trade appearing as a KEY would mean the wall offers a plumber to
    // someone who searched for a plumber.
    for (const slug of Object.keys(COVERED_BY)) {
      expect(isLaunchTrade(slug), `${slug} is a launch trade and cannot be covered`).toBe(
        false,
      );
    }
  });

  it("every key is a real trade", () => {
    for (const slug of Object.keys(COVERED_BY)) {
      expect(getTradeBySlug(slug), `unknown trade slug: ${slug}`).toBeTruthy();
    }
  });

  /**
   * This is the test that keeps the sponge honest. Every claim is justified by a
   * NAMED subtrade the covering trade can actually tag — if the taxonomy drops
   * one, the claim becomes marketing and this fails.
   */
  it("every `via` subtrade still exists on the covering trade", () => {
    for (const [slug, cover] of Object.entries(COVERED_BY)) {
      const available = subtradeSlugsFor(cover.trade);
      expect(cover.via.length, `${slug} has no evidence`).toBeGreaterThan(0);
      for (const via of cover.via) {
        expect(
          available.has(via),
          `${slug} -> ${cover.trade} claims "${via}", which is not a subtrade of ${cover.trade}`,
        ).toBe(true);
      }
    }
  });

  it("states the limit whenever the cover is partial", () => {
    for (const [slug, cover] of Object.entries(COVERED_BY)) {
      if (cover.partial === null) continue;
      // The copy renders this verbatim, so an empty string would render a wall
      // that says "not" and stops.
      expect(cover.partial.trim().length, `${slug} has an empty partial`).toBeGreaterThan(0);
    }
  });

  it("leaves the genuine misses uncovered", () => {
    // These are the expected volume drivers and nothing in the six covers them.
    // The wall must fire, because that is what turns a miss into a recruiting
    // signal instead of a bounced visitor.
    for (const slug of [
      "tiler",
      "cleaner",
      "landscaper",
      "air-conditioning-hvac",
      "roofer",
      "fencer",
      "concreter",
      // Compliance-shaped: NSW security licensing / a separate gas ticket.
      "locksmith",
      "security-systems",
      "gas-fitter",
    ]) {
      expect(coverFor(slug), `${slug} must not be sponged`).toBeNull();
    }
  });

  it("coverFor handles absent input", () => {
    expect(coverFor(undefined)).toBeNull();
    expect(coverFor("")).toBeNull();
  });
});
