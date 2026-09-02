// AUTO-SYNCED from ~/bldesy-web/lib/avatar.ts by scripts/sync-web-libs.mjs — DO NOT EDIT HERE.
// Change the website original, then run: npm run sync:web

/**
 * Fallback avatar for profiles without a photo. Keep the background in sync
 * with --color-primary (globals.css) so generated initials match the brand.
 */
const AVATAR_BG = "0D9B7A";

export function avatarFallbackUrl(name: string, size = 200): string {
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=${AVATAR_BG}&color=fff&size=${size}`;
}
