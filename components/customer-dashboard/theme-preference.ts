/**
 * Appearance preference IO — persists the Settings radio to AsyncStorage
 * (`bldesy_theme`) and applies it through `Appearance.setColorScheme`, which
 * every `useColorScheme()` consumer honours. `applyStoredThemePreference()` is
 * the one-liner the root layout should call on launch so the choice survives
 * restarts (app/_layout.tsx is owned elsewhere — see the port report).
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Appearance } from 'react-native';

import { THEME_PREFERENCE_KEY, parseThemePreference, type ThemePreference } from './settings-model';

export function applyThemePreference(preference: ThemePreference): void {
  Appearance.setColorScheme(preference === 'system' ? null : preference);
}

export async function loadThemePreference(): Promise<ThemePreference> {
  try {
    return parseThemePreference(await AsyncStorage.getItem(THEME_PREFERENCE_KEY));
  } catch {
    return 'system';
  }
}

export async function saveThemePreference(preference: ThemePreference): Promise<void> {
  try {
    await AsyncStorage.setItem(THEME_PREFERENCE_KEY, preference);
  } catch {
    // Storage unavailable — the in-session override still applies.
  }
}

export async function applyStoredThemePreference(): Promise<ThemePreference> {
  const preference = await loadThemePreference();
  applyThemePreference(preference);
  return preference;
}
