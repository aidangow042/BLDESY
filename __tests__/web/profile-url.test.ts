// AUTO-SYNCED from ~/bldesy-web/__tests__/profile-url.test.ts by scripts/sync-web-libs.mjs — DO NOT EDIT HERE.
// Change the website original, then run: npm run sync:web

import { describe, expect, it } from "vitest";
import { builderProfilePath, categoryPath } from "@/lib/web/profile-url";

const UUID = "413f251c-3343-48f7-a3df-000000000000";

describe("builderProfilePath", () => {
  it("builds the keyword URL when every ingredient is present", () => {
    expect(
      builderProfilePath({
        user_id: UUID,
        slug: "harbour-city-plumbing-gas",
        trade_category: "plumber",
        suburb: "Surry Hills",
      }),
    ).toBe("/plumber/surry-hills/harbour-city-plumbing-gas");
  });

  it("routes builder-trade profiles through the static /builder segment", () => {
    expect(
      builderProfilePath({
        user_id: UUID,
        slug: "smiths-building",
        trade_category: "builder",
        suburb: "North Ryde",
      }),
    ).toBe("/builder/north-ryde/smiths-building");
  });

  it.each([
    ["missing slug", { user_id: UUID, slug: null, trade_category: "plumber", suburb: "Newtown" }],
    ["missing suburb", { user_id: UUID, slug: "x", trade_category: "plumber", suburb: "" }],
    ["stale trade not in lib/trades", { user_id: UUID, slug: "x", trade_category: "hvac", suburb: "Newtown" }],
    ["plural passed as trade", { user_id: UUID, slug: "x", trade_category: "plumbers", suburb: "Newtown" }],
  ])("falls back to the legacy 301-handled URL when %s", (_label, input) => {
    expect(builderProfilePath(input)).toBe(`/builder/${UUID}`);
  });
});

describe("categoryPath", () => {
  it("uses the plural slug", () => {
    expect(categoryPath("plumber")).toBe("/plumbers");
    expect(categoryPath("plumber", "surry-hills")).toBe("/plumbers/surry-hills");
    expect(categoryPath("handyman", "newtown")).toBe("/handymen/newtown");
    expect(categoryPath("drainage", "newtown")).toBe("/drainage/newtown");
  });
});
