import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { Session, User as SupabaseUser } from '@supabase/supabase-js';

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

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Listen for auth changes FIRST (Supabase best practice)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session?.user) {
        fetchUserProfile(session.user);
      } else {
        setUser(null);
        setLoading(false);
      }
    });

    // Get initial session
    // On native platforms, Capacitor Preferences is async and needs a moment
    // to read from disk. We warm it up first to avoid a race condition where
    // getSession() returns null before storage has loaded the saved tokens.
    const initSession = async () => {
      try {
        // Warm up native storage by reading the Supabase auth key
        // This ensures Preferences has loaded before getSession reads it
        const { Capacitor } = await import('@capacitor/core');
        if (Capacitor.isNativePlatform()) {
          const { Preferences } = await import('@capacitor/preferences');
          await Preferences.get({ key: 'sb-hfpunlwbzrscunpajjcl-auth-token' });
        }
      } catch (_) {
        // Ignore - non-native or plugin not available
      }
      
      const { data: { session } } = await supabase.auth.getSession();
      // Only update if onAuthStateChange hasn't already fired
      if (session?.user) {
        setSession(session);
        fetchUserProfile(session.user);
      } else {
        setLoading(false);
      }
    };
    
    initSession();

    return () => subscription.unsubscribe();
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
