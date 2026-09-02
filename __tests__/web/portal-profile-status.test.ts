// AUTO-SYNCED from ~/bldesy-web/__tests__/portal-profile-status.test.ts by scripts/sync-web-libs.mjs — DO NOT EDIT HERE.
// Change the website original, then run: npm run sync:web

import { describe, it, expect } from "vitest";
import {
  derivePortalStatus,
  buildChecklist,
  COMPLETENESS_NUDGE_TARGET,
  type ProfileStatusInput,
} from "@/lib/web/portal/profile-status";

/**
 * The dashboard status card's whole behaviour is this pure derivation —
 * every state, the precedence chain, and the locked listing-bar decision
 * (completeness never blocks) are pinned here.
 */

const LIVE_READY: ProfileStatusInput = {
  status: "active",
  searchPausedAt: null,
  completeness: 80,
  hasEmail: true,
  emailVerified: true,
  credentialsVerified: true,
  hasServiceArea: true,
  hasPhoto: true,
  launchMode: "live",
};

function derive(overrides: Partial<ProfileStatusInput>) {
  return derivePortalStatus({ ...LIVE_READY, ...overrides });
}

describe("derivePortalStatus states", () => {
  it("fully-ready active profile is live", () => {
    const r = derive({});
    expect(r.state).toBe("live");
    expect(r.showPauseControl).toBe(true);
    expect(r.checklist).toHaveLength(0);
  });

  it("approved (not yet subscribed) is also live — listing never needs payment", () => {
    expect(derive({ status: "approved" }).state).toBe("live");
  });

  it("waitlist mode changes live copy to the launch roster", () => {
    expect(derive({ launchMode: "waitlist" }).headline).toMatch(/launch roster/i);
    expect(derive({ launchMode: "live" }).headline).toMatch(/live/i);
  });

  it("pending_review → pending, no pause control", () => {
    const r = derive({ status: "pending_review" });
    expect(r.state).toBe("pending");
    expect(r.showPauseControl).toBe(false);
  });

  it("suspended and rejected → suspended", () => {
    expect(derive({ status: "suspended" }).state).toBe("suspended");
    expect(derive({ status: "rejected" }).state).toBe("suspended");
  });

  it("paused → paused with one-tap go-live", () => {
    const r = derive({ searchPausedAt: "2026-07-28T00:00:00Z" });
    expect(r.state).toBe("paused");
    expect(r.showPauseControl).toBe(true);
  });

  it("missing listing-bar items → needs_attention with exact deep-linked items", () => {
    const r = derive({ credentialsVerified: false, hasPhoto: false });
    expect(r.state).toBe("needs_attention");
    expect(r.checklist.map((c) => c.key).sort()).toEqual(["photo", "verified"]);
    expect(r.checklist.every((c) => c.href.startsWith("/portal/"))).toBe(true);
  });

  it("unverified email → needs_attention, but phone-only accounts are exempt", () => {
    expect(derive({ emailVerified: false }).state).toBe("needs_attention");
    expect(derive({ hasEmail: false, emailVerified: false }).state).toBe("live");
  });
});

describe("precedence chain (suspended > paused > pending > needs_attention > live)", () => {
  const paused = "2026-07-28T00:00:00Z";

  it("suspended beats paused", () => {
    expect(derive({ status: "suspended", searchPausedAt: paused }).state).toBe("suspended");
  });

  it("suspended beats missing checklist items", () => {
    expect(derive({ status: "suspended", credentialsVerified: false }).state).toBe("suspended");
  });

  it("paused beats pending and needs_attention", () => {
    expect(derive({ status: "pending_review", searchPausedAt: paused }).state).toBe("paused");
    expect(derive({ searchPausedAt: paused, hasPhoto: false }).state).toBe("paused");
  });

  it("pending beats needs_attention", () => {
    expect(derive({ status: "pending_review", hasPhoto: false }).state).toBe("pending");
  });
});

describe("locked listing-bar decision", () => {
  it("low completeness NEVER blocks live — it's a nudge", () => {
    const r = derive({ completeness: 44 });
    expect(r.state).toBe("live");
    expect(r.nudges.length).toBe(1);
    expect(r.nudges[0]).toContain("44%");
  });

  it(`no nudge at/above the ${COMPLETENESS_NUDGE_TARGET}% target`, () => {
    expect(derive({ completeness: COMPLETENESS_NUDGE_TARGET }).nudges).toHaveLength(0);
  });
});

describe("fail-closed defaults", () => {
  it("an unknown status is never live", () => {
    expect(derive({ status: "" }).state).toBe("pending");
    expect(derive({ status: "garbage" }).state).toBe("pending");
  });

  it("checklist covers exactly the listing bar + email", () => {
    const keys = buildChecklist(LIVE_READY).map((c) => c.key);
    expect(keys).toEqual(["verified", "service_area", "photo", "email"]);
    expect(buildChecklist({ ...LIVE_READY, hasEmail: false }).map((c) => c.key)).toEqual([
      "verified",
      "service_area",
      "photo",
    ]);
  });
});
