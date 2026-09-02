// AUTO-SYNCED from ~/bldesy-web/lib/contract-roles.ts by scripts/sync-web-libs.mjs — DO NOT EDIT HERE.
// Change the website original, then run: npm run sync:web

/**
 * Helpers for enterprise contract postings. A contract can bundle several
 * roles ("multiple jobs") or be a pure onboarding/talent-pool post. The wizard
 * sends `contract_roles` as a JSON string and `contract_type` as a slug; both
 * are sanitised here before they reach the `jobs` row, so the action and the
 * Stripe pay-per-post mapper share one trusted parser.
 */

import type { ContractRole, ContractType } from "@/types/database";

export function sanitiseContractType(v: unknown): ContractType | null {
  return v === "project" || v === "onboarding" ? v : null;
}

/**
 * Accepts either a parsed array or a JSON string. Drops anything without a
 * trade, clamps counts/lengths, and caps the list. Returns null when empty so
 * single jobs and legacy posts stay null.
 */
export function sanitiseContractRoles(v: unknown): ContractRole[] | null {
  let arr: unknown = v;
  if (typeof v === "string") {
    if (v.trim() === "") return null;
    try {
      arr = JSON.parse(v);
    } catch {
      return null;
    }
  }
  if (!Array.isArray(arr)) return null;

  const roles: ContractRole[] = [];
  for (const item of arr) {
    if (!item || typeof item !== "object") continue;
    const o = item as Record<string, unknown>;
    const trade = typeof o.trade === "string" ? o.trade.trim().slice(0, 60) : "";
    if (!trade) continue; // a role with no trade is meaningless

    const raw = typeof o.workers === "number" ? o.workers : Number(o.workers);
    const workers = Number.isFinite(raw) ? Math.max(0, Math.min(500, Math.trunc(raw))) : 0;
    const rate = typeof o.rate === "string" ? o.rate.trim().slice(0, 50) : "";
    const notes = typeof o.notes === "string" ? o.notes.trim().slice(0, 500) : "";

    roles.push({ trade, workers, rate, notes });
    if (roles.length >= 30) break; // sane upper bound
  }
  return roles.length > 0 ? roles : null;
}

/** Total workers across all roles (used for jobs.workers_needed back-compat). */
export function sumContractWorkers(roles: ContractRole[] | null): number {
  if (!roles) return 0;
  return roles.reduce((acc, r) => acc + (r.workers || 0), 0);
}
