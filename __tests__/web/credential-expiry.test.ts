// AUTO-SYNCED from ~/bldesy-web/__tests__/credential-expiry.test.ts by scripts/sync-web-libs.mjs — DO NOT EDIT HERE.
// Change the website original, then run: npm run sync:web

import { describe, it, expect } from "vitest";
import {
  expiringInsurance,
  EXPIRY_WARNING_DAYS,
} from "@/lib/web/portal/credential-expiry";

const NOW = new Date("2026-07-28T00:00:00Z");
const days = (n: number) =>
  new Date(NOW.getTime() + n * 86_400_000).toISOString().slice(0, 10);

function blob(insurance: Record<string, { expiry_date?: string | null; verified?: boolean }>) {
  return { insurance };
}

describe("expiringInsurance", () => {
  it("empty/malformed input yields nothing", () => {
    expect(expiringInsurance(null, NOW)).toEqual([]);
    expect(expiringInsurance({}, NOW)).toEqual([]);
    expect(expiringInsurance({ insurance: "junk" }, NOW)).toEqual([]);
    expect(expiringInsurance(blob({ public_liability: {} }), NOW)).toEqual([]);
    expect(
      expiringInsurance(blob({ public_liability: { expiry_date: "not-a-date", verified: true } }), NOW),
    ).toEqual([]);
  });

  it("warns inside the window, stays quiet outside it", () => {
    const soon = expiringInsurance(
      blob({ public_liability: { expiry_date: days(10), verified: true } }),
      NOW,
    );
    expect(soon).toHaveLength(1);
    expect(soon[0]).toMatchObject({
      label: "Public Liability insurance",
      expired: false,
      daysLeft: 10,
    });

    expect(
      expiringInsurance(
        blob({ public_liability: { expiry_date: days(EXPIRY_WARNING_DAYS + 1), verified: true } }),
        NOW,
      ),
    ).toEqual([]);
  });

  it("expired certificates warn regardless of verified state", () => {
    const gone = expiringInsurance(
      blob({ workers_compensation: { expiry_date: days(-3), verified: false } }),
      NOW,
    );
    expect(gone).toHaveLength(1);
    expect(gone[0].expired).toBe(true);
    expect(gone[0].daysLeft).toBeLessThan(0);
  });

  it("unverified soon-to-expire certificates are skipped (nothing to lose)", () => {
    expect(
      expiringInsurance(
        blob({ public_liability: { expiry_date: days(5), verified: false } }),
        NOW,
      ),
    ).toEqual([]);
  });

  it("sorts most-urgent first and labels unknown kinds generically", () => {
    const out = expiringInsurance(
      blob({
        public_liability: { expiry_date: days(20), verified: true },
        marine_cargo: { expiry_date: days(-1), verified: true },
      }),
      NOW,
    );
    expect(out.map((w) => w.label)).toEqual([
      "marine_cargo insurance",
      "Public Liability insurance",
    ]);
  });
});
