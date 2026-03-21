/**
 * Persists recent AI chat searches in AsyncStorage so the AI Assist
 * screen can show personalised suggestion chips.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'bldesy_search_history';
const MAX_ITEMS = 10;

export type SearchEntry = {
  trade: string;
  location: string | null;
  timestamp: number;
};

/** Get all stored searches, newest first. */
export async function getSearchHistory(): Promise<SearchEntry[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/** Add a search entry (deduplicates by trade+location). */
export async function addSearchEntry(trade: string, location: string | null): Promise<void> {
  try {
    const history = await getSearchHistory();
    // Remove existing duplicate
    const filtered = history.filter(
      (e) => !(e.trade.toLowerCase() === trade.toLowerCase() && e.location?.toLowerCase() === location?.toLowerCase()),
    );
    // Prepend new entry
    filtered.unshift({ trade, location, timestamp: Date.now() });
    // Trim to max
    await AsyncStorage.setItem(KEY, JSON.stringify(filtered.slice(0, MAX_ITEMS)));
  } catch {
    // Silently fail — not critical
  }
}
