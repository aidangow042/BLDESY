/**
 * Contract sub-type + per-role editor — the "Contract Details" half of Step 1
 * in ~/bldesy-web/components/jobs/job-wizard.tsx. A contract can bundle
 * several roles ("Multiple roles", tabbed so each role gets its own schedule)
 * or just onboard tradies ("Onboarding only", a simple stacked trade list).
 */
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import { Input } from '@/components/ui';
import { Colors, FontFamily, Radius, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { getTradeBySlug } from '@/lib/web/trades';
import type { ContractRole, ContractType } from '@/types/database';

import { SelectSheet } from './select-sheet';
import { TRADE_SELECT_GROUPS } from './trade-options';
import { DateTimeField } from './when-and-how-step';
import { clampRoleIndex } from './wizard-model';

/** Verbatim sub-type cards. */
export const CONTRACT_TYPE_OPTIONS: readonly { key: ContractType; title: string; blurb: string }[] = [
  { key: 'project', title: 'Multiple roles', blurb: 'Hire several trades under one contract — a count + rate per role.' },
  { key: 'onboarding', title: 'Onboarding only', blurb: 'Invite tradies to join your books / talent pool. No specific job yet.' },
];

interface ContractRolesEditorProps {
  contractType: ContractType;
  roles: ContractRole[];
  activeIndex: number;
  onChangeType: (type: ContractType) => void;
  onUpdateRole: (index: number, patch: Partial<ContractRole>) => void;
  onAddRole: () => void;
  onRemoveRole: (index: number) => void;
  onSelectTab: (index: number) => void;
  error?: string;
}

export function ContractRolesEditor({
  contractType,
  roles,
  activeIndex,
  onChangeType,
  onUpdateRole,
  onAddRole,
  onRemoveRole,
  onSelectTab,
  error,
}: ContractRolesEditorProps) {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];
  const accent = c.indigo;
  const isOnboarding = contractType === 'onboarding';
  const roleTabIndex = clampRoleIndex(activeIndex, roles.length);
  const role = roles[roleTabIndex];

  return (
    <View style={{ gap: Spacing.lg }}>
      {/* Sub-type — a contract can bundle several roles ("multiple jobs") or just onboard tradies. */}
      <View style={styles.typeRow}>
        {CONTRACT_TYPE_OPTIONS.map((opt) => {
          const active = contractType === opt.key;
          return (
            <Pressable
              key={opt.key}
              accessibilityRole="radio"
              accessibilityState={{ checked: active }}
              onPress={() => onChangeType(opt.key)}
              style={[
                styles.typeCard,
                {
                  borderColor: active ? accent : c.border,
                  backgroundColor: active ? accent + '1A' : c.surface,
                  borderWidth: active ? 2 : 1,
                },
              ]}
            >
              <Text style={[styles.typeTitle, { color: c.textPrimary }]}>{opt.title}</Text>
              <Text style={[styles.typeBlurb, { color: c.textSecondary }]}>{opt.blurb}</Text>
            </Pressable>
          );
        })}
      </View>

      <View style={{ gap: Spacing.md }}>
        <Text style={[styles.rolesLabel, { color: c.textPrimary }]}>
          {isOnboarding ? 'Trades you want to onboard' : 'Roles'}
        </Text>

        {isOnboarding ? (
          /* Onboarding — a simple stacked trade list (no schedule). */
          <>
            {roles.map((r, i) => (
              <View key={i} style={[styles.roleCard, { backgroundColor: c.surface, borderColor: c.border }]}>
                <View style={styles.roleHead}>
                  <Text style={[styles.roleIndex, { color: c.textSecondary }]}>Trade {i + 1}</Text>
                  {roles.length > 1 ? (
                    <Pressable accessibilityRole="button" onPress={() => onRemoveRole(i)} hitSlop={6}>
                      <Text style={[styles.removeText, { color: c.error }]}>Remove</Text>
                    </Pressable>
                  ) : null}
                </View>
                <SelectSheet
                  value={r.trade}
                  onChange={(v) => onUpdateRole(i, { trade: v })}
                  placeholder="Select trade…"
                  title="Select trade"
                  groups={TRADE_SELECT_GROUPS}
                  accent={accent}
                  compact
                />
                <Input
                  value={r.notes}
                  onChangeText={(t) => onUpdateRole(i, { notes: t })}
                  placeholder="Notes (optional) — speciality, site"
                  accessibilityLabel={`Trade ${i + 1} notes`}
                />
              </View>
            ))}
            <Pressable
              accessibilityRole="button"
              onPress={onAddRole}
              style={({ pressed }) => [styles.addRow, { borderColor: pressed ? accent + '66' : c.border }]}
            >
              <Ionicons name="add" size={16} color={accent} />
              <Text style={[styles.addText, { color: accent }]}>Add trade</Text>
            </Pressable>
          </>
        ) : (
          /* Multiple roles — tabs; edit one role's full detail (incl. its own start date + duration) at a time. */
          <>
            <View style={styles.tabRow}>
              {roles.map((r, i) => {
                const active = i === roleTabIndex;
                const label = r.trade ? getTradeBySlug(r.trade)?.name ?? `Role ${i + 1}` : `Role ${i + 1}`;
                return (
                  <Pressable
                    key={i}
                    accessibilityRole="tab"
                    accessibilityState={{ selected: active }}
                    onPress={() => onSelectTab(i)}
                    style={[
                      styles.tab,
                      active
                        ? { backgroundColor: accent, borderColor: accent }
                        : { backgroundColor: c.surface, borderColor: c.border },
                    ]}
                  >
                    <Text style={[styles.tabText, { color: active ? '#ffffff' : c.textSecondary }]}>{label}</Text>
                  </Pressable>
                );
              })}
              <Pressable
                accessibilityRole="button"
                onPress={onAddRole}
                style={({ pressed }) => [styles.tabAdd, { borderColor: pressed ? accent + '66' : c.border }]}
              >
                <Ionicons name="add" size={14} color={accent} />
                <Text style={[styles.tabAddText, { color: accent }]}>Add role</Text>
              </Pressable>
            </View>

            {role ? (
              <View style={[styles.roleCard, { backgroundColor: c.surface, borderColor: c.border }]}>
                <View style={styles.roleHead}>
                  <Text style={[styles.roleIndex, { color: c.textSecondary }]}>Role {roleTabIndex + 1}</Text>
                  {roles.length > 1 ? (
                    <Pressable accessibilityRole="button" onPress={() => onRemoveRole(roleTabIndex)} hitSlop={6}>
                      <Text style={[styles.removeText, { color: c.error }]}>Remove</Text>
                    </Pressable>
                  ) : null}
                </View>
                <View style={styles.grid2}>
                  <View style={{ flex: 1.4 }}>
                    <SelectSheet
                      value={role.trade}
                      onChange={(v) => onUpdateRole(roleTabIndex, { trade: v })}
                      placeholder="Select trade…"
                      title="Select trade"
                      groups={TRADE_SELECT_GROUPS}
                      accent={accent}
                      compact
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Input
                      value={role.workers ? String(role.workers) : ''}
                      onChangeText={(t) => onUpdateRole(roleTabIndex, { workers: parseInt(t, 10) || 0 })}
                      placeholder="Workers"
                      keyboardType="number-pad"
                      accessibilityLabel="Workers"
                    />
                  </View>
                </View>
                <Input
                  value={role.rate}
                  onChangeText={(t) => onUpdateRole(roleTabIndex, { rate: t })}
                  placeholder="Rate — e.g. $45/hr, $1,800/week, $90k"
                  accessibilityLabel="Rate"
                />
                <View style={styles.grid2}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.miniLabel, { color: c.textSecondary }]}>Start date</Text>
                    <DateTimeField
                      label="Start date"
                      value={role.startDate ?? ''}
                      mode="date"
                      accent={accent}
                      hideLabel
                      compact
                      onChange={(v) => onUpdateRole(roleTabIndex, { startDate: v })}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.miniLabel, { color: c.textSecondary }]}>Duration</Text>
                    <Input
                      value={role.duration ?? ''}
                      onChangeText={(t) => onUpdateRole(roleTabIndex, { duration: t })}
                      placeholder="e.g. 2 weeks"
                      accessibilityLabel="Duration"
                    />
                  </View>
                </View>
                <Input
                  value={role.notes}
                  onChangeText={(t) => onUpdateRole(roleTabIndex, { notes: t })}
                  placeholder="Notes (optional) — speciality, site"
                  accessibilityLabel="Notes"
                />
                <Text style={[styles.sharedHint, { color: c.textSecondary }]}>
                  Shared requirements (PPE, licences, insurance) are set once on the next step.
                </Text>
              </View>
            ) : null}
          </>
        )}

        {error ? <Text style={[styles.error, { color: c.error }]}>{error}</Text> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  typeRow: { gap: Spacing.md },
  typeCard: { borderRadius: Radius.lg, padding: 12, gap: 2 },
  typeTitle: { fontSize: 14, fontFamily: FontFamily.bodyBold, fontWeight: '700' },
  typeBlurb: { fontSize: 11, lineHeight: 16, fontFamily: FontFamily.body },
  rolesLabel: { fontSize: 12, fontFamily: FontFamily.bodySemiBold, fontWeight: '600' },
  roleCard: { borderWidth: 1, borderRadius: Radius.lg, padding: 12, gap: Spacing.sm },
  roleHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.sm },
  roleIndex: { fontSize: 11, fontFamily: FontFamily.bodySemiBold, fontWeight: '600' },
  removeText: { fontSize: 11, fontFamily: FontFamily.bodyMedium, fontWeight: '500' },
  grid2: { flexDirection: 'row', gap: Spacing.sm },
  miniLabel: { fontSize: 11, fontFamily: FontFamily.bodySemiBold, fontWeight: '600', marginBottom: 4 },
  sharedHint: { fontSize: 11, lineHeight: 16, fontFamily: FontFamily.body },
  addRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: Radius.md,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  addText: { fontSize: 12, fontFamily: FontFamily.bodyMedium, fontWeight: '500' },
  tabRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: Spacing.sm },
  tab: { borderWidth: 1, borderRadius: Radius.full, paddingHorizontal: 12, paddingVertical: 6 },
  tabText: { fontSize: 12, fontFamily: FontFamily.bodySemiBold, fontWeight: '600' },
  tabAdd: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: Radius.full,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  tabAddText: { fontSize: 12, fontFamily: FontFamily.bodyMedium, fontWeight: '500' },
  error: { fontSize: 12, fontFamily: FontFamily.body },
});
