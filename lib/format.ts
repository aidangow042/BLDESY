/**
 * Shared formatting utilities — port of ~/bldesy-web/lib/format.ts so every
 * relative timestamp in the app reads exactly like the website's.
 */

/** Format a date string into a human-readable relative time (e.g. "just now", "5m ago"). */
export function relativeTime(dateStr: string): string {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  const days = Math.floor(diff / 86400);
  if (days === 1) return 'yesterday';
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString('en-AU', {
    day: 'numeric',
    month: 'short',
  });
}

/**
 * Safely coerce an unknown value to a string.
 * Handles plain strings, objects with a `name` or `text` property, and fallback.
 * Used for JSONB fields that may arrive in different shapes.
 */
export function str(val: unknown): string {
  if (typeof val === 'string') return val;
  if (val && typeof val === 'object') {
    if ('name' in val) return String((val as Record<string, unknown>).name);
    if ('text' in val) return String((val as Record<string, unknown>).text);
  }
  return String(val ?? '');
}
