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
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user) {
        fetchUserProfile(session.user);
      } else {
        setLoading(false);
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session?.user) {
        fetchUserProfile(session.user);
      } else {
        setUser(null);
        setLoading(false);
      }
    });

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
