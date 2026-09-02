// AUTO-SYNCED from ~/bldesy-web/__tests__/profile-completeness.test.ts by scripts/sync-web-libs.mjs — DO NOT EDIT HERE.
// Change the website original, then run: npm run sync:web

import { describe, it, expect } from "vitest";
import {
  getProfileCompleteness,
  completenessChecklist,
  PROFILE_COMPLETENESS_CHECKS,
} from "@/lib/web/profile-completeness";

/**
 * P2.6 pins: the % and the checklist come from ONE formula, email
 * verification counts only when supplied, and every checklist item carries
 * a real deep link.
 */

const FULL: Record<string, unknown> = {
  bio: "x".repeat(60),
  profile_photo_url: "p.jpg",
  projects: [{}],
  phone: "0412345678",
  website: "https://x.com",
  cover_photo_url: "c.jpg",
  abn: "12345678901",
  license_key: "L123",
  team_members: [{}],
  faqs: [{}],
  business_name: "Full Profile Pty",
  trade_category: "plumber",
  suburb: "Newtown",
  email: "a@b.co",
};

describe("getProfileCompleteness", () => {
  it("full profile is 100%, empty is 0%", () => {
    expect(getProfileCompleteness(FULL)).toBe(100);
    expect(getProfileCompleteness({})).toBe(0);
  });

  it("email verification counts only when extras are supplied", () => {
    // Without extras (phone-only account): unchanged formula.
    expect(getProfileCompleteness(FULL)).toBe(100);
    // Verified email keeps 100; unverified drags it below.
    expect(getProfileCompleteness(FULL, { emailVerified: true })).toBe(100);
    expect(getProfileCompleteness(FULL, { emailVerified: false })).toBeLessThan(100);
  });

  it("short bio fails the min-length check", () => {
    const p = { ...FULL, bio: "too short" };
    expect(getProfileCompleteness(p)).toBeLessThan(100);
  });
});

describe("completenessChecklist", () => {
  it("missing items come first, heaviest first, all deep-linked", () => {
    const items = completenessChecklist({ ...FULL, bio: null, faqs: [] });
    expect(items[0].done).toBe(false);
    expect(items[0].key).toBe("bio"); // weight 10 beats faqs' 2
    expect(items.filter((i) => !i.done).map((i) => i.key)).toEqual(["bio", "faqs"]);
    expect(items.every((i) => i.href.startsWith("/portal/"))).toBe(true);
  });

  it("email-verified appears as an item only when extras are supplied", () => {
    const without = completenessChecklist(FULL);
    expect(without.some((i) => i.key === "email_verified")).toBe(false);
    const withExtras = completenessChecklist(FULL, { emailVerified: false });
    const item = withExtras.find((i) => i.key === "email_verified");
    expect(item?.done).toBe(false);
    expect(item?.href).toBe("/portal/settings");
  });

  it("checklist and % agree: everything done → 100 and no missing items", () => {
    const items = completenessChecklist(FULL, { emailVerified: true });
    expect(items.every((i) => i.done)).toBe(true);
    expect(getProfileCompleteness(FULL, { emailVerified: true })).toBe(100);
    // Every weighted check is represented in the checklist.
    expect(items.length).toBe(PROFILE_COMPLETENESS_CHECKS.length + 1);
  });
});

describe("formatDeclaredResponseTime (P3.3)", () => {
  it("prefixes declared values with Typically", async () => {
    const { formatDeclaredResponseTime } = await import("@/lib/web/response-time");
    expect(formatDeclaredResponseTime("Within 2 hours")).toBe("Typically within 2 hours");
    expect(formatDeclaredResponseTime("Same day")).toBe("Typically same day");
    expect(formatDeclaredResponseTime("Typically within 1 hour")).toBe("Typically within 1 hour");
    expect(formatDeclaredResponseTime(null)).toBeNull();
    expect(formatDeclaredResponseTime("  ")).toBeNull();
  });
});
