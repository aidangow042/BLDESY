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
