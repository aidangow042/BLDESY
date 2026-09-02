/**
 * /dashboard/messages — port of ~/bldesy-web/app/dashboard/messages/page.tsx:
 * the same inbox as /messages, embedded in the dashboard shell. `?c=` keeps the
 * open conversation on this surface (`/dashboard/messages?c=<id>`).
 *
 * `Inbox` (components/messages) is owned by the messaging agent; its
 * `MessagesBasePath` union does not yet include `/dashboard/messages`, so the
 * base path is cast here — the route exists and the inbox only uses it to
 * build `${basePath}?c=`. Widening the union removes the cast.
 */
import { useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { DashboardScreen } from '@/components/customer-dashboard/dashboard-screen';
import { APP_HEADER_HEIGHT } from '@/components/layout';
import { Inbox } from '@/components/messages/inbox';
import type { MessagesBasePath } from '@/components/messages/send-message-button';
import { ROUTES } from '@/lib/routes';

export default function DashboardMessagesScreen() {
  const insets = useSafeAreaInsets();
  const [chromeHeight, setChromeHeight] = useState(0);

  return (
    <DashboardScreen title="Messages" subtitle="Your conversations with tradies" scroll={false} onChromeLayout={setChromeHeight}>
      <Inbox
        basePath={ROUTES.dashboardMessages as unknown as MessagesBasePath}
        forceRole="customer"
        keyboardVerticalOffset={insets.top + APP_HEADER_HEIGHT + chromeHeight}
        // The dashboard tab bar already pads the bottom safe area.
        bottomInset={0}
      />
    </DashboardScreen>
  );
}
