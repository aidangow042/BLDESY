/**
 * "Releasing in Stage 2" panel shown in place of the Project Jobs and
 * Contracts feeds while the business side is pre-launch (lib/web/stage2.ts).
 * Port of ~/bldesy-web/components/portal/stage2-teaser.tsx — copy verbatim.
 */
import { Text } from 'react-native';
import { useRouter } from 'expo-router';

import { Colors, FontFamily } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { zoneIsLive } from '@/lib/launch-flags';
import { ROUTES } from '@/lib/routes';
import { GateTeaser } from './gate-teaser';

export function Stage2Teaser({ kind }: { kind: 'projects' | 'contracts' }) {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];
  const router = useRouter();
  const title = kind === 'projects' ? 'Project Jobs' : 'Contracts';
  const homeJobsLive = zoneIsLive('home_jobs');

  const homeJobsLink = (
    <Text
      onPress={() => router.push(ROUTES.portalJobsResidential)}
      style={{ color: c.primary, fontFamily: FontFamily.bodySemiBold, fontWeight: '600' }}
      accessibilityRole="link"
    >
      Home Jobs
    </Text>
  );

  return (
    <GateTeaser
      badge="Releasing in Stage 2"
      title={`${title} are coming`}
      body={
        <>
          {kind === 'projects'
            ? 'Builders, strata managers and other businesses will post project work here — bigger jobs, longer engagements, direct to verified tradies.'
            : 'Ongoing contract work from businesses — maintenance rounds, retainers and repeat engagements — will be posted here.'}{' '}
          We&apos;re opening the business side after the homeowner launch, and you&apos;ll be first
          to know — it lands straight in this tab.
        </>
      }
      footer={
        homeJobsLive ? (
          <>
            In the meantime, {homeJobsLink} is live now.
          </>
        ) : (
          <>
            {homeJobsLink} opens at launch — finish your profile so homeowners see you first.
          </>
        )
      }
    />
  );
}
