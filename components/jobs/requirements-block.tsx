/**
 * "Requirements" block on the Project Job detail page. Renders nothing when
 * the job has no requirements at all.
 * Port of ~/bldesy-web/components/jobs/requirements-block.tsx.
 */
import { StyleSheet, Text, View } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

import { Colors, FontFamily, Radius, Shadows, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { formatPublicLiability } from '@/lib/web/capabilities';
import type { MatchResult } from '@/lib/web/match';

/** Tailwind amber-600 — the web's "missing" status icon. */
const AMBER = '#d97706';

interface RequirementsBlockProps {
  /**
   * Match result computed against the viewing tradie's capabilities. If
   * `null`, the viewer isn't a tradie — render the requirements but skip
   * per-item green/yellow status (just show as plain bullet items).
   */
  match: MatchResult | null;
}

export function RequirementsBlock({ match }: RequirementsBlockProps) {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];

  if (!match || match.hasNoRequirements) return null;

  const requiredItems = [...match.metRequired, ...match.missingRequired];
  const preferredItems = [...match.metPreferred, ...match.missingPreferred];
  const hasLiabilityReq = match.publicLiabilityRequired != null;

  if (requiredItems.length === 0 && preferredItems.length === 0 && !hasLiabilityReq) {
    return null;
  }

  return (
    <View style={[styles.card, Shadows.sm, { backgroundColor: c.surface, borderColor: c.border }]}>
      <Text style={[styles.heading, { color: c.textPrimary }]}>REQUIREMENTS</Text>

      {requiredItems.length > 0 || hasLiabilityReq ? (
        <View>
          <Text style={[styles.subheading, { color: c.textSecondary }]}>REQUIRED</Text>
          <View style={styles.list}>
            {requiredItems.map((item) => (
              <View key={item.key} style={styles.row}>
                <StatusIcon met={item.met} successColor={c.success} />
                <Text style={[styles.label, { color: item.met ? c.textPrimary : c.textSecondary }]}>
                  {item.label}
                </Text>
              </View>
            ))}
            {hasLiabilityReq ? (
              <View style={styles.row}>
                <StatusIcon met={match.publicLiabilityMet ?? false} successColor={c.success} />
                <Text
                  style={[
                    styles.label,
                    { color: match.publicLiabilityMet ? c.textPrimary : c.textSecondary },
                  ]}
                >
                  {formatPublicLiability(match.publicLiabilityRequired)}
                </Text>
              </View>
            ) : null}
          </View>
        </View>
      ) : null}

      {preferredItems.length > 0 ? (
        <View>
          <Text style={[styles.subheading, { color: c.textSecondary }]}>NICE TO HAVE</Text>
          <View style={styles.list}>
            {preferredItems.map((item) => (
              <View key={item.key} style={styles.row}>
                {item.met ? (
                  <StatusIcon met successColor={c.success} />
                ) : (
                  <View style={[styles.dot, { backgroundColor: c.border }]} />
                )}
                <Text
                  style={[
                    styles.label,
                    { color: item.met ? c.textPrimary : c.textSecondary + 'B3' },
                  ]}
                >
                  {item.label}
                </Text>
              </View>
            ))}
          </View>
        </View>
      ) : null}
    </View>
  );
}

function StatusIcon({ met, successColor }: { met: boolean; successColor: string }) {
  return met ? (
    <MaterialIcons name="check" size={16} color={successColor} />
  ) : (
    <MaterialIcons name="warning" size={16} color={AMBER} />
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Radius.xl,
    borderWidth: 1,
    padding: Spacing['2xl'],
    gap: Spacing.xl, // web space-y-5
  },
  heading: {
    fontSize: 14,
    fontFamily: FontFamily.bodyBold,
    fontWeight: '700',
    letterSpacing: 1, // tracking-wider
  },
  subheading: {
    marginBottom: Spacing.sm,
    fontSize: 11,
    fontFamily: FontFamily.bodyBold,
    fontWeight: '700',
    letterSpacing: 1,
  },
  list: { gap: Spacing.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  dot: { width: 16, height: 16, borderRadius: 8 },
  label: { fontSize: 14, lineHeight: 20, fontFamily: FontFamily.body, flex: 1 },
});
