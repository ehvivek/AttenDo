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
    let isMounted = true;
    let initialSessionHandled = false;

    // Because we use an ASYNC storage adapter (Capacitor Preferences) on native,
    // supabase.auth.getSession() will return null if called immediately on mount.
    // Instead, we MUST rely strictly on onAuthStateChange, which Supabase guarantees 
    // to fire with an 'INITIAL_SESSION' event once it has finished reading the async storage.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!isMounted) return;

      if (event === 'INITIAL_SESSION' || event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        initialSessionHandled = true;
        setSession(session);
        if (session?.user) {
          fetchUserProfile(session.user);
        } else {
          setUser(null);
          setLoading(false);
        }
      } else if (event === 'SIGNED_OUT') {
        setSession(null);
        setUser(null);
        setLoading(false);
      }
    });

    // Safety fallback: if for some reason INITIAL_SESSION never fires 
    // (e.g., Supabase client was already initialized before React mounted),
    // we can check getSession after a short delay.
    const fallbackTimer = setTimeout(async () => {
      if (!initialSessionHandled && isMounted) {
        const { data: { session } } = await supabase.auth.getSession();
        setSession(session);
        if (session?.user) {
          fetchUserProfile(session.user);
        } else {
          setUser(null);
          setLoading(false);
        }
      }
    }, 2000);

    return () => {
      isMounted = false;
      subscription.unsubscribe();
      clearTimeout(fallbackTimer);
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
