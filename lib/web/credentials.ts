// AUTO-SYNCED from ~/bldesy-web/lib/credentials.ts by scripts/sync-web-libs.mjs — DO NOT EDIT HERE.
// Change the website original, then run: npm run sync:web

/**
 * Credential verification flags shared by search scoring, the "Verified
 * only" filter, and the result-card badge — one definition so ranking and
 * display can never disagree about who counts as verified.
 *
 * Prefers the API-verified credentials_verified JSONB and falls back to the
 * legacy credentials flags. Isomorphic on purpose: no server-only imports,
 * so client components can use it too.
 */

export interface CredentialFlags {
  licence: boolean;
  abn: boolean;
  insurance: boolean;
  /** At least one pillar verified — the "Verified only" filter test. */
  any: boolean;
  /** How many pillars are verified (drives the "Nx Verified" badge). */
  count: number;
}

interface CredentialBearer {
  credentials?: unknown;
  credentials_verified?: unknown;
}

export function verifiedCredentialFlags(builder: CredentialBearer): CredentialFlags {
  const credsV = builder.credentials_verified as {
    abn?: { verified?: boolean };
    licences?: Array<{ verified?: boolean }>;
    insurance?: { public_liability?: { verified?: boolean; verdict?: string } };
  } | null;
  const credsLegacy = builder.credentials as {
    license_verified?: boolean;
    abn_verified?: boolean;
    insurance_verified?: boolean;
  } | null;
  const licence = (credsV?.licences?.some((l) => l.verified) ?? credsLegacy?.license_verified) === true;
  const abn = (credsV?.abn?.verified ?? credsLegacy?.abn_verified) === true;
  // The verifier nests per-kind under insurance.<kind>; Public Liability is
  // the pillar-scored anchor, so it alone drives the "Insured" badge — same
  // test as lib/verification/pillar.ts.
  const pl = credsV?.insurance?.public_liability;
  const insurance = pl
    ? pl.verified === true || pl.verdict === "PASS"
    : credsLegacy?.insurance_verified === true;
  const count = [licence, abn, insurance].filter(Boolean).length;
  return { licence, abn, insurance, any: count > 0, count };
}
