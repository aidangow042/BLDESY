/**
 * ProfileVisibilityPanel — port of
 * `~/bldesy-web/components/settings/profile-visibility-panel.tsx`.
 *
 * Shared by the builder (teal) and enterprise (indigo) portals. Groups of
 * rows: name + one-line description + a right-aligned switch, saved instantly
 * per row with a fading tick. Locked rows (core trust signals) render a lock
 * icon + "Always shown" — clearly intentional, clearly not broken.
 *
 * The parent owns the visibility state and the write: `onToggle` should
 * update optimistically, persist, and throw on failure (after its own revert
 * + toast) so the row status resets.
 */
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import { Card, ToggleSwitch, type ToggleAccent } from '@/components/ui';
import { Colors, FontFamily, Radius, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import type { VisibilityGroup } from '@/lib/web/profile-visibility';

type RowStatus = 'saving' | 'saved' | undefined;

export function ProfileVisibilityPanel({
  groups,
  isVisible,
  onToggle,
  accent = 'primary',
}: {
  groups: VisibilityGroup[];
  isVisible: (key: string) => boolean;
  onToggle: (key: string, visible: boolean) => Promise<void>;
  accent?: ToggleAccent;
}) {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];
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

  const tickColour = accent === 'indigo' ? c.indigo : c.primary;

  return (
    <View style={styles.stack}>
      {groups.map((group) => (
        <Card key={group.title} padding={Spacing.xl} flat>
          <Text accessibilityRole="header" style={[styles.groupTitle, { color: c.textSecondary }]}>
            {group.title}
          </Text>
          <View style={styles.rows}>
            {group.rows.map((row, i) => (
              <View
                key={row.label}
                style={[styles.row, i > 0 && { borderTopWidth: 1, borderTopColor: c.border }]}
              >
                <View style={styles.rowText}>
                  <View style={styles.labelRow}>
                    {row.kind === 'locked' ? (
                      <Ionicons name="lock-closed-outline" size={14} color={c.textSecondary} />
                    ) : null}
                    <Text style={[styles.label, { color: c.textPrimary }]}>{row.label}</Text>
                  </View>
                  <Text style={[styles.description, { color: c.textSecondary }]}>{row.description}</Text>
                </View>

                {row.kind === 'locked' ? (
                  <View style={[styles.lockedPill, { borderColor: c.border, backgroundColor: c.canvas }]}>
                    <Text style={[styles.lockedText, { color: c.textSecondary }]}>Always shown</Text>
                  </View>
                ) : (
                  <>
                    <View accessibilityLiveRegion="polite" style={styles.status}>
                      {status[row.key] === 'saving' ? (
                        <Text style={[styles.statusText, { color: c.textSecondary }]}>Saving…</Text>
                      ) : null}
                      {status[row.key] === 'saved' ? (
                        <View style={styles.saved}>
                          <Ionicons name="checkmark" size={12} color={tickColour} />
                          <Text style={[styles.statusText, styles.savedText, { color: tickColour }]}>Saved</Text>
                        </View>
                      ) : null}
                    </View>
                    <ToggleSwitch
                      checked={isVisible(row.key)}
                      onChange={(v) => void handleToggle(row.key, v)}
                      disabled={status[row.key] === 'saving'}
                      accent={accent}
                      accessibilityLabel={`Show ${row.label} on your public profile`}
                    />
                  </>
                )}
              </View>
            ))}
          </View>
        </Card>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  stack: {
    gap: Spacing.xl,
  },
  groupTitle: {
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    fontFamily: FontFamily.bodyBold,
    fontWeight: '700',
  },
  rows: {
    marginTop: Spacing.xs,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.lg,
    paddingVertical: 14,
  },
  rowText: {
    flex: 1,
    minWidth: 0,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  label: {
    fontSize: 14,
    lineHeight: 20,
    fontFamily: FontFamily.bodySemiBold,
    fontWeight: '600',
  },
  description: {
    marginTop: 2,
    fontSize: 12,
    lineHeight: 16,
    fontFamily: FontFamily.body,
  },
  lockedPill: {
    borderRadius: Radius.full,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  lockedText: {
    fontSize: 11,
    lineHeight: 14,
    fontFamily: FontFamily.bodySemiBold,
    fontWeight: '600',
  },
  status: {
    width: 56,
    alignItems: 'flex-end',
  },
  statusText: {
    fontSize: 12,
    lineHeight: 16,
    fontFamily: FontFamily.body,
  },
  saved: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  savedText: {
    fontFamily: FontFamily.bodyMedium,
    fontWeight: '500',
  },
});
