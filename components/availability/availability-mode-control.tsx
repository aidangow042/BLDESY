/**
 * AvailabilityModeControl — port of
 * `~/bldesy-web/components/availability/availability-mode-control.tsx`.
 *
 * The three-state availability display picker. Saves instantly via the async
 * `onChange` the parent supplies (parent owns the write + error toast);
 * shows Saving… / a fading tick inline.
 */
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import { SegmentedControl, type SegmentedAccent, type SegmentedOption } from '@/components/ui';
import { Colors, FontFamily } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import type { AvailabilityDisplayMode } from '@/types/database';

export const MODE_OPTIONS: SegmentedOption<AvailabilityDisplayMode>[] = [
  {
    value: 'hidden',
    label: 'Hidden',
    description: 'No availability shown on your public profile',
  },
  {
    value: 'next_available',
    label: 'Next available',
    description: 'Show a single “next available” date',
  },
  {
    value: 'calendar',
    label: 'Full calendar',
    description: 'Show a month view with your booked days',
  },
];

export function AvailabilityModeControl({
  value,
  onChange,
  accent = 'primary',
}: {
  value: AvailabilityDisplayMode;
  onChange: (mode: AvailabilityDisplayMode) => Promise<void>;
  accent?: SegmentedAccent;
}) {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const resetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (resetTimer.current) clearTimeout(resetTimer.current);
    };
  }, []);

  async function handleSelect(mode: AvailabilityDisplayMode) {
    if (mode === value || status === 'saving') return;
    setStatus('saving');
    try {
      await onChange(mode);
      setStatus('saved');
      if (resetTimer.current) clearTimeout(resetTimer.current);
      resetTimer.current = setTimeout(() => setStatus('idle'), 1600);
    } catch {
      // Parent surfaces the error (toast) and keeps its previous value.
      setStatus('idle');
    }
  }

  const tick = accent === 'indigo' ? c.indigo : c.primary;

  return (
    <View>
      <SegmentedControl
        value={value}
        options={MODE_OPTIONS}
        onChange={(mode) => void handleSelect(mode)}
        accent={accent}
        disabled={status === 'saving'}
      />
      <View style={styles.status} accessibilityLiveRegion="polite">
        {status === 'saving' ? (
          <Text style={[styles.statusText, { color: c.textSecondary }]}>Saving…</Text>
        ) : null}
        {status === 'saved' ? (
          <View style={styles.saved}>
            <Ionicons name="checkmark" size={14} color={tick} />
            <Text style={[styles.statusText, styles.savedText, { color: tick }]}>Saved</Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  status: {
    marginTop: 8,
    height: 16,
  },
  statusText: {
    fontSize: 12,
    lineHeight: 16,
    fontFamily: FontFamily.body,
  },
  saved: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  savedText: {
    fontFamily: FontFamily.bodyMedium,
    fontWeight: '500',
  },
});
