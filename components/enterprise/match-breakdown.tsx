/**
 * MatchBreakdown — the per-applicant expanded capability breakdown from
 * ~/bldesy-web/app/enterprise/jobs/[id]/page.tsx: Required and Preferred
 * items with green ticks / red crosses, plus the public-liability comparison.
 * "Summary on the surface, detail on demand" — the card shows the match
 * headline chip; tapping it reveals this.
 */
import { StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import { FontFamily, Radius, Spacing } from '@/constants/theme';
import { formatPublicLiability, type TradieCapabilities } from '@/lib/web/capabilities';
import type { MatchResult } from '@/lib/web/match';

import { useHubTheme } from './hub-primitives';

export function MatchBreakdown({ match, capabilities }: { match: MatchResult; capabilities: TradieCapabilities | null }) {
  const c = useHubTheme();
  const requiredItems = [...match.metRequired, ...match.missingRequired];
  const preferredItems = [...match.metPreferred, ...match.missingPreferred];

  return (
    <View style={[styles.box, { backgroundColor: c.canvas, borderColor: c.border }]}>
      {requiredItems.length > 0 || match.publicLiabilityRequired != null ? (
        <View>
          <Text style={[styles.heading, { color: c.textSecondary }]}>Required</Text>
          <View style={styles.list}>
            {requiredItems.map((item) => (
              <BreakdownRow key={`r-${item.key}`} label={item.label} state={item.met ? 'yes' : 'no'} />
            ))}
            {match.publicLiabilityRequired != null ? (
              <BreakdownRow
                label={formatPublicLiability(match.publicLiabilityRequired) ?? 'Public liability'}
                state={match.publicLiabilityMet ? 'yes' : 'no'}
                detail={
                  capabilities?.public_liability_amount != null
                    ? (formatPublicLiability(capabilities.public_liability_amount) ?? undefined)
                    : 'Tradie has none on file'
                }
              />
            ) : null}
          </View>
        </View>
      ) : null}
      {preferredItems.length > 0 ? (
        <View>
          <Text style={[styles.heading, { color: c.textSecondary }]}>Preferred</Text>
          <View style={styles.list}>
            {preferredItems.map((item) => (
              <BreakdownRow key={`p-${item.key}`} label={item.label} state={item.met ? 'yes' : 'neutral'} />
            ))}
          </View>
        </View>
      ) : null}
      {capabilities == null ? (
        <Text style={[styles.note, { color: c.textSecondary }]}>Tradie hasn&apos;t filled in their capabilities yet.</Text>
      ) : null}
    </View>
  );
}

function BreakdownRow({ label, state, detail }: { label: string; state: 'yes' | 'no' | 'neutral'; detail?: string }) {
  const c = useHubTheme();
  return (
    <View style={styles.row}>
      {state === 'yes' ? (
        <Ionicons name="checkmark" size={14} color={c.success} style={styles.rowIcon} />
      ) : state === 'no' ? (
        <Ionicons name="close-circle" size={14} color={c.error} style={styles.rowIcon} />
      ) : (
        <View style={[styles.neutralDot, { backgroundColor: c.border }]} />
      )}
      <View style={{ flex: 1 }}>
        <Text style={[styles.rowLabel, { color: state === 'yes' ? c.textPrimary : c.textSecondary }]}>{label}</Text>
        {detail ? <Text style={[styles.rowDetail, { color: c.textSecondary + 'B3' }]}>{detail}</Text> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    marginTop: Spacing.md,
    gap: Spacing.md,
    borderRadius: Radius.lg,
    borderWidth: 1,
    padding: Spacing.md,
  },
  heading: {
    marginBottom: 6,
    fontSize: 10,
    fontFamily: FontFamily.bodyBold,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  list: {
    gap: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
  },
  rowIcon: {
    marginTop: 1,
  },
  neutralDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 4,
    marginHorizontal: 3,
  },
  rowLabel: {
    fontSize: 11,
    lineHeight: 15,
    fontFamily: FontFamily.body,
  },
  rowDetail: {
    fontSize: 10,
    lineHeight: 14,
    fontFamily: FontFamily.body,
  },
  note: {
    fontSize: 11,
    lineHeight: 15,
    fontFamily: FontFamily.body,
  },
});
