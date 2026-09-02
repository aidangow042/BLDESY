/**
 * lib/enterprise-hub/media.ts — uploads for the Enterprise Hub.
 *
 * Mirrors the `uploadFile` helpers in ~/bldesy-web/app/enterprise/edit-profile/
 * page.tsx and jobs/[id]/edit/page.tsx: images + documents go to the
 * `enterprise-media` bucket at `${userId}/${folder}-${Date.now()}.${ext}` and
 * are queued for AI moderation; project videos go to `enterprise-videos`
 * (100MB, video MIMEs only) so the image/doc rules stay tight. No poster frame
 * is captured on device, so `poster` is null.
 *
 * Validation (type / size, the website's strings) happens in the screen with
 * `lib/enterprise-hub/upload-validation.ts` before calling these.
 */
import { File } from 'expo-file-system';

import { queueMediaModeration } from '@/lib/data/profile-edit';
import { supabase } from '@/lib/supabase';
import type { ProjectVideo } from '@/types/database';

import { contentTypeFor, fileExtension } from './upload-validation';

export const ENTERPRISE_MEDIA_BUCKET = 'enterprise-media';
export const ENTERPRISE_VIDEOS_BUCKET = 'enterprise-videos';

export type EnterpriseMediaFolder = 'logo' | 'cover' | `project-${number}` | 'job-photo' | 'job-doc';

export interface UploadedEnterpriseMedia {
  url: string;
  /** Object path inside the bucket (what the moderation queue keys on). */
  path: string;
}

/** `${userId}/${folder}-${stamp}.${ext}` — the website's object-path convention. */
export function enterpriseMediaPath(userId: string, folder: string, ext: string, stamp: number = Date.now()): string {
  return `${userId}/${folder}-${stamp}.${ext}`;
}

async function readBytes(localUri: string): Promise<ArrayBuffer> {
  const file = new File(localUri);
  return file.arrayBuffer();
}

/**
 * Upload an image or document to enterprise-media and queue moderation.
 * Throws with the storage error message (the pages render `Upload failed: …`).
 */
export async function uploadEnterpriseMedia(
  localUri: string,
  userId: string,
  folder: EnterpriseMediaFolder,
  mimeType?: string | null,
): Promise<UploadedEnterpriseMedia> {
  const ext = fileExtension(localUri) || 'jpg';
  const path = enterpriseMediaPath(userId, folder, ext);
  const bytes = await readBytes(localUri);
  const { error } = await supabase.storage
    .from(ENTERPRISE_MEDIA_BUCKET)
    .upload(path, bytes, { upsert: true, contentType: contentTypeFor(ext, mimeType) });
  if (error) throw new Error(error.message);
  queueMediaModeration('enterprise-media', path);
  const { data } = supabase.storage.from(ENTERPRISE_MEDIA_BUCKET).getPublicUrl(path);
  return { url: data.publicUrl, path };
}

/**
 * Upload a past-project video to enterprise-videos. Poster frames are not
 * captured on device, so `poster` is null. Throws with the storage message.
 */
export async function uploadEnterpriseVideo(
  localUri: string,
  userId: string,
  projectIndex: number,
  mimeType?: string | null,
): Promise<ProjectVideo> {
  const ext = fileExtension(localUri) || 'mp4';
  const path = `${userId}/project-${projectIndex}-video-${Date.now()}.${ext}`;
  const bytes = await readBytes(localUri);
  const { error } = await supabase.storage
    .from(ENTERPRISE_VIDEOS_BUCKET)
    .upload(path, bytes, { upsert: true, contentType: contentTypeFor(ext, mimeType) });
  if (error) throw new Error(error.message);
  const { data } = supabase.storage.from(ENTERPRISE_VIDEOS_BUCKET).getPublicUrl(path);
  return { url: data.publicUrl, poster: null };
}
