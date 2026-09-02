// AUTO-SYNCED from ~/bldesy-web/__tests__/billing-plan-state.test.ts by scripts/sync-web-libs.mjs — DO NOT EDIT HERE.
// Change the website original, then run: npm run sync:web

import { describe, expect, it } from "vitest";
import {
  acceptsNewEnquiries,
  cardWindowDeadline,
  hasPortalAccess,
  isBillable,
  isLeadContactLocked,
} from "@/lib/web/billing/plan-state";
import { CARD_WINDOW_DAYS, MS_PER_DAY } from "@/lib/web/billing/config";
import type { BuilderStatus, PlanState } from "@/types/database";

const NOW = new Date("2026-07-20T00:00:00Z");
const DAYS = (n: number) => new Date(NOW.getTime() - n * MS_PER_DAY).toISOString();

function accepting(overrides: {
  plan_state: PlanState | null;
  card_on_file_at?: string | null;
  card_required_at?: string | null;
  search_paused_at?: string | null;
}) {
  return acceptsNewEnquiries(
    {
      card_on_file_at: null,
      card_required_at: null,
      ...overrides,
    },
    NOW,
  );
}

/**
 * The full plan-state matrix. acceptsNewEnquiries has an SQL twin in
 * public_builder_profiles (migration 20260723) — if a row here changes, the
 * view's CASE expression must change with it.
 */
describe("acceptsNewEnquiries", () => {
  it("paused never accepts", () => {
    expect(accepting({ plan_state: "paused" })).toBe(false);
    expect(
      accepting({ plan_state: "paused", card_on_file_at: DAYS(1) }),
    ).toBe(false);
  });

  it("tradie-initiated pause (search_paused_at) never accepts, any plan state", () => {
    expect(accepting({ plan_state: "active", search_paused_at: DAYS(1) })).toBe(false);
    expect(accepting({ plan_state: "free", search_paused_at: DAYS(1) })).toBe(false);
    expect(accepting({ plan_state: null, search_paused_at: DAYS(1) })).toBe(false);
    // Omitted / null = not paused (pre-pause callers keep working).
    expect(accepting({ plan_state: "active" })).toBe(true);
    expect(accepting({ plan_state: "active", search_paused_at: null })).toBe(true);
  });

  it("free accepts while unstamped, carded, or inside the window", () => {
    // Flag OFF world: nothing stamped.
    expect(accepting({ plan_state: "free" })).toBe(true);
    // Card on file.
    expect(accepting({ plan_state: "free", card_on_file_at: DAYS(2) })).toBe(true);
    // Stamped 3 days ago — inside the 7-day window.
    expect(accepting({ plan_state: "free", card_required_at: DAYS(3) })).toBe(true);
  });

  it("free stops accepting once the card window lapses", () => {
    expect(
      accepting({ plan_state: "free", card_required_at: DAYS(CARD_WINDOW_DAYS + 1) }),
    ).toBe(false);
    // A card fixes it even if the stale stamp is still present.
    expect(
      accepting({
        plan_state: "free",
        card_required_at: DAYS(CARD_WINDOW_DAYS + 1),
        card_on_file_at: DAYS(0.5),
      }),
    ).toBe(true);
  });

  it("grace / active / past_due / founding_free / legacy NULL always accept", () => {
    for (const plan_state of [
      "grace",
      "active",
      "past_due",
      "founding_free",
      null,
    ] as const) {
      expect(accepting({ plan_state })).toBe(true);
      // The card window never applies outside 'free'.
      expect(
        accepting({ plan_state, card_required_at: DAYS(CARD_WINDOW_DAYS + 5) }),
      ).toBe(true);
    }
  });
});

describe("hasPortalAccess", () => {
  const cases: Array<[BuilderStatus, PlanState | null, boolean]> = [
    // Value-gated: every approved plan state gets the portal.
    ["approved", "free", true],
    ["approved", "grace", true],
    ["approved", "active", true],
    ["approved", "past_due", true],
    ["approved", "paused", true], // billing page + open conversations
    ["approved", "founding_free", true],
    // Legacy NULL keeps the old paid-only rule.
    ["approved", null, false],
    // status='active' (paid) is always in, whatever the plan column says.
    ["active", "active", true],
    ["active", null, true],
    // Approval pipeline still gates.
    ["pending_review", "free", false],
    ["rejected", "free", false],
    ["suspended", "free", false],
  ];
  for (const [status, plan_state, expected] of cases) {
    it(`${status} + ${plan_state ?? "NULL"} → ${expected}`, () => {
      expect(hasPortalAccess({ status, plan_state })).toBe(expected);
    });
  }
});

describe("isLeadContactLocked", () => {
  it("never locks a value-gated row — full contact access is the free product", () => {
    for (const plan_state of [
      "free",
      "grace",
      "active",
      "past_due",
      "paused",
      "founding_free",
    ] as const) {
      expect(isLeadContactLocked({ status: "approved", plan_state })).toBe(false);
    }
  });

  it("legacy NULL keeps the old subscribe-teaser rule", () => {
    expect(isLeadContactLocked({ status: "approved", plan_state: null })).toBe(true);
    expect(isLeadContactLocked({ status: "active", plan_state: null })).toBe(false);
  });
});

describe("isBillable", () => {
  it("founding_free and legacy NULL are never billable; every vg state is", () => {
    expect(isBillable({ plan_state: "founding_free" })).toBe(false);
    expect(isBillable({ plan_state: null })).toBe(false);
    for (const plan_state of ["free", "grace", "active", "paused", "past_due"] as const) {
      expect(isBillable({ plan_state })).toBe(true);
    }
  });
});

describe("cardWindowDeadline", () => {
  it("is null without a stamp and stamp + window with one", () => {
    expect(cardWindowDeadline(null)).toBeNull();
    expect(cardWindowDeadline("not a date")).toBeNull();
    const stamped = "2026-07-15T00:00:00.000Z";
    expect(cardWindowDeadline(stamped)?.toISOString()).toBe(
      new Date(new Date(stamped).getTime() + CARD_WINDOW_DAYS * MS_PER_DAY).toISOString(),
    );
  });
});
