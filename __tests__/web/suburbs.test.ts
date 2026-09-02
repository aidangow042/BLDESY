// AUTO-SYNCED from ~/bldesy-web/__tests__/suburbs.test.ts by scripts/sync-web-libs.mjs — DO NOT EDIT HERE.
// Change the website original, then run: npm run sync:web

import { describe, expect, it } from "vitest";
import { displaySuburbName, nearbySuburbs, resolveSuburbSlug, stateForSuburb } from "@/lib/web/suburbs";

describe("resolveSuburbSlug", () => {
  it("resolves plain suburbs from the dataset", () => {
    const entry = resolveSuburbSlug("surry-hills");
    expect(entry?.key).toBe("surry hills");
    expect(entry?.name).toBe("Surry Hills");
    expect(entry?.coords).toBeTruthy();
  });

  it("resolves apostrophe and hyphen localities (not naive de-hyphenation)", () => {
    // the dataset stores curly apostrophes: "o’connor"
    expect(resolveSuburbSlug("oconnor")?.key).toBe("o’connor");
    expect(resolveSuburbSlug("oconnor")?.name).toBe("O’Connor");
    expect(resolveSuburbSlug("brighton-le-sands")?.key).toBeTruthy();
    expect(resolveSuburbSlug("mount-kuring-gai")?.key).toBeTruthy();
  });

  it("covers major cities missing from the raw dataset via MAJOR_LOCATIONS", () => {
    for (const slug of ["central-coast", "gold-coast", "sunshine-coast", "sydney"]) {
      const entry = resolveSuburbSlug(slug);
      expect(entry, slug).toBeTruthy();
      expect(entry?.isMajorCity).toBe(true);
      expect(entry?.state).toBeTruthy();
    }
  });

  it("returns null for unknown slugs", () => {
    expect(resolveSuburbSlug("not-a-real-place-xyz")).toBeNull();
    expect(resolveSuburbSlug("")).toBeNull();
  });
});

describe("displaySuburbName", () => {
  it("title-cases across spaces, hyphens and apostrophes", () => {
    expect(displaySuburbName("surry hills")).toBe("Surry Hills");
    expect(displaySuburbName("o'connor")).toBe("O'Connor");
    expect(displaySuburbName("brighton-le-sands")).toBe("Brighton-Le-Sands");
  });
});

describe("stateForSuburb", () => {
  it("uses curated state for major cities", () => {
    expect(stateForSuburb(resolveSuburbSlug("sydney")!)).toBe("NSW");
    expect(stateForSuburb(resolveSuburbSlug("gold-coast")!)).toBe("QLD");
  });

  it("derives a state for dataset suburbs via nearest postcode", () => {
    expect(stateForSuburb(resolveSuburbSlug("surry-hills")!)).toBe("NSW");
  });
});

describe("nearbySuburbs", () => {
  it("returns n nearest distinct suburbs", () => {
    const entry = resolveSuburbSlug("surry-hills")!;
    const nearby = nearbySuburbs(entry, 5);
    expect(nearby).toHaveLength(5);
    expect(nearby.map((e) => e.slug)).not.toContain("surry-hills");
    // all inner-Sydney neighbours, i.e. within a handful of km
    for (const e of nearby) {
      expect(e.coords).toBeTruthy();
    }
  });
});
