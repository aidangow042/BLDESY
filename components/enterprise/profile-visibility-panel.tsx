/**
 * ProfileVisibilityPanel — port of
 * ~/bldesy-web/components/settings/profile-visibility-panel.tsx (indigo accent).
 *
 * Groups of rows: name + one-line description + a right-aligned switch, saved
 * instantly per row with a fading "Saved" tick. Locked rows (core trust
 * signals) render a lock icon + "Always shown" — clearly intentional, clearly
 * not broken. The parent owns the visibility state and the write: `onToggle`
 * should update optimistically, persist, and throw on failure (after its own
 * revert + toast) so the row status resets.
 */
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import { FontFamily, Radius, Spacing } from '@/constants/theme';
import type { VisibilityGroup } from '@/lib/web/profile-visibility';

import { HubSwitch } from './hub-form';
import { useHubTheme } from './hub-primitives';

type RowStatus = 'saving' | 'saved' | undefined;

export function ProfileVisibilityPanel({
  groups,
  isVisible,
  onToggle,
}: {
  groups: VisibilityGroup[];
  isVisible: (key: string) => boolean;
  onToggle: (key: string, visible: boolean) => Promise<void>;
}) {
  const c = useHubTheme();
  const [status, setStatus] = useState<Record<string, RowStatus>>({});
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  useEffect(() => {
    const pending = timers.current;
    return () => Object.values(pending).forEach(clearTimeout);
  }, []);

  async function handleToggle(key: string, visible: boolean) {
    setStatus((s) => ({ ...s, [key]: 'saving' }));
    try {
      await onToggle(key, visible);
      setStatus((s) => ({ ...s, [key]: 'saved' }));
      clearTimeout(timers.current[key]);
      timers.current[key] = setTimeout(() => setStatus((s) => ({ ...s, [key]: undefined })), 1600);
    } catch {
      // Parent reverted + toasted; just clear the row status.
      setStatus((s) => ({ ...s, [key]: undefined }));
    }
  }

  return (
    <View style={{ gap: Spacing.xl }}>
      {groups.map((group) => (
        <View key={group.title} style={[styles.group, { backgroundColor: c.surface, borderColor: c.border }]}>
          <Text style={[styles.groupTitle, { color: c.textSecondary }]}>{group.title}</Text>
          {group.rows.map((row, i) => (
            <View
              key={row.label}
              style={[styles.row, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.border }]}
            >
              <View style={{ flex: 1, minWidth: 0 }}>
                <View style={styles.labelRow}>
                  {row.kind === 'locked' ? (
                    <Ionicons name="lock-closed-outline" size={14} color={c.textSecondary} />
                  ) : null}
                  <Text style={[styles.label, { color: c.textPrimary }]}>{row.label}</Text>
                </View>
                <Text style={[styles.desc, { color: c.textSecondary }]}>{row.description}</Text>
              </View>

              {row.kind === 'locked' ? (
                <View style={[styles.locked, { backgroundColor: c.canvas, borderColor: c.border }]}>
                  <Text style={[styles.lockedLabel, { color: c.textSecondary }]}>Always shown</Text>
                </View>
              ) : (
                <>
                  <View style={styles.status} accessibilityLiveRegion="polite">
                    {status[row.key] === 'saving' ? (
                      <Text style={[styles.statusText, { color: c.textSecondary }]}>Saving…</Text>
                    ) : null}
                    {status[row.key] === 'saved' ? (
                      <View style={styles.savedRow}>
                        <Ionicons name="checkmark" size={12} color={c.indigo} />
                        <Text style={[styles.statusText, { color: c.indigo, fontFamily: FontFamily.bodyMedium }]}>Saved</Text>
                      </View>
                    ) : null}
                  </View>
                  <HubSwitch
                    value={isVisible(row.key)}
                    onValueChange={(v) => void handleToggle(row.key, v)}
                    disabled={status[row.key] === 'saving'}
                    accessibilityLabel={`Show ${row.label} on your public profile`}
                  />
                </>
              )}
            </View>
          ))}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  group: {
    borderRadius: Radius.xl,
    borderWidth: 1,
    padding: Spacing.xl,
  },
  groupTitle: {
    fontSize: 11,
    fontFamily: FontFamily.bodyBold,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: 14,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  label: {
    fontSize: 14,
    fontFamily: FontFamily.bodySemiBold,
    fontWeight: '600',
  },
  desc: {
    marginTop: 2,
    fontSize: 12,
    lineHeight: 16,
    fontFamily: FontFamily.body,
  },
  locked: {
    borderRadius: Radius.full,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  lockedLabel: {
    fontSize: 11,
    fontFamily: FontFamily.bodySemiBold,
    fontWeight: '600',
  },
  status: {
    width: 56,
    alignItems: 'flex-end',
  },
  statusText: {
    fontSize: 12,
    fontFamily: FontFamily.body,
  },
  savedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
});
