// AUTO-SYNCED from ~/bldesy-web/__tests__/slug.test.ts by scripts/sync-web-libs.mjs — DO NOT EDIT HERE.
// Change the website original, then run: npm run sync:web

import { describe, expect, it } from "vitest";
import { slugify } from "@/lib/web/slug";

// Twin of public.slugify() in migration 20260726 — the worked examples here
// must match what the SQL function produces for the same inputs.
describe("slugify", () => {
  it("matches the user-facing example", () => {
    expect(slugify("Harbour City Plumbing & Gas")).toBe("harbour-city-plumbing-gas");
  });

  it("drops apostrophes instead of hyphenating them", () => {
    expect(slugify("O'Connor")).toBe("oconnor");
    expect(slugify("Bob’s Plumbing")).toBe("bobs-plumbing");
    expect(slugify("`quoted`")).toBe("quoted");
  });

  it("collapses punctuation and whitespace runs to single hyphens", () => {
    expect(slugify("Bob's  Plumbing!!")).toBe("bobs-plumbing");
    expect(slugify("Smith & Sons — Building Co.")).toBe("smith-sons-building-co");
    expect(slugify("no. 4 branch")).toBe("no-4-branch");
  });

  it("keeps existing hyphens as single separators", () => {
    expect(slugify("Mount Kuring-gai")).toBe("mount-kuring-gai");
    expect(slugify("Brighton-Le-Sands")).toBe("brighton-le-sands");
  });

  it("strips accents like Postgres unaccent()", () => {
    expect(slugify("Café Renovations")).toBe("cafe-renovations");
    expect(slugify("Søren's Plumbing")).toBe("sorens-plumbing");
    expect(slugify("Straße Builders")).toBe("strasse-builders");
  });

  it("trims leading/trailing separators", () => {
    expect(slugify("  --Deluxe Decks-- ")).toBe("deluxe-decks");
  });

  it("returns null for empty or symbol-only input", () => {
    expect(slugify(null)).toBeNull();
    expect(slugify(undefined)).toBeNull();
    expect(slugify("")).toBeNull();
    expect(slugify("!!! ???")).toBeNull();
    expect(slugify("'’")).toBeNull();
  });
});
