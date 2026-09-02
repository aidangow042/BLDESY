/** /dashboard → /dashboard/profile (~/bldesy-web/app/dashboard/page.tsx). */
import { Redirect, type Href } from 'expo-router';

import { ROUTES } from '@/lib/routes';

export default function DashboardIndex() {
  return <Redirect href={ROUTES.dashboard as Href} />;
}
