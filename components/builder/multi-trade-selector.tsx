/**
 * Multi-trade selector — port of ~/bldesy-web/components/builder/multi-trade-selector.tsx.
 * Adding a trade:
 *   - no licence required        → added immediately
 *   - covered by a verified
 *     licence (e.g. the Builder
 *     umbrella covers civil work) → added immediately
 *   - licensed & not covered     → needs a verified licence first. On the web
 *                                  that is an inline verify form; in the app
 *                                  credential verification is a WEB HAND-OFF
 *                                  (CLAUDE.md §7, decision D2), so the gate
 *                                  panel keeps the website's copy and sends
 *                                  the tradie to the Credentials step online.
 * Coverage reuses the umbrella/class logic from lib/web/trade-licence-map.
 */
import { useCallback, useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Colors, FontFamily, Radius, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { db } from '@/lib/supabase';
import { openWebOnboarding } from '@/lib/web-onboarding';
import { requiresLicense } from '@/lib/web/licensed-trades';
import { isCategoryAcceptable } from '@/lib/web/trade-licence-map';
import { formatTradeName, TRADE_CATEGORIES } from '@/lib/web/trades';

interface VerifiedLicence {
  state: string;
  trade_category: string;
  licence_type: string | null;
}

interface MultiTradeSelectorProps {
  userId: string;
  /** Selected trade slugs. First entry is the primary trade. */
  value: string[];
  onChange: (next: string[]) => void;
  /** Called when the tradie comes back from the web credentials hand-off. */
  onReturnFromWeb?: () => void;
}

export function MultiTradeSelector({ userId, value, onChange, onReturnFromWeb }: MultiTradeSelectorProps) {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];
  const insets = useSafeAreaInsets();
  const [licences, setLicences] = useState<VerifiedLicence[]>([]);
  const [note, setNote] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  // Licence gate (shown when a licensed, uncovered trade is picked)
  const [pendingTrade, setPendingTrade] = useState<string | null>(null);

  const loadLicences = useCallback(async () => {
    const { data } = await db
      .from('builder_licences')
      .select('state, trade_category, licence_type')
      .eq('builder_user_id', userId)
      .eq('verified', true);
    setLicences(((data ?? []) as unknown as VerifiedLicence[]) || []);
  }, [userId]);

  useEffect(() => {
    if (userId) void loadLicences();
  }, [userId, loadLicences]);

  /** Does a held, verified licence already cover this trade? */
  function coversTrade(slug: string): boolean {
    return licences.some(
      (l) => l.trade_category === slug || isCategoryAcceptable(slug, l.state, l.licence_type ?? ''),
    );
  }

  function addTrade(slug: string) {
    if (!value.includes(slug)) onChange([...value, slug]);
  }

  function handlePick(slug: string) {
    setPickerOpen(false);
    setError(null);
    setNote(null);
    if (!slug || value.includes(slug)) return;

    if (!requiresLicense(slug)) {
      addTrade(slug);
      return;
    }
    if (coversTrade(slug)) {
      addTrade(slug);
      setNote(`${formatTradeName(slug)} added — covered by your existing licence.`);
      return;
    }
    // Licensed and not covered → a verified licence is required before adding.
    setPendingTrade(slug);
  }

  async function manageOnWeb() {
    await openWebOnboarding('builder', 'portal/edit-profile?step=2');
    await loadLicences();
    onReturnFromWeb?.();
    // If the licence verified while online, the trade can be added now.
    if (pendingTrade && coversTrade(pendingTrade)) {
      const slug = pendingTrade;
      addTrade(slug);
      setNote(`${formatTradeName(slug)} added — licence verified.`);
      setPendingTrade(null);
    }
  }

  function removeTrade(slug: string) {
    if (value.length <= 1) {
      setError('You need at least one trade.');
      return;
    }
    setError(null);
    onChange(value.filter((s) => s !== slug));
  }

  function makePrimary(slug: string) {
    onChange([slug, ...value.filter((s) => s !== slug)]);
  }

  return (
    <View style={styles.wrap}>
      {/* Selected trades as chips */}
      <View style={styles.chips}>
        {value.length === 0 ? (
          <Text style={[styles.muted, { color: c.textSecondary }]}>No trades selected yet.</Text>
        ) : null}
        {value.map((slug, i) => (
          <View key={slug} style={[styles.chip, { borderColor: c.primary + '4D', backgroundColor: c.primary + '1A' }]}>
            {i === 0 ? (
              <View style={[styles.primaryBadge, { backgroundColor: c.primary }]}>
                <Text style={styles.primaryBadgeText}>PRIMARY</Text>
              </View>
            ) : null}
            <Text style={[styles.chipText, { color: c.primary }]}>{formatTradeName(slug)}</Text>
            {requiresLicense(slug) ? (
              <MaterialIcons name="shield" size={14} color={c.primary} accessibilityLabel="Licensed trade" />
            ) : null}
            {i !== 0 ? (
              <Pressable
                onPress={() => makePrimary(slug)}
                hitSlop={6}
                accessibilityRole="button"
                accessibilityLabel="Make primary trade"
              >
                <MaterialIcons name="star-outline" size={16} color={c.primary + '99'} />
              </Pressable>
            ) : null}
            <Pressable
              onPress={() => removeTrade(slug)}
              hitSlop={6}
              accessibilityRole="button"
              accessibilityLabel={`Remove ${formatTradeName(slug)}`}
            >
              <MaterialIcons name="close" size={14} color={c.primary + '99'} />
            </Pressable>
          </View>
        ))}
      </View>

      {/* Add-trade picker (hidden while the licence gate is open) */}
      {!pendingTrade ? (
        <Pressable
          onPress={() => setPickerOpen(true)}
          style={[styles.select, { backgroundColor: c.surface, borderColor: c.border }]}
          accessibilityRole="button"
          accessibilityLabel="Add a trade"
        >
          <Text style={[styles.selectText, { color: c.textPrimary }]}>+ Add a trade…</Text>
          <MaterialIcons name="expand-more" size={20} color={c.textSecondary} />
        </Pressable>
      ) : null}

      {note ? <Text style={[styles.note, { color: c.success }]}>{note}</Text> : null}
      {error ? <Text style={[styles.note, { color: c.error }]}>{error}</Text> : null}

      {/* Licence gate — licensed trade not covered by an existing licence */}
      {pendingTrade ? (
        <View style={[styles.gate, { borderColor: c.primary + '4D', backgroundColor: c.primary + '0D' }]}>
          <Text style={[styles.gateTitle, { color: c.textPrimary }]}>{formatTradeName(pendingTrade)} needs a licence</Text>
          <Text style={[styles.gateBody, { color: c.textSecondary }]}>
            Add and verify your {formatTradeName(pendingTrade)} licence to list this trade. If your
            existing licence already covers it, it would have been added automatically.
          </Text>
          <View style={styles.gateActions}>
            <Pressable
              onPress={() => {
                setPendingTrade(null);
                setError(null);
              }}
              style={styles.gateCancel}
              accessibilityRole="button"
            >
              <Text style={[styles.gateCancelText, { color: c.textSecondary }]}>Cancel</Text>
            </Pressable>
            <Pressable onPress={manageOnWeb} style={[styles.gateVerify, { backgroundColor: c.primary }]} accessibilityRole="button">
              <Text style={styles.gateVerifyText}>Manage credentials on the web</Text>
            </Pressable>
          </View>
        </View>
      ) : null}

      <Modal visible={pickerOpen} transparent animationType="fade" onRequestClose={() => setPickerOpen(false)}>
        <View style={styles.modalRoot}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setPickerOpen(false)} accessibilityLabel="Close" />
          <View style={[styles.sheet, { backgroundColor: c.surface, paddingBottom: insets.bottom + Spacing.md }]}>
            <View style={[styles.grabber, { backgroundColor: c.border }]} />
            <View style={styles.sheetHeader}>
              <Text style={[styles.sheetTitle, { color: c.textPrimary }]}>+ Add a trade…</Text>
              <Pressable onPress={() => setPickerOpen(false)} hitSlop={10} accessibilityLabel="Close">
                <MaterialIcons name="close" size={22} color={c.textSecondary} />
              </Pressable>
            </View>
            <ScrollView style={styles.sheetScroll} contentContainerStyle={styles.sheetBody} showsVerticalScrollIndicator={false}>
              {TRADE_CATEGORIES.map((cat) => {
                const opts = cat.trades.filter((t) => !value.includes(t.slug));
                if (opts.length === 0) return null;
                return (
                  <View key={cat.slug} style={styles.group}>
                    <Text style={[styles.groupLabel, { color: c.textSecondary }]}>{cat.name.toUpperCase()}</Text>
                    {opts.map((t) => (
                      <Pressable
                        key={t.slug}
                        onPress={() => handlePick(t.slug)}
                        style={[styles.option, { borderBottomColor: c.border }]}
                        accessibilityRole="button"
                      >
                        <Text style={[styles.optionText, { color: c.textPrimary }]}>
                          {t.name}
                          {requiresLicense(t.slug) ? ' (licensed)' : ''}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: Spacing.md },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  muted: { fontSize: 14, fontFamily: FontFamily.body },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderRadius: Radius.full,
    paddingHorizontal: 12,
    paddingVertical: 6,
    minHeight: 36,
  },
  chipText: { fontSize: 14, fontFamily: FontFamily.bodySemiBold, fontWeight: '600' },
  primaryBadge: { borderRadius: Radius.full, paddingHorizontal: 6, paddingVertical: 2 },
  primaryBadgeText: { color: '#fff', fontSize: 9, fontFamily: FontFamily.bodyBold, fontWeight: '700', letterSpacing: 0.5 },
  select: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 48,
    borderWidth: 1,
    borderRadius: Radius.xl,
    paddingHorizontal: Spacing.lg,
  },
  selectText: { fontSize: 14, fontFamily: FontFamily.body },
  note: { fontSize: 12, fontFamily: FontFamily.bodyMedium, fontWeight: '500' },
  gate: { borderWidth: 1, borderRadius: Radius.lg, padding: Spacing.md, gap: Spacing.md },
  gateTitle: { fontSize: 14, fontFamily: FontFamily.bodySemiBold, fontWeight: '600' },
  gateBody: { fontSize: 12, lineHeight: 18, fontFamily: FontFamily.body },
  gateActions: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: Spacing.sm, flexWrap: 'wrap' },
  gateCancel: { paddingHorizontal: Spacing.lg, paddingVertical: 8, minHeight: 36, justifyContent: 'center' },
  gateCancelText: { fontSize: 12, fontFamily: FontFamily.bodySemiBold, fontWeight: '600' },
  gateVerify: { borderRadius: Radius.full, paddingHorizontal: Spacing.lg, paddingVertical: 8, minHeight: 36, justifyContent: 'center' },
  gateVerifyText: { color: '#fff', fontSize: 12, fontFamily: FontFamily.bodyBold, fontWeight: '700' },
  modalRoot: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.45)' },
  sheet: { borderTopLeftRadius: Radius.xl, borderTopRightRadius: Radius.xl, paddingHorizontal: Spacing.lg, paddingTop: Spacing.sm, maxHeight: '82%' },
  grabber: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, marginBottom: Spacing.md },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing.md },
  sheetTitle: { fontSize: 17, fontFamily: FontFamily.bodyBold, fontWeight: '700' },
  sheetScroll: { flexGrow: 0 },
  sheetBody: { paddingBottom: Spacing.md },
  group: { marginBottom: Spacing.lg },
  groupLabel: { fontSize: 11, fontFamily: FontFamily.bodyBold, fontWeight: '700', letterSpacing: 0.6, marginBottom: Spacing.xs },
  option: { paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, minHeight: 44, justifyContent: 'center' },
  optionText: { fontSize: 15, fontFamily: FontFamily.body },
});
