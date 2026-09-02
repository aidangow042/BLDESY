/**
 * Shared /messages page (homeowners; role auto-detected) — the same Inbox as
 * the tradie portal with `basePath="/messages"`, inside the AppShell
 * (~/bldesy-web/app/messages/page.tsx renders <Inbox basePath="/messages" />).
 */
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { APP_HEADER_HEIGHT, AppShell } from '@/components/layout';
import { Inbox } from '@/components/messages/inbox';

export default function MessagesScreen() {
  const insets = useSafeAreaInsets();
  return (
    <AppShell title="Messages" showBack hideAssist>
      <Inbox basePath="/messages" keyboardVerticalOffset={insets.top + APP_HEADER_HEIGHT} />
    </AppShell>
  );
}
