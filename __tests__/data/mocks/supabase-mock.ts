/**
 * Test double for @/lib/supabase. The pure helpers under test never touch the
 * client; this only stops the real module (react-native-url-polyfill,
 * expo-secure-store, react-native) from loading in vitest.
 */
export const db = {} as never;
export const supabase = {} as never;
