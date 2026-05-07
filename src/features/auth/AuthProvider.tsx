import type { PropsWithChildren } from 'react';
import { createContext, useCallback, useEffect, useMemo, useState } from 'react';
import type { AuthChangeEvent, Session, SupabaseClient } from '@supabase/supabase-js';

import { getMissingSupabaseEnvKeys, getSupabaseEnvIssues, isSupabaseEnvConfigured } from '../../lib/env';
import { getSupabaseClient } from '../../services/supabase/client';
import { resolveUserProfile } from '../../services/supabase/profile';
import type { AuthState } from '../../types/auth';

interface SignInInput {
  email: string;
  password: string;
}

export interface AuthContextValue extends AuthState {
  signInWithPassword: (input: SignInInput) => Promise<string | null>;
  signOut: () => Promise<string | null>;
  refreshAuth: () => Promise<void>;
}

const baseState: AuthState = {
  status: isSupabaseEnvConfigured() ? 'loading' : 'unavailable',
  isConfigured: isSupabaseEnvConfigured(),
  missingEnvKeys: getMissingSupabaseEnvKeys(),
  envIssues: getSupabaseEnvIssues(),
  session: null,
  user: null,
  profile: null,
  role: null,
  errorMessage: null,
  warningMessage: null,
};

export const AuthContext = createContext<AuthContextValue | null>(null);

function unauthenticatedState(previous: AuthState): AuthState {
  return {
    ...previous,
    status: 'unauthenticated',
    session: null,
    user: null,
    profile: null,
    role: null,
    errorMessage: null,
    warningMessage: null,
  };
}

export function AuthProvider({ children }: PropsWithChildren) {
  const [state, setState] = useState<AuthState>(baseState);
  const [client] = useState<SupabaseClient | null>(() => getSupabaseClient());

  const applySession = useCallback(
    async (session: Session | null, event?: AuthChangeEvent) => {
      if (!client) {
        setState({
          ...baseState,
          status: 'unavailable',
        });
        return;
      }

      if (!session?.user) {
        setState((previous) => unauthenticatedState(previous));
        return;
      }

      setState((previous) => ({
        ...previous,
        status: 'loading',
        errorMessage: null,
        warningMessage: event === 'SIGNED_OUT' ? null : previous.warningMessage,
      }));

      try {
        const { profile, warning } = await resolveUserProfile(client, session.user);
        setState((previous) => ({
          ...previous,
          status: 'authenticated',
          session,
          user: session.user,
          profile,
          role: profile.role,
          errorMessage: null,
          warningMessage: warning,
        }));
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to resolve profile information.';
        setState((previous) => ({
          ...previous,
          status: 'error',
          session,
          user: session.user,
          profile: null,
          role: null,
          errorMessage: message,
          warningMessage: null,
        }));
      }
    },
    [client],
  );

  const refreshAuth = useCallback(async () => {
    if (!client) {
      setState({
        ...baseState,
        status: 'unavailable',
      });
      return;
    }

    setState((previous) => ({
      ...previous,
      status: 'loading',
      errorMessage: null,
    }));

    const { data, error } = await client.auth.getSession();
    if (error) {
      setState((previous) => ({
        ...previous,
        status: 'error',
        errorMessage: error.message,
      }));
      return;
    }

    await applySession(data.session);
  }, [applySession, client]);

  useEffect(() => {
    if (!client) {
      setState({
        ...baseState,
        status: 'unavailable',
      });
      return;
    }

    void refreshAuth();

    const {
      data: { subscription },
    } = client.auth.onAuthStateChange((event, session) => {
      void applySession(session, event);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [applySession, client, refreshAuth]);

  const signInWithPassword = useCallback(
    async ({ email, password }: SignInInput) => {
      if (!client) {
        return 'Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY first.';
      }

      const { data, error } = await client.auth.signInWithPassword({ email, password });
      if (error) {
        return error.message;
      }

      await applySession(data.session);
      return null;
    },
    [applySession, client],
  );

  const signOut = useCallback(async () => {
    if (!client) {
      setState((previous) => unauthenticatedState(previous));
      return null;
    }

    const { error } = await client.auth.signOut();
    if (error) {
      return error.message;
    }

    setState((previous) => unauthenticatedState(previous));
    return null;
  }, [client]);

  const value = useMemo<AuthContextValue>(
    () => ({
      ...state,
      signInWithPassword,
      signOut,
      refreshAuth,
    }),
    [refreshAuth, signInWithPassword, signOut, state],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
