import { createClient } from '@supabase/supabase-js';
import { Preferences } from '@capacitor/preferences';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase credentials');
}

/**
 * Hybrid storage adapter: writes to BOTH localStorage AND Capacitor Preferences.
 * Reads from Capacitor Preferences first (survives app kill), falls back to localStorage.
 * This guarantees persistence on every platform — web, Android, BlueStacks, etc.
 */
const persistentStorage = {
  getItem: async (key: string): Promise<string | null> => {
    try {
      // Try Capacitor Preferences first (survives app kill on Android)
      const { value } = await Preferences.get({ key });
      if (value !== null) {
        // Sync back to localStorage for fast subsequent reads
        try { localStorage.setItem(key, value); } catch (_) { /* ignore */ }
        return value;
      }
    } catch (_) {
      // Capacitor Preferences not available, fall through
    }
    // Fallback to localStorage
    try {
      return localStorage.getItem(key);
    } catch (_) {
      return null;
    }
  },
  setItem: async (key: string, value: string): Promise<void> => {
    // Write to BOTH storages for maximum reliability
    try { localStorage.setItem(key, value); } catch (_) { /* ignore */ }
    try { await Preferences.set({ key, value }); } catch (_) { /* ignore */ }
  },
  removeItem: async (key: string): Promise<void> => {
    try { localStorage.removeItem(key); } catch (_) { /* ignore */ }
    try { await Preferences.remove({ key }); } catch (_) { /* ignore */ }
  },
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: persistentStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
