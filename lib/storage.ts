import { File } from 'expo-file-system';
import { supabase } from './supabase';

/**
 * Upload a local file URI to Supabase Storage and return the public URL.
 * Uses expo-file-system's File.arrayBuffer() for reliable React Native uploads.
 */
export async function uploadImage(
  localUri: string,
  userId: string,
  folder: 'cover' | 'profile' | 'projects' | 'team',
): Promise<string | null> {
  try {
    // Get file extension from URI
    const ext = localUri.split('.').pop()?.toLowerCase() ?? 'jpg';
    const fileName = `${userId}/${folder}/${Date.now()}.${ext}`;
    const videoExts = ['mp4', 'mov', 'avi', 'webm', 'mkv'];
    const contentType = videoExts.includes(ext)
      ? `video/${ext === 'mov' ? 'quicktime' : ext}`
      : `image/${ext === 'jpg' ? 'jpeg' : ext}`;

    // Read local file as ArrayBuffer using expo-file-system File API
    const file = new File(localUri);
    const arrayBuffer = await file.arrayBuffer();

    const { error } = await supabase.storage
      .from('builder-media')
      .upload(fileName, arrayBuffer, {
        contentType,
        upsert: true,
      });

    if (error) {
      console.error('Upload error:', error.message);
      return null;
    }

    // Get public URL
    const { data } = supabase.storage
      .from('builder-media')
      .getPublicUrl(fileName);

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
 * Check if a URI is a local file (needs uploading) or already a remote URL.
 */
export function isLocalUri(uri: string): boolean {
  return uri.startsWith('file://') || uri.startsWith('ph://') || uri.startsWith('/');
}

/**
 * Upload a job photo to the job-photos bucket. Returns the public URL or null.
 */
export async function uploadJobPhoto(
  localUri: string,
  userId: string,
  jobId: string,
): Promise<string | null> {
  try {
    const ext = localUri.split('.').pop()?.toLowerCase() ?? 'jpg';
    const fileName = `${userId}/${jobId}/${Date.now()}.${ext}`;
    const contentType = `image/${ext === 'jpg' ? 'jpeg' : ext}`;

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
 * Upload a job document (PDF) to the job-documents bucket. Returns the public URL or null.
 */
export async function uploadJobDocument(
  localUri: string,
  userId: string,
  jobId: string,
  originalName: string,
): Promise<string | null> {
  try {
    const ext = localUri.split('.').pop()?.toLowerCase() ?? 'pdf';
    const safeName = originalName.replace(/[^a-zA-Z0-9._-]/g, '_');
    const fileName = `${userId}/${jobId}/${Date.now()}_${safeName}`;
    const contentType = ext === 'pdf' ? 'application/pdf' : 'application/octet-stream';

    const file = new File(localUri);
    const arrayBuffer = await file.arrayBuffer();

    const { error } = await supabase.storage
      .from('job-documents')
      .upload(fileName, arrayBuffer, { contentType, upsert: true });

    if (error) {
      console.error('Job document upload error:', error.message);
      return null;
    }

    const { data } = supabase.storage.from('job-documents').getPublicUrl(fileName);
    return data.publicUrl;
  } catch (err) {
    console.error('Job document upload failed:', err);
    return null;
  }
}
