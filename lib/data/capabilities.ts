/**
 * lib/data/capabilities.ts — tradie capabilities (gear, tickets, business setup).
 *
 * Port of:
 *   ~/bldesy-web/lib/actions/capabilities.ts   (getMyCapabilities / saveCapabilities — the
 *                                               request/response shapes below are typed to it)
 *   ~/bldesy-web/lib/queries/capabilities.ts   (getBuilderCapabilities — the PII-safe column list)
 *
 * Writes go through the website API (the White Card number is encrypted
 * server-side and is WRITE-ONLY — never readable back). FINAL route contract:
 *
 *   GET /api/me/capabilities
 *     200 { caps: TradieCapabilities, hasStoredWhiteCardNumber: boolean }
 *         (no row → all-false defaults with updated_at = epoch; non-tradies
 *          still get 200 with defaults — never 403)
 *     401 { error: "Unauthorized" }   500 { error: "Failed to load capabilities." }
 *
 *   PUT /api/me/capabilities   body = CapabilitiesInput (all 15 booleans REQUIRED,
 *         public_liability_amount REQUIRED null|5000000|10000000|20000000,
 *         notes?: string|null (≤2000, blank→null),
 *         white_card_number?: omit = keep stored, null = clear, 8-digit string = set;
 *         only persisted when white_card === true)
 *     200 { ok: true }
 *     400 { ok: false, error, code?: "invalid_liability" | "invalid_white_card_number" }
 *     401 · 403 { ok: false, error: "Builder profile not found.", code: "not_a_tradie" }
 *     429 { ok: false, error: "Too many requests" } (30/min)
 *     500 { ok: false, error, code: "save_failed" | "encryption_unavailable" }
 *
 * Reads of capability ROWS (own or other tradies') use `tradie_capabilities`
 * directly under RLS with the explicit column list — never `*`, because the
 * `authenticated` role has no column grant on white_card_number.
 */
import { api, ApiError } from '@/lib/api';
import { db } from '@/lib/supabase';
import {
  ALL_CAPABILITY_KEYS,
  emptyCapabilities,
  type CapabilityKey,
  type TradieCapabilities,
} from '@/lib/web/capabilities';

import { requireUserId } from './own-session';

/**
 * Capability values writable by the tradie. Verification fields are stripped
 * server-side by the protect trigger — listing them would be a no-op.
 * (lib/actions/capabilities.ts CapabilitiesInput; `notes` optional per the route.)
 */
export interface CapabilitiesInput {
  ppe: boolean;
  own_tools: boolean;
  own_vehicle: boolean;
  tools_of_trade_insurance: boolean;
  white_card: boolean;
  /**
   * Write-only. `null` clears the stored number; omit the key entirely to
   * leave the existing stored number unchanged. Only persisted when
   * `white_card === true` — unticking White Card clears it.
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
  /** ≤ 2000 chars; blank is stored as null. */
  notes?: string | null;
}

/** GET /api/me/capabilities body — also the website action's return shape. */
export interface CapabilitiesLoaded {
  caps: TradieCapabilities;
  /** True when an encrypted card number is on file (the plaintext is never returned). */
  hasStoredWhiteCardNumber: boolean;
}

/** PUT /api/me/capabilities body. */
export type SaveMyCapabilitiesRequest = CapabilitiesInput;

/** PUT /api/me/capabilities success body. */
export interface SaveMyCapabilitiesResponse {
  ok: true;
}

/** `code` on a failed PUT (ApiError.code). */
export type CapabilitiesSaveErrorCode =
  | 'invalid_liability'
  | 'invalid_white_card_number'
  | 'not_a_tradie'
  | 'save_failed'
  | 'encryption_unavailable';

/** The website's 403 for accounts with no builder_profiles row. */
export const NOT_A_TRADIE_MESSAGE = 'Builder profile not found.';

/** True when a save was refused because the account has no tradie profile (403 not_a_tradie). */
export function isNotATradie(e: unknown): boolean {
  return e instanceof ApiError && e.status === 403 && e.code === 'not_a_tradie';
}

/**
 * Load the calling tradie's capabilities. The route returns all-false
 * defaults when they haven't filled out the step yet, so the form always
 * renders in a clean state; a malformed body falls back to the same defaults.
 */
export async function getMyCapabilities(): Promise<CapabilitiesLoaded> {
  const uid = await requireUserId();
  const res = await api.get<Partial<CapabilitiesLoaded> | null>('/api/me/capabilities');
  return {
    caps: res?.caps ?? emptyCapabilities(uid),
    hasStoredWhiteCardNumber: res?.hasStoredWhiteCardNumber === true,
  };
}

/**
 * Save the calling tradie's capabilities (idempotent upsert server-side).
 * Throws ApiError carrying the route's message and `code`
 * ({@link CapabilitiesSaveErrorCode}), e.g. "White Card number must be
 * exactly 8 digits." / "Invalid public liability amount.".
 */
export async function saveMyCapabilities(input: CapabilitiesInput): Promise<void> {
  await api.put<SaveMyCapabilitiesResponse>('/api/me/capabilities', input);
}

/* ── Client-side validation (mirrors the server's checks + strings) ─── */

/** Bands the server accepts for public_liability_amount. */
export const PUBLIC_LIABILITY_BANDS: readonly (number | null)[] = [
  null,
  5_000_000,
  10_000_000,
  20_000_000,
];

/** Server cap on `notes` (characters). */
export const CAPABILITY_NOTES_MAX = 2000;

/** lib/encryption.ts isValidWhiteCardNumber — exactly 8 digits. */
export function isValidWhiteCardNumber(raw: string): boolean {
  return /^\d{8}$/.test(raw);
}

export const INVALID_PUBLIC_LIABILITY = 'Invalid public liability amount.';
export const INVALID_WHITE_CARD_NUMBER = 'White Card number must be exactly 8 digits.';

/**
 * Pre-flight the payload with the server's own rules so the form can show the
 * website's strings before a round trip. Returns null when valid.
 */
export function validateCapabilitiesInput(input: CapabilitiesInput): string | null {
  if (!PUBLIC_LIABILITY_BANDS.includes(input.public_liability_amount)) {
    return INVALID_PUBLIC_LIABILITY;
  }
  if (Object.prototype.hasOwnProperty.call(input, 'white_card_number')) {
    const raw = input.white_card_number;
    const clearing = input.white_card === false || raw == null || raw === '';
    if (!clearing && !isValidWhiteCardNumber(raw.trim())) {
      return INVALID_WHITE_CARD_NUMBER;
    }
  }
  return null;
}

/**
 * Build the PUT body from a loaded row + form edits. Carries exactly the 15
 * booleans + liability + notes the route requires; `white_card_number` is
 * included only when the form touched it (undefined = keep what's stored).
 * Blank notes are sent as null, matching the server's normalisation.
 */
export function capabilitiesInputFrom(
  caps: TradieCapabilities,
  whiteCardNumber?: string | null,
): CapabilitiesInput {
  const notes = typeof caps.notes === 'string' ? caps.notes.trim() : caps.notes;
  const input: CapabilitiesInput = {
    ppe: caps.ppe,
    own_tools: caps.own_tools,
    own_vehicle: caps.own_vehicle,
    tools_of_trade_insurance: caps.tools_of_trade_insurance,
    white_card: caps.white_card,
    first_aid: caps.first_aid,
    working_at_heights: caps.working_at_heights,
    confined_spaces: caps.confined_spaces,
    traffic_control: caps.traffic_control,
    forklift_licence: caps.forklift_licence,
    ewp_licence: caps.ewp_licence,
    asbestos_awareness: caps.asbestos_awareness,
    own_abn: caps.own_abn,
    gst_registered: caps.gst_registered,
    public_liability_amount: caps.public_liability_amount,
    personal_accident_insurance: caps.personal_accident_insurance,
    notes: notes ? notes : null,
  };
  if (whiteCardNumber !== undefined) input.white_card_number = whiteCardNumber;
  return input;
}

/** The boolean capability keys, for iterating a form. */
export const CAPABILITY_TOGGLE_KEYS: readonly CapabilityKey[] = ALL_CAPABILITY_KEYS;

/* ── Row reads (RLS) ────────────────────────────────────────────────── */

/**
 * The columns the `authenticated` role may read — lib/queries/capabilities.ts
 * getBuilderCapabilities. Never `*`: white_card_number and
 * white_card_warning_sent_at have no column grant.
 */
export const CAPABILITY_ROW_COLUMNS = [
  'tradie_id',
  'ppe',
  'own_tools',
  'own_vehicle',
  'tools_of_trade_insurance',
  'white_card',
  'white_card_verified',
  'white_card_verified_at',
  'first_aid',
  'first_aid_verified',
  'working_at_heights',
  'confined_spaces',
  'traffic_control',
  'forklift_licence',
  'ewp_licence',
  'asbestos_awareness',
  'own_abn',
  'gst_registered',
  'public_liability_amount',
  'personal_accident_insurance',
  'notes',
  'updated_at',
] as const;

export const CAPABILITY_ROW_SELECT: string = CAPABILITY_ROW_COLUMNS.join(', ');

/**
 * Capability rows for a set of tradies, keyed by tradie_id — the enterprise
 * applicant list and the Project Jobs feed both read this. Tradies without a
 * row are simply absent (null = "hasn't filled out the step yet").
 */
export async function readCapabilitiesRows(
  tradieIds: readonly string[],
): Promise<Map<string, TradieCapabilities>> {
  const map = new Map<string, TradieCapabilities>();
  if (tradieIds.length === 0) return map;
  const { data, error } = await db
    .from('tradie_capabilities')
    .select(CAPABILITY_ROW_SELECT)
    .in('tradie_id', [...tradieIds]);
  if (error) throw new Error(error.message);
  for (const row of (data ?? []) as unknown as TradieCapabilities[]) {
    map.set(row.tradie_id, row);
  }
  return map;
}

/** The signed-in tradie's own capabilities row (RLS), or null. */
export async function readOwnCapabilitiesRow(): Promise<TradieCapabilities | null> {
  const uid = await requireUserId();
  const rows = await readCapabilitiesRows([uid]);
  return rows.get(uid) ?? null;
}

/** Every boolean false and no public liability — "hasn't filled it in" (lib/queries/capabilities.ts). */
export function capabilitiesAreEmpty(caps: TradieCapabilities | null): boolean {
  if (!caps) return true;
  const sentinel = emptyCapabilities(caps.tradie_id);
  for (const key of Object.keys(sentinel) as (keyof TradieCapabilities)[]) {
    if (key === 'tradie_id' || key === 'updated_at' || key === 'notes') continue;
    if (caps[key] !== sentinel[key]) return false;
  }
  return true;
}
