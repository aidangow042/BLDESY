/**
 * ReferralDashboardCard — port of
 * `~/bldesy-web/components/referrals/referral-dashboard-card.tsx`.
 *
 * The dismissible referral card at the top of the portal dashboard. Dismissal
 * persists to builder_profiles.referral_card_dismissed_at — deliberately the
 * DB, not device storage, so it stays dismissed across devices. After
 * dismissal the permanent "Refer & Earn" nav item is the way back in.
 */
import { useState } from 'react';

import { dismissReferralCard } from '@/lib/data/portal';

import { ReferralCodeCard } from './referral-code-card';

export function ReferralDashboardCard() {
  const [dismissed, setDismissed] = useState(false);

  async function handleDismiss() {
    // Hide immediately; the write is best-effort (a failure just means the
    // card reappears next visit — no error surface needed for a dismiss).
    setDismissed(true);
    await dismissReferralCard().catch(() => {});
  }

  if (dismissed) return null;

  return <ReferralCodeCard variant="dashboard" onDismiss={() => void handleDismiss()} />;
}
