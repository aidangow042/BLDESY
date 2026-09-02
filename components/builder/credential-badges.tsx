/**
 * Verified credential badges (ABN, licences, insurance) — port of
 * ~/bldesy-web/components/builder/credential-badges.tsx. Same badge set, same
 * N/A rows for licence-exempt trades, same "Not licensed — jobs under $5,000
 * only" row for unlicensed NSW threshold trades, same date suffix.
 */
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

import { Colors, FontFamily, Radius, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { NSW_THRESHOLD_AMOUNT, requiresLicense, unlicensedThresholdTrades } from '@/lib/web/licensed-trades';
import { getLicenceClass, type LicenceClass } from '@/lib/web/trade-licence-map';
import { formatTradeName } from '@/lib/web/trades';
import type { Credentials, CredentialsVerified } from '@/types/database';

/**
 * Compose the on-badge label from the licence's class + trade slug.
 *
 *   - 'trade'      → keep the existing display_label (e.g. "NSW Plumbing Licence").
 *   - 'contractor' → "Licensed Contractor — {Trade} (NSW)" — the state suffix keeps
 *                    multi-state holders from rendering identical-looking rows.
 *   - 'civil'      → "Civil Contractor — {Trade} (NSW)".
 *   - 'specialist' → keep display_label — it's already precise ("Asbestos Removal Licence" etc.).
 */
export function formatBadgeLabel(
  licenceClass: LicenceClass,
  tradeSlug: string,
  displayLabel: string,
  state: string | null | undefined,
): string {
  if (licenceClass === 'trade' || licenceClass === 'specialist') return displayLabel;
  const tradeName = formatTradeName(tradeSlug);
  const base =
    licenceClass === 'civil' ? `Civil Contractor — ${tradeName}` : `Licensed Contractor — ${tradeName}`;
  return state ? `${base} (${state})` : base;
}

interface CredentialBadgesProps {
  credentialsVerified: CredentialsVerified | null | undefined;
  /**
   * Legacy boolean credentials — rendered (undated) only when no structured
   * verification data exists, so every profile shows one badge system.
   */
  legacyCredentials?: Credentials | null;
  /** "pills" = horizontal pill badges, "list" = vertical tick list */
  variant?: 'pills' | 'list';
  /** List variant only on the web: two columns on wide layouts. Accepted for API parity. */
  columns?: boolean;
  /**
   * The profile's trade slugs (primary + secondaries). When EVERY trade is
   * non-licensed, licence and White Card render as neutral "Not applicable"
   * rows — the badge itself answers the question instead of staying silent.
   * Omit where trades are unknown (enterprise profiles) to keep old behaviour.
   */
  tradeSlugs?: string[] | null;
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '';
  try {
    return new Date(dateStr).toLocaleDateString('en-AU', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return '';
  }
}

export interface BadgeItem {
  label: string;
  verifiedAt: string | null;
  /** Drives grouping in the list variant. */
  group?: 'abn' | 'insurance' | 'licence:business' | 'licence:individual';
  /** Neutral "Not applicable" row — grey dash instead of a green tick. */
  na?: boolean;
  /** Verification source of a licence row (e.g. "no_licence_required"). */
  source?: string;
}

export function collectBadges(credentialsVerified: CredentialsVerified): BadgeItem[] {
  const items: BadgeItem[] = [];

  if (credentialsVerified.abn?.verified) {
    items.push({ label: 'ABN Verified', verifiedAt: credentialsVerified.abn.verified_at, group: 'abn' });
  }

  if (credentialsVerified.licences) {
    for (const licence of credentialsVerified.licences) {
      if (licence.verified) {
        const holder = licence.licence_holder_type ?? 'individual';
        const licenceClass = getLicenceClass(licence.type, licence.state);
        items.push({
          label: formatBadgeLabel(licenceClass, licence.type, licence.display_label, licence.state),
          verifiedAt: licence.verified_at,
          group: holder === 'business' ? 'licence:business' : 'licence:individual',
          source: licence.source,
        });
      }
    }
  }

  if (credentialsVerified.insurance?.public_liability?.verified) {
    items.push({
      label: 'Insurance Certified',
      verifiedAt: credentialsVerified.insurance.public_liability.verified_at,
      group: 'insurance',
    });
  }

  // Collapse exact duplicates (same label in the same group) — a repeated row
  // reads as a rendering bug to visitors.
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = `${item.group}|${item.label}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function collectLegacyBadges(credentials: Credentials): BadgeItem[] {
  const items: BadgeItem[] = [];
  if (credentials.abn_verified) items.push({ label: 'ABN Verified', verifiedAt: null, group: 'abn' });
  if (credentials.license_verified) items.push({ label: 'Licensed', verifiedAt: null });
  if (credentials.insurance_verified) items.push({ label: 'Insured', verifiedAt: null, group: 'insurance' });
  return items;
}

/** The full badge list the component renders (exported for tests / other surfaces). */
export function credentialBadgeItems(
  credentialsVerified: CredentialsVerified | null | undefined,
  legacyCredentials: Credentials | null | undefined,
  tradeSlugs: string[] | null | undefined,
): BadgeItem[] {
  // Every trade on the profile is licence-exempt → licence and White Card
  // become "Not applicable" rows rather than silent gaps.
  const allNonLicensed =
    tradeSlugs != null && tradeSlugs.length > 0 && tradeSlugs.every((slug) => !requiresLicense(slug));

  let items = credentialsVerified ? collectBadges(credentialsVerified) : [];
  if (items.length === 0 && legacyCredentials) {
    items = collectLegacyBadges(legacyCredentials);
  }

  if (allNonLicensed && items.length > 0) {
    // The verify pipeline can project a "No licence required" licence row
    // (source: no_licence_required) — the explicit N/A row replaces it. A
    // genuinely verified licence (voluntary extra) is never hidden.
    items = items.filter((i) => i.source !== 'no_licence_required');
    const hasRealLicence = items.some((i) => i.group === 'licence:business' || i.group === 'licence:individual');
    const forThe = tradeSlugs.length === 1 ? 'for this trade' : 'for these trades';
    if (!hasRealLicence) {
      items.push({ label: `Licence — not applicable ${forThe}`, verifiedAt: null, na: true });
    }
    items.push({ label: `White Card — not applicable ${forThe}`, verifiedAt: null, na: true });
  }

  // NSW $5,000 minor-works threshold trades with no verified licence FOR THAT
  // SPECIFIC TRADE: a trade that CAN be licensed and simply isn't — silence
  // here would read as an unremarked gap. Per-trade, not per-profile.
  if (tradeSlugs != null && tradeSlugs.length > 0) {
    const verifiedTradeSlugs = new Set(
      (credentialsVerified?.licences ?? []).filter((l) => l.verified).map((l) => l.type),
    );
    const unlicensed = unlicensedThresholdTrades(tradeSlugs, verifiedTradeSlugs);
    for (const trade of unlicensed) {
      const suffix = tradeSlugs.length > 1 ? ` (${formatTradeName(trade)})` : '';
      items.push({
        label: `Not licensed — jobs under $${NSW_THRESHOLD_AMOUNT.toLocaleString('en-AU')} only${suffix}`,
        verifiedAt: null,
        na: true,
      });
    }
  }

  return items;
}

function Pill({ label, verifiedAt, na }: BadgeItem) {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];
  const [showTooltip, setShowTooltip] = useState(false);
  const dateStr = formatDate(verifiedAt);

  if (na) {
    return (
      <View style={[styles.pill, styles.pillNa, { backgroundColor: c.canvas, borderColor: c.border }]}>
        <Text style={[styles.pillText, { color: c.textSecondary }]}>{label.toUpperCase()}</Text>
      </View>
    );
  }

  const pill = (
    <View style={[styles.pill, { backgroundColor: c.primaryLight }]}>
      <MaterialIcons name="verified" size={14} color={c.primary} />
      <Text style={[styles.pillText, { color: c.primary }]}>{label.toUpperCase()}</Text>
    </View>
  );

  if (!dateStr) return pill;

  return (
    <View>
      <Pressable
        onPress={() => setShowTooltip((s) => !s)}
        accessibilityRole="button"
        accessibilityLabel={`${label} — Verified on ${dateStr}`}
      >
        {pill}
      </Pressable>
      {showTooltip ? (
        <View style={[styles.tooltip, { backgroundColor: c.textPrimary }]} accessibilityRole="text">
          <Text style={[styles.tooltipText, { color: c.canvas }]}>Verified on {dateStr}</Text>
        </View>
      ) : null}
    </View>
  );
}

function TickItem({ label, verifiedAt, na }: BadgeItem) {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];
  const dateStr = formatDate(verifiedAt);

  if (na) {
    // Neutral row: a grey dash-in-circle, not a tick and never a cross —
    // "not applicable" must not read as missing or failed.
    return (
      <View style={styles.tickRow}>
        <MaterialIcons name="remove-circle-outline" size={20} color={c.textSecondary + '80'} />
        <Text style={[styles.tickLabel, { color: c.textSecondary }]}>{label}</Text>
      </View>
    );
  }

  return (
    <View style={styles.tickRow}>
      <MaterialIcons name="check-circle-outline" size={20} color={c.success} />
      <Text style={[styles.tickLabel, { color: c.textPrimary }]}>
        {label}
        {dateStr ? <Text style={[styles.tickDate, { color: c.textSecondary }]}> ({dateStr})</Text> : null}
      </Text>
    </View>
  );
}

export function CredentialBadges({
  credentialsVerified,
  legacyCredentials = null,
  variant = 'list',
  tradeSlugs = null,
}: CredentialBadgesProps) {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];
  const items = credentialBadgeItems(credentialsVerified, legacyCredentials, tradeSlugs);

  if (items.length === 0) return null;

  if (variant === 'pills') {
    return (
      <View style={styles.pillWrap} accessibilityLabel="Verified credentials">
        {items.map((item) => (
          <Pill key={item.label} {...item} />
        ))}
      </View>
    );
  }

  // List variant: group business licences and personal licences under their
  // own sub-headings. Non-licence items (ABN, insurance) render first.
  const nonLicence = items.filter((i) => i.group !== 'licence:business' && i.group !== 'licence:individual');
  const business = items.filter((i) => i.group === 'licence:business');
  const personal = items.filter((i) => i.group === 'licence:individual');

  return (
    <View style={styles.listWrap} accessibilityLabel="Verified credentials">
      {nonLicence.length > 0 ? (
        <View style={styles.group}>
          {nonLicence.map((item) => (
            <TickItem key={item.label} {...item} />
          ))}
        </View>
      ) : null}
      {business.length > 0 ? (
        <View>
          <Text style={[styles.groupHeading, { color: c.textSecondary }]}>BUSINESS LICENCES</Text>
          <View style={styles.group}>
            {business.map((item) => (
              <TickItem key={`b-${item.label}`} {...item} />
            ))}
          </View>
        </View>
      ) : null}
      {personal.length > 0 ? (
        <View>
          <Text style={[styles.groupHeading, { color: c.textSecondary }]}>PERSONAL LICENCES</Text>
          <View style={styles.group}>
            {personal.map((item) => (
              <TickItem key={`p-${item.label}`} {...item} />
            ))}
          </View>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  pillWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: Radius.full,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  pillNa: { borderWidth: 1 },
  pillText: { fontSize: 11, fontFamily: FontFamily.bodyBold, fontWeight: '700', letterSpacing: 0.5 },
  tooltip: { marginTop: 4, alignSelf: 'flex-start', borderRadius: Radius.sm, paddingHorizontal: 10, paddingVertical: 4 },
  tooltipText: { fontSize: 10, fontFamily: FontFamily.bodyMedium, fontWeight: '500' },
  listWrap: { gap: Spacing.lg },
  group: { gap: 10 },
  groupHeading: { marginBottom: 6, fontSize: 11, fontFamily: FontFamily.bodyBold, fontWeight: '700', letterSpacing: 1 },
  tickRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  tickLabel: { flex: 1, fontSize: 14, lineHeight: 20, fontFamily: FontFamily.body },
  tickDate: { fontSize: 10, fontFamily: FontFamily.body },
});
