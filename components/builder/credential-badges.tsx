/**
 * Displays verified credential badges (ABN, licences, insurance) on builder profiles.
 *
 * Insurance surfaces the new three-state verdict (PASS / REVIEW / FAIL)
 * computed by the website's insurance verifier. Supports both the legacy
 * single-object shape and the new per-kind nested shape
 * (public_liability, professional_indemnity, workers_compensation).
 */
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Colors, Radius, Spacing, Type } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

type AbnVerification = {
  number?: string;
  verified: boolean;
  entity_name?: string;
  verified_at?: string;
};

type LicenceVerification = {
  type: string;
  licence_number?: string;
  verified: boolean;
  display_label?: string;
  verified_at?: string | null;
  status?: string;
};

export type InsuranceVerdict = 'PASS' | 'REVIEW' | 'FAIL';

export interface InsuranceCheck {
  id: string;
  label: string;
  status: 'ok' | 'warn' | 'fail';
  detail?: string;
}

export interface InsuranceKind {
  verified?: boolean;
  verdict?: InsuranceVerdict;
  confidence?: number;
  checks?: InsuranceCheck[];
  insurer_name?: string | null;
  matched_insurer?: string | null;
  policy_number?: string | null;
  insured_name?: string | null;
  coverage_amount?: string | null;
  coverage_amount_dollars?: number | null;
  expiry_date?: string | null;
  policy_type?: string | null;
  verified_at?: string | null;
}

type InsuranceVerification =
  | (InsuranceKind & {
      // Legacy flat shape (no kind subkeys).
      public_liability?: undefined;
      professional_indemnity?: undefined;
      workers_compensation?: undefined;
    })
  | {
      public_liability?: InsuranceKind;
      professional_indemnity?: InsuranceKind;
      workers_compensation?: InsuranceKind;
    };

type CredentialsVerified = {
  abn?: AbnVerification;
  licences?: LicenceVerification[];
  insurance?: InsuranceVerification;
  state?: string;
};

type Props = {
  credentials?: CredentialsVerified | null;
  variant?: 'pills' | 'list';
  /** When true, also render the detailed insurance verdict block under the pills. */
  showInsuranceDetail?: boolean;
};

const INSURANCE_KIND_LABELS: Record<string, string> = {
  public_liability: 'Public Liability',
  professional_indemnity: 'Professional Indemnity',
  workers_compensation: 'Workers Compensation',
};

function formatDate(iso?: string | null): string {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' });
}

function daysUntil(iso?: string | null): number | null {
  if (!iso) return null;
  const ms = new Date(iso).getTime() - Date.now();
  if (Number.isNaN(ms)) return null;
  return Math.floor(ms / 86_400_000);
}

function getInsuranceKinds(insurance?: InsuranceVerification): Array<[string, InsuranceKind]> {
  if (!insurance) return [];
  const nested = insurance as Record<string, InsuranceKind | undefined>;
  const named: Array<[string, InsuranceKind]> = [];
  for (const key of ['public_liability', 'professional_indemnity', 'workers_compensation']) {
    const k = nested[key];
    if (k && (k.verdict || k.verified)) named.push([key, k]);
  }
  if (named.length > 0) return named;
  // Legacy: treat flat shape as PL.
  const flat = insurance as InsuranceKind;
  if (flat.verdict || flat.verified) return [['public_liability', flat]];
  return [];
}

function verdictColor(
  verdict: InsuranceVerdict | undefined,
  colors: typeof Colors.light,
) {
  switch (verdict) {
    case 'PASS':
      return { bg: colors.successLight, text: colors.success, label: 'Verified' };
    case 'REVIEW':
      return { bg: colors.warningLight ?? '#fef3c7', text: colors.warning ?? '#d97706', label: 'Under review' };
    case 'FAIL':
      return { bg: colors.errorLight, text: colors.error, label: 'Rejected' };
    default:
      // No verdict yet (legacy data) — green when verified flag is set.
      return { bg: colors.successLight, text: colors.success, label: 'Verified' };
  }
}

export function CredentialBadges({ credentials, variant = 'pills', showInsuranceDetail = false }: Props) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const colors = Colors[isDark ? 'dark' : 'light'];
  const [expandedKind, setExpandedKind] = useState<string | null>(null);

  if (!credentials) return null;

  const insuranceKinds = getInsuranceKinds(credentials.insurance);

  const hasAnything =
    credentials.abn?.verified ||
    (credentials.licences ?? []).some((l) => l.verified) ||
    insuranceKinds.length > 0;
  if (!hasAnything) return null;

  const Pills = (
    <View style={styles.pillsContainer}>
      {credentials.abn?.verified ? (
        <View
          style={[styles.pill, { backgroundColor: colors.tealBg, borderColor: colors.tealLight }]}
        >
          <MaterialIcons name="verified" size={14} color={colors.teal} />
          <Text style={[styles.pillText, { color: colors.teal }]}>ABN VERIFIED</Text>
        </View>
      ) : null}
      {(credentials.licences ?? [])
        .filter((l) => l.verified)
        .map((licence) => (
          <View
            key={licence.licence_number ?? licence.type}
            style={[styles.pill, { backgroundColor: colors.tealBg, borderColor: colors.tealLight }]}
          >
            <MaterialIcons name="verified" size={14} color={colors.teal} />
            <Text style={[styles.pillText, { color: colors.teal }]}>
              {(licence.display_label || `${licence.type} LICENCE`).toUpperCase()}
            </Text>
          </View>
        ))}
      {insuranceKinds.map(([kind, k]) => {
        const c = verdictColor(k.verdict, colors);
        const icon =
          k.verdict === 'REVIEW'
            ? 'schedule'
            : k.verdict === 'FAIL'
              ? 'cancel'
              : 'verified';
        return (
          <View
            key={kind}
            style={[styles.pill, { backgroundColor: c.bg, borderColor: c.bg }]}
          >
            <MaterialIcons name={icon as any} size={14} color={c.text} />
            <Text style={[styles.pillText, { color: c.text }]}>
              {INSURANCE_KIND_LABELS[kind] ?? 'Insurance'} · {c.label}
            </Text>
          </View>
        );
      })}
    </View>
  );

  if (variant === 'list') {
    return (
      <View style={styles.listContainer}>
        {credentials.abn?.verified ? (
          <View style={styles.listItem}>
            <MaterialIcons name="verified" size={18} color={colors.success} />
            <View style={styles.listText}>
              <Text style={[styles.listLabel, { color: colors.text }]}>ABN Verified</Text>
              {credentials.abn.verified_at ? (
                <Text style={[styles.listDate, { color: colors.textSecondary }]}>
                  Verified {formatDate(credentials.abn.verified_at)}
                </Text>
              ) : null}
            </View>
          </View>
        ) : null}
        {(credentials.licences ?? [])
          .filter((l) => l.verified)
          .map((licence) => (
            <View key={licence.licence_number ?? licence.type} style={styles.listItem}>
              <MaterialIcons name="verified" size={18} color={colors.success} />
              <View style={styles.listText}>
                <Text style={[styles.listLabel, { color: colors.text }]}>
                  {licence.display_label || `${licence.type} Licence`}
                </Text>
                {licence.verified_at ? (
                  <Text style={[styles.listDate, { color: colors.textSecondary }]}>
                    Verified {formatDate(licence.verified_at)}
                  </Text>
                ) : null}
              </View>
            </View>
          ))}
        {insuranceKinds.map(([kind, k]) => (
          <InsuranceRow key={kind} kind={kind} data={k} colors={colors} />
        ))}
      </View>
    );
  }

  return (
    <View style={{ gap: Spacing.sm }}>
      {Pills}
      {showInsuranceDetail && insuranceKinds.length > 0 ? (
        <View style={{ gap: Spacing.xs }}>
          {insuranceKinds.map(([kind, k]) => {
            const expanded = expandedKind === kind;
            const c = verdictColor(k.verdict, colors);
            const days = daysUntil(k.expiry_date);
            return (
              <Pressable
                key={kind}
                onPress={() => setExpandedKind(expanded ? null : kind)}
                style={[
                  styles.detailCard,
                  { backgroundColor: isDark ? colors.surface : '#fff', borderColor: colors.border },
                ]}
              >
                <View style={styles.detailHeader}>
                  <Text style={[Type.bodySemiBold, { color: colors.text, flex: 1 }]}>
                    {INSURANCE_KIND_LABELS[kind] ?? kind}
                  </Text>
                  <Text style={[styles.verdictBadge, { color: c.text, backgroundColor: c.bg }]}>
                    {c.label}
                  </Text>
                </View>
                <View style={styles.detailMeta}>
                  {k.insurer_name ? (
                    <Text style={[Type.caption, { color: colors.textSecondary }]}>
                      Insurer: {k.insurer_name}
                    </Text>
                  ) : null}
                  {k.coverage_amount ? (
                    <Text style={[Type.caption, { color: colors.textSecondary }]}>
                      Coverage: {k.coverage_amount}
                    </Text>
                  ) : null}
                  {k.expiry_date ? (
                    <Text
                      style={[
                        Type.caption,
                        {
                          color:
                            days !== null && days >= 0 && days <= 30 ? colors.warning ?? '#d97706' : colors.textSecondary,
                          fontWeight:
                            days !== null && days >= 0 && days <= 30 ? '700' : 'normal',
                        },
                      ]}
                    >
                      Expires {formatDate(k.expiry_date)}
                      {days !== null && days >= 0 && days <= 30 ? ` · ${days}d left` : ''}
                      {days !== null && days < 0 ? ' · expired' : ''}
                    </Text>
                  ) : null}
                </View>
                {expanded && k.checks && k.checks.length > 0 ? (
                  <View style={styles.checksList}>
                    {k.checks.map((check) => (
                      <View key={check.id} style={styles.checkRow}>
                        <MaterialIcons
                          name={
                            check.status === 'ok'
                              ? 'check-circle'
                              : check.status === 'warn'
                                ? 'warning'
                                : 'cancel'
                          }
                          size={14}
                          color={
                            check.status === 'ok'
                              ? colors.success
                              : check.status === 'warn'
                                ? colors.warning ?? '#d97706'
                                : colors.error
                          }
                        />
                        <View style={{ flex: 1 }}>
                          <Text style={[Type.caption, { color: colors.text }]}>{check.label}</Text>
                          {check.detail ? (
                            <Text style={[styles.checkDetail, { color: colors.textSecondary }]}>
                              {check.detail}
                            </Text>
                          ) : null}
                        </View>
                      </View>
                    ))}
                  </View>
                ) : null}
                {k.checks && k.checks.length > 0 ? (
                  <Text style={[styles.expandHint, { color: colors.teal }]}>
                    {expanded ? 'Hide checks' : 'Show checks'}
                  </Text>
                ) : null}
              </Pressable>
            );
          })}
        </View>
      ) : null}
    </View>
  );
}

function InsuranceRow({
  kind,
  data,
  colors,
}: {
  kind: string;
  data: InsuranceKind;
  colors: typeof Colors.light;
}) {
  const c = verdictColor(data.verdict, colors);
  return (
    <View style={styles.listItem}>
      <MaterialIcons
        name={data.verdict === 'REVIEW' ? 'schedule' : data.verdict === 'FAIL' ? 'cancel' : 'verified'}
        size={18}
        color={c.text}
      />
      <View style={styles.listText}>
        <Text style={[styles.listLabel, { color: colors.text }]}>
          {INSURANCE_KIND_LABELS[kind] ?? 'Insurance'} · {c.label}
        </Text>
        {data.expiry_date ? (
          <Text style={[styles.listDate, { color: colors.textSecondary }]}>
            Expires {formatDate(data.expiry_date)}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  pillsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: Radius.sm,
    borderWidth: 1,
  },
  pillText: {
    ...Type.micro,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  listContainer: {
    gap: Spacing.sm,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  listText: {
    gap: 1,
  },
  listLabel: {
    ...Type.bodySemiBold,
  },
  listDate: {
    ...Type.caption,
  },
  detailCard: {
    borderRadius: Radius.md,
    borderWidth: 1,
    padding: Spacing.sm,
    gap: Spacing.xs,
  },
  detailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  verdictBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: Radius.full,
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    overflow: 'hidden',
  },
  detailMeta: { gap: 2 },
  checksList: { gap: 6, marginTop: Spacing.xs },
  checkRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
  },
  checkDetail: {
    fontSize: 11,
    lineHeight: 15,
    marginTop: 1,
  },
  expandHint: {
    fontSize: 12,
    fontWeight: '700',
    marginTop: 2,
  },
});
