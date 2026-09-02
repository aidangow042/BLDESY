/**
 * Review step. Port of ~/bldesy-web/components/jobs/step-review.tsx: the
 * summary card (title, Contract/trade/urgency badges, specialities, edit
 * pencil), the Roles / Description / Location sections with their "Edit"
 * links, and the Annex A.2 "Heads up" clickwrap disclaimer.
 */
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import { Badge, Card } from '@/components/ui';
import { Colors, FontFamily, Radius, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import type { CreateJobContractRole } from '@/lib/data/jobs';
import { getSpecialisationName } from '@/lib/web/trade-specialisations';
import { getTradeBySlug } from '@/lib/web/trades';
import type { ContractType, PostingKind } from '@/types/database';

import { formatBudget, formatShortDate, urgencyConfig } from './job-format';

/** Verbatim Annex A.2 — Post Job clickwrap disclaimer. */
export const POST_JOB_DISCLAIMER =
  "BLDESY connects you with independent tradies – we don't perform, supervise, or guarantee any work. Always check licences and references before hiring. Get any agreement in writing. By tapping Post Job, you confirm you understand BLDESY's role as a connector only.";

interface StepReviewProps {
  formData: {
    title: string;
    tradeCategory: string;
    urgency: string;
    description: string;
    budget: string;
    suburb: string;
    postcode: string;
    contactEmail?: string;
    postingKind?: PostingKind;
  };
  specialisations?: string[];
  contractRoles?: CreateJobContractRole[];
  contractType?: ContractType;
  onEdit: (step: number) => void;
  /** Wizard step index for the Location step — 4 for enterprise (When & How comes first), 3 for homeowners. */
  locationStep?: number;
}

export function StepReview({
  formData,
  specialisations = [],
  contractRoles = [],
  contractType,
  onEdit,
  locationStep = 3,
}: StepReviewProps) {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];
  const trade = getTradeBySlug(formData.tradeCategory);
  const urg = urgencyConfig(formData.urgency);
  const isContract = formData.postingKind === 'contract';
  const isOnboarding = isContract && contractType === 'onboarding';

  return (
    <View style={styles.stack}>
      <View>
        <Text style={[styles.h2, { color: c.textPrimary }]}>
          {isContract ? 'Review Your Contract' : 'Review Your Job'}
        </Text>
        <Text style={[styles.sub, { color: c.textSecondary }]}>
          Check the details below before posting your {isContract ? 'contract' : 'job'}.
        </Text>
      </View>

      <Card>
        {/* Visual header with title and badges */}
        <View style={[styles.header, { backgroundColor: c.primaryBg }]}>
          <View style={styles.headerRow}>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={[styles.title, { color: c.textPrimary }]}>{formData.title}</Text>
              <View style={styles.badgeRow}>
                {isContract ? (
                  <View style={[styles.contractPill, { backgroundColor: c.indigo + '1A' }]}>
                    <Text style={[styles.contractPillText, { color: c.indigo }]}>Contract</Text>
                  </View>
                ) : null}
                <Badge variant="trade">{trade?.name ?? formData.tradeCategory}</Badge>
                <Badge variant={urg.variant}>{urg.label}</Badge>
              </View>
              {specialisations.length > 0 ? (
                <View style={[styles.badgeRow, { marginTop: 6 }]}>
                  {specialisations.map((slug) => (
                    <Badge key={slug} variant="trade">
                      {getSpecialisationName(formData.tradeCategory, slug) ?? slug}
                    </Badge>
                  ))}
                </View>
              ) : null}
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Edit job details"
              onPress={() => onEdit(1)}
              hitSlop={6}
              style={({ pressed }) => [styles.pencil, pressed && { backgroundColor: c.primary + '1A' }]}
            >
              <Ionicons name="pencil-outline" size={16} color={c.primary} />
            </Pressable>
          </View>
        </View>

        {/* Contract roles — the per-role breakdown ("multiple jobs") or the trades being onboarded. */}
        {isContract && contractRoles.length > 0 ? (
          <Section
            title={isOnboarding ? 'Trades to onboard' : 'Roles'}
            onEdit={() => onEdit(1)}
            c={c}
          >
            <View style={{ gap: Spacing.sm }}>
              {contractRoles.map((role, i) => {
                const t = getTradeBySlug(role.trade);
                return (
                  <View key={`${role.trade}-${i}`} style={styles.roleRow}>
                    <Badge variant="trade">{t?.name ?? role.trade}</Badge>
                    {!isOnboarding && role.workers > 0 ? (
                      <Text style={[styles.roleMeta, { color: c.textSecondary }]}>× {role.workers}</Text>
                    ) : null}
                    {!isOnboarding && role.rate ? (
                      <Text style={[styles.roleRate, { color: c.textPrimary }]}>{role.rate}</Text>
                    ) : null}
                    {!isOnboarding && role.startDate ? (
                      <Text style={[styles.roleMeta, { color: c.textSecondary }]}>
                        · from {formatShortDate(role.startDate)}
                      </Text>
                    ) : null}
                    {!isOnboarding && role.duration ? (
                      <Text style={[styles.roleMeta, { color: c.textSecondary }]}>· {role.duration}</Text>
                    ) : null}
                    {role.notes ? (
                      <Text style={[styles.roleMeta, { color: c.textSecondary }]}>— {role.notes}</Text>
                    ) : null}
                  </View>
                );
              })}
            </View>
          </Section>
        ) : null}

        {/* Description */}
        <Section title="Description" icon="document-text-outline" onEdit={() => onEdit(2)} c={c}>
          <Text style={[styles.body, { color: c.textPrimary }]}>{formData.description}</Text>
          {formData.budget ? (
            <View style={[styles.budgetPill, { backgroundColor: c.successBg }]}>
              <Ionicons name="cash-outline" size={16} color={c.success} />
              <Text style={[styles.budgetText, { color: c.success }]}>Budget: {formatBudget(formData.budget)}</Text>
            </View>
          ) : null}
        </Section>

        {/* Location */}
        <Section title="Location" icon="location-outline" onEdit={() => onEdit(locationStep)} c={c}>
          <Text style={[styles.location, { color: c.textPrimary }]}>
            {formData.suburb}, {formData.postcode}
          </Text>
          {formData.contactEmail ? (
            <View style={styles.emailRow}>
              <Ionicons name="mail-outline" size={16} color={c.textSecondary} />
              <Text style={[styles.email, { color: c.textSecondary }]}>{formData.contactEmail}</Text>
            </View>
          ) : null}
        </Section>
      </Card>

      {/* Annex A.2 — Post Job clickwrap disclaimer */}
      <View style={[styles.headsUp, { backgroundColor: c.warningBg, borderColor: c.warningBorder }]}>
        <Ionicons name="warning-outline" size={20} color={c.warning} style={{ marginTop: 2 }} />
        <View style={{ flex: 1 }}>
          <Text style={[styles.headsUpTitle, { color: c.warning }]}>Heads up</Text>
          <Text style={[styles.headsUpBody, { color: c.textPrimary }]}>{POST_JOB_DISCLAIMER}</Text>
        </View>
      </View>
    </View>
  );
}

function Section({
  title,
  icon,
  onEdit,
  c,
  children,
}: {
  title: string;
  icon?: 'document-text-outline' | 'location-outline';
  onEdit: () => void;
  c: Record<string, string>;
  children: React.ReactNode;
}) {
  return (
    <View style={[styles.section, { borderTopColor: c.border }]}>
      <View style={styles.sectionHead}>
        <View style={styles.sectionTitleRow}>
          {icon ? <Ionicons name={icon} size={16} color={c.textSecondary} /> : null}
          <Text style={[styles.sectionTitle, { color: c.textSecondary }]}>{title.toUpperCase()}</Text>
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel={`Edit ${title.toLowerCase()}`} onPress={onEdit} hitSlop={6}>
          <Text style={[styles.editLink, { color: c.primary }]}>Edit</Text>
        </Pressable>
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  stack: { gap: Spacing.xl },
  h2: { fontSize: 20, fontFamily: FontFamily.bodyBold, fontWeight: '700' },
  sub: { fontSize: 14, fontFamily: FontFamily.body, marginTop: 4 },
  header: { padding: Spacing.xl },
  headerRow: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.md },
  title: { fontSize: 18, fontFamily: FontFamily.bodyBold, fontWeight: '700' },
  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: Spacing.sm, marginTop: Spacing.sm },
  contractPill: { borderRadius: Radius.full, paddingHorizontal: 10, paddingVertical: 2 },
  contractPillText: { fontSize: 12, fontFamily: FontFamily.bodyBold, fontWeight: '700' },
  pencil: { padding: 6, borderRadius: Radius.md },
  section: { padding: Spacing.xl, borderTopWidth: StyleSheet.hairlineWidth, gap: Spacing.md },
  sectionHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  sectionTitle: { fontSize: 12, fontFamily: FontFamily.bodySemiBold, fontWeight: '600', letterSpacing: 0.6 },
  editLink: { fontSize: 14, fontFamily: FontFamily.bodyMedium, fontWeight: '500' },
  body: { fontSize: 14, lineHeight: 22, fontFamily: FontFamily.body },
  budgetPill: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: Radius.full,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  budgetText: { fontSize: 14, fontFamily: FontFamily.bodySemiBold, fontWeight: '600' },
  location: { fontSize: 14, fontFamily: FontFamily.bodyMedium, fontWeight: '500' },
  emailRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  email: { fontSize: 14, fontFamily: FontFamily.body },
  roleRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: Spacing.sm },
  roleMeta: { fontSize: 14, fontFamily: FontFamily.body },
  roleRate: { fontSize: 14, fontFamily: FontFamily.bodyMedium, fontWeight: '500' },
  headsUp: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.md,
    borderWidth: 1,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
  },
  headsUpTitle: { fontSize: 14, fontFamily: FontFamily.bodyMedium, fontWeight: '500' },
  headsUpBody: { fontSize: 12, lineHeight: 18, fontFamily: FontFamily.body, marginTop: 4 },
});
