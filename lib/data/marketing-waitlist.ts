/**
 * Waitlist step-2 helper — the one waitlist call lib/data/public-forms.ts does
 * not cover:
 *   POST /api/waitlist/classify   ~/bldesy-web/app/api/waitlist/classify/route.ts
 *                                 (client: components/waitlist/waitlist-form.tsx)
 *
 * AI-tags a homeowner's free-text job description with ONE trade slug (+ a
 * short sub-trade label and whether it reads as a job or a story). Best-effort
 * on both ends: the route degrades to nulls when the key is missing or the
 * model is unsure, and this client never throws — the manual trade picker is
 * always available.
 */
import { api } from '@/lib/api';

export type WaitlistEntryKind = 'job' | 'story' | 'unknown';

export interface WaitlistClassification {
  trade_category: string | null;
  sub_trade: string | null;
  entry_type: WaitlistEntryKind | null;
}

export const NO_CLASSIFICATION: WaitlistClassification = {
  trade_category: null,
  sub_trade: null,
  entry_type: null,
};

/** The route ignores anything under 4 characters; the form only asks from 6. */
export const CLASSIFY_MIN_LENGTH = 6;

export async function classifyWaitlistDescription(description: string): Promise<WaitlistClassification> {
  const text = description.trim();
  if (text.length < CLASSIFY_MIN_LENGTH) return NO_CLASSIFICATION;
  try {
    const json = await api.post<Partial<WaitlistClassification> | null>('/api/waitlist/classify', {
      description: text,
    });
    return {
      trade_category: typeof json?.trade_category === 'string' ? json.trade_category : null,
      sub_trade: typeof json?.sub_trade === 'string' ? json.sub_trade : null,
      entry_type:
        json?.entry_type === 'job' || json?.entry_type === 'story' || json?.entry_type === 'unknown'
          ? json.entry_type
          : null,
    };
  } catch {
    return NO_CLASSIFICATION;
  }
}
