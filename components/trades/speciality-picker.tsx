/**
 * SpecialityPicker — a compact "dropdown box" for choosing trade specialities.
 *
 * Mirrors the website's `components/trades/speciality-modal.tsx`: instead of
 * dumping every sub-trade chip on the page, it shows a single trigger box
 * ("Add specialities" / "N selected") that opens a bottom-sheet of chips.
 *
 * Works for both shapes the app uses:
 *   • Single trade (search, post-job)   → pass `selectedTrades={[slug]}`
 *   • Multi-trade (builder onboarding)   → pass the builder's full trade list
 * The value is always the `BuilderSpecialisations` map ({ [trade]: slug[] }),
 * so single-trade callers wrap/unwrap a flat array at the call site.
 *
 * Renders nothing if none of the given trades have sub-trades defined.
 */
import { useMemo, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Colors, FontFamily, Radius, Shadows, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import {
  getSpecialisationsForTrade,
  hasSpecialisations,
  type BuilderSpecialisations,
} from '@/lib/trade-specialisations';

interface SpecialityPickerProps {
  /** Trades whose sub-trades should be offered. Usually one. */
  selectedTrades: readonly string[];
  /** Current selection, keyed by trade slug → chosen speciality slugs. */
  value: BuilderSpecialisations;
  onChange: (next: BuilderSpecialisations) => void;
  /** Resolve a trade slug → display name (group heading when multi-trade). */
  tradeName?: (slug: string) => string;
  /** Label shown on the trigger when nothing is selected. */
  triggerLabel?: string;
  /** Heading inside the sheet. */
  title?: string;
  /** Fired when the sheet closes (Done, ✕ or backdrop) — the web SpecialityModal's `onDone`. */
  onDone?: () => void;
}

export function SpecialityPicker({
  selectedTrades,
  value,
  onChange,
  tradeName,
  triggerLabel = 'Add specialities',
  title = 'Choose specialities',
  onDone,
}: SpecialityPickerProps) {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false);

  function close() {
    setOpen(false);
    onDone?.();
  }

  const eligible = useMemo(
    () => selectedTrades.filter(hasSpecialisations),
    [selectedTrades],
  );
  const count = eligible.reduce((n, t) => n + (value[t]?.length ?? 0), 0);

  if (eligible.length === 0) return null;

  function toggle(trade: string, slug: string) {
    const current = value[trade] ?? [];
    const next = current.includes(slug)
      ? current.filter((s) => s !== slug)
      : [...current, slug];
    const merged = { ...value };
    if (next.length === 0) delete merged[trade];
    else merged[trade] = next;
    onChange(merged);
  }

  function nameFor(slug: string): string {
    if (tradeName) return tradeName(slug);
    return slug.replace(/-/g, ' ').replace(/\b\w/g, (ch) => ch.toUpperCase());
  }

  return (
    <>
      {/* Trigger box — looks like a dropdown select */}
      <Pressable
        onPress={() => setOpen(true)}
        style={[styles.trigger, Shadows.sm, { backgroundColor: c.surface, borderColor: c.border }]}
        accessibilityRole="button"
        accessibilityLabel={count > 0 ? `${count} specialities selected` : triggerLabel}
      >
        <Text
          style={[styles.triggerText, { color: count > 0 ? c.textPrimary : c.textSecondary }]}
          numberOfLines={1}
        >
          {count > 0 ? `${count} selected` : triggerLabel}
        </Text>
        <MaterialIcons name="expand-more" size={20} color={c.textSecondary} />
      </Pressable>

      <Modal
        visible={open}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={close}
      >
        <View style={styles.modalRoot}>
          <Pressable style={StyleSheet.absoluteFill} onPress={close} />
          <View
            style={[
              styles.sheet,
              { backgroundColor: c.surface, paddingBottom: insets.bottom + Spacing.md },
            ]}
          >
            <View style={[styles.grabber, { backgroundColor: c.border }]} />

            <View style={styles.sheetHeader}>
              <Text style={[styles.sheetTitle, { color: c.textPrimary }]}>{title}</Text>
              <Pressable onPress={close} hitSlop={10} accessibilityLabel="Close">
                <MaterialIcons name="close" size={22} color={c.textSecondary} />
              </Pressable>
            </View>

            <ScrollView
              style={styles.sheetScroll}
              contentContainerStyle={styles.sheetBody}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {eligible.map((trade, idx) => {
                const options = getSpecialisationsForTrade(trade);
                const chosen = value[trade] ?? [];
                return (
                  <View key={trade} style={idx > 0 ? { marginTop: Spacing.lg } : undefined}>
                    {eligible.length > 1 ? (
                      <Text style={[styles.groupLabel, { color: c.textSecondary }]}>
                        {nameFor(trade).toUpperCase()}
                      </Text>
                    ) : null}
                    <View style={styles.chipWrap}>
                      {options.map((opt) => {
                        const on = chosen.includes(opt.slug);
                        return (
                          <Pressable
                            key={opt.slug}
                            onPress={() => toggle(trade, opt.slug)}
                            style={[
                              styles.chip,
                              {
                                backgroundColor: on ? c.primary : 'transparent',
                                borderColor: on ? c.primary : c.border,
                              },
                            ]}
                            accessibilityRole="button"
                            accessibilityState={{ selected: on }}
                            accessibilityLabel={`${opt.name}${on ? ', selected' : ''}`}
                          >
                            {on ? <MaterialIcons name="check" size={14} color="#fff" /> : null}
                            <Text style={[styles.chipText, { color: on ? '#fff' : c.textPrimary }]}>
                              {opt.name}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </View>
                  </View>
                );
              })}
            </ScrollView>

            <Pressable
              onPress={close}
              style={[styles.doneBtn, { backgroundColor: c.primary }]}
              accessibilityRole="button"
            >
              <Text style={styles.doneText}>Done</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 52,
    borderRadius: Radius.lg,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
  },
  triggerText: { flex: 1, fontSize: 15, fontFamily: FontFamily.body },
  modalRoot: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  sheet: {
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
    maxHeight: '82%',
  },
  grabber: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    marginBottom: Spacing.md,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  sheetTitle: { fontSize: 17, fontFamily: FontFamily.bodyBold, fontWeight: '700' },
  sheetScroll: { flexGrow: 0 },
  sheetBody: { paddingBottom: Spacing.md },
  groupLabel: {
    fontSize: 11,
    fontFamily: FontFamily.bodyBold,
    fontWeight: '700',
    letterSpacing: 0.6,
    marginBottom: Spacing.sm,
  },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing.md,
    paddingVertical: 9,
    borderRadius: Radius.full,
    borderWidth: 1,
  },
  chipText: { fontSize: 13, fontFamily: FontFamily.bodySemiBold, fontWeight: '600' },
  doneBtn: {
    height: 50,
    borderRadius: Radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.sm,
  },
  doneText: { color: '#fff', fontSize: 16, fontFamily: FontFamily.bodyBold, fontWeight: '700' },
});
