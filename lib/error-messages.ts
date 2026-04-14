/**
 * Friendly error message helper.
 * Maps raw Supabase / network / auth errors to user-facing strings.
 */

export function friendlyError(error: any): string {
  if (!error) return 'Something went wrong. Please try again.';
  const msg = error?.message || String(error);

  // Network errors
  if (
    msg.includes('fetch') ||
    msg.includes('network') ||
    msg.includes('Failed to fetch') ||
    msg.includes('NetworkError')
  )
    return 'Connection error. Check your internet and try again.';

  // Auth errors
  if (msg.includes('JWT') || msg.includes('token') || msg.includes('unauthorized'))
    return 'Your session has expired. Please log in again.';

  // Rate limiting
  if (msg.includes('rate limit') || msg.includes('too many'))
    return 'Too many requests. Please wait a moment and try again.';

  // Generic
  return 'Something went wrong. Please try again.';
}
