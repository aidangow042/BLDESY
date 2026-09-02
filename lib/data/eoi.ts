/**
 * Expression of Interest — port of the submit inside
 * ~/bldesy-web/components/builder/express-interest.tsx, typed against
 * ~/bldesy-web/app/api/eoi/route.ts.
 *
 * `POST /api/eoi` inserts the lead server-side (RLS-locked table), notifies
 * the tradie (in-app + email + opt-in SMS) and records the qualified contact
 * for value-gated billing — so it MUST go through the website API. Signed-in
 * callers may omit email/phone (the server trusts the account's over the
 * body); guests must supply a name and email (the app's `X-Mobile-Secret`
 * replaces Turnstile).
 *
 * The website is still in waitlist mode until launch: the route answers
 * 403 `{ code: "waitlist_mode" }` today — surfaced as `kind: "waitlist_closed"`.
 */
import { api, ApiError, isWaitlistClosed } from '@/lib/api';

/**
 * One shared 403 body for the waitlist-gated APIs (EOI, conversation-create,
 * message-send, post-job) — ~/bldesy-web/lib/auth/waitlist-gate.ts.
 */
export const WAITLIST_CLOSED_ERROR = {
  error: "BLDESY isn't open for enquiries yet — join the waitlist and we'll match you first at launch.",
  code: 'waitlist_mode',
} as const;

/** Website copy (express-interest.tsx / api/eoi/route.ts). */
export const EOI_RATE_LIMITED_MESSAGE = 'Steady on — try again in a bit.';
export const EOI_GENERIC_ERROR = "Couldn't send that. Please try again.";
export const EOI_NOT_TAKING_ENQUIRIES = "This tradie isn't taking new enquiries right now.";
export const EOI_NOT_FOUND = 'Tradie not found.';
export const EOI_MESSAGE_MAX_LENGTH = 500;

export interface ExpressInterestInput {
  /** The tradie's `user_id`. */
  tradie_id: string;
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  message?: string | null;
}

export interface EoiRequestBody {
  tradie_id: string;
  name?: string;
  email?: string;
  phone?: string;
  message?: string;
  /** Honeypot — always empty from a real client. */
  company: '';
}

export interface EoiResponse {
  ok: true;
  /** Absent on the honeypot's fake success and on the 24h dedupe path. */
  business_name: string | null;
}

export type EoiErrorKind =
  | 'waitlist_closed'
  | 'not_taking_enquiries'
  | 'rate_limited'
  | 'not_found'
  | 'invalid'
  | 'network'
  | 'unknown';

export class EoiError extends Error {
  kind: EoiErrorKind;
  status?: number;

  constructor(kind: EoiErrorKind, message: string, status?: number) {
    super(message);
    this.name = 'EoiError';
    this.kind = kind;
    this.status = status;
  }
}

/** Trimmed body with blanks dropped (the website sends `|| undefined`) and the honeypot left empty. */
export function buildEoiBody(input: ExpressInterestInput): EoiRequestBody {
  const clean = (v: string | null | undefined): string | undefined => {
    const t = v?.trim();
    return t ? t : undefined;
  };
  return {
    tradie_id: input.tradie_id,
    name: clean(input.name),
    email: clean(input.email),
    phone: clean(input.phone),
    message: clean(input.message),
    company: '',
  };
}

/**
 * Normalise a failed submit into the website's copy: 429 → "Steady on…",
 * waitlist 403 → the shared waitlist message, other 403 → "not taking new
 * enquiries", 404 → "Tradie not found.", 400 → the server's validation text,
 * anything non-HTTP → the generic "Couldn't send that…".
 */
export function classifyEoiError(e: unknown): { kind: EoiErrorKind; message: string; status?: number } {
  if (e instanceof EoiError) return { kind: e.kind, message: e.message, status: e.status };
  if (e instanceof ApiError) {
    if (isWaitlistClosed(e)) {
      return { kind: 'waitlist_closed', message: e.message || WAITLIST_CLOSED_ERROR.error, status: 403 };
    }
    if (e.status === 429) return { kind: 'rate_limited', message: EOI_RATE_LIMITED_MESSAGE, status: 429 };
    if (e.status === 403) {
      return { kind: 'not_taking_enquiries', message: e.message || EOI_NOT_TAKING_ENQUIRIES, status: 403 };
    }
    if (e.status === 404) return { kind: 'not_found', message: e.message || EOI_NOT_FOUND, status: 404 };
    if (e.status === 400) return { kind: 'invalid', message: e.message || EOI_GENERIC_ERROR, status: 400 };
    return { kind: 'unknown', message: e.message || EOI_GENERIC_ERROR, status: e.status };
  }
  return { kind: 'network', message: EOI_GENERIC_ERROR };
}

/**
 * Send an Expression of Interest to a tradie. Resolves with the tradie's
 * business name for the "Sent! {business_name} will be in touch." state;
 * rejects with an `EoiError` carrying the website's copy and a `kind`.
 */
export async function submitExpressionOfInterest(input: ExpressInterestInput): Promise<EoiResponse> {
  try {
    const res = await api.post<{ ok?: boolean; business_name?: string | null; error?: string }>(
      '/api/eoi',
      buildEoiBody(input),
    );
    if (!res?.ok) {
      throw new EoiError('unknown', res?.error ?? EOI_GENERIC_ERROR);
    }
    return { ok: true, business_name: res.business_name ?? null };
  } catch (e) {
    const { kind, message, status } = classifyEoiError(e);
    throw new EoiError(kind, message, status);
  }
}
