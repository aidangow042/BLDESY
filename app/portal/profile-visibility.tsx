/**
 * /portal/profile-visibility — port of
 * `~/bldesy-web/app/portal/profile-visibility/page.tsx`.
 *
 * The availability display mode (three states, not a binary toggle) and the
 * per-section visibility panel over BUILDER_VISIBILITY_GROUPS. Every toggle
 * saves instantly with an optimistic flip and a per-key revert on failure.
 */
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';

import { AvailabilityModeControl } from '@/components/availability/availability-mode-control';
import { usePortal } from '@/components/portal/portal-context';
import { PortalPage } from '@/components/portal/portal-page';
import { ProfileVisibilityPanel } from '@/components/settings/profile-visibility-panel';
import { Card, Skeleton, useToast } from '@/components/ui';
import { Colors, FontFamily, Radius, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { saveDisplayMode } from '@/lib/data/availability';
import type { OwnBuilderProfile } from '@/lib/data/portal';
import {
  buildVisibilityPatch,
  isRowVisible,
  revertVisibilityKey,
  setSectionVisible,
  VISIBILITY_SAVE_ERROR,
  visibilityStateFrom,
} from '@/lib/data/visibility';
import { ROUTES } from '@/lib/routes';
import { BLDESY_SCORE_TOGGLE_KEY, BUILDER_VISIBILITY_GROUPS, isSectionVisible } from '@/lib/web/profile-visibility';
import type { AvailabilityDisplayMode, ProfileVisibilityMap } from '@/types/database';

export default function ProfileVisibilityPage() {
  const { profile, refreshProfile } = usePortal();

  if (!profile) {
    return (
      <PortalPage>
        <Skeleton style={{ height: 32, width: 208 }} />
        <Skeleton variant="card" style={{ height: 144 }} />
        <Skeleton variant="card" style={{ height: 288 }} />
      </PortalPage>
    );
  }

  return <BuilderVisibilitySettings profile={profile} refreshProfile={refreshProfile} />;
}

function BuilderVisibilitySettings({
  profile,
  refreshProfile,
}: {
  profile: OwnBuilderProfile;
  refreshProfile: () => Promise<void>;
}) {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];
  const router = useRouter();
  const toast = useToast();
  const [initial] = useState(() => visibilityStateFrom(profile));
  const [visMap, setVisMap] = useState<ProfileVisibilityMap>(initial.visibility);
  const [showScore, setShowScore] = useState(initial.displayBldesyScore);
  const [mode, setMode] = useState<AvailabilityDisplayMode>(initial.availabilityDisplayMode);

  const isVisible = (key: string) => isRowVisible({ visibility: visMap, displayBldesyScore: showScore }, key);

  async function handleToggle(key: string, visible: boolean) {
    // The BLDESY Score opt-in is a real column (view-gated), not a JSONB key.
    if (key === BLDESY_SCORE_TOGGLE_KEY) {
      const previous = showScore;
      setShowScore(visible);
      try {
        await setSectionVisible(visMap, key, visible);
      } catch (e) {
        setShowScore(previous);
        toast.show(VISIBILITY_SAVE_ERROR, { variant: 'error' });
        throw e;
      }
      void refreshProfile();
      return;
    }

    const wasVisible = isSectionVisible(visMap, key);
    const patch = buildVisibilityPatch(visMap, key, visible);
    if (patch.column === 'profile_visibility') setVisMap(patch.value);
    try {
      await setSectionVisible(visMap, key, visible);
    } catch (e) {
      // Revert only this key — restoring a whole-object snapshot would clobber
      // any other toggle saved while this write was in flight.
      setVisMap((current) => revertVisibilityKey(current, key, wasVisible));
      toast.show(VISIBILITY_SAVE_ERROR, { variant: 'error' });
      throw e;
    }
    void refreshProfile();
  }

  async function saveMode(next: AvailabilityDisplayMode) {
    try {
      await saveDisplayMode(next);
    } catch (e) {
      toast.show("Couldn't save your display mode — please try again.", { variant: 'error' });
      throw e;
    }
    setMode(next);
    void refreshProfile();
  }

  return (
    <PortalPage>
      {/* Page header */}
      <View style={styles.header}>
        <View>
          <Text accessibilityRole="header" style={[styles.h1, { color: c.textPrimary }]}>
            Profile visibility
          </Text>
          <Text style={[styles.sub, { color: c.textSecondary }]}>
            Control what homeowners see on your public profile.
          </Text>
        </View>
        <Pressable
          accessibilityRole="link"
          onPress={() => router.push(ROUTES.builderProfile(profile.user_id))}
          style={[styles.headerButton, { borderColor: c.border, backgroundColor: c.surface }]}
        >
          <Text style={[styles.headerButtonText, { color: c.textPrimary }]}>View public profile</Text>
          <Ionicons name="open-outline" size={14} color={c.textPrimary} />
        </Pressable>
      </View>

      {/* Availability display mode — three states, not a binary toggle */}
      <Card padding={Spacing.xl} flat>
        <Text accessibilityRole="header" style={[styles.groupTitle, { color: c.textSecondary }]}>
          Availability
        </Text>
        <Text style={[styles.groupSub, { color: c.textSecondary }]}>How your availability appears to homeowners.</Text>
        <View style={styles.control}>
          <AvailabilityModeControl value={mode} onChange={saveMode} />
        </View>
        <Pressable
          accessibilityRole="link"
          onPress={() => router.push(ROUTES.portalAvailability)}
          style={styles.manageLink}
        >
          <Text style={[styles.manageText, { color: c.primary }]}>Manage booked dates</Text>
          <Ionicons name="chevron-forward" size={14} color={c.primary} />
        </Pressable>
      </Card>

      <ProfileVisibilityPanel groups={BUILDER_VISIBILITY_GROUPS} isVisible={isVisible} onToggle={handleToggle} />
    </PortalPage>
  );
}

const styles = StyleSheet.create({
  header: {
    gap: Spacing.md,
  },
  h1: {
    fontSize: 24,
    lineHeight: 32,
    fontFamily: FontFamily.bodyBold,
    fontWeight: '700',
  },
  sub: {
    marginTop: Spacing.xs,
    fontSize: 14,
    lineHeight: 20,
    fontFamily: FontFamily.body,
  },
  headerButton: {
    alignSelf: 'flex-start',
    height: 40,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: Radius.lg,
    borderWidth: 1,
    paddingHorizontal: Spacing.lg,
  },
  headerButtonText: {
    fontSize: 14,
    lineHeight: 20,
    fontFamily: FontFamily.bodyMedium,
    fontWeight: '500',
  },
  groupTitle: {
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    fontFamily: FontFamily.bodyBold,
    fontWeight: '700',
  },
  groupSub: {
    marginTop: Spacing.sm,
    fontSize: 14,
    lineHeight: 20,
    fontFamily: FontFamily.body,
  },
  control: {
    marginTop: Spacing.lg,
  },
  manageLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    minHeight: 32,
  },
  manageText: {
    fontSize: 14,
    lineHeight: 20,
    fontFamily: FontFamily.bodyMedium,
    fontWeight: '500',
  },
});
