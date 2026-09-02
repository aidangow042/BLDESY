/**
 * Job / avatar media uploads for the homeowner surfaces.
 *
 * Ports of:
 *   ~/bldesy-web/lib/upload-validation.ts        (validateImageFile / validateDocFile — the
 *                                                  same allow-lists, caps and messages)
 *   ~/bldesy-web/components/jobs/job-wizard.tsx   (uploadJobFile: `enterprise-media` bucket,
 *                                                  `${user.id}/job-${type}-${Date.now()}.${ext}`,
 *                                                  then queueMediaModeration)
 *   ~/bldesy-web/components/dashboard/customer-profile-section.tsx
 *                                                 (avatar → `avatars/${userId}/avatar-${Date.now()}.${ext}`, upsert)
 *
 * Uploads go client-direct to Supabase Storage exactly as the website does
 * (owner folder inside the bucket — the moderation route requires it), then
 * the best-effort moderation beacon fires via lib/data/profile-edit.
 */
import { File } from 'expo-file-system';

import { queueMediaModeration, type ModeratedBucket } from '@/lib/data/profile-edit';
import { supabase } from '@/lib/supabase';

export const IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'gif', 'webp'] as const;
export const DOC_EXTENSIONS = ['pdf', 'doc', 'docx', 'xls', 'xlsx'] as const;
export const IMAGE_MIMES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'] as const;
export const DOC_MIMES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
] as const;

export const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5MB
export const MAX_DOC_BYTES = 10 * 1024 * 1024; // 10MB

const CONTENT_TYPES: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  gif: 'image/gif',
  webp: 'image/webp',
  pdf: 'application/pdf',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xls: 'application/vnd.ms-excel',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
};

/** A picked asset — expo-image-picker / expo-document-picker results share this subset. */
export interface PickedFile {
  uri: string;
  /** Original file name when the picker knows it (document picker always, image picker on iOS). */
  name?: string | null;
  size?: number | null;
  mimeType?: string | null;
}

/** Lower-case extension of a file name or URI, without a query string ("photo.JPG?x" → "jpg"). */
export function extensionOf(nameOrUri: string): string {
  const clean = nameOrUri.split('?')[0].split('#')[0];
  const last = clean.split('/').pop() ?? clean;
  const idx = last.lastIndexOf('.');
  return idx === -1 ? '' : last.slice(idx + 1).toLowerCase();
}

function fileExt(file: PickedFile): string {
  return extensionOf(file.name || file.uri);
}

function mb(bytes: number): string {
  return (bytes / 1024 / 1024).toFixed(1);
}

/** Website validateImageFile — null when acceptable, else the message to show. */
export function validateImageFile(file: PickedFile): string | null {
  const ext = fileExt(file);
  if (!ext || !(IMAGE_EXTENSIONS as readonly string[]).includes(ext)) {
    return `Invalid file type. Allowed: ${IMAGE_EXTENSIONS.join(', ')}`;
  }
  if (file.mimeType && !(IMAGE_MIMES as readonly string[]).includes(file.mimeType)) {
    return `Invalid file type: ${file.mimeType}`;
  }
  if (file.size != null && file.size > MAX_IMAGE_BYTES) {
    return `File too large. Maximum size: 5MB (yours: ${mb(file.size)}MB)`;
  }
  return null;
}

/** Website validateDocFile — null when acceptable, else the message to show. */
export function validateDocFile(file: PickedFile): string | null {
  const ext = fileExt(file);
  if (!ext || !(DOC_EXTENSIONS as readonly string[]).includes(ext)) {
    return `Invalid file type. Allowed: ${DOC_EXTENSIONS.join(', ')}`;
  }
  if (file.mimeType && !(DOC_MIMES as readonly string[]).includes(file.mimeType)) {
    return `Invalid file type: ${file.mimeType}`;
  }
  if (file.size != null && file.size > MAX_DOC_BYTES) {
    return `File too large. Maximum size: 10MB (yours: ${mb(file.size)}MB)`;
  }
  return null;
}

export function contentTypeFor(ext: string): string {
  return CONTENT_TYPES[ext] ?? 'application/octet-stream';
}

export type JobMediaType = 'photo' | 'doc';

/** The wizard's object path: `${userId}/job-${type}-${now}.${ext}`. */
export function jobMediaPath(userId: string, type: JobMediaType, ext: string, now: number = Date.now()): string {
  return `${userId}/job-${type}-${now}.${ext}`;
}

/** The customer profile's avatar path: `${userId}/avatar-${now}.${ext}`. */
export function avatarPath(userId: string, ext: string, now: number = Date.now()): string {
  return `${userId}/avatar-${now}.${ext}`;
}

export interface UploadResult {
  url: string;
  path: string;
}

/**
 * Upload a local file to a moderated bucket and queue the moderation pass.
 * Resolves null on any failure (unreadable file, storage error) — the website
 * treats a failed upload as "nothing was added".
 */
export async function uploadToBucket(
  bucket: ModeratedBucket,
  path: string,
  localUri: string,
  opts: { upsert?: boolean; maxBytes?: number } = {},
): Promise<UploadResult | null> {
  try {
    const file = new File(localUri);
    const bytes = await file.arrayBuffer();
    if (bytes.byteLength === 0) return null;
    if (opts.maxBytes != null && bytes.byteLength > opts.maxBytes) return null;

    const { error } = await supabase.storage.from(bucket).upload(path, bytes, {
      contentType: contentTypeFor(extensionOf(path)),
      upsert: opts.upsert ?? false,
    });
    if (error) {
      console.warn(`Upload error (${bucket}):`, error.message);
      return null;
    }

    queueMediaModeration(bucket, path);
    const { data } = supabase.storage.from(bucket).getPublicUrl(path);
    return { url: data.publicUrl, path };
  } catch (e) {
    console.warn(`Upload failed (${bucket}):`, e instanceof Error ? e.message : e);
    return null;
  }
}

/** The wizard's uploadJobFile: photos and documents both land in `enterprise-media`. */
export async function uploadJobMedia(
  file: PickedFile,
  userId: string,
  type: JobMediaType,
): Promise<string | null> {
  const ext = fileExt(file) || (type === 'photo' ? 'jpg' : 'pdf');
  const result = await uploadToBucket('enterprise-media', jobMediaPath(userId, type, ext), file.uri, {
    maxBytes: type === 'photo' ? MAX_IMAGE_BYTES : MAX_DOC_BYTES,
  });
  return result?.url ?? null;
}

/** The customer profile avatar upload (`avatars` bucket, upsert). */
export async function uploadAvatar(file: PickedFile, userId: string): Promise<UploadResult | null> {
  const ext = fileExt(file) || 'jpg';
  return uploadToBucket('avatars', avatarPath(userId, ext), file.uri, {
    upsert: true,
    maxBytes: MAX_IMAGE_BYTES,
  });
}
