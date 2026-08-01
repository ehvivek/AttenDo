import { createClient } from '@supabase/supabase-js';
import { Preferences } from '@capacitor/preferences';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase credentials');
}

import { Capacitor } from '@capacitor/core';

/**
 * Hybrid storage adapter: writes to BOTH localStorage AND Capacitor Preferences on native.
 * Reads from Capacitor Preferences first (survives app kill), falls back to localStorage.
 * This guarantees persistence on every platform — web, Android, BlueStacks, etc.
 */
const persistentStorage = {
  getItem: async (key: string): Promise<string | null> => {
    if (Capacitor.isNativePlatform()) {
      try {
        const { value } = await Preferences.get({ key });
        if (value !== null) return value;
      } catch (_) {}
    }
    // Fallback to localStorage (Web)
    try {
      return localStorage.getItem(key);
    } catch (_) {
      return null;
    }
  },
  setItem: async (key: string, value: string): Promise<void> => {
    try { localStorage.setItem(key, value); } catch (_) {}
    if (Capacitor.isNativePlatform()) {
      try { await Preferences.set({ key, value }); } catch (_) {}
    }
  },
  removeItem: async (key: string): Promise<void> => {
    try { localStorage.removeItem(key); } catch (_) {}
    if (Capacitor.isNativePlatform()) {
      try { await Preferences.remove({ key }); } catch (_) {}
    }
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
