/**
 * AI consent — persists whether the user has acknowledged that their input is
 * sent to a third-party AI provider (Anthropic / Claude) before any AI feature
 * runs (chat, "write it for me"). Required for App Store review (third-party
 * data sharing must be disclosed + consented before the data leaves the app).
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

// Bump the version suffix if the disclosure materially changes — re-prompts.
const KEY = 'bldesy_ai_consent_v1';

export async function hasAiConsent(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(KEY)) === 'true';
  } catch {
    return false;
  }
}

export async function setAiConsent(): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, 'true');
  } catch {
    // Non-fatal: worst case we re-prompt next time.
  }
}

export async function clearAiConsent(): Promise<void> {
  try {
    await AsyncStorage.removeItem(KEY);
  } catch {
    // Non-fatal.
  }
}
