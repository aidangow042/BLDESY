/**
 * "What you bring" — port of ~/bldesy-web/components/builder/capabilities-step.tsx.
 * Self-contained: loads the tradie's row on mount and exposes `save()` through
 * the ref so the edit-profile page saves it as part of "Save All Changes".
 * The White Card number is write-only (encrypted server-side).
 */
import { forwardRef, useEffect, useImperativeHandle, useState, type ForwardedRef } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

import { SelectField } from '@/components/edit-profile/select-field';
import { Skeleton } from '@/components/ui';
import { Colors, FontFamily, Radius, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import {
  CAPABILITY_NOTES_MAX,
  getMyCapabilities,
  saveMyCapabilities,
  validateCapabilitiesInput,
  type CapabilitiesInput,
} from '@/lib/data/capabilities';
import {
  CAPABILITY_GROUPS,
  PUBLIC_LIABILITY_OPTIONS,
  type CapabilityKey,
  type TradieCapabilities,
} from '@/lib/web/capabilities';

/** Exposed through the ref so the parent page can save as part of its flow. */
export interface CapabilitiesStepHandle {
  save: () => Promise<{ success: boolean; error?: string }>;
}

interface State {
  ppe: boolean;
  own_tools: boolean;
  own_vehicle: boolean;
  tools_of_trade_insurance: boolean;
  white_card: boolean;
  first_aid: boolean;
  working_at_heights: boolean;
  confined_spaces: boolean;
  traffic_control: boolean;
  forklift_licence: boolean;
  ewp_licence: boolean;
  asbestos_awareness: boolean;
  own_abn: boolean;
  gst_registered: boolean;
  public_liability_amount: number | null;
  personal_accident_insurance: boolean;
  notes: string;
}

function fromCaps(caps: TradieCapabilities): State {
  return {
    ppe: caps.ppe,
    own_tools: caps.own_tools,
    own_vehicle: caps.own_vehicle,
    tools_of_trade_insurance: caps.tools_of_trade_insurance,
    white_card: caps.white_card,
    first_aid: caps.first_aid,
    working_at_heights: caps.working_at_heights,
    confined_spaces: caps.confined_spaces,
    traffic_control: caps.traffic_control,
    forklift_licence: caps.forklift_licence,
    ewp_licence: caps.ewp_licence,
    asbestos_awareness: caps.asbestos_awareness,
    own_abn: caps.own_abn,
    gst_registered: caps.gst_registered,
    public_liability_amount: caps.public_liability_amount,
    personal_accident_insurance: caps.personal_accident_insurance,
    notes: caps.notes ?? '',
  };
}

const INITIAL: State = {
  ppe: false,
  own_tools: false,
  own_vehicle: false,
  tools_of_trade_insurance: false,
  white_card: false,
  first_aid: false,
  working_at_heights: false,
  confined_spaces: false,
  traffic_control: false,
  forklift_licence: false,
  ewp_licence: false,
  asbestos_awareness: false,
  own_abn: false,
  gst_registered: false,
  public_liability_amount: null,
  personal_accident_insurance: false,
  notes: '',
};

const GROUP_KEYS = Object.keys(CAPABILITY_GROUPS) as (keyof typeof CAPABILITY_GROUPS)[];

function CapabilitiesStepInner(_: object, ref: ForwardedRef<CapabilitiesStepHandle>) {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];
  const [state, setState] = useState<State>(INITIAL);
  const [whiteCardNumberInput, setWhiteCardNumberInput] = useState('');
  const [hasStoredNumber, setHasStoredNumber] = useState(false);
  const [verifiedFlags, setVerifiedFlags] = useState({ white_card: false, first_aid: false });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  useEffect(() => {
    let cancelled = false;
    getMyCapabilities()
      .then((res) => {
        if (cancelled) return;
        setState(fromCaps(res.caps));
        setHasStoredNumber(res.hasStoredWhiteCardNumber);
        setVerifiedFlags({ white_card: res.caps.white_card_verified, first_aid: res.caps.first_aid_verified });
        setLoading(false);
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : 'Failed to load capabilities.');
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useImperativeHandle(
    ref,
    () => ({
      async save() {
        setError(null);
        // Only include white_card_number when the user actually typed one in
        // this session OR they unticked white card. Otherwise leave the
        // stored value alone.
        const payload: CapabilitiesInput = {
          ppe: state.ppe,
          own_tools: state.own_tools,
          own_vehicle: state.own_vehicle,
          tools_of_trade_insurance: state.tools_of_trade_insurance,
          white_card: state.white_card,
          first_aid: state.first_aid,
          working_at_heights: state.working_at_heights,
          confined_spaces: state.confined_spaces,
          traffic_control: state.traffic_control,
          forklift_licence: state.forklift_licence,
          ewp_licence: state.ewp_licence,
          asbestos_awareness: state.asbestos_awareness,
          own_abn: state.own_abn,
          gst_registered: state.gst_registered,
          public_liability_amount: state.public_liability_amount,
          personal_accident_insurance: state.personal_accident_insurance,
          notes: state.notes.trim() === '' ? null : state.notes.trim(),
        };
        if (whiteCardNumberInput.trim() !== '') {
          payload.white_card_number = whiteCardNumberInput.trim();
        } else if (!state.white_card) {
          // Unticked white card — clear the stored number.
          payload.white_card_number = null;
        }
        const invalid = validateCapabilitiesInput(payload);
        if (invalid) {
          setError(invalid);
          return { success: false, error: invalid };
        }
        try {
          await saveMyCapabilities(payload);
        } catch (e) {
          const msg = e instanceof Error && e.message ? e.message : 'Failed to save capabilities.';
          setError(msg);
          return { success: false, error: msg };
        }
        // Successful save — mark stored if a new number was uploaded.
        if (state.white_card && whiteCardNumberInput.trim() !== '') {
          setHasStoredNumber(true);
          setWhiteCardNumberInput('');
        } else if (!state.white_card) {
          setHasStoredNumber(false);
        }
        return { success: true };
      },
    }),
    [state, whiteCardNumberInput],
  );

  const setField = <K extends keyof State>(key: K, value: State[K]) =>
    setState((prev) => ({ ...prev, [key]: value }));

  const toggle = (key: CapabilityKey) => {
    const current = state[key];
    setField(key, !current);
    if (key === 'white_card' && current) {
      // When unticking, also clear the number-input draft.
      setWhiteCardNumberInput('');
    }
  };

  if (loading) {
    return (
      <View style={styles.skeleton}>
        <Skeleton style={{ width: '33%', height: 20 }} />
        <Skeleton style={{ height: 128, borderRadius: Radius.xl }} />
        <Skeleton style={{ height: 128, borderRadius: Radius.xl }} />
      </View>
    );
  }

  return (
    <View style={styles.wrap}>
      <View>
        <Text style={[styles.h2, { color: c.textPrimary }]}>What you bring to the job</Text>
        <Text style={[styles.sub, { color: c.textSecondary }]}>
          Tick everything you have. Project Jobs will match you against these.
        </Text>
      </View>

      {error ? (
        <View style={[styles.errorBox, { borderColor: c.error + '4D', backgroundColor: c.error + '0D' }]}>
          <Text style={[styles.errorText, { color: c.error }]}>{error}</Text>
        </View>
      ) : null}

      {GROUP_KEYS.map((groupKey) => {
        const group = CAPABILITY_GROUPS[groupKey];
        const isCollapsed = !!collapsed[groupKey];
        return (
          <View key={groupKey} style={[styles.group, { borderColor: c.border, backgroundColor: c.canvas }]}>
            <Pressable
              onPress={() => setCollapsed((prev) => ({ ...prev, [groupKey]: !prev[groupKey] }))}
              style={styles.groupSummary}
              accessibilityRole="button"
              accessibilityState={{ expanded: !isCollapsed }}
            >
              <Text style={[styles.groupLabel, { color: c.textPrimary }]}>{group.label}</Text>
              <MaterialIcons name={isCollapsed ? 'expand-more' : 'expand-less'} size={18} color={c.textSecondary} />
            </Pressable>

            {!isCollapsed ? (
              <View style={styles.groupItems}>
                {group.items.map((item) => {
                  const checked = state[item.key];
                  const isVerifiable = item.verifiable === true;
                  const verified =
                    item.key === 'white_card'
                      ? verifiedFlags.white_card
                      : item.key === 'first_aid'
                        ? verifiedFlags.first_aid
                        : false;
                  return (
                    <View key={item.key}>
                      <Pressable
                        onPress={() => toggle(item.key)}
                        accessibilityRole="checkbox"
                        accessibilityState={{ checked }}
                        style={[
                          styles.itemRow,
                          checked
                            ? { borderColor: c.primary, backgroundColor: c.primary + '0D' }
                            : { borderColor: c.border, backgroundColor: c.surface },
                        ]}
                      >
                        <View
                          style={[
                            styles.checkbox,
                            { borderColor: checked ? c.primary : c.border, backgroundColor: checked ? c.primary : 'transparent' },
                          ]}
                        >
                          {checked ? <MaterialIcons name="check" size={12} color="#fff" /> : null}
                        </View>
                        <Text style={[styles.itemLabel, { color: c.textPrimary }]}>{item.label}</Text>
                        {isVerifiable && verified ? (
                          <View style={[styles.verifiedBadge, { backgroundColor: c.successBg }]}>
                            <Text style={[styles.verifiedText, { color: c.success }]}>VERIFIED</Text>
                          </View>
                        ) : null}
                      </Pressable>

                      {/* White Card number input — shown only when ticked. */}
                      {item.key === 'white_card' && checked ? (
                        <View style={styles.whiteCard}>
                          {hasStoredNumber && whiteCardNumberInput === '' ? (
                            <View style={styles.onFileRow}>
                              <View style={[styles.onFileBadge, { backgroundColor: c.successBg }]}>
                                <Text style={[styles.onFileText, { color: c.success }]}>Number on file</Text>
                              </View>
                              <Pressable
                                onPress={() => setHasStoredNumber(false)}
                                accessibilityRole="button"
                                accessibilityLabel="Replace White Card number"
                              >
                                <Text style={[styles.replace, { color: c.primary }]}>Replace</Text>
                              </Pressable>
                            </View>
                          ) : (
                            <>
                              <Text style={[styles.wcLabel, { color: c.textSecondary }]}>WHITE CARD NUMBER (8 DIGITS)</Text>
                              <TextInput
                                value={whiteCardNumberInput}
                                onChangeText={(v) => setWhiteCardNumberInput(v.replace(/[^\d]/g, ''))}
                                keyboardType="number-pad"
                                maxLength={8}
                                placeholder="e.g. 12345678"
                                placeholderTextColor={c.textSecondary + '80'}
                                style={[styles.wcInput, { backgroundColor: c.surface, borderColor: c.border, color: c.textPrimary }]}
                                accessibilityLabel="White Card number (8 digits)"
                              />
                              <Text style={[styles.wcHelp, { color: c.textSecondary }]}>
                                Encrypted at rest. Never shown on your public profile.
                              </Text>
                            </>
                          )}
                        </View>
                      ) : null}
                    </View>
                  );
                })}
              </View>
            ) : null}
          </View>
        );
      })}

      {/* Public liability */}
      <View style={[styles.group, styles.liability, { borderColor: c.border, backgroundColor: c.canvas }]}>
        <Text style={[styles.groupLabel, { color: c.textPrimary }]}>Public liability insurance</Text>
        <Text style={[styles.helper, { color: c.textSecondary }]}>
          Pick the highest band your current policy covers. Jobs that require a minimum will match
          you against this.
        </Text>
        <SelectField
          value={state.public_liability_amount == null ? '' : String(state.public_liability_amount)}
          options={PUBLIC_LIABILITY_OPTIONS.map((opt) => ({
            value: opt.value == null ? '' : String(opt.value),
            label: opt.label,
          }))}
          onChange={(v) => setField('public_liability_amount', v === '' ? null : Number(v))}
          accessibilityLabel="Public liability insurance"
        />
      </View>

      {/* Notes */}
      <View>
        <Text style={[styles.fieldLabel, { color: c.textSecondary }]}>Notes (optional)</Text>
        <TextInput
          value={state.notes}
          onChangeText={(v) => setField('notes', v.slice(0, CAPABILITY_NOTES_MAX))}
          placeholder="Anything else worth mentioning — extra tickets, recent training, gear specifics."
          placeholderTextColor={c.textSecondary + '80'}
          multiline
          numberOfLines={3}
          maxLength={CAPABILITY_NOTES_MAX}
          textAlignVertical="top"
          style={[styles.textarea, { backgroundColor: c.surface, borderColor: c.border, color: c.textPrimary }]}
          accessibilityLabel="Notes (optional)"
        />
      </View>
    </View>
  );
}

export const CapabilitiesStep = forwardRef<CapabilitiesStepHandle, object>(CapabilitiesStepInner);
CapabilitiesStep.displayName = 'CapabilitiesStep';

const styles = StyleSheet.create({
  skeleton: { gap: Spacing.lg },
  wrap: { gap: Spacing['2xl'] },
  h2: { fontSize: 18, lineHeight: 28, fontFamily: FontFamily.bodyBold, fontWeight: '700' },
  sub: { marginTop: 4, fontSize: 14, lineHeight: 20, fontFamily: FontFamily.body },
  errorBox: { borderWidth: 1, borderRadius: Radius.lg, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md },
  errorText: { fontSize: 14, lineHeight: 20, fontFamily: FontFamily.body },
  group: { borderWidth: 1, borderRadius: Radius.xl },
  groupSummary: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, minHeight: 48 },
  groupLabel: { fontSize: 14, fontFamily: FontFamily.bodyBold, fontWeight: '700' },
  groupItems: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.lg, gap: Spacing.sm },
  itemRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, borderWidth: 1, borderRadius: Radius.lg, paddingHorizontal: 12, paddingVertical: 10, minHeight: 48 },
  checkbox: { width: 18, height: 18, borderRadius: 4, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  itemLabel: { flex: 1, fontSize: 14, fontFamily: FontFamily.bodyMedium, fontWeight: '500' },
  verifiedBadge: { borderRadius: Radius.full, paddingHorizontal: 8, paddingVertical: 2 },
  verifiedText: { fontSize: 10, fontFamily: FontFamily.bodyBold, fontWeight: '700', letterSpacing: 0.5 },
  whiteCard: { marginTop: Spacing.sm, marginLeft: 28, gap: 4 },
  onFileRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  onFileBadge: { borderRadius: Radius.full, paddingHorizontal: 10, paddingVertical: 2 },
  onFileText: { fontSize: 12, fontFamily: FontFamily.bodySemiBold, fontWeight: '600' },
  replace: { fontSize: 12, fontFamily: FontFamily.bodySemiBold, fontWeight: '600', textDecorationLine: 'underline' },
  wcLabel: { fontSize: 11, fontFamily: FontFamily.bodyBold, fontWeight: '700', letterSpacing: 1 },
  wcInput: { width: 192, height: 40, borderWidth: 1, borderRadius: Radius.lg, paddingHorizontal: 12, fontSize: 14, fontFamily: FontFamily.body },
  wcHelp: { fontSize: 11, lineHeight: 16, fontFamily: FontFamily.body },
  liability: { paddingHorizontal: Spacing.lg, paddingVertical: Spacing.lg, gap: Spacing.sm },
  helper: { fontSize: 12, lineHeight: 18, fontFamily: FontFamily.body },
  fieldLabel: { fontSize: 14, fontFamily: FontFamily.bodyMedium, fontWeight: '500', marginBottom: 6 },
  textarea: { minHeight: 88, borderWidth: 1, borderRadius: Radius.xl, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, fontSize: 14, lineHeight: 20, fontFamily: FontFamily.body },
});
