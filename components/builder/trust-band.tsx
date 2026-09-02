/**
 * TrustBand — ~/bldesy-web/components/builder/trust-band.tsx: the full-width
 * strip under the profile header — the single home for everything BLDESY has
 * checked: credentials (the shared CredentialBadges list, incl. N/A rows and
 * the threshold badge), licensed states, memberships and the opt-in BLDESY
 * Score, with the standing ACL disclaimer.
 */
import { StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import { CredentialBadges } from '@/components/builder/credential-badges';
import { CredentialsDisclaimer } from '@/components/builder/credentials-disclaimer';
import { Colors, FontFamily, Radius, Shadows, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import type { Credentials, CredentialsVerified } from '@/types';

interface TrustBandProps {
  credentialsVerified: CredentialsVerified | null;
  /** Legacy boolean credentials — fallback when no structured data exists. */
  credentials: Credentials | null;
  licensedStates: string[] | null;
  bldesyScore: number | null;
  displayBldesyScore: boolean;
  /** Profile trade slugs — lets the badge show "Not applicable" rows on all-non-licensed profiles. */
  tradeSlugs?: string[] | null;
}

/** True when the structured credentials object holds at least one verified item. */
export function hasVerifiedCredentials(cv: CredentialsVerified | null): boolean {
  if (!cv) return false;
  return Boolean(cv.abn?.verified || cv.insurance?.public_liability?.verified || cv.licences?.some((l) => l.verified));
}

export function hasLegacyBadges(credentials: Credentials | null): boolean {
  if (!credentials) return false;
  return Boolean(
    credentials.abn_verified ||
      credentials.license_verified ||
      credentials.insurance_verified ||
      (credentials.memberships && credentials.memberships.length > 0),
  );
}

export function TrustBand({ credentialsVerified, credentials, licensedStates, bldesyScore, displayBldesyScore, tradeSlugs = null }: TrustBandProps) {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];
  const hasStructured = hasVerifiedCredentials(credentialsVerified);
  const hasLegacy = hasLegacyBadges(credentials);
  const showScore = displayBldesyScore && bldesyScore != null;
  const memberships = credentials?.memberships ?? [];

  if (!hasStructured && !hasLegacy && !showScore && !licensedStates?.length) return null;

  return (
    <View accessibilityLabel="Verified by BLDESY" style={[styles.card, Shadows.sm, { backgroundColor: c.surface, borderColor: c.border }]}>
      <View style={styles.headRow}>
        <View style={[styles.shield, { backgroundColor: c.primaryBg }]}>
          <Ionicons name="shield-checkmark-outline" size={20} color={c.primary} />
        </View>
        <View style={styles.flex1}>
          <Text accessibilityRole="header" style={[styles.title, { color: c.textPrimary }]}>
            Verified by BLDESY
          </Text>
          <Text style={[styles.sub, { color: c.textSecondary }]}>Credentials checked against official registers and documents</Text>
        </View>
      </View>

      {showScore ? (
        <View style={[styles.scoreCard, { borderColor: c.primary + '33', backgroundColor: c.primary + '0A' }]}>
          <View style={[styles.scoreRing, { backgroundColor: c.primary + '1A', borderColor: c.primary + '33' }]}>
            <Text style={[styles.scoreValue, { color: c.primary }]}>{bldesyScore}</Text>
            <Text style={[styles.scoreOutOf, { color: c.primary + 'B3' }]}>/ 100</Text>
          </View>
          <View style={styles.flex1}>
            <Text style={[styles.scoreTitle, { color: c.textPrimary }]}>BLDESY Score</Text>
            <Text style={[styles.scoreBlurb, { color: c.textSecondary }]}>
              Independent trust score combining verified credentials and public reputation.
            </Text>
          </View>
        </View>
      ) : null}

      {hasStructured || hasLegacy ? (
        <View style={styles.badges}>
          <CredentialBadges
            credentialsVerified={hasStructured ? credentialsVerified : null}
            legacyCredentials={credentials}
            variant="list"
            columns
            tradeSlugs={tradeSlugs}
          />
        </View>
      ) : null}

      {(licensedStates && licensedStates.length > 0) || memberships.length > 0 ? (
        <View style={styles.chipRow}>
          {licensedStates && licensedStates.length > 0 ? (
            <>
              <Text style={[styles.chipLabel, { color: c.textSecondary }]}>Licensed in:</Text>
              {licensedStates.map((s) => (
                <View key={s} style={[styles.stateChip, { backgroundColor: c.primary + '1A' }]}>
                  <Text style={[styles.stateChipText, { color: c.primary }]}>{s}</Text>
                </View>
              ))}
            </>
          ) : null}
          {memberships.map((m) => (
            <View key={m} style={[styles.memberChip, { backgroundColor: c.primaryBg, borderColor: c.primary + '33' }]}>
              <Text style={[styles.memberChipText, { color: c.primary }]}>{m}</Text>
            </View>
          ))}
        </View>
      ) : null}

      <View style={[styles.disclaimer, { borderTopColor: c.border }]}>
        <CredentialsDisclaimer />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Radius.xl,
    borderWidth: 1,
    padding: Spacing.xl,
  },
  headRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  shield: {
    width: 40,
    height: 40,
    borderRadius: Radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  flex1: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    fontFamily: FontFamily.bodySemiBold,
    fontWeight: '600',
    fontSize: 16,
    letterSpacing: -0.2,
  },
  sub: {
    fontFamily: FontFamily.body,
    fontSize: 12,
    lineHeight: 16,
  },
  scoreCard: {
    marginTop: Spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    borderWidth: 1,
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  scoreRing: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreValue: {
    fontFamily: FontFamily.bodyBold,
    fontWeight: '800',
    fontSize: 20,
    lineHeight: 22,
  },
  scoreOutOf: {
    fontFamily: FontFamily.bodySemiBold,
    fontWeight: '600',
    fontSize: 9,
  },
  scoreTitle: {
    fontFamily: FontFamily.bodySemiBold,
    fontWeight: '600',
    fontSize: 14,
  },
  scoreBlurb: {
    fontFamily: FontFamily.body,
    fontSize: 12,
    lineHeight: 16,
  },
  badges: {
    marginTop: Spacing.xl,
  },
  chipRow: {
    marginTop: Spacing.lg,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  chipLabel: {
    fontFamily: FontFamily.bodySemiBold,
    fontWeight: '600',
    fontSize: 12,
  },
  stateChip: {
    borderRadius: Radius.full,
    paddingHorizontal: 10,
    paddingVertical: 2,
  },
  stateChipText: {
    fontFamily: FontFamily.bodyBold,
    fontWeight: '700',
    fontSize: 12,
  },
  memberChip: {
    borderWidth: 1,
    borderRadius: Radius.full,
    paddingHorizontal: 10,
    paddingVertical: 2,
  },
  memberChipText: {
    fontFamily: FontFamily.bodySemiBold,
    fontWeight: '600',
    fontSize: 12,
  },
  disclaimer: {
    marginTop: Spacing.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: Spacing.md,
  },
});
