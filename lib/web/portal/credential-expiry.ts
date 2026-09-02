// AUTO-SYNCED from ~/bldesy-web/lib/portal/credential-expiry.ts by scripts/sync-web-libs.mjs — DO NOT EDIT HERE.
// Change the website original, then run: npm run sync:web

/**
 * Credential-expiry surfacing (P2.2). Pure — unit-tested, no imports.
 *
 * Scope note: only INSURANCE carries a stored expiry_date. Licences are
 * deliberately date-less — the nightly credential-recheck cron re-validates
 * them against the live registers (NSW/QBCC), which catches expiry,
 * suspension and cancellation without trusting a stored date. Backend
 * enforcement for insurance lives in /api/cron/insurance-expiry (expired →
 * verified=false + notify; ≤30d → warn); this module only derives what the
 * portal UI shows.
 */

export const EXPIRY_WARNING_DAYS = 30;

export interface ExpiryWarning {
  /** e.g. "Public Liability insurance" */
  label: string;
  /** ISO date it expires/expired */
  expiryDate: string;
  /** already past */
  expired: boolean;
  /** whole days until expiry (negative when past) */
  daysLeft: number;
}

const KIND_LABELS: Record<string, string> = {
  public_liability: "Public Liability insurance",
  professional_indemnity: "Professional Indemnity insurance",
  workers_compensation: "Workers Compensation insurance",
};

interface InsuranceBlob {
  [kind: string]: { expiry_date?: string | null; verified?: boolean } | undefined;
}

/**
 * Warnings for insurance certificates expiring within EXPIRY_WARNING_DAYS
 * (or already expired). Unverified certificates are skipped for the
 * soon-window (nothing to lose) but expired-while-verified is impossible
 * post-cron, so expired entries show regardless of verified state — the
 * tradie needs to re-upload either way.
 */
export function expiringInsurance(
  credentialsVerified: unknown,
  now: Date,
): ExpiryWarning[] {
  const insurance = (credentialsVerified as { insurance?: InsuranceBlob } | null)
    ?.insurance;
  if (!insurance || typeof insurance !== "object") return [];

  const out: ExpiryWarning[] = [];
  for (const [kind, cert] of Object.entries(insurance)) {
    const raw = cert?.expiry_date;
    if (!raw) continue;
    const expiry = new Date(raw);
    if (Number.isNaN(expiry.getTime())) continue;
    const daysLeft = Math.floor((expiry.getTime() - now.getTime()) / 86_400_000);
    if (daysLeft > EXPIRY_WARNING_DAYS) continue;
    if (daysLeft >= 0 && cert?.verified !== true) continue;
    out.push({
      label: KIND_LABELS[kind] ?? `${kind} insurance`,
      expiryDate: raw,
      expired: daysLeft < 0,
      daysLeft,
    });
  }
  return out.sort((a, b) => a.daysLeft - b.daysLeft);
}
