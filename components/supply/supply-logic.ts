/**
 * Pure rules behind the supply widgets — kept free of React Native so the
 * node unit tests can import them (__tests__/marketing/supply-logic.test.ts).
 */
import { FOUNDING_COUNTER_MIN_TAKEN } from '@/lib/web/founding-offer';

export type ChipTone = 'full' | 'low' | 'ok';

/** SpotsRemaining chip tint: full → error, three or fewer → warning, otherwise brand. */
export function chipTone(remaining: number): ChipTone {
  if (remaining === 0) return 'full';
  if (remaining <= 3) return 'low';
  return 'ok';
}

/**
 * FoundingSpotsLeft visibility: nothing until FOUNDING_COUNTER_MIN_TAKEN spots
 * are consumed (a full "200 of 200" reads as nobody-joined), nothing on a
 * failed fetch, nothing once the cap is exhausted — never a made-up number.
 */
export function foundingSpotsToShow(spots: { taken: number; remaining: number } | null): number | null {
  if (!spots) return null;
  return spots.taken >= FOUNDING_COUNTER_MIN_TAKEN && spots.remaining > 0 ? spots.remaining : null;
}
