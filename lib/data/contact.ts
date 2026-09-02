/**
 * Contact-reveal + profile-view beacons — ports of the fetches inside
 * ~/bldesy-web/components/enterprise/contact-popover.tsx (the tradie Contact
 * modal; `POST /api/builder/[id]/contact-reveal`, kind "reveal" once per open
 * when a phone or email is shown, kind "copy" on every clipboard copy) and
 * ~/bldesy-web/components/builder/profile-view-beacon.tsx (`POST
 * /api/builder/[id]/view` on mount of the public profile).
 *
 * The tradie's `phone`/`email`/`website` come from the `public_builder_profiles`
 * row; revealing them is METERED here (value-gated billing — off-platform
 * contact otherwise leaves no trace). Never call the revoked
 * `get_builder_contact` RPC.
 *
 * Both beacons are fire-and-forget: the server always answers 204 (it dedupes,
 * drops self-views/anonymous sessions, and rate-limits), and a failure must
 * never affect the screen — so these never reject; failures are warned.
 */
import { api } from '@/lib/api';

export type ContactRevealKind = 'reveal' | 'copy';

export function contactRevealPath(builderUserId: string): string {
  return `/api/builder/${encodeURIComponent(builderUserId)}/contact-reveal`;
}

export function profileViewPath(builderUserId: string): string {
  return `/api/builder/${encodeURIComponent(builderUserId)}/view`;
}

/**
 * The website's trigger condition for the "reveal" beacon: a real tradie id,
 * at least one contact detail actually shown, and not a demo/preview profile.
 * Call once per modal open (the website guards with a ref); the server
 * dedupes properly regardless.
 */
export function shouldRecordContactReveal(input: {
  builderUserId?: string | null;
  phone?: string | null;
  email?: string | null;
  demo?: boolean;
}): boolean {
  if (input.demo) return false;
  if (!input.builderUserId) return false;
  return Boolean(input.phone || input.email);
}

/**
 * Record that the viewer revealed (`kind: "reveal"`, the default) or copied
 * (`kind: "copy"`) this tradie's phone/email. Guests and self-views are
 * no-ops server-side. Never rejects.
 */
export async function revealContact(
  builderUserId: string,
  kind: ContactRevealKind = 'reveal',
): Promise<void> {
  try {
    await api.post<void>(contactRevealPath(builderUserId), { kind });
  } catch (e) {
    console.warn('contact-reveal beacon failed', e instanceof Error ? e.message : e);
  }
}

/**
 * Record a public-profile view (anonymous viewers count via an IP hash;
 * self-views are ignored server-side; deduped per builder × viewer × day).
 * Skipped for demo/preview profiles — a mock id has no analytics to pollute.
 * Never rejects.
 */
export async function recordProfileView(
  builderUserId: string,
  opts: { demo?: boolean } = {},
): Promise<void> {
  if (!builderUserId || opts.demo) return;
  try {
    await api.post<void>(profileViewPath(builderUserId));
  } catch (e) {
    console.warn('profile-view beacon failed', e instanceof Error ? e.message : e);
  }
}
