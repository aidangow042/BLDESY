import { File } from 'expo-file-system';
import * as FileSystem from 'expo-file-system';
import { supabase } from './supabase';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const IMAGE_EXTS = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'heic', 'heif'];
const VIDEO_EXTS = ['mp4', 'mov', 'avi', 'webm'];
const DOC_EXTS = ['pdf', 'doc', 'docx', 'xls', 'xlsx'];
const MEDIA_EXTS = [...IMAGE_EXTS, ...VIDEO_EXTS];

// ── Helpers ──────────────────────────────────────────────────────────────────

async function getFileSize(uri: string): Promise<number> {
  try {
    const info = await FileSystem.getInfoAsync(uri);
    return (info as any)?.size ?? 0;
  } catch {
    return 0;
  }
}

function getExt(uri: string): string {
  return (uri.split('.').pop()?.toLowerCase() ?? 'jpg').split('?')[0];
}

function getContentType(ext: string): string {
  if (VIDEO_EXTS.includes(ext)) return `video/${ext === 'mov' ? 'quicktime' : ext}`;
  if (ext === 'pdf') return 'application/pdf';
  if (ext === 'doc' || ext === 'docx') return 'application/msword';
  return `image/${ext === 'jpg' ? 'jpeg' : ext}`;
}

/** Check if a URI is a local file (needs uploading) or already a remote URL. */
export function isLocalUri(uri: string): boolean {
  return uri.startsWith('file://') || uri.startsWith('ph://') || uri.startsWith('/');
}

// ── Core upload ──────────────────────────────────────────────────────────────

type UploadConfig = {
  bucket: string;
  allowedExts: string[];
  /** Storage path within the bucket. */
  filePath: string;
  /** If true, return the storage path instead of a public URL (for private buckets). */
  returnPath?: boolean;
};

async function uploadFile(localUri: string, config: UploadConfig): Promise<string | null> {
  try {
    const ext = getExt(localUri);
    if (!config.allowedExts.includes(ext)) {
      console.error(`Upload rejected: .${ext} not allowed for ${config.bucket}`);
      return null;
    }

    const size = await getFileSize(localUri);
    if (size > MAX_FILE_SIZE) {
      console.error(`Upload rejected: ${(size / 1024 / 1024).toFixed(1)}MB exceeds 10MB limit`);
      return null;
    }

    const file = new File(localUri);
    const arrayBuffer = await file.arrayBuffer();

    const { error } = await supabase.storage
      .from(config.bucket)
      .upload(config.filePath, arrayBuffer, {
        contentType: getContentType(ext),
        upsert: true,
      });

    if (error) {
      console.error(`Upload error (${config.bucket}):`, error.message);
      return null;
    }

    if (config.returnPath) return config.filePath;

    const { data } = supabase.storage.from(config.bucket).getPublicUrl(config.filePath);
    return data.publicUrl;
  } catch (err) {
    console.error(`Upload failed (${config.bucket}):`, err);
    return null;
  }
}

// ── Public API (same signatures as before) ───────────────────────────────────

export async function uploadImage(
  localUri: string,
  userId: string,
  folder: 'cover' | 'profile' | 'projects' | 'team',
): Promise<string | null> {
  const ext = getExt(localUri);
  return uploadFile(localUri, {
    bucket: 'builder-media',
    allowedExts: MEDIA_EXTS,
    filePath: `${userId}/${folder}/${Date.now()}.${ext}`,
  });
}

export async function uploadImages(
  localUris: string[],
  userId: string,
  folder: 'cover' | 'profile' | 'projects' | 'team',
): Promise<string[]> {
  const results = await Promise.all(
    localUris.map(uri => uploadImage(uri, userId, folder)),
  );
  return results.filter((url): url is string => url !== null);
}

export async function uploadJobPhoto(
  localUri: string,
  userId: string,
  jobId: string,
): Promise<string | null> {
  const ext = getExt(localUri);
  return uploadFile(localUri, {
    bucket: 'job-photos',
    allowedExts: MEDIA_EXTS,
    filePath: `${userId}/${jobId}/${Date.now()}.${ext}`,
  });
}

export async function uploadJobDocument(
  localUri: string,
  userId: string,
  jobId: string,
  originalName: string,
): Promise<string | null> {
  const safeName = originalName.replace(/[^a-zA-Z0-9._-]/g, '_');
  return uploadFile(localUri, {
    bucket: 'job-documents',
    allowedExts: DOC_EXTS,
    filePath: `${userId}/${jobId}/${Date.now()}_${safeName}`,
    returnPath: true,
  });
}
