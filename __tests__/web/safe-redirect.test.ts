// AUTO-SYNCED from ~/bldesy-web/__tests__/safe-redirect.test.ts by scripts/sync-web-libs.mjs — DO NOT EDIT HERE.
// Change the website original, then run: npm run sync:web

import { describe, expect, it } from "vitest";
import { safeRedirectPath } from "@/lib/web/safe-redirect";

describe("safeRedirectPath", () => {
  it("passes genuine same-origin paths through, query and hash intact", () => {
    expect(safeRedirectPath("/")).toBe("/");
    expect(safeRedirectPath("/portal")).toBe("/portal");
    expect(safeRedirectPath("/join-as-a-tradie?step=2")).toBe("/join-as-a-tradie?step=2");
    expect(safeRedirectPath("/portal?tab=leads#top")).toBe("/portal?tab=leads#top");
  });

  it("rejects the backslash bypass that beat the startsWith guard", () => {
    // WHATWG URL parsing normalises "\" to "/", so this is protocol-relative.
    expect(safeRedirectPath("/\\evil.com")).toBe("/");
    expect(safeRedirectPath("/\\evil.com/login")).toBe("/");
    expect(safeRedirectPath("/\\/evil.com")).toBe("/");
    expect(safeRedirectPath("\\/evil.com")).toBe("/");
  });

  it("rejects dot-segment inputs that collapse to a protocol-relative path", () => {
    // Each starts with a single "/" (so it passes the cheap prefix check),
    // but WHATWG dot-segment removal rebuilds it as "//evil.com" → off-site.
    expect(safeRedirectPath("/..//evil.com")).toBe("/");
    expect(safeRedirectPath("/a/..//evil.com")).toBe("/");
    expect(safeRedirectPath("/.//evil.com")).toBe("/");
    expect(safeRedirectPath("/..///evil.com")).toBe("/");
  });

  it("rejects protocol-relative and absolute URLs", () => {
    expect(safeRedirectPath("//evil.com")).toBe("/");
    expect(safeRedirectPath("https://evil.com/portal")).toBe("/");
    expect(safeRedirectPath("javascript:alert(1)")).toBe("/");
  });

  it("rejects embedded-whitespace variants (URL parser strips tab/newline)", () => {
    expect(safeRedirectPath("/\t\\evil.com")).toBe("/");
    expect(safeRedirectPath("/\n/evil.com")).toBe("/");
  });

  it("rejects non-strings and non-path strings", () => {
    expect(safeRedirectPath(null)).toBe("/");
    expect(safeRedirectPath(undefined)).toBe("/");
    expect(safeRedirectPath(42)).toBe("/");
    expect(safeRedirectPath("portal")).toBe("/");
    expect(safeRedirectPath("")).toBe("/");
  });

  it("honours a caller-supplied fallback", () => {
    expect(safeRedirectPath("//evil.com", "/login")).toBe("/login");
  });

  it("normalises interior backslashes into harmless path segments", () => {
    expect(safeRedirectPath("/portal\\jobs")).toBe("/portal/jobs");
  });
});
