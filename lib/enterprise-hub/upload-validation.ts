/**
 * lib/enterprise-hub/upload-validation.ts — the website's
 * lib/upload-validation.ts rules (extensions, MIME agreement, size caps) and
 * strings, applied to what a native picker hands back (file name / URI, size,
 * optional MIME) instead of a browser `File`. Pure — no React Native imports.
 */

export const IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'gif', 'webp'] as const;
const IMAGE_MIMES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'] as const;
export const VIDEO_EXTENSIONS = ['mp4', 'mov', 'webm'] as const;
const VIDEO_MIMES = ['video/mp4', 'video/quicktime', 'video/webm'] as const;
export const DOC_EXTENSIONS = ['pdf', 'doc', 'docx', 'xls', 'xlsx'] as const;
const DOC_MIMES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
] as const;

// Extension → expected MIME mapping, so a renamed file whose picker-reported
// type disagrees with its extension is rejected like on the web.
const EXT_MIME_MAP: Record<string, readonly string[]> = {
  pdf: ['application/pdf'],
  doc: ['application/msword'],
  docx: ['application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
  xls: ['application/vnd.ms-excel'],
  xlsx: ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
  jpg: ['image/jpeg'],
  jpeg: ['image/jpeg'],
  png: ['image/png'],
  gif: ['image/gif'],
  webp: ['image/webp'],
  mp4: ['video/mp4'],
  mov: ['video/quicktime'],
  webm: ['video/webm'],
};

export const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB
export const MAX_DOC_SIZE = 10 * 1024 * 1024; // 10MB
// Must stay in sync with the enterprise-videos bucket file_size_limit.
export const MAX_VIDEO_SIZE = 100 * 1024 * 1024; // 100MB

/** What expo-image-picker / expo-document-picker tell us about a picked file. */
export interface PickedFile {
  /** File name or URI — only the extension is read. */
  name: string;
  /** Bytes; unknown (null/undefined) skips the size check. */
  size?: number | null;
  /** Picker-reported MIME; unknown skips the MIME checks. */
  mimeType?: string | null;
}

/** Lower-cased extension of a file name or URI, query string stripped. */
export function fileExtension(nameOrUri: string): string {
  const clean = nameOrUri.split('?')[0].split('#')[0];
  const last = clean.split('/').pop() ?? clean;
  const dot = last.lastIndexOf('.');
  return dot === -1 ? '' : last.slice(dot + 1).toLowerCase();
}

function mb(bytes: number): string {
  return (bytes / 1024 / 1024).toFixed(1);
}

function validate(
  file: PickedFile,
  allowedExts: readonly string[],
  allowedMimes: readonly string[],
  maxSize: number,
  maxLabel: string,
): string | null {
  const ext = fileExtension(file.name);
  if (!ext || !allowedExts.includes(ext)) {
    return `Invalid file type. Allowed: ${allowedExts.join(', ')}`;
  }
  const mime = file.mimeType ?? null;
  if (mime) {
    if (!allowedMimes.includes(mime)) return `Invalid file type: ${mime}`;
    const expected = EXT_MIME_MAP[ext];
    if (expected && !expected.includes(mime)) return 'File extension does not match its content type.';
  }
  if (file.size != null && file.size > maxSize) {
    return `File too large. Maximum size: ${maxLabel} (yours: ${mb(file.size)}MB)`;
  }
  return null;
}

/** Null when valid; otherwise the website's error string. */
export function validateImageFile(file: PickedFile): string | null {
  return validate(file, IMAGE_EXTENSIONS, IMAGE_MIMES, MAX_IMAGE_SIZE, '5MB');
}

export function validateVideoFile(file: PickedFile): string | null {
  return validate(file, VIDEO_EXTENSIONS, VIDEO_MIMES, MAX_VIDEO_SIZE, '100MB');
}

export function validateDocFile(file: PickedFile): string | null {
  return validate(file, DOC_EXTENSIONS, DOC_MIMES, MAX_DOC_SIZE, '10MB');
}

/** Content-Type for a storage upload from the extension (the picker MIME wins when present). */
export function contentTypeFor(ext: string, mimeType?: string | null): string {
  if (mimeType) return mimeType;
  const known = EXT_MIME_MAP[ext];
  if (known && known.length > 0) return known[0];
  return 'application/octet-stream';
}
