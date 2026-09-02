/**
 * CompletenessChecklist — port of
 * `~/bldesy-web/components/portal/completeness-checklist.tsx`.
 *
 * THE completeness checklist (P2.6) — one renderer behind the status card's
 * nudge section and the dashboard % tile, fed by completenessChecklist()
 * so every surface shows identical priorities and deep links.
 */
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter, type Href } from 'expo-router';

import { Colors, FontFamily, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import type { CompletenessItem } from '@/lib/web/profile-completeness';

export interface ChecklistLink {
  key: string;
  label: string;
  /** Website deep link (`/portal/edit-profile?step=N` or `/portal/settings`) — app routes mirror it. */
  href: string;
}

/** Deep-linked checklist rows shared by the status card and the % tile. */
export function ChecklistLinks({ items }: { items: readonly ChecklistLink[] }) {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];
  const router = useRouter();

  if (items.length === 0) return null;
  return (
    <View style={styles.list}>
      {items.map((item) => (
        <Pressable
          key={item.key}
          accessibilityRole="link"
          onPress={() => router.push(item.href as Href)}
          style={styles.row}
        >
          <View style={[styles.arrow, { borderColor: c.primary + '66' }]}>
            <Text style={[styles.arrowText, { color: c.primary }]}>→</Text>
          </View>
          <Text style={[styles.label, { color: c.primary }]}>{item.label}</Text>
        </Pressable>
      ))}
    </View>
  );
}

export function CompletenessChecklist({
  items,
  limit,
}: {
  items: CompletenessItem[];
  /** Show at most this many MISSING items (done items always hidden). */
  limit?: number;
}) {
  const missing = items.filter((i) => !i.done).slice(0, limit ?? items.length);
  if (missing.length === 0) return null;
  return <ChecklistLinks items={missing} />;
}

const styles = StyleSheet.create({
  list: {
    gap: 6, // web space-y-1.5
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    alignSelf: 'flex-start',
  },
  arrow: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  arrowText: {
    fontSize: 10,
    lineHeight: 12,
  },
  label: {
    fontSize: 14,
    lineHeight: 20,
    fontFamily: FontFamily.bodySemiBold,
    fontWeight: '600',
  },
});
