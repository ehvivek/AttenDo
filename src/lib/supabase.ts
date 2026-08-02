import { createClient } from '@supabase/supabase-js';
import { Capacitor } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase credentials');
}

/**
 * Unified storage adapter that safely checks platform at RUNTIME.
 * If we check Capacitor.isNativePlatform() at module load time, it might return false
 * before Capacitor is fully initialized, falling back to localStorage (which gets wiped).
 */
const unifiedStorage = {
  getItem: async (key: string): Promise<string | null> => {
    if (Capacitor.isNativePlatform()) {
      try {
        const { value } = await Preferences.get({ key });
        return value;
      } catch (_) {
        return null;
      }
    }
    return window.localStorage.getItem(key);
  },
  setItem: async (key: string, value: string): Promise<void> => {
    if (Capacitor.isNativePlatform()) {
      try { await Preferences.set({ key, value }); } catch (_) {}
    } else {
      window.localStorage.setItem(key, value);
    }
  },
  removeItem: async (key: string): Promise<void> => {
    if (Capacitor.isNativePlatform()) {
      try { await Preferences.remove({ key }); } catch (_) {}
    } else {
      window.localStorage.removeItem(key);
    }
  },
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: unifiedStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false, // Prevents deep-link auth resets on native
  },
});
