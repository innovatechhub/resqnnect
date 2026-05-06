import type { Session, User } from '@supabase/supabase-js';

export type UserRole = 'mdrrmo_admin' | 'barangay_official' | 'rescuer' | 'household';

export type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated' | 'unavailable' | 'error';

export interface UserProfile {
  id: string;
  role: UserRole;
  fullName: string | null;
  barangayId: string | null;
  source: 'profiles' | 'metadata' | 'fallback';
}

export interface AuthState {
  status: AuthStatus;
  isConfigured: boolean;
  missingEnvKeys: string[];
  session: Session | null;
  user: User | null;
  profile: UserProfile | null;
  role: UserRole | null;
  errorMessage: string | null;
  warningMessage: string | null;
}
