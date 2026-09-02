// AUTO-SYNCED from ~/bldesy-web/lib/safe-redirect.ts by scripts/sync-web-libs.mjs — DO NOT EDIT HERE.
// Change the website original, then run: npm run sync:web

/**
 * Clamp a user-supplied redirect target to a same-origin path.
 *
 * `startsWith("/") && !startsWith("//")` is NOT a safe guard: WHATWG URL
 * parsing (new URL(), browsers resolving Location headers, and
 * window.location.assign) treats "\" as "/", so "/\evil.com" resolves to
 * https://evil.com/ yet passes that check. Parse the candidate against a
 * fixed base instead and require the origin to survive — backslash tricks,
 * protocol-relative paths, absolute URLs, and embedded-whitespace variants
 * all escape the base origin and fall back.
 *
 * No "server-only": pure string logic, shared with unit tests.
 */

const GUARD_BASE = new URL("https://redirect-guard.invalid");

export function safeRedirectPath(candidate: unknown, fallback = "/"): string {
  if (typeof candidate !== "string" || !candidate.startsWith("/")) return fallback;
  try {
    const resolved = new URL(candidate, GUARD_BASE);
    if (resolved.origin !== GUARD_BASE.origin) return fallback;
    // Rebuild from the parsed parts so downstream consumers (Location
    // headers, window.location.assign) see exactly what was validated.
    const path = resolved.pathname + resolved.search + resolved.hash;
    // WHATWG dot-segment removal can turn an input that started with a
    // single "/" into a "//"-prefixed path ("/..//evil.com" → "//evil.com").
    // Re-parsed against the real origin that reads as protocol-relative
    // (→ https://evil.com/), so reject any path that survived as "//".
    if (path.startsWith("//")) return fallback;
    return path;
  } catch {
    return fallback;
  }
}
