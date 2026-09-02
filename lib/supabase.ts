import 'react-native-url-polyfill/auto'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'
import * as SecureStore from 'expo-secure-store'
import { Platform } from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!

/**
 * SecureStore adapter with chunking for values > 2048 bytes.
 * Falls back to AsyncStorage on web (SecureStore is native-only).
 */
const CHUNK_SIZE = 2048

const SecureStoreAdapter = {
  getItem: async (key: string): Promise<string | null> => {
    if (Platform.OS === 'web') return AsyncStorage.getItem(key)

    const value = await SecureStore.getItemAsync(key)
    if (value === null) return null

    // Check if this is a chunked value
    if (value.startsWith('__chunked__:')) {
      const count = parseInt(value.replace('__chunked__:', ''), 10)
      const chunks: string[] = []
      for (let i = 0; i < count; i++) {
        const chunk = await SecureStore.getItemAsync(`${key}_chunk_${i}`)
        if (chunk === null) return null
        chunks.push(chunk)
      }
      return chunks.join('')
    }

    return value
  },

  setItem: async (key: string, value: string): Promise<void> => {
    if (Platform.OS === 'web') {
      await AsyncStorage.setItem(key, value)
      return
    }

    if (value.length <= CHUNK_SIZE) {
      await SecureStore.setItemAsync(key, value)
      return
    }

    // Split into chunks
    const chunks: string[] = []
    for (let i = 0; i < value.length; i += CHUNK_SIZE) {
      chunks.push(value.slice(i, i + CHUNK_SIZE))
    }

    // Store chunk count as the main key
    await SecureStore.setItemAsync(key, `__chunked__:${chunks.length}`)
    for (let i = 0; i < chunks.length; i++) {
      await SecureStore.setItemAsync(`${key}_chunk_${i}`, chunks[i])
    }
  },

  removeItem: async (key: string): Promise<void> => {
    if (Platform.OS === 'web') {
      await AsyncStorage.removeItem(key)
      return
    }

    // Check if chunked and clean up chunks
    const value = await SecureStore.getItemAsync(key)
    if (value?.startsWith('__chunked__:')) {
      const count = parseInt(value.replace('__chunked__:', ''), 10)
      for (let i = 0; i < count; i++) {
        await SecureStore.deleteItemAsync(`${key}_chunk_${i}`)
      }
    }

    await SecureStore.deleteItemAsync(key)
  },
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: SecureStoreAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
})

/**
 * The SAME client instance, typed against the website's generated schema
 * (types/database.ts, mirrored by scripts/sync-web-libs.mjs). New code — every
 * module under lib/data/ and every rewritten screen — must use `db`, which
 * type-checks table/view names and columns (incl. the PII-safe views
 * public_builder_profiles / public_enterprise_profiles / public_profiles).
 * `supabase` stays untyped only for legacy screens awaiting their rewrite.
 */
export const db = supabase as unknown as SupabaseClient<Database>
