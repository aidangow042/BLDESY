import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'bldesy_recent_profiles';
const MAX_ITEMS = 10;

export type RecentProfile = {
  id: string;
  business_name: string;
  trade_category: string;
  suburb: string;
  profile_photo_url: string | null;
  timestamp: number;
};

/** Get all recently viewed profiles, newest first. */
export async function getRecentProfiles(): Promise<RecentProfile[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/** Add a profile to recent views (deduplicates by id). */
export async function addRecentProfile(profile: Omit<RecentProfile, 'timestamp'>): Promise<void> {
  try {
    const history = await getRecentProfiles();
    const filtered = history.filter((p) => p.id !== profile.id);
    filtered.unshift({ ...profile, timestamp: Date.now() });
    await AsyncStorage.setItem(KEY, JSON.stringify(filtered.slice(0, MAX_ITEMS)));
  } catch {
    // Silently fail
  }
}
