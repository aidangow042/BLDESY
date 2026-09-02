/**
 * AvailabilityConfirmBanner — port of
 * `~/bldesy-web/components/portal/availability-confirm-banner.tsx`.
 *
 * One-tap answer to the weekly "Still taking on work this week?" pulse
 * (P3.2). Shown when the dashboard is opened via the notification's
 * ?confirm=availability deep link; any tap re-saves availability and
 * records the availability_confirmed funnel event — THE weekly-active
 * measure. Dismiss just hides it (no penalty for ignoring).
 */
import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Colors, FontFamily, Radius, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useUser } from '@/lib/auth-context';
import { saveAvailabilityStatus } from '@/lib/data/availability';
import { trackFunnelEvent } from '@/lib/data/tracking';
import type { AvailabilityStatus } from '@/types/database';

import { usePortal } from './portal-context';

const OPTIONS: { value: AvailabilityStatus; label: string }[] = [
  { value: 'available', label: 'Yes — available' },
  { value: 'limited', label: 'Limited' },
  { value: 'unavailable', label: 'Not this week' },
];

export function AvailabilityConfirmBanner({ initialVisible }: { initialVisible: boolean }) {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];
  const { user } = useUser();
  const { profile, refreshProfile } = usePortal();
  const [visible, setVisible] = useState(initialVisible);
  const [saving, setSaving] = useState<AvailabilityStatus | null>(null);
  const [done, setDone] = useState(false);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (initialVisible) setVisible(true);
  }, [initialVisible]);

  useEffect(
    () => () => {
      if (hideTimer.current) clearTimeout(hideTimer.current);
    },
    [],
  );

  if (!visible || !user || !profile) return null;

  async function confirm(value: AvailabilityStatus) {
    if (!user) return;
    setSaving(value);
    try {
      await saveAvailabilityStatus(value);
    } catch {
      setSaving(null);
      return;
    }
    setSaving(null);
    trackFunnelEvent('availability_confirmed', { availability: value });
    setDone(true);
    await refreshProfile();
    hideTimer.current = setTimeout(() => setVisible(false), 2000);
  }

  return (
    <View style={[styles.card, { borderColor: c.primary + '4D', backgroundColor: c.primary + '0D' }]}>
      {done ? (
        <Text style={[styles.question, { color: c.textPrimary }]}>
          Sorted — thanks! Your availability is up to date. ✅
        </Text>
      ) : (
        <View style={styles.body}>
          <Text style={[styles.question, { color: c.textPrimary }]}>Still taking on work this week?</Text>
          <View style={styles.options}>
            {OPTIONS.map((o) => {
              const primary = o.value === 'available';
              return (
                <Pressable
                  key={o.value}
                  accessibilityRole="button"
                  disabled={saving !== null}
                  onPress={() => void confirm(o.value)}
                  style={[
                    styles.option,
                    primary
                      ? { backgroundColor: c.primary }
                      : { borderWidth: 1, borderColor: c.border },
                    saving !== null && styles.disabled,
                  ]}
                >
                  <Text style={[styles.optionText, { color: primary ? '#ffffff' : c.textPrimary }]}>
                    {saving === o.value ? 'Saving…' : o.label}
                  </Text>
                </Pressable>
              );
            })}
            <Pressable accessibilityRole="button" onPress={() => setVisible(false)} style={styles.dismiss}>
              <Text style={[styles.dismissText, { color: c.textSecondary }]}>Dismiss</Text>
            </Pressable>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Radius.xl,
    borderWidth: 1,
    padding: Spacing.lg,
  },
  body: {
    gap: Spacing.md,
  },
  question: {
    fontSize: 14,
    lineHeight: 20,
    fontFamily: FontFamily.bodyBold,
    fontWeight: '700',
  },
  options: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    alignItems: 'center',
  },
  option: {
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    minHeight: 36,
    justifyContent: 'center',
  },
  optionText: {
    fontSize: 12,
    lineHeight: 16,
    fontFamily: FontFamily.bodyBold,
    fontWeight: '700',
  },
  dismiss: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    minHeight: 36,
    justifyContent: 'center',
  },
  dismissText: {
    fontSize: 12,
    lineHeight: 16,
    fontFamily: FontFamily.bodySemiBold,
    fontWeight: '600',
  },
  disabled: {
    opacity: 0.5,
  },
});
