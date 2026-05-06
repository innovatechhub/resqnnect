import type { SupabaseClient, User } from '@supabase/supabase-js';

import { parseUserRole } from '../../lib/roles';
import type { UserProfile } from '../../types/auth';

interface ProfileRow {
  id: string;
  role: string | null;
  full_name?: string | null;
  barangay_id?: string | null;
}

interface ProfileResolutionResult {
  profile: UserProfile;
  warning: string | null;
}

const PROFILE_COLUMNS = 'id, role, full_name, barangay_id';

function metadataRoleForUser(user: User) {
  return parseUserRole(user.user_metadata?.role ?? user.app_metadata?.role);
}

function buildProfileFromUser(user: User, role: UserProfile['role'], source: UserProfile['source']): UserProfile {
  return {
    id: user.id,
    role,
    fullName: typeof user.user_metadata?.full_name === 'string' ? user.user_metadata.full_name : null,
    barangayId: typeof user.user_metadata?.barangay_id === 'string' ? user.user_metadata.barangay_id : null,
    source,
  };
}

export async function resolveUserProfile(client: SupabaseClient, user: User): Promise<ProfileResolutionResult> {
  const metadataRole = metadataRoleForUser(user);

  const { data, error } = await client
    .from('profiles')
    .select(PROFILE_COLUMNS)
    .eq('id', user.id)
    .maybeSingle<ProfileRow>();

  if (!error && data) {
    const role = parseUserRole(data.role) ?? metadataRole ?? 'household';
    return {
      profile: {
        id: data.id,
        role,
        fullName: data.full_name ?? null,
        barangayId: data.barangay_id ?? null,
        source: 'profiles',
      },
      warning: null,
    };
  }

  if (!error && !data) {
    if (metadataRole) {
      return {
        profile: buildProfileFromUser(user, metadataRole, 'metadata'),
        warning: 'No profile row found for this user. Falling back to auth metadata role.',
      };
    }

    return {
      profile: buildProfileFromUser(user, 'household', 'fallback'),
      warning: 'No profile row found for this user. Falling back to default household role.',
    };
  }

  if (metadataRole) {
    return {
      profile: buildProfileFromUser(user, metadataRole, 'metadata'),
      warning: `Profile query failed (${error.message}). Falling back to auth metadata role.`,
    };
  }

  return {
    profile: buildProfileFromUser(user, 'household', 'fallback'),
    warning: `Profile query failed (${error.message}). Falling back to default household role.`,
  };
}
