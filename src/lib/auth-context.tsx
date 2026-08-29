"use client";

import React, { createContext, useContext, useEffect, useState, ReactNode, useCallback, useMemo } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from './supabase';
import { useRouter } from 'next/navigation';

export type SubscriptionStatus = 'Subscribed' | 'Unsubscribed' | 'Free Access';
export type DownloadCategory = 'master_roster' | 'individual_profile' | 'daywise_profile';

export interface DownloadQuota {
  master_roster: number;
  individual_profile: number;
  daywise_profile: number;
}

export const QUOTA_LIMITS: Record<DownloadCategory, number> = {
  master_roster: 3,
  individual_profile: 3,
  daywise_profile: 3,
};

export interface UserProfile {
  id: string;
  email: string;
  institution_name: string;
  subscription_status: SubscriptionStatus;
  subscription_start_date: string | null;
  subscription_end_date: string | null;
  download_count: number;
  master_roster_downloads: number;
  individual_profile_downloads: number;
  daywise_profile_downloads: number;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: UserProfile | null;
  isLoading: boolean;
  isSubscribed: boolean;
  isUnsubscribed: boolean;
  isFreeAccess: boolean;
  quota: DownloadQuota;
  canDownload: (category: DownloadCategory) => { allowed: boolean; remaining: number; current: number; max: number };
  recordCategoryDownload: (category: DownloadCategory, count?: number) => Promise<void>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (institutionName: string, email: string, password: string) => Promise<{ error: Error | null; needsEmailConfirmation?: boolean }>;
  signOut: () => Promise<void>;
  updateProfile: (updated: Partial<UserProfile>) => Promise<{ error: Error | null }>;
  recordDownload: () => Promise<void>;
}

export const DEFAULT_GUEST_PROFILE: UserProfile = {
  id: 'guest-session',
  email: 'guest@dutyflow.in',
  institution_name: 'Guest Profile',
  subscription_status: 'Free Access',
  subscription_start_date: new Date().toISOString(),
  subscription_end_date: null,
  download_count: 0,
  master_roster_downloads: 0,
  individual_profile_downloads: 0,
  daywise_profile_downloads: 0,
};

const getGuestProfile = (): UserProfile => {
  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem('dutyflow_guest_profile');
      if (stored) {
        const parsed = JSON.parse(stored);
        const email = parsed.email === 'guestuser@dutyflow.in' ? 'guest@dutyflow.in' : (parsed.email || 'guest@dutyflow.in');
        return {
          ...DEFAULT_GUEST_PROFILE,
          ...parsed,
          email,
        };
      }
    } catch (_) {}
  }
  return DEFAULT_GUEST_PROFILE;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(() => {
    return typeof window !== 'undefined' ? getGuestProfile() : DEFAULT_GUEST_PROFILE;
  });
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
          subscription_status: (data.subscription_status as SubscriptionStatus) || 'Free Access',
          subscription_start_date: data.subscription_start_date || data.created_at || new Date().toISOString(),
          subscription_end_date: data.subscription_end_date || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          download_count: data.download_count ?? 0,
          master_roster_downloads: data.master_roster_downloads ?? 0,
          individual_profile_downloads: data.individual_profile_downloads ?? 0,
          daywise_profile_downloads: data.daywise_profile_downloads ?? 0,
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
          master_roster_downloads: 0,
          individual_profile_downloads: 0,
          daywise_profile_downloads: 0,
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
        setProfile(getGuestProfile());
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
        setProfile(getGuestProfile());
        setIsLoading(false);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [fetchProfile]);

  const isSubscribed = useMemo(() => profile?.subscription_status === 'Subscribed', [profile?.subscription_status]);
  const isUnsubscribed = useMemo(() => profile?.subscription_status === 'Unsubscribed', [profile?.subscription_status]);
  const isFreeAccess = useMemo(() => !profile || profile.subscription_status === 'Free Access', [profile?.subscription_status]);

  const quota: DownloadQuota = useMemo(() => ({
    master_roster: profile?.master_roster_downloads ?? 0,
    individual_profile: profile?.individual_profile_downloads ?? 0,
    daywise_profile: profile?.daywise_profile_downloads ?? 0,
  }), [profile?.master_roster_downloads, profile?.individual_profile_downloads, profile?.daywise_profile_downloads]);

  const canDownload = useCallback((category: DownloadCategory) => {
    // If unsubscribed, permission denied
    if (profile?.subscription_status === 'Unsubscribed') {
      return { allowed: false, remaining: 0, current: quota[category] || 0, max: QUOTA_LIMITS[category] };
    }
    // If subscribed, unlimited access
    if (profile?.subscription_status === 'Subscribed') {
      return { allowed: true, remaining: 9999, current: quota[category] || 0, max: 9999 };
    }
    // Free Access tier (limited to 3 each)
    const current = quota[category] || 0;
    const max = QUOTA_LIMITS[category];
    const remaining = Math.max(0, max - current);
    return {
      allowed: current < max,
      remaining,
      current,
      max,
    };
  }, [profile?.subscription_status, quota]);

  const recordCategoryDownload = async (category: DownloadCategory, count: number = 1) => {
    const incrementAmount = Math.max(1, count);
    const countKey = category === 'master_roster'
      ? 'master_roster_downloads'
      : category === 'individual_profile'
      ? 'individual_profile_downloads'
      : 'daywise_profile_downloads';

    if (!user) {
      setProfile(prev => {
        const currentProfile = prev || DEFAULT_GUEST_PROFILE;
        const newProfile: UserProfile = {
          ...currentProfile,
          [countKey]: (currentProfile[countKey] || 0) + incrementAmount,
          download_count: (currentProfile.download_count || 0) + incrementAmount,
        };

        if (typeof window !== 'undefined') {
          try {
            localStorage.setItem('dutyflow_guest_profile', JSON.stringify(newProfile));
          } catch (_) {}
        }
        return newProfile;
      });
      return;
    }

    try {
      setProfile(prev => {
        if (!prev) return null;
        return {
          ...prev,
          [countKey]: (prev[countKey] || 0) + incrementAmount,
          download_count: (prev.download_count || 0) + incrementAmount,
        };
      });

      // Update Supabase Database
      await supabase.rpc('increment_category_download', {
        p_user_id: user.id,
        p_category: category,
        p_count: incrementAmount,
      });
    } catch (err) {
      console.error('Failed to increment category download in database:', err);
    }
  };

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
          master_roster_downloads: 0,
          individual_profile_downloads: 0,
          daywise_profile_downloads: 0,
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
    if (!user) {
      const updatedProfile = { ...(profile || DEFAULT_GUEST_PROFILE), ...updated };
      setProfile(updatedProfile);
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem('dutyflow_guest_profile', JSON.stringify(updatedProfile));
        } catch (_) {}
      }
      return { error: null };
    }
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
    await recordCategoryDownload('master_roster');
  };

  const signOut = async () => {
    try {
      if (user) {
        await supabase.auth.signOut();
      }
      setUser(null);
      setSession(null);
      setProfile(DEFAULT_GUEST_PROFILE);

      // Clean up all local storage session items on sign out
      if (typeof window !== 'undefined') {
        const keysToRemove: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith('dutyflow_')) {
            keysToRemove.push(key);
          }
        }
        keysToRemove.forEach(k => localStorage.removeItem(k));
      }

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
      isSubscribed,
      isUnsubscribed,
      isFreeAccess,
      quota,
      canDownload,
      recordCategoryDownload,
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
