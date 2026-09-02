/**
 * Push deep-link routes — the app-side consumer of the `data.route` values the
 * website's dispatcher puts on every push (~/bldesy-web/lib/notifications/
 * dispatch.ts: `/jobs/{id}`, `/jobs`, `/my-jobs`, `/portal`, `/portal/pending`,
 * `/portal/refer`, `/portal/billing`, `/messages?c={id}`, `/enterprise/jobs/{id}`,
 * `credential_alert` links such as `/portal/edit-profile`, …).
 *
 * App routes mirror website paths (CLAUDE.md §5), so an allowed route is
 * returned verbatim. Anything else — a host, a protocol-relative `//`, a
 * character outside `[A-Za-z0-9/_?=&-]`, or a path we have no screen for —
 * falls back to "/" so a crafted or stale payload can never open an
 * unexpected screen.
 *
 * Known gap: `credential_alert` pushes may carry the tradie's keyword profile
 * URL (`/{trade}/{suburb}/{slug}`); the app's profile route is keyed by
 * `user_id`, so those need a slug lookup at navigation time and currently
 * fall back to "/".
 */
export const PUSH_ROUTE_FALLBACK = '/';

const UUID = '[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}';

const SAFE_ROUTE_CHARS = /^[A-Za-z0-9/_?=&-]+$/;

const ALLOWED_ROUTE_PATTERNS: readonly RegExp[] = [
  new RegExp(`^/jobs/${UUID}$`),
  /^\/jobs$/,
  /^\/my-jobs$/,
  /^\/portal$/,
  /^\/portal\/pending$/,
  /^\/portal\/refer$/,
  /^\/portal\/billing$/,
  new RegExp(`^/portal/jobs/${UUID}$`),
  /^\/portal\/edit-profile(\?step=[1-6])?$/,
  /^\/messages$/,
  new RegExp(`^/messages\\?c=${UUID}$`),
  /^\/dashboard(\/[a-z][a-z-]*)*$/,
  new RegExp(`^/enterprise/jobs/${UUID}$`),
  /^\/enterprise$/,
  /^\/settings$/,
  new RegExp(`^/builder/${UUID}$`),
];

/** True when `route` is a relative, character-safe path the app has a screen for. */
export function isAllowedPushRoute(route: string): boolean {
  if (!route.startsWith('/') || route.startsWith('//')) return false;
  if (!SAFE_ROUTE_CHARS.test(route)) return false;
  return ALLOWED_ROUTE_PATTERNS.some((re) => re.test(route));
}

/**
 * Map a push payload's `data.route` to an app href. Allowed website paths
 * come back unchanged (routes mirror); everything else → "/".
 */
export function webRouteToAppHref(route: string | null | undefined): string {
  if (typeof route !== 'string') return PUSH_ROUTE_FALLBACK;
  const trimmed = route.trim();
  return isAllowedPushRoute(trimmed) ? trimmed : PUSH_ROUTE_FALLBACK;
}
