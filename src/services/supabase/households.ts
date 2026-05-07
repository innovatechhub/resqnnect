import type { SupabaseClient } from '@supabase/supabase-js';

import { isHouseholdMemberSex, isHouseholdStatus } from '../../constants/households';
import type { HouseholdMemberSex, HouseholdStatus } from '../../constants/households';

interface HouseholdRow {
  id: string;
  household_code: string | null;
  barangay_id: string;
  address_text: string;
  latitude: number | null;
  longitude: number | null;
  qr_code: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

interface HouseholdMemberRow {
  id: string;
  household_id: string;
  full_name: string;
  relationship_to_head: string | null;
  birth_date: string | null;
  sex: string | null;
  is_vulnerable: boolean;
  vulnerability_notes: string | null;
  created_at: string;
  updated_at: string;
}

interface HouseholdInsertRow {
  household_code: string | null;
  barangay_id: string;
  address_text: string;
  latitude: number | null;
  longitude: number | null;
  qr_code: string | null;
  status: HouseholdStatus;
}

interface HouseholdUpdateRow {
  household_code: string | null;
  address_text: string;
  latitude: number | null;
  longitude: number | null;
  qr_code: string | null;
  status: HouseholdStatus;
}

interface HouseholdMemberInsertRow {
  household_id: string;
  full_name: string;
  relationship_to_head: string | null;
  birth_date: string | null;
  sex: HouseholdMemberSex | null;
  is_vulnerable: boolean;
  vulnerability_notes: string | null;
}

interface HouseholdMemberUpdateRow {
  full_name: string;
  relationship_to_head: string | null;
  birth_date: string | null;
  sex: HouseholdMemberSex | null;
  is_vulnerable: boolean;
  vulnerability_notes: string | null;
}

export interface HouseholdRecord {
  id: string;
  householdCode: string | null;
  barangayId: string;
  addressText: string;
  latitude: number | null;
  longitude: number | null;
  qrCode: string | null;
  status: HouseholdStatus;
  createdAt: string;
  updatedAt: string;
}

export interface HouseholdMemberRecord {
  id: string;
  householdId: string;
  fullName: string;
  relationshipToHead: string | null;
  birthDate: string | null;
  sex: HouseholdMemberSex | null;
  isVulnerable: boolean;
  vulnerabilityNotes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateHouseholdInput {
  householdCode: string | null;
  barangayId: string;
  addressText: string;
  latitude: number | null;
  longitude: number | null;
  qrCode: string | null;
  status: HouseholdStatus;
}

export interface UpdateHouseholdInput {
  householdCode: string | null;
  addressText: string;
  latitude: number | null;
  longitude: number | null;
  qrCode: string | null;
  status: HouseholdStatus;
}

export interface CreateHouseholdMemberInput {
  householdId: string;
  fullName: string;
  relationshipToHead: string | null;
  birthDate: string | null;
  sex: HouseholdMemberSex | null;
  isVulnerable: boolean;
  vulnerabilityNotes: string | null;
}

export interface UpdateHouseholdMemberInput {
  fullName: string;
  relationshipToHead: string | null;
  birthDate: string | null;
  sex: HouseholdMemberSex | null;
  isVulnerable: boolean;
  vulnerabilityNotes: string | null;
}

const HOUSEHOLD_COLUMNS =
  'id, household_code, barangay_id, address_text, latitude, longitude, qr_code, status, created_at, updated_at';
const HOUSEHOLD_MEMBER_COLUMNS =
  'id, household_id, full_name, relationship_to_head, birth_date, sex, is_vulnerable, vulnerability_notes, created_at, updated_at';

function normalizeHouseholdStatus(status: string): HouseholdStatus {
  return isHouseholdStatus(status) ? status : 'active';
}

function normalizeHouseholdMemberSex(sex: string | null): HouseholdMemberSex | null {
  if (!sex) {
    return null;
  }

  return isHouseholdMemberSex(sex) ? sex : null;
}

function mapHouseholdRow(row: HouseholdRow): HouseholdRecord {
  return {
    id: row.id,
    householdCode: row.household_code,
    barangayId: row.barangay_id,
    addressText: row.address_text,
    latitude: row.latitude,
    longitude: row.longitude,
    qrCode: row.qr_code,
    status: normalizeHouseholdStatus(row.status),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapHouseholdMemberRow(row: HouseholdMemberRow): HouseholdMemberRecord {
  return {
    id: row.id,
    householdId: row.household_id,
    fullName: row.full_name,
    relationshipToHead: row.relationship_to_head,
    birthDate: row.birth_date,
    sex: normalizeHouseholdMemberSex(row.sex),
    isVulnerable: row.is_vulnerable,
    vulnerabilityNotes: row.vulnerability_notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function listHouseholds(client: SupabaseClient): Promise<HouseholdRecord[]> {
  const { data, error } = await client
    .from('households')
    .select(HOUSEHOLD_COLUMNS)
    .order('updated_at', { ascending: false })
    .returns<HouseholdRow[]>();

  if (error) {
    throw error;
  }

  return (data ?? []).map(mapHouseholdRow);
}

export async function createHousehold(client: SupabaseClient, input: CreateHouseholdInput): Promise<HouseholdRecord> {
  const payload: HouseholdInsertRow = {
    household_code: input.householdCode,
    barangay_id: input.barangayId,
    address_text: input.addressText,
    latitude: input.latitude,
    longitude: input.longitude,
    qr_code: input.qrCode,
    status: input.status,
  };

  const { data: rpcData, error: rpcError } = await client.rpc('create_household', {
    target_barangay_id: input.barangayId,
    target_household_code: input.householdCode,
    target_address_text: input.addressText,
    target_latitude: input.latitude,
    target_longitude: input.longitude,
    target_qr_code: input.qrCode,
    target_status: input.status,
  });

  if (!rpcError && rpcData) {
    return mapHouseholdRow(rpcData as HouseholdRow);
  }

  const rpcMessage = typeof rpcError?.message === 'string' ? rpcError.message : '';
  const rpcCode = typeof rpcError?.code === 'string' ? rpcError.code : '';
  const isRpcUnavailable =
    rpcCode === 'PGRST202' || rpcCode === '42883' || rpcMessage.toLowerCase().includes('create_household');

  if (rpcError && !isRpcUnavailable) {
    throw rpcError;
  }

  const { data, error } = await client
    .from('households')
    .insert(payload)
    .select(HOUSEHOLD_COLUMNS)
    .single<HouseholdRow>();

  if (error) {
    throw error;
  }

  return mapHouseholdRow(data);
}

export async function updateHousehold(
  client: SupabaseClient,
  householdId: string,
  input: UpdateHouseholdInput,
): Promise<HouseholdRecord> {
  const payload: HouseholdUpdateRow = {
    household_code: input.householdCode,
    address_text: input.addressText,
    latitude: input.latitude,
    longitude: input.longitude,
    qr_code: input.qrCode,
    status: input.status,
  };

  const { data, error } = await client
    .from('households')
    .update(payload)
    .eq('id', householdId)
    .select(HOUSEHOLD_COLUMNS)
    .single<HouseholdRow>();

  if (error) {
    throw error;
  }

  return mapHouseholdRow(data);
}

export async function deleteHousehold(client: SupabaseClient, householdId: string): Promise<void> {
  const { error } = await client.from('households').delete().eq('id', householdId);

  if (error) {
    throw error;
  }
}

export async function listHouseholdMembers(
  client: SupabaseClient,
  householdId: string,
): Promise<HouseholdMemberRecord[]> {
  const { data, error } = await client
    .from('household_members')
    .select(HOUSEHOLD_MEMBER_COLUMNS)
    .eq('household_id', householdId)
    .order('created_at', { ascending: true })
    .returns<HouseholdMemberRow[]>();

  if (error) {
    throw error;
  }

  return (data ?? []).map(mapHouseholdMemberRow);
}

export async function createHouseholdMember(
  client: SupabaseClient,
  input: CreateHouseholdMemberInput,
): Promise<HouseholdMemberRecord> {
  const payload: HouseholdMemberInsertRow = {
    household_id: input.householdId,
    full_name: input.fullName,
    relationship_to_head: input.relationshipToHead,
    birth_date: input.birthDate,
    sex: input.sex,
    is_vulnerable: input.isVulnerable,
    vulnerability_notes: input.vulnerabilityNotes,
  };

  const { data, error } = await client
    .from('household_members')
    .insert(payload)
    .select(HOUSEHOLD_MEMBER_COLUMNS)
    .single<HouseholdMemberRow>();

  if (error) {
    throw error;
  }

  return mapHouseholdMemberRow(data);
}

export async function updateHouseholdMember(
  client: SupabaseClient,
  memberId: string,
  input: UpdateHouseholdMemberInput,
): Promise<HouseholdMemberRecord> {
  const payload: HouseholdMemberUpdateRow = {
    full_name: input.fullName,
    relationship_to_head: input.relationshipToHead,
    birth_date: input.birthDate,
    sex: input.sex,
    is_vulnerable: input.isVulnerable,
    vulnerability_notes: input.vulnerabilityNotes,
  };

  const { data, error } = await client
    .from('household_members')
    .update(payload)
    .eq('id', memberId)
    .select(HOUSEHOLD_MEMBER_COLUMNS)
    .single<HouseholdMemberRow>();

  if (error) {
    throw error;
  }

  return mapHouseholdMemberRow(data);
}

export async function deleteHouseholdMember(client: SupabaseClient, memberId: string): Promise<void> {
  const { error } = await client.from('household_members').delete().eq('id', memberId);

  if (error) {
    throw error;
  }
}
