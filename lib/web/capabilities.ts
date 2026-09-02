// AUTO-SYNCED from ~/bldesy-web/lib/capabilities.ts by scripts/sync-web-libs.mjs — DO NOT EDIT HERE.
// Change the website original, then run: npm run sync:web

/**
 * Tradie capabilities — gear, tickets, business setup the tradie brings to a
 * job. Sits alongside the existing credential verification system (ABN +
 * state licences) without overlapping.
 *
 * The single source of truth for:
 *   - the keys stored in `tradie_capabilities` and the `required_capabilities`
 *     JSONB on jobs
 *   - the labels rendered in the edit-profile form, on the public profile,
 *     and on the job detail screen
 *   - the dropdown options for public-liability and employment terms
 */

export type CapabilityKey =
  | "ppe"
  | "own_tools"
  | "own_vehicle"
  | "tools_of_trade_insurance"
  | "white_card"
  | "first_aid"
  | "working_at_heights"
  | "confined_spaces"
  | "traffic_control"
  | "forklift_licence"
  | "ewp_licence"
  | "asbestos_awareness"
  | "own_abn"
  | "gst_registered"
  | "personal_accident_insurance";

export type CapabilityGroupKey = "gear" | "tickets" | "business";

export interface CapabilityItem {
  key: CapabilityKey;
  label: string;
  /** Admin verifies certain tickets (currently White Card + First Aid). */
  verifiable?: boolean;
}

export const CAPABILITY_GROUPS: Record<
  CapabilityGroupKey,
  { label: string; items: readonly CapabilityItem[] }
> = {
  gear: {
    label: "Gear & vehicle",
    items: [
      { key: "ppe", label: "Full PPE" },
      { key: "own_tools", label: "Own tools" },
      { key: "own_vehicle", label: "Own vehicle" },
      { key: "tools_of_trade_insurance", label: "Tools of trade insurance" },
    ],
  },
  tickets: {
    label: "Tickets & cards",
    items: [
      { key: "white_card", label: "White Card (CIC)", verifiable: true },
      { key: "first_aid", label: "First Aid", verifiable: true },
      { key: "working_at_heights", label: "Working at Heights" },
      { key: "confined_spaces", label: "Confined Spaces" },
      { key: "traffic_control", label: "Traffic Control" },
      { key: "forklift_licence", label: "Forklift Licence" },
      { key: "ewp_licence", label: "EWP Licence" },
      { key: "asbestos_awareness", label: "Asbestos Awareness" },
    ],
  },
  business: {
    label: "Business setup",
    items: [
      { key: "own_abn", label: "Has ABN" },
      { key: "gst_registered", label: "GST registered" },
      { key: "personal_accident_insurance", label: "Personal accident insurance" },
    ],
  },
};

/** Flat lookup from capability key to label. */
export const CAPABILITY_LABELS: Record<CapabilityKey, string> = (() => {
  const map = {} as Record<CapabilityKey, string>;
  for (const group of Object.values(CAPABILITY_GROUPS)) {
    for (const item of group.items) {
      map[item.key] = item.label;
    }
  }
  return map;
})();

export const ALL_CAPABILITY_KEYS: readonly CapabilityKey[] = Object.values(
  CAPABILITY_GROUPS,
).flatMap((g) => g.items.map((i) => i.key));

export type RequirementLevel = "required" | "preferred";

export interface PublicLiabilityOption {
  value: number | null;
  label: string;
}

export const PUBLIC_LIABILITY_OPTIONS: readonly PublicLiabilityOption[] = [
  { value: null, label: "Not required" },
  { value: 5_000_000, label: "$5M minimum" },
  { value: 10_000_000, label: "$10M minimum" },
  { value: 20_000_000, label: "$20M minimum" },
];

export function formatPublicLiability(amount: number | null | undefined): string | null {
  if (amount == null) return null;
  if (amount >= 1_000_000) {
    const m = amount / 1_000_000;
    return `$${m % 1 === 0 ? m.toString() : m.toFixed(1)}M Public Liability`;
  }
  return `$${amount.toLocaleString("en-AU")} Public Liability`;
}

export type EmploymentType =
  | "full_time_contract"
  | "part_time"
  | "casual"
  | "on_call"
  | "fixed_term";

export const EMPLOYMENT_TYPES: readonly { value: EmploymentType; label: string }[] = [
  { value: "full_time_contract", label: "Full-time contract" },
  { value: "part_time", label: "Part-time" },
  { value: "casual", label: "Casual" },
  { value: "on_call", label: "On-call" },
  { value: "fixed_term", label: "Fixed-term" },
];

export const EMPLOYMENT_TYPE_LABELS: Record<EmploymentType, string> =
  EMPLOYMENT_TYPES.reduce((acc, t) => {
    acc[t.value] = t.label;
    return acc;
  }, {} as Record<EmploymentType, string>);

export type PayType = "hourly" | "daily" | "fixed_contract" | "negotiable";

export const PAY_TYPES: readonly { value: PayType; label: string }[] = [
  { value: "hourly", label: "Hourly" },
  { value: "daily", label: "Daily" },
  { value: "fixed_contract", label: "Fixed contract" },
  { value: "negotiable", label: "Negotiable" },
];

export type WorkDay = "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";

export const WORK_DAYS: readonly WorkDay[] = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];

export const WORK_DAY_LABELS: Record<WorkDay, { short: string; full: string }> = {
  mon: { short: "Mon", full: "Monday" },
  tue: { short: "Tue", full: "Tuesday" },
  wed: { short: "Wed", full: "Wednesday" },
  thu: { short: "Thu", full: "Thursday" },
  fri: { short: "Fri", full: "Friday" },
  sat: { short: "Sat", full: "Saturday" },
  sun: { short: "Sun", full: "Sunday" },
};

/** Shape of the `required_capabilities` JSONB column on jobs. */
export type RequiredCapabilities = Partial<Record<CapabilityKey, RequirementLevel>>;

/** Tradie capabilities row (without the encrypted white_card_number). */
export interface TradieCapabilities {
  tradie_id: string;
  ppe: boolean;
  own_tools: boolean;
  own_vehicle: boolean;
  tools_of_trade_insurance: boolean;
  white_card: boolean;
  white_card_verified: boolean;
  white_card_verified_at: string | null;
  first_aid: boolean;
  first_aid_verified: boolean;
  working_at_heights: boolean;
  confined_spaces: boolean;
  traffic_control: boolean;
  forklift_licence: boolean;
  ewp_licence: boolean;
  asbestos_awareness: boolean;
  own_abn: boolean;
  gst_registered: boolean;
  public_liability_amount: number | null;
  personal_accident_insurance: boolean;
  notes: string | null;
  updated_at: string;
}

export function emptyCapabilities(tradieId: string): TradieCapabilities {
  return {
    tradie_id: tradieId,
    ppe: false,
    own_tools: false,
    own_vehicle: false,
    tools_of_trade_insurance: false,
    white_card: false,
    white_card_verified: false,
    white_card_verified_at: null,
    first_aid: false,
    first_aid_verified: false,
    working_at_heights: false,
    confined_spaces: false,
    traffic_control: false,
    forklift_licence: false,
    ewp_licence: false,
    asbestos_awareness: false,
    own_abn: false,
    gst_registered: false,
    public_liability_amount: null,
    personal_accident_insurance: false,
    notes: null,
    updated_at: new Date(0).toISOString(),
  };
}

export function hasCapability(
  caps: TradieCapabilities | null | undefined,
  key: CapabilityKey,
): boolean {
  if (!caps) return false;
  const value = caps[key as keyof TradieCapabilities];
  return value === true;
}

export function isCapabilityVerified(
  caps: TradieCapabilities | null | undefined,
  key: CapabilityKey,
): boolean {
  if (!caps) return false;
  if (key === "white_card") return caps.white_card_verified === true;
  if (key === "first_aid") return caps.first_aid_verified === true;
  return false;
}

// ---------------------------------------------------------------------------
// Tradie-writable input — edit-profile form (saveCapabilities action) and
// PUT /api/me/capabilities share this shape and parser.
// ---------------------------------------------------------------------------

/**
 * Capability values writable by the tradie. Verification fields are stripped
 * server-side by the protect trigger — listing them here would be a no-op.
 */
export interface CapabilitiesInput {
  ppe: boolean;
  own_tools: boolean;
  own_vehicle: boolean;
  tools_of_trade_insurance: boolean;
  white_card: boolean;
  /**
   * Plaintext White Card number (8 digits) — encrypted server-side before
   * storage. `null` clears the stored number; omit the key to leave whatever
   * is stored unchanged.
   */
  white_card_number?: string | null;
  first_aid: boolean;
  working_at_heights: boolean;
  confined_spaces: boolean;
  traffic_control: boolean;
  forklift_licence: boolean;
  ewp_licence: boolean;
  asbestos_awareness: boolean;
  own_abn: boolean;
  gst_registered: boolean;
  public_liability_amount: number | null;
  personal_accident_insurance: boolean;
  notes: string | null;
}

/** The only public-liability bands a tradie may declare (null = none). */
export function isAllowedPublicLiability(value: unknown): value is number | null {
  return PUBLIC_LIABILITY_OPTIONS.some((o) => o.value === value);
}

export const CAPABILITY_NOTES_MAX_LENGTH = 2000;

export type ParseCapabilitiesInputResult =
  | { ok: true; input: CapabilitiesInput }
  | { ok: false; error: string };

/**
 * Validate an untrusted JSON body into CapabilitiesInput — the shape the
 * edit-profile form has always sent saveCapabilities. Every capability
 * boolean is required; `public_liability_amount` must be present (null or
 * one of the bands); `notes` is trimmed with blank → null (max 2000 chars);
 * `white_card_number` is optional and, when present, a string or null.
 */
export function parseCapabilitiesInput(body: unknown): ParseCapabilitiesInputResult {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return { ok: false, error: "Input must be an object." };
  }
  const b = body as Record<string, unknown>;

  const flags = {} as Record<CapabilityKey, boolean>;
  for (const key of ALL_CAPABILITY_KEYS) {
    const value = b[key];
    if (typeof value !== "boolean") {
      return { ok: false, error: `${key} must be true or false.` };
    }
    flags[key] = value;
  }

  if (!Object.prototype.hasOwnProperty.call(b, "public_liability_amount")) {
    return {
      ok: false,
      error: "public_liability_amount is required (use null for none).",
    };
  }
  const liability = b.public_liability_amount;
  if (!isAllowedPublicLiability(liability)) {
    return { ok: false, error: "Invalid public liability amount." };
  }

  let notes: string | null = null;
  if (b.notes !== undefined && b.notes !== null) {
    if (typeof b.notes !== "string") {
      return { ok: false, error: "notes must be a string or null." };
    }
    const trimmed = b.notes.trim();
    if (trimmed.length > CAPABILITY_NOTES_MAX_LENGTH) {
      return {
        ok: false,
        error: `Notes must be ${CAPABILITY_NOTES_MAX_LENGTH} characters or fewer.`,
      };
    }
    notes = trimmed || null;
  }

  const input: CapabilitiesInput = { ...flags, public_liability_amount: liability, notes };

  if (Object.prototype.hasOwnProperty.call(b, "white_card_number")) {
    const number = b.white_card_number;
    if (number !== null && typeof number !== "string") {
      return { ok: false, error: "white_card_number must be a string or null." };
    }
    input.white_card_number = number;
  }

  return { ok: true, input };
}
