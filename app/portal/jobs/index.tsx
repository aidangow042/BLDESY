/** /portal/jobs → Project Jobs, exactly like ~/bldesy-web/app/portal/jobs/page.tsx. */
import { Redirect } from 'expo-router';

import { ROUTES } from '@/lib/routes';

export default function JobsRedirect() {
  return <Redirect href={ROUTES.portalJobsCommercial} />;
}
