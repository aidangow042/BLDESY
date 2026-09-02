/**
 * EoiDashboardCards — port of `~/bldesy-web/components/eoi/eoi-dashboard-cards.tsx`.
 *
 * New-lead cards on the portal dashboard — one per undismissed Expression of
 * Interest (RLS scopes the read to the signed-in tradie). Dismiss is per-row:
 * optimistic removal, then a best-effort status update. "Junk" also voids the
 * enquiry from the billing meter. Renders nothing when there are no new leads.
 */
import { useEffect, useState } from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import { Card } from '@/components/ui';
import { Colors, FontFamily, Radius, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { dismissEoi, flagEoiJunk, listOwnEois, type EoiLead } from '@/lib/data/portal';
import { relativeTime } from '@/lib/web/format';
import { formatAuMobile } from '@/lib/web/phone';
import { formatTradeName } from '@/lib/web/trades';

export function EoiDashboardCards({ refreshKey = 0 }: { refreshKey?: number }) {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];
  const [leads, setLeads] = useState<EoiLead[]>([]);

  useEffect(() => {
    let cancelled = false;
    listOwnEois()
      .then((data) => {
        if (!cancelled) setLeads(data);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  async function dismiss(id: string) {
    // Hide immediately; the write is best-effort (a failure just means the
    // card reappears next visit — no error surface needed for a dismiss).
    setLeads((prev) => prev.filter((l) => l.id !== id));
    await dismissEoi(id).catch(() => {});
  }

  async function flagJunk(id: string) {
    // Junk ≠ dismiss: it also voids the enquiry from the billing meter
    // (within the 7-day window) and is visible in admin, so serial flaggers
    // stand out. Optimistic removal, server does the rest.
    setLeads((prev) => prev.filter((l) => l.id !== id));
    await flagEoiJunk(id).catch(() => {});
  }

  if (leads.length === 0) return null;

  return (
    <View style={styles.stack}>
      {leads.map((lead) => (
        <Card key={lead.id} padding={Spacing.xl} style={styles.card}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Dismiss lead"
            onPress={() => void dismiss(lead.id)}
            hitSlop={6}
            style={styles.close}
          >
            <Ionicons name="close" size={16} color={c.textSecondary} />
          </Pressable>

          <View style={styles.row}>
            <View style={[styles.icon, { backgroundColor: c.primary + '1A' }]}>
              <Ionicons name="flame-outline" size={20} color={c.primary} />
            </View>
            <View style={styles.body}>
              <Text style={[styles.eyebrow, { color: c.primary }]}>New lead</Text>
              <Text style={[styles.name, { color: c.textPrimary }]}>{lead.name}</Text>
              <Text style={[styles.meta, { color: c.textSecondary }]}>
                Reached out{' '}
                {lead.trade_category
                  ? `via your ${formatTradeName(lead.trade_category)} profile`
                  : 'via your profile'}{' '}
                · {relativeTime(lead.created_at)}
              </Text>
              {lead.message ? (
                <Text style={[styles.message, { color: c.textPrimary, borderColor: c.border, backgroundColor: c.canvas }]}>
                  “{lead.message}”
                </Text>
              ) : null}
              <View style={styles.contacts}>
                <Pressable
                  accessibilityRole="link"
                  onPress={() => void Linking.openURL(`mailto:${lead.email}`)}
                  style={styles.contact}
                >
                  <Ionicons name="mail-outline" size={16} color={c.primary} />
                  <Text style={[styles.contactText, { color: c.primary }]}>{lead.email}</Text>
                </Pressable>
                {lead.phone ? (
                  <Pressable
                    accessibilityRole="link"
                    onPress={() => void Linking.openURL(`tel:${lead.phone}`)}
                    style={styles.contact}
                  >
                    <Ionicons name="call-outline" size={16} color={c.primary} />
                    <Text style={[styles.contactText, { color: c.primary }]}>
                      {formatAuMobile(lead.phone) ?? lead.phone}
                    </Text>
                  </Pressable>
                ) : null}
              </View>
              <Pressable
                accessibilityRole="button"
                onPress={() => void flagJunk(lead.id)}
                style={styles.junk}
              >
                <Ionicons name="flag-outline" size={14} color={c.textSecondary} />
                <Text style={[styles.junkText, { color: c.textSecondary }]}>
                  Flag as junk — doesn&apos;t count toward your free enquiries
                </Text>
              </Pressable>
            </View>
          </View>
        </Card>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  stack: {
    gap: Spacing.lg,
  },
  card: {
    position: 'relative',
  },
  close: {
    position: 'absolute',
    top: Spacing.md,
    right: Spacing.md,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.md,
  },
  icon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    flex: 1,
    minWidth: 0,
    paddingRight: Spacing.lg,
  },
  eyebrow: {
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    fontFamily: FontFamily.bodySemiBold,
    fontWeight: '600',
  },
  name: {
    marginTop: 2,
    fontSize: 16,
    lineHeight: 24,
    fontFamily: FontFamily.bodyBold,
    fontWeight: '700',
  },
  meta: {
    marginTop: Spacing.xs,
    fontSize: 12,
    lineHeight: 16,
    fontFamily: FontFamily.body,
  },
  message: {
    marginTop: Spacing.sm,
    borderRadius: Radius.lg,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    lineHeight: 22,
    fontStyle: 'italic',
    fontFamily: FontFamily.body,
  },
  contacts: {
    marginTop: Spacing.md,
    flexDirection: 'row',
    flexWrap: 'wrap',
    columnGap: Spacing.lg,
    rowGap: 6,
  },
  contact: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  contactText: {
    fontSize: 14,
    lineHeight: 20,
    fontFamily: FontFamily.bodySemiBold,
    fontWeight: '600',
  },
  junk: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  junkText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 16,
    fontFamily: FontFamily.bodySemiBold,
    fontWeight: '600',
  },
});
