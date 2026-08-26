"use client";

import React, { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from './supabase';
import { useRouter } from 'next/navigation';

export interface UserProfile {
  id: string;
  email: string;
  institution_name: string;
  subscription_status: string;
  subscription_start_date: string | null;
  subscription_end_date: string | null;
  download_count: number;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: UserProfile | null;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (institutionName: string, email: string, password: string) => Promise<{ error: Error | null; needsEmailConfirmation?: boolean }>;
  signOut: () => Promise<void>;
  updateProfile: (updated: Partial<UserProfile>) => Promise<{ error: Error | null }>;
  recordDownload: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  const fetchProfile = useCallback(async (currentUser: User) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', currentUser.id)
        .maybeSingle();

      if (data) {
        setProfile({
          id: data.id,
          email: data.email || currentUser.email || '',
          institution_name: data.institution_name || (currentUser.user_metadata?.institution_name as string) || 'Institution',
          subscription_status: data.subscription_status || 'Free Access',
          subscription_start_date: data.subscription_start_date || data.created_at || new Date().toISOString(),
          subscription_end_date: data.subscription_end_date || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          download_count: data.download_count ?? 0,
        });
      } else {
        // Fallback default profile
        const defaultProfile: UserProfile = {
          id: currentUser.id,
          email: currentUser.email || '',
          institution_name: (currentUser.user_metadata?.institution_name as string) || 'Institution',
          subscription_status: 'Free Access',
          subscription_start_date: new Date().toISOString(),
          subscription_end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          download_count: 0,
        };
        setProfile(defaultProfile);
        // Persist default row in database
        await supabase.from('profiles').upsert(defaultProfile);
      }
    } catch (err) {
      console.error('Error fetching profile:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    // Initial session load
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user);
      } else {
        setIsLoading(false);
      }
    });

    // Auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user);
      } else {
        setProfile(null);
        setIsLoading(false);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [fetchProfile]);

  const signIn = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        return { error };
      }

      if (data.user) {
        setUser(data.user);
        setSession(data.session);
        await fetchProfile(data.user);
      }

      return { error: null };
    } catch (err: any) {
      return { error: err };
    }
  };

  const signUp = async (institutionName: string, email: string, password: string) => {
    try {
      const trimmedInst = institutionName.trim();
      const trimmedEmail = email.trim();

      const { data, error } = await supabase.auth.signUp({
        email: trimmedEmail,
        password,
        options: {
          data: {
            institution_name: trimmedInst,
          },
        },
      });

      if (error) {
        return { error };
      }

      if (data.user) {
        const now = new Date();
        const endDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

        const newProfileData: UserProfile = {
          id: data.user.id,
          email: trimmedEmail,
          institution_name: trimmedInst,
          subscription_status: 'Free Access',
          subscription_start_date: now.toISOString(),
          subscription_end_date: endDate.toISOString(),
          download_count: 0,
        };

        if (data.session) {
          setUser(data.user);
          setSession(data.session);
          await supabase.from('profiles').upsert(newProfileData);
          setProfile(newProfileData);
          return { error: null, needsEmailConfirmation: false };
        } else {
          return { error: null, needsEmailConfirmation: true };
        }
      }

      return { error: null };
    } catch (err: any) {
      return { error: err };
    }
  };

  const updateProfile = async (updated: Partial<UserProfile>) => {
    if (!user) return { error: new Error('User not logged in') };
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ ...updated, updated_at: new Date().toISOString() })
        .eq('id', user.id);

      if (error) return { error };

      setProfile(prev => prev ? { ...prev, ...updated } : null);
      return { error: null };
    } catch (err: any) {
      return { error: err };
    }
  };

  const recordDownload = async () => {
    if (!user) return;
    try {
      setProfile(prev => prev ? { ...prev, download_count: prev.download_count + 1 } : null);
      await supabase.rpc('increment_download_count', { user_id: user.id });
    } catch (err) {
      console.error('Failed to increment download count:', err);
    }
  };

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
      setUser(null);
      setSession(null);
      setProfile(null);
      router.push('/');
    } catch (err) {
      console.error('Error signing out:', err);
      router.push('/');
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      session,
      profile,
      isLoading,
      signIn,
      signUp,
      signOut,
      updateProfile,
      recordDownload,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
