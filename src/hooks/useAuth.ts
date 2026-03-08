/**
 * useAuth — React hook wrapping Supabase Auth.
 * Provides sign-in, sign-up, sign-out, and reactive session state.
 */

import { useState, useEffect, useCallback } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import {
  loginSchema,
  signupSchema,
  type LoginInput,
  type SignupInput,
} from '@/utils/validation';

export interface AuthState {
  session: Session | null;
  user: User | null;
  loading: boolean;
  error: string | null;
}

export function useAuth() {
  const [authState, setAuthState] = useState<AuthState>({
    session: null,
    user: null,
    loading: true,
    error: null,
  });

  // Initialise session from Supabase on mount
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setAuthState({ session, user: session?.user ?? null, loading: false, error: null });
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setAuthState((s) => ({ ...s, session, user: session?.user ?? null }));
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = useCallback(async (input: LoginInput): Promise<boolean> => {
    const parsed = loginSchema.safeParse(input);
    if (!parsed.success) {
      setAuthState((s) => ({ ...s, error: parsed.error.issues[0].message }));
      return false;
    }

    setAuthState((s) => ({ ...s, loading: true, error: null }));
    const { error } = await supabase.auth.signInWithPassword({
      email: parsed.data.email,
      password: parsed.data.password,
    });

    if (error) {
      setAuthState((s) => ({ ...s, loading: false, error: error.message }));
      return false;
    }

    setAuthState((s) => ({ ...s, loading: false }));
    return true;
  }, []);

  const signUp = useCallback(async (input: SignupInput): Promise<boolean> => {
    const parsed = signupSchema.safeParse(input);
    if (!parsed.success) {
      setAuthState((s) => ({ ...s, error: parsed.error.issues[0].message }));
      return false;
    }

    setAuthState((s) => ({ ...s, loading: true, error: null }));
    const { error } = await supabase.auth.signUp({
      email: parsed.data.email,
      password: parsed.data.password,
      options: {
        data: {
          name: parsed.data.name,
          location: parsed.data.location,
        },
      },
    });

    if (error) {
      setAuthState((s) => ({ ...s, loading: false, error: error.message }));
      return false;
    }

    setAuthState((s) => ({ ...s, loading: false }));
    return true;
  }, []);

  const signOut = useCallback(async (): Promise<void> => {
    await supabase.auth.signOut();
  }, []);

  return { ...authState, signIn, signUp, signOut };
}
