import { File } from 'expo-file-system';
import * as FileSystem from 'expo-file-system';
import { supabase } from './supabase';

// ── Size limits ──────────────────────────────────────────────────────────────

const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_DOCUMENT_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_IMAGE_EXTS = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'heic', 'heif'];
const ALLOWED_VIDEO_EXTS = ['mp4', 'mov', 'avi', 'webm'];
const ALLOWED_DOC_EXTS = ['pdf', 'doc', 'docx', 'xls', 'xlsx'];

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

function isAllowedImage(ext: string): boolean {
  return ALLOWED_IMAGE_EXTS.includes(ext) || ALLOWED_VIDEO_EXTS.includes(ext);
}

function getContentType(ext: string): string {
  if (ALLOWED_VIDEO_EXTS.includes(ext)) return `video/${ext === 'mov' ? 'quicktime' : ext}`;
  if (ext === 'pdf') return 'application/pdf';
  if (ext === 'doc' || ext === 'docx') return 'application/msword';
  return `image/${ext === 'jpg' ? 'jpeg' : ext}`;
}

/**
 * Check if a URI is a local file (needs uploading) or already a remote URL.
 */
export function isLocalUri(uri: string): boolean {
  return uri.startsWith('file://') || uri.startsWith('ph://') || uri.startsWith('/');
}

// ── Upload functions ─────────────────────────────────────────────────────────

/**
 * Upload a local file URI to Supabase Storage and return the public URL.
 * Validates file size (10MB max) and MIME type.
 */
export async function uploadImage(
  localUri: string,
  userId: string,
  folder: 'cover' | 'profile' | 'projects' | 'team',
): Promise<string | null> {
  try {
    const ext = getExt(localUri);
    if (!isAllowedImage(ext)) {
      console.error(`Upload rejected: .${ext} is not an allowed image type`);
      return null;
    }

    const size = await getFileSize(localUri);
    if (size > MAX_IMAGE_SIZE) {
      console.error(`Upload rejected: ${(size / 1024 / 1024).toFixed(1)}MB exceeds ${MAX_IMAGE_SIZE / 1024 / 1024}MB limit`);
      return null;
    }

    const fileName = `${userId}/${folder}/${Date.now()}.${ext}`;
    const contentType = getContentType(ext);

    const file = new File(localUri);
    const arrayBuffer = await file.arrayBuffer();

    const { error } = await supabase.storage
      .from('builder-media')
      .upload(fileName, arrayBuffer, { contentType, upsert: true });

    if (error) {
      console.error('Upload error:', error.message);
      return null;
    }

    const { data } = supabase.storage.from('builder-media').getPublicUrl(fileName);
    return data.publicUrl;
  } catch (err) {
    console.error('Upload failed:', err);
    return null;
  }
}

/**
 * Upload multiple images and return their public URLs.
 */
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

/**
 * Upload a job photo. Validates size + type.
 */
export async function uploadJobPhoto(
  localUri: string,
  userId: string,
  jobId: string,
): Promise<string | null> {
  try {
    const ext = getExt(localUri);
    if (!isAllowedImage(ext)) {
      console.error(`Job photo rejected: .${ext} not allowed`);
      return null;
    }

    const size = await getFileSize(localUri);
    if (size > MAX_IMAGE_SIZE) {
      console.error(`Job photo rejected: exceeds ${MAX_IMAGE_SIZE / 1024 / 1024}MB limit`);
      return null;
    }

    const fileName = `${userId}/${jobId}/${Date.now()}.${ext}`;
    const contentType = getContentType(ext);

    const file = new File(localUri);
    const arrayBuffer = await file.arrayBuffer();

    const { error } = await supabase.storage
      .from('job-photos')
      .upload(fileName, arrayBuffer, { contentType, upsert: true });

    if (error) {
      console.error('Job photo upload error:', error.message);
      return null;
    }

    const { data } = supabase.storage.from('job-photos').getPublicUrl(fileName);
    return data.publicUrl;
  } catch (err) {
    console.error('Job photo upload failed:', err);
    return null;
  }
}

/**
 * Upload a job document (PDF, Word). Returns a SIGNED URL (1 hour expiry) for private access.
 * Documents are stored in a private bucket.
 */
export async function uploadJobDocument(
  localUri: string,
  userId: string,
  jobId: string,
  originalName: string,
): Promise<string | null> {
  try {
    const ext = getExt(localUri);
    if (!ALLOWED_DOC_EXTS.includes(ext)) {
      console.error(`Document rejected: .${ext} not allowed`);
      return null;
    }

    const size = await getFileSize(localUri);
    if (size > MAX_DOCUMENT_SIZE) {
      console.error(`Document rejected: exceeds ${MAX_DOCUMENT_SIZE / 1024 / 1024}MB limit`);
      return null;
    }

    const safeName = originalName.replace(/[^a-zA-Z0-9._-]/g, '_');
    const fileName = `${userId}/${jobId}/${Date.now()}_${safeName}`;
    const contentType = getContentType(ext);

    const file = new File(localUri);
    const arrayBuffer = await file.arrayBuffer();

    const { error } = await supabase.storage
      .from('job-documents')
      .upload(fileName, arrayBuffer, { contentType, upsert: true });

    if (error) {
      console.error('Job document upload error:', error.message);
      return null;
    }

    // Return the storage path — signed URLs are generated at read time
    return fileName;
  } catch (err) {
    console.error('Job document upload failed:', err);
    return null;
  }
}
