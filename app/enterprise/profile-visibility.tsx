/**
 * /enterprise/profile-visibility — Profile visibility. Port of
 * ~/bldesy-web/app/enterprise/profile-visibility/page.tsx: the
 * ENTERPRISE_VISIBILITY_GROUPS panel (indigo accent) writing
 * `enterprise_profiles.profile_visibility` — absent key = visible, only
 * `false` keys are stored (lib/data/visibility.ts buildVisibilityPatch), with
 * a per-key revert + toast on failure.
 */
import { useState } from 'react';
import { View } from 'react-native';

import { useEnterprise } from '@/components/enterprise/enterprise-context';
import { HubScreen, PageTitle, PillButton, Spinner, useHubTheme } from '@/components/enterprise/hub-primitives';
import { ProfileVisibilityPanel } from '@/components/enterprise/profile-visibility-panel';
import { useToast } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { router } from 'expo-router';
import { updateOwnEnterpriseProfile, type EnterpriseProfile } from '@/lib/data/enterprise';
import { buildVisibilityPatch, revertVisibilityKey, VISIBILITY_SAVE_ERROR } from '@/lib/data/visibility';
import { toHref } from '@/lib/enterprise-hub/nav';
import { ROUTES } from '@/lib/routes';
import { ENTERPRISE_VISIBILITY_GROUPS, isSectionVisible } from '@/lib/web/profile-visibility';
import type { ProfileVisibilityMap } from '@/types/database';

export default function EnterpriseProfileVisibilityScreen() {
  const c = useHubTheme();
  const { profile, refreshProfile } = useEnterprise();

  if (!profile) {
    return (
      <View style={{ flex: 1, backgroundColor: c.canvas }}>
        <Spinner minHeight={320} />
      </View>
    );
  }

  return <EnterpriseVisibilitySettings profile={profile} refreshProfile={refreshProfile} />;
}

function EnterpriseVisibilitySettings({
  profile,
  refreshProfile,
}: {
  profile: EnterpriseProfile;
  refreshProfile: () => Promise<void>;
}) {
  const toast = useToast();
  const [visMap, setVisMap] = useState<ProfileVisibilityMap>(profile.profile_visibility ?? {});

  async function handleToggle(key: string, visible: boolean) {
    const wasVisible = isSectionVisible(visMap, key);
    const patch = buildVisibilityPatch(visMap, key, visible);
    if (patch.column !== 'profile_visibility') return; // enterprise groups carry no column-backed toggles
    setVisMap(patch.value);
    try {
      await updateOwnEnterpriseProfile({ profile_visibility: patch.value });
    } catch (e) {
      // Revert only this key — restoring a whole-object snapshot would clobber
      // any other toggle saved while this write was in flight.
      setVisMap((current) => revertVisibilityKey(current, key, wasVisible));
      toast.show(VISIBILITY_SAVE_ERROR, { variant: 'error' });
      throw e;
    }
    void refreshProfile();
  }

  return (
    <HubScreen gap={Spacing.xl}>
      <PageTitle
        title="Profile visibility"
        subtitle="Control what tradies see on your public company profile."
        right={
          <PillButton
            label="View public profile"
            variant="outline"
            size="sm"
            icon="open-outline"
            onPress={() => router.push(toHref(ROUTES.companyProfile(profile.user_id)))}
          />
        }
      />
      <ProfileVisibilityPanel
        groups={ENTERPRISE_VISIBILITY_GROUPS}
        isVisible={(key) => isSectionVisible(visMap, key)}
        onToggle={handleToggle}
      />
    </HubScreen>
  );
}
