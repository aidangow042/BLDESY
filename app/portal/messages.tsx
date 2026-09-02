/**
 * Tradie inbox inside the portal — port of ~/bldesy-web/app/portal/messages/page.tsx:
 * same conversation UI as the shared /messages page, portal chrome and tradie copy.
 * While a thread is open the page heading yields to the conversation header.
 */
import { useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Inbox } from '@/components/messages/inbox';
import { PORTAL_HEADER_HEIGHT } from '@/components/portal/portal-header';
import { PortalPage } from '@/components/portal/portal-page';
import { zoneIsLive } from '@/lib/launch-flags';

export default function PortalMessagesScreen() {
  const insets = useSafeAreaInsets();
  const { c } = useLocalSearchParams<{ c?: string }>();
  return (
    <PortalPage
      title="Messages"
      subtitle={
        zoneIsLive('home_jobs')
          ? 'Homeowner enquiries and conversations.'
          : 'Homeowner enquiries land here at launch.'
      }
      scroll={false}
      hideHeading={!!c}
    >
      <Inbox
        basePath="/portal/messages"
        forceRole="tradie"
        keyboardVerticalOffset={insets.top + PORTAL_HEADER_HEIGHT}
        // The portal tab bar already pads the bottom safe area.
        bottomInset={0}
      />
    </PortalPage>
  );
}
