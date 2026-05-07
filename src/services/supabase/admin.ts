import { createClient, type SupabaseClient } from '@supabase/supabase-js';

import { appEnv } from '../../lib/env';
import type { UserRole } from '../../types/auth';

interface BarangayRow {
  id: string;
  code: string;
  name: string;
  municipality: string;
  province: string;
  is_active: boolean;
}

interface ProfileRow {
  id: string;
  role: UserRole;
  full_name: string | null;
  barangay_id: string | null;
  approved_at: string | null;
  created_at: string;
  updated_at: string;
  barangay?: BarangayRow | null;
}

interface ProfileUpdateRow {
  role: UserRole;
  full_name: string | null;
  barangay_id: string | null;
  approved_at: string | null;
}

interface ProfileInsertRow extends ProfileUpdateRow {
  id: string;
}

export interface BarangayRecord {
  id: string;
  code: string;
  name: string;
  municipality: string;
  province: string;
  isActive: boolean;
}

export interface UserAccessRecord {
  id: string;
  role: UserRole;
  fullName: string | null;
  barangayId: string | null;
  approvedAt: string | null;
  createdAt: string;
  updatedAt: string;
  barangay: BarangayRecord | null;
}

export interface UpdateUserAccessInput {
  role: UserRole;
  fullName: string | null;
  barangayId: string | null;
}

export interface CreateUserAccessInput extends UpdateUserAccessInput {
  id: string;
}

export interface CreateManagedUserInput extends UpdateUserAccessInput {
  email: string;
  password: string;
}

function mapBarangay(row: BarangayRow): BarangayRecord {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    municipality: row.municipality,
    province: row.province,
    isActive: row.is_active,
  };
}

function mapUserAccess(row: ProfileRow): UserAccessRecord {
  return {
    id: row.id,
    role: row.role,
    fullName: row.full_name,
    barangayId: row.barangay_id,
    approvedAt: row.approved_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    barangay: row.barangay ? mapBarangay(row.barangay) : null,
  };
}

export async function listBarangays(client: SupabaseClient): Promise<BarangayRecord[]> {
  const { data, error } = await client
    .from('barangays')
    .select('id, code, name, municipality, province, is_active')
    .eq('is_active', true)
    .order('name', { ascending: true })
    .returns<BarangayRow[]>();

  if (error) {
    throw error;
  }

  return (data ?? []).map(mapBarangay);
}

export async function listUserAccessRecords(client: SupabaseClient): Promise<UserAccessRecord[]> {
  const { data, error } = await client
    .from('profiles')
    .select(
      'id, role, full_name, barangay_id, approved_at, created_at, updated_at, barangay:barangay_id (id, code, name, municipality, province, is_active)',
    )
    .order('full_name', { ascending: true, nullsFirst: false })
    .returns<ProfileRow[]>();

  if (error) {
    throw error;
  }

  return (data ?? []).map(mapUserAccess);
}

export async function updateUserAccess(
  client: SupabaseClient,
  profileId: string,
  input: UpdateUserAccessInput,
): Promise<UserAccessRecord> {
  const payload: ProfileUpdateRow = {
    role: input.role,
    full_name: input.fullName,
    barangay_id: input.barangayId,
    approved_at: new Date().toISOString(),
  };

  const { data, error } = await client
    .from('profiles')
    .update(payload)
    .eq('id', profileId)
    .select(
      'id, role, full_name, barangay_id, approved_at, created_at, updated_at, barangay:barangay_id (id, code, name, municipality, province, is_active)',
    )
    .single<ProfileRow>();

  if (error) {
    throw error;
  }

  return mapUserAccess(data);
}

export async function createUserAccess(
  client: SupabaseClient,
  input: CreateUserAccessInput,
): Promise<UserAccessRecord> {
  const payload: ProfileInsertRow = {
    id: input.id,
    role: input.role,
    full_name: input.fullName,
    barangay_id: input.barangayId,
    approved_at: new Date().toISOString(),
  };

  const { data, error } = await client
    .from('profiles')
    .insert(payload)
    .select(
      'id, role, full_name, barangay_id, approved_at, created_at, updated_at, barangay:barangay_id (id, code, name, municipality, province, is_active)',
    )
    .single<ProfileRow>();

  if (error) {
    throw error;
  }

  return mapUserAccess(data);
}

export async function createManagedUserAccess(
  client: SupabaseClient,
  input: CreateManagedUserInput,
): Promise<UserAccessRecord> {
  if (!appEnv.VITE_SUPABASE_URL || !appEnv.VITE_SUPABASE_ANON_KEY) {
    throw new Error('Supabase environment variables are not configured.');
  }

  const authClient = createClient(appEnv.VITE_SUPABASE_URL, appEnv.VITE_SUPABASE_ANON_KEY, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });

  const { data, error } = await authClient.auth.signUp({
    email: input.email.trim().toLowerCase(),
    password: input.password,
    options: {
      data: {
        full_name: input.fullName,
        role: input.role,
        barangay_id: input.barangayId,
      },
    },
  });

  if (error) {
    throw error;
  }

  if (!data.user?.id) {
    throw new Error('Auth user creation did not return a user ID.');
  }

  if (Array.isArray(data.user.identities) && data.user.identities.length === 0) {
    throw new Error('Email is already registered. Use another email or update the existing profile.');
  }

  return createUserAccess(client, {
    id: data.user.id,
    role: input.role,
    fullName: input.fullName,
    barangayId: input.barangayId,
  });
}

export async function deleteUserAccess(client: SupabaseClient, profileId: string): Promise<void> {
  const { error } = await client.from('profiles').delete().eq('id', profileId);

  if (error) {
    throw error;
  }
}
