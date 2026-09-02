/**
 * Native stand-ins for the edit-profile page's hidden `<input type="file">`s.
 * Both resolve to a local URI or null when the tradie cancels.
 */
import * as ImagePicker from 'expo-image-picker';

/** The website's `Upload failed: …` line without a storage message to quote. */
export const UPLOAD_FAILED = 'Upload failed. Please try again.';

export async function pickImage(): Promise<string | null> {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    quality: 0.85,
    selectionLimit: 1,
  });
  if (result.canceled || !result.assets[0]) return null;
  return result.assets[0].uri;
}

export async function pickVideo(): Promise<string | null> {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['videos'],
    selectionLimit: 1,
  });
  if (result.canceled || !result.assets[0]) return null;
  return result.assets[0].uri;
}
