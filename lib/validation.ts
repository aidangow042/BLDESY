/**
 * Input validation helpers for the BLDESY mobile app.
 * Validates user input before sending to Supabase.
 */

/** Sanitise a string to a max length */
export function sanitizeLength(value: string, maxLength: number): string {
  return value.slice(0, maxLength);
}

/** Check if a string looks like a valid UUID */
export function isValidUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

/** Check if a string looks like a valid email */
export function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

/** Check if a string looks like a valid URL */
export function isValidUrl(value: string): boolean {
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
}

/** Validate an ABN (11 digits) */
export function isValidAbn(value: string): boolean {
  const digits = value.replace(/\D/g, '');
  return digits.length === 11;
}

/** Format an ABN with spaces: XX XXX XXX XXX */
export function formatAbn(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 2) return digits;
  if (digits.length <= 5) return `${digits.slice(0, 2)} ${digits.slice(2)}`;
  if (digits.length <= 8) return `${digits.slice(0, 2)} ${digits.slice(2, 5)} ${digits.slice(5)}`;
  return `${digits.slice(0, 2)} ${digits.slice(2, 5)} ${digits.slice(5, 8)} ${digits.slice(8)}`;
}

/** Validate job posting fields */
export function validateJobPost(data: {
  title: string;
  description: string;
  trade_category: string;
  suburb: string;
}): string | null {
  if (!data.title.trim()) return 'Job title is required';
  if (data.title.trim().length < 5) return 'Job title must be at least 5 characters';
  if (data.title.trim().length > 200) return 'Job title must be under 200 characters';
  if (!data.description.trim()) return 'Description is required';
  if (data.description.trim().length < 20) return 'Description must be at least 20 characters';
  if (data.description.trim().length > 5000) return 'Description must be under 5000 characters';
  if (!data.trade_category) return 'Trade category is required';
  if (!data.suburb.trim()) return 'Location is required';
  return null;
}

/** Validate message text */
export function validateMessage(body: string): string | null {
  const trimmed = body.trim();
  if (!trimmed) return 'Message cannot be empty';
  if (trimmed.length > 2000) return 'Message must be under 2000 characters';
  return null;
}
