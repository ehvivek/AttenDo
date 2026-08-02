import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Capacitor } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';
import type { Session, User as SupabaseUser } from '@supabase/supabase-js';

const SESSION_KEY = 'attendo-session-tokens';

export interface User {
  id: string;
  email: string;
  role: 'student' | 'admin';
  fullName?: string;
  rollNumber?: string;
  batch?: string;
  createdAt: string;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * Save session tokens to Capacitor Preferences (Android SharedPreferences).
 * This is our own manual backup — completely independent from Supabase's
 * internal storage mechanism. SharedPreferences persists across app restarts.
 */
async function saveSessionToNative(session: Session) {
  if (!Capacitor.isNativePlatform()) return;
  try {
    await Preferences.set({
      key: SESSION_KEY,
      value: JSON.stringify({
        access_token: session.access_token,
        refresh_token: session.refresh_token,
      }),
    });
  } catch (_) {
    // Silent fail — not critical, localStorage is primary
  }
}

/**
 * Clear saved session from Capacitor Preferences.
 */
async function clearNativeSession() {
  if (!Capacitor.isNativePlatform()) return;
  try {
    await Preferences.remove({ key: SESSION_KEY });
  } catch (_) {}
}

/**
 * Try to restore session from Capacitor Preferences.
 * If tokens exist, calls supabase.auth.setSession() which validates
 * and refreshes them. Returns the restored session or null.
 */
async function restoreSessionFromNative(): Promise<Session | null> {
  if (!Capacitor.isNativePlatform()) return null;
  try {
    const { value } = await Preferences.get({ key: SESSION_KEY });
    if (!value) return null;

    const { access_token, refresh_token } = JSON.parse(value);
    if (!access_token || !refresh_token) return null;

    // setSession validates and refreshes the tokens with Supabase
    const { data, error } = await supabase.auth.setSession({
      access_token,
      refresh_token,
    });

    if (error || !data.session) {
      // Tokens are invalid/expired — clean up
      await clearNativeSession();
      return null;
    }

    return data.session;
  } catch (_) {
    return null;
  }
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const initAuth = async () => {
      // Step 1: Try Supabase's built-in getSession (uses localStorage)
      const { data: { session: existingSession } } = await supabase.auth.getSession();

      if (existingSession?.user) {
        if (isMounted) {
          setSession(existingSession);
          fetchUserProfile(existingSession.user);
          // Also save to native as backup
          saveSessionToNative(existingSession);
        }
        return;
      }

      // Step 2: localStorage was empty — try restoring from Capacitor Preferences
      // This handles the case where the WebView cleared localStorage on restart
      const restoredSession = await restoreSessionFromNative();
      if (restoredSession?.user && isMounted) {
        setSession(restoredSession);
        fetchUserProfile(restoredSession.user);
        return;
      }

      // Step 3: No session anywhere — user needs to log in
      if (isMounted) {
        setLoading(false);
      }
    };

    // Listen for future auth changes (login, logout, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!isMounted) return;

      setSession(session);
      if (session?.user) {
        fetchUserProfile(session.user);
        // Persist to native storage on every auth change
        saveSessionToNative(session);
      } else {
        setUser(null);
        setLoading(false);
        // ONLY clear if the user explicitly signed out.
        // If it's just the INITIAL_SESSION event with a null session (because localStorage
        // was empty on app start), we MUST NOT clear the backup!
        if (event === 'SIGNED_OUT') {
          clearNativeSession();
        }
      }
    });

    initAuth();

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const fetchUserProfile = async (authUser: SupabaseUser) => {
    // Determine role and additional details based on metadata or hardcoded logic
    let role: 'student' | 'admin' = authUser.user_metadata?.role === 'admin' ? 'admin' : 'student';
    let fullName = authUser.user_metadata?.full_name || '';
    let rollNumber = authUser.user_metadata?.roll_number || '';
    let batch = authUser.user_metadata?.batch || 'D1';

    // Fallback hardcoded admin mapping
    if (authUser.email?.toLowerCase() === 'vivek67@attendo.com') {
      role = 'admin';
      fullName = 'Admin Vivek';
    }

    setUser({
      id: authUser.id,
      email: authUser.email!,
      role,
      fullName,
      rollNumber,
      batch,
      createdAt: authUser.created_at
    });
    
    setLoading(false);
  };

  const logout = async () => {
    await clearNativeSession();
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      session, 
      loading, 
      logout, 
      isAuthenticated: !!user,
      isAdmin: user?.role === 'admin'
    }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
