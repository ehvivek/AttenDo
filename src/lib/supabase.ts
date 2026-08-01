import { createClient } from '@supabase/supabase-js';
import { Preferences } from '@capacitor/preferences';
import { Capacitor } from '@capacitor/core';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase credentials');
}

/**
 * Custom storage adapter for Native (Android/iOS) using Capacitor Preferences.
 * We only use this on mobile because Web can just use window.localStorage directly
 * which is fully synchronous and avoids any async initialization race conditions.
 */
const nativeStorage = {
  getItem: async (key: string): Promise<string | null> => {
    try {
      const { value } = await Preferences.get({ key });
      return value;
    } catch (_) {
      return null;
    }
  },
  setItem: async (key: string, value: string): Promise<void> => {
    try { await Preferences.set({ key, value }); } catch (_) {}
  },
  removeItem: async (key: string): Promise<void> => {
    try { await Preferences.remove({ key }); } catch (_) {}
  },
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: Capacitor.isNativePlatform() ? nativeStorage : window.localStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
});
