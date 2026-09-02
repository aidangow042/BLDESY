// AUTO-SYNCED from ~/bldesy-web/lib/response-time.ts by scripts/sync-web-libs.mjs — DO NOT EDIT HERE.
// Change the website original, then run: npm run sync:web

/**
 * Response-time display (P3.3). The stored value is DECLARED by the tradie
 * ("Within 2 hours"), not measured — until real message data can back a
 * measured number, every public surface prefixes it "Typically" so it reads
 * as a promise of habit, not a guarantee. Swap this formatter for a
 * measured figure (first-reply latency from conversations) post-launch.
 */
export function formatDeclaredResponseTime(
  raw: string | null | undefined,
): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  // Already qualified (future measured values, or legacy free text).
  if (/^typically/i.test(trimmed)) return trimmed;
  return `Typically ${trimmed.charAt(0).toLowerCase()}${trimmed.slice(1)}`;
}
