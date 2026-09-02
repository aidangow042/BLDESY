/**
 * Native file pickers for the Enterprise Hub uploads — the app twin of the
 * hidden `<input type="file">` elements on the website's edit pages. Each
 * returns a normalised `{ uri, name, size, mimeType }` (or null when
 * cancelled) so screens can run lib/enterprise-hub/upload-validation.ts with
 * the website's strings before uploading.
 */
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';

import { fileExtension } from '@/lib/enterprise-hub/upload-validation';

export interface PickedAsset {
  uri: string;
  /** File name (falls back to the URI's last segment). */
  name: string;
  size: number | null;
  mimeType: string | null;
}

function nameFromUri(uri: string): string {
  const clean = uri.split('?')[0];
  return clean.split('/').pop() || `upload.${fileExtension(uri) || 'bin'}`;
}

/** Pick one image from the photo library (`accept="image/*"`). */
export async function pickImage(): Promise<PickedAsset | null> {
  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) return null;
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsMultipleSelection: false,
    quality: 0.9,
  });
  if (result.canceled || result.assets.length === 0) return null;
  const asset = result.assets[0];
  return {
    uri: asset.uri,
    name: asset.fileName ?? nameFromUri(asset.uri),
    size: asset.fileSize ?? null,
    mimeType: asset.mimeType ?? null,
  };
}

/** Pick one video (`accept="video/mp4,video/quicktime,video/webm"`). */
export async function pickVideo(): Promise<PickedAsset | null> {
  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) return null;
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['videos'],
    allowsMultipleSelection: false,
  });
  if (result.canceled || result.assets.length === 0) return null;
  const asset = result.assets[0];
  return {
    uri: asset.uri,
    name: asset.fileName ?? nameFromUri(asset.uri),
    size: asset.fileSize ?? null,
    mimeType: asset.mimeType ?? null,
  };
}

const DOC_MIME_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
];

/** Pick one document (`accept=".pdf,.doc,.docx,.xls,.xlsx"`). */
export async function pickDocument(): Promise<PickedAsset | null> {
  const result = await DocumentPicker.getDocumentAsync({
    type: DOC_MIME_TYPES,
    multiple: false,
    copyToCacheDirectory: true,
  });
  if (result.canceled || result.assets.length === 0) return null;
  const asset = result.assets[0];
  return {
    uri: asset.uri,
    name: asset.name || nameFromUri(asset.uri),
    size: asset.size ?? null,
    mimeType: asset.mimeType ?? null,
  };
}
