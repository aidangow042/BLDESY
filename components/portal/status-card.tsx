/**
 * StatusCard — port of `~/bldesy-web/components/portal/status-card.tsx`.
 *
 * THE dashboard status card (top position): one card, five states, derived
 * by lib/portal/profile-status.ts (mirrored). Owns the one-tap Pause / Go-live
 * control (Settings mirrors it). Pausing never touches verification, reviews
 * or completeness.
 */
import { useState } from 'react';
import { Platform, Pressable, Share, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';

import { Colors, FontFamily, Radius, Shadows, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useUser } from '@/lib/auth-context';
import {
  getCompletenessChecklist,
  getInsuranceExpiryWarnings,
  getPortalStatus,
  setProfilePaused,
} from '@/lib/data/portal';
import { ROUTES, WEB_BASE } from '@/lib/routes';
import type { PortalProfileState } from '@/lib/web/portal/profile-status';
import { builderProfilePath } from '@/lib/web/profile-url';
import {
  CITY_REGIONS,
  getCityRegion,
  getFoundingZone,
  parseServiceAreas,
} from '@/lib/web/service-areas';

import { ChecklistLinks, CompletenessChecklist } from './completeness-checklist';
import { usePortal } from './portal-context';

/* ── Region (components/portal/use-waitlist-count.ts, cityRegionFor) ──── */

function haversineKmApprox(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * The tradie's `region:` entries live in TWO namespaces: metro cities
 * ("Sydney") and inner-city founding zones ("Upper Eastern"). Founding zones
 * resolve to their metro city by containment. Returns the display name, or
 * null when nothing maps. (The web's homeowner-demand COUNT only renders in
 * waitlist mode, which the app does not have — only the region is ported.)
 */
export function cityRegionFor(serviceAreas: string[] | null | undefined): string | null {
  const { regions } = parseServiceAreas(serviceAreas);
  for (const name of regions) {
    const city = getCityRegion(name);
    if (city) return city.name;
  }
  for (const name of regions) {
    const zone = getFoundingZone(name);
    if (!zone) continue;
    const city = CITY_REGIONS.find(
      (c) => haversineKmApprox(c.latitude, c.longitude, zone.latitude, zone.longitude) <= c.radiusKm,
    );
    if (city) return city.name;
  }
  return null;
}

/* ── Card ──────────────────────────────────────────────────────────── */

export function StatusCard() {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];
  const router = useRouter();
  const { user } = useUser();
  const { profile, refreshProfile } = usePortal();
  const [saving, setSaving] = useState(false);
  const [nowTs] = useState(() => Date.now());

  if (!user || !profile) return null;

  const expiryWarnings = getInsuranceExpiryWarnings(profile, new Date(nowTs));
  const status = getPortalStatus(profile, user);
  const region = cityRegionFor(profile.service_areas);
  const profilePath = builderProfilePath(profile);

  async function setPaused(paused: boolean) {
    setSaving(true);
    try {
      await setProfilePaused(paused);
      await refreshProfile();
    } catch {
      /* the row keeps its previous state; the card re-renders from it */
    } finally {
      setSaving(false);
    }
  }

  async function shareProfile() {
    const url = `${WEB_BASE}${profilePath}`;
    const text = 'Find me on BLDESY — checked tradies, yours to choose.';
    try {
      await Share.share({
        title: profile?.business_name ?? 'My BLDESY profile',
        message: Platform.OS === 'ios' ? text : `${text} ${url}`,
        url,
      });
    } catch {
      /* user dismissed the share sheet */
    }
  }

  const tone = tones(status.state, c);

  return (
    <View style={[styles.card, Shadows.sm, { borderColor: tone.border, backgroundColor: tone.bg }]}>
      <View style={styles.row}>
        <View style={[styles.dot, { backgroundColor: tone.dot }]} />
        <View style={styles.body}>
          <Text accessibilityRole="header" style={[styles.headline, { color: c.textPrimary }]}>
            {status.headline}
            {status.state === 'live' && region ? ` in ${region}` : ''}
          </Text>
          <Text style={[styles.detail, { color: c.textSecondary }]}>{status.detail}</Text>

          {/* Needs-sorting checklist — the exact items, deep-linked. */}
          {status.checklist.length > 0 ? (
            <View style={styles.block}>
              <ChecklistLinks items={status.checklist} />
            </View>
          ) : null}

          {/* Completeness nudge — never blocking. Top items from THE shared
              checklist (P2.6) so this card and the % tile always agree. */}
          {status.nudges.map((n) => (
            <Text key={n} style={[styles.nudge, { color: c.textSecondary }]}>
              {n}
            </Text>
          ))}
          {status.state === 'live' && status.nudges.length > 0 ? (
            <View style={styles.blockSm}>
              <CompletenessChecklist items={getCompletenessChecklist(profile, user)} limit={3} />
            </View>
          ) : null}

          {/* Credential expiry warnings (P2.2) — the insurance cron enforces;
              this is the heads-up with a one-tap path to the fix. */}
          {expiryWarnings.map((w) => (
            <Text key={w.label} style={[styles.warning, { color: w.expired ? c.error : c.warning }]}>
              {w.expired
                ? `Your ${w.label} expired on ${w.expiryDate} — `
                : `Your ${w.label} expires in ${w.daysLeft} day${w.daysLeft === 1 ? '' : 's'} (${w.expiryDate}) — `}
              <Text
                accessibilityRole="link"
                onPress={() => router.push(ROUTES.portalEditProfileStep(2))}
                style={styles.underline}
              >
                upload the new certificate
              </Text>
            </Text>
          ))}

          {/* Actions */}
          <View style={styles.actions}>
            {status.state === 'suspended' ? (
              <Pressable
                accessibilityRole="link"
                onPress={() => router.push(ROUTES.portalEditProfileStep(2))}
                style={[styles.pill, { backgroundColor: c.error }]}
              >
                <Text style={[styles.pillText, { color: '#ffffff' }]}>Upload document</Text>
              </Pressable>
            ) : null}
            {status.state === 'paused' ? (
              <Pressable
                accessibilityRole="button"
                disabled={saving}
                onPress={() => void setPaused(false)}
                style={[styles.pill, { backgroundColor: c.primary }, saving && styles.disabled]}
              >
                <Text style={[styles.pillText, { color: '#ffffff' }]}>
                  {saving ? 'Going live…' : 'Make profile live'}
                </Text>
              </Pressable>
            ) : null}
            {status.state === 'live' ? (
              <>
                <Pressable
                  accessibilityRole="link"
                  onPress={() => router.push(ROUTES.builderProfile(profile.user_id))}
                  style={[styles.pill, styles.pillOutline, { borderColor: c.primary }]}
                >
                  <Text style={[styles.pillText, styles.pillTextSemi, { color: c.primary }]}>
                    View public profile
                  </Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => void shareProfile()}
                  style={[styles.pill, styles.pillOutline, { borderColor: c.primary }]}
                >
                  <Text style={[styles.pillText, styles.pillTextSemi, { color: c.primary }]}>Share link</Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  disabled={saving}
                  onPress={() => void setPaused(true)}
                  style={[styles.ghost, saving && styles.disabled]}
                >
                  <Text style={[styles.ghostText, { color: c.textSecondary }]}>
                    {saving ? 'Pausing…' : 'Pause profile'}
                  </Text>
                </Pressable>
              </>
            ) : null}
            {status.state === 'needs_attention' ? (
              <Pressable
                accessibilityRole="link"
                onPress={() => router.push(ROUTES.portalEditProfile)}
                style={[styles.pill, { backgroundColor: c.primary }]}
              >
                <Text style={[styles.pillText, { color: '#ffffff' }]}>Finish your profile</Text>
              </Pressable>
            ) : null}
          </View>
        </View>
      </View>
    </View>
  );
}

function tones(state: PortalProfileState, c: Record<string, string>): { border: string; bg: string; dot: string } {
  switch (state) {
    case 'suspended':
      return { border: c.error + '66', bg: c.error + '0A', dot: c.error };
    case 'paused':
    case 'needs_attention':
      return { border: c.warning + '80', bg: c.warning + '0F', dot: c.warning };
    case 'pending':
      return { border: c.border, bg: c.surface, dot: c.primary };
    case 'live':
    default:
      return { border: c.success + '66', bg: c.successBg + '66', dot: c.success };
  }
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Radius.xl,
    borderWidth: 1,
    padding: Spacing.xl,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.md,
  },
  dot: {
    marginTop: 6,
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  body: {
    flex: 1,
    minWidth: 0,
  },
  headline: {
    fontSize: 16,
    lineHeight: 24,
    fontFamily: FontFamily.bodyBold,
    fontWeight: '700',
  },
  detail: {
    marginTop: Spacing.xs,
    fontSize: 14,
    lineHeight: 22,
    fontFamily: FontFamily.body,
  },
  block: {
    marginTop: Spacing.md,
  },
  blockSm: {
    marginTop: Spacing.sm,
  },
  nudge: {
    marginTop: Spacing.sm,
    fontSize: 12,
    lineHeight: 16,
    fontFamily: FontFamily.body,
  },
  warning: {
    marginTop: Spacing.sm,
    fontSize: 12,
    lineHeight: 16,
    fontFamily: FontFamily.bodySemiBold,
    fontWeight: '600',
  },
  underline: {
    textDecorationLine: 'underline',
  },
  actions: {
    marginTop: Spacing.lg,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  pill: {
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.sm,
    minHeight: 36,
    justifyContent: 'center',
  },
  pillOutline: {
    borderWidth: 1,
    paddingHorizontal: Spacing.lg,
  },
  pillText: {
    fontSize: 12,
    lineHeight: 16,
    fontFamily: FontFamily.bodyBold,
    fontWeight: '700',
  },
  pillTextSemi: {
    fontFamily: FontFamily.bodySemiBold,
    fontWeight: '600',
  },
  ghost: {
    marginLeft: 'auto',
    paddingVertical: Spacing.sm,
    paddingLeft: Spacing.sm,
    minHeight: 36,
    justifyContent: 'center',
  },
  ghostText: {
    fontSize: 12,
    lineHeight: 16,
    fontFamily: FontFamily.bodySemiBold,
    fontWeight: '600',
  },
  disabled: {
    opacity: 0.5,
  },
});
