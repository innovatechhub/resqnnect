import type { SupabaseClient } from '@supabase/supabase-js';

export type VerificationMode = 'qr' | 'manual_name' | 'manual_family_id';
export type VerificationResult = 'success' | 'failed' | 'duplicate' | 'conflict';

interface VerificationHouseholdRow {
  id: string;
  household_code: string | null;
  barangay_id: string;
  head_profile_id: string | null;
  address_text: string;
  qr_code: string | null;
  status: string;
}

interface VerificationHeadProfileRow {
  id: string;
  full_name: string | null;
}

interface VerificationHouseholdMemberLiteRow {
  household_id: string;
  full_name: string;
  relationship_to_head: string | null;
}

interface VerificationMemberRow {
  id: string;
  household_id: string;
  full_name: string;
  relationship_to_head: string | null;
  is_vulnerable: boolean;
}

interface VerificationLogRow {
  id: string;
  qr_code: string;
  household_id: string | null;
  household_member_id: string | null;
  verification_mode: string;
  result: string;
  notes: string | null;
  verified_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface VerificationHouseholdRecord {
  id: string;
  householdCode: string | null;
  barangayId: string;
  headName: string | null;
  familyMemberCount: number;
  addressText: string;
  qrCode: string | null;
  status: string;
}

export interface VerificationMemberRecord {
  id: string;
  householdId: string;
  fullName: string;
  relationshipToHead: string | null;
  isVulnerable: boolean;
}

export interface VerificationLogRecord {
  id: string;
  qrCode: string;
  householdId: string | null;
  householdMemberId: string | null;
  verificationMode: VerificationMode;
  result: VerificationResult;
  notes: string | null;
  verifiedBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateVerificationLogInput {
  qrCode: string;
  householdId: string | null;
  householdMemberId: string | null;
  verificationMode: VerificationMode;
  result: VerificationResult;
  notes: string | null;
  verifiedBy: string;
}

const HOUSEHOLD_COLUMNS = 'id, household_code, barangay_id, head_profile_id, address_text, qr_code, status';
const MEMBER_COLUMNS = 'id, household_id, full_name, relationship_to_head, is_vulnerable';
const LOG_COLUMNS =
  'id, qr_code, household_id, household_member_id, verification_mode, result, notes, verified_by, created_at, updated_at';
const VERIFICATION_MODES: readonly VerificationMode[] = ['qr', 'manual_name', 'manual_family_id'];
const VERIFICATION_RESULTS: readonly VerificationResult[] = ['success', 'failed', 'duplicate', 'conflict'];

function normalizeMode(mode: string): VerificationMode {
  return VERIFICATION_MODES.includes(mode as VerificationMode) ? (mode as VerificationMode) : 'manual_name';
}

function normalizeResult(result: string): VerificationResult {
  return VERIFICATION_RESULTS.includes(result as VerificationResult) ? (result as VerificationResult) : 'failed';
}

function mapHousehold(row: VerificationHouseholdRow): VerificationHouseholdRecord {
  return {
    id: row.id,
    householdCode: row.household_code,
    barangayId: row.barangay_id,
    headName: null,
    familyMemberCount: 0,
    addressText: row.address_text,
    qrCode: row.qr_code,
    status: row.status,
  };
}

function mapMember(row: VerificationMemberRow): VerificationMemberRecord {
  return {
    id: row.id,
    householdId: row.household_id,
    fullName: row.full_name,
    relationshipToHead: row.relationship_to_head,
    isVulnerable: row.is_vulnerable,
  };
}

function mapLog(row: VerificationLogRow): VerificationLogRecord {
  return {
    id: row.id,
    qrCode: row.qr_code,
    householdId: row.household_id,
    householdMemberId: row.household_member_id,
    verificationMode: normalizeMode(row.verification_mode),
    result: normalizeResult(row.result),
    notes: row.notes,
    verifiedBy: row.verified_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function searchVerificationHouseholds(
  client: SupabaseClient,
  input: { query: string; barangayId?: string },
): Promise<VerificationHouseholdRecord[]> {
  const queryText = input.query.trim();
  let query = client.from('households').select(HOUSEHOLD_COLUMNS).order('updated_at', { ascending: false }).limit(20);

  if (input.barangayId) {
    query = query.eq('barangay_id', input.barangayId);
  }

  if (queryText) {
    query = query.or(
      `household_code.ilike.%${queryText}%,qr_code.ilike.%${queryText}%,address_text.ilike.%${queryText}%`,
    );
  }

  const { data, error } = await query.returns<VerificationHouseholdRow[]>();
  if (error) {
    throw error;
  }

  const rows = data ?? [];
  if (rows.length === 0) {
    return [];
  }

  const householdIds = rows.map((row) => row.id);
  const headProfileIds = Array.from(
    new Set(
      rows
        .map((row) => row.head_profile_id)
        .filter((value): value is string => typeof value === 'string' && value.length > 0),
    ),
  );

  const [{ data: memberRows, error: memberError }, { data: headRows, error: headError }] = await Promise.all([
    client
      .from('household_members')
      .select('household_id, full_name, relationship_to_head')
      .in('household_id', householdIds)
      .returns<VerificationHouseholdMemberLiteRow[]>(),
    headProfileIds.length > 0
      ? client.from('profiles').select('id, full_name').in('id', headProfileIds).returns<VerificationHeadProfileRow[]>()
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (memberError) {
    throw memberError;
  }
  if (headError) {
    throw headError;
  }

  const memberCountByHouseholdId = new Map<string, number>();
  const headNameFromMembersByHouseholdId = new Map<string, string>();

  for (const member of memberRows ?? []) {
    memberCountByHouseholdId.set(member.household_id, (memberCountByHouseholdId.get(member.household_id) ?? 0) + 1);
    if (
      !headNameFromMembersByHouseholdId.has(member.household_id) &&
      typeof member.relationship_to_head === 'string' &&
      member.relationship_to_head.trim().toLowerCase() === 'head'
    ) {
      headNameFromMembersByHouseholdId.set(member.household_id, member.full_name);
    }
  }

  const headNameByProfileId = new Map<string, string>();
  for (const row of headRows ?? []) {
    const fullName = row.full_name?.trim();
    if (fullName) {
      headNameByProfileId.set(row.id, fullName);
    }
  }

  return rows.map((row) => {
    const mapped = mapHousehold(row);
    const headNameFromProfile = row.head_profile_id ? (headNameByProfileId.get(row.head_profile_id) ?? null) : null;
    mapped.headName = headNameFromProfile ?? headNameFromMembersByHouseholdId.get(row.id) ?? null;
    mapped.familyMemberCount = memberCountByHouseholdId.get(row.id) ?? 0;
    return mapped;
  });
}

export async function findHouseholdByQrCode(
  client: SupabaseClient,
  qrCode: string,
): Promise<VerificationHouseholdRecord | null> {
  const { data, error } = await client
    .from('households')
    .select(HOUSEHOLD_COLUMNS)
    .eq('qr_code', qrCode.trim())
    .maybeSingle<VerificationHouseholdRow>();

  if (error) {
    throw error;
  }

  return data ? mapHousehold(data) : null;
}

export async function getVerificationHousehold(
  client: SupabaseClient,
  householdId: string,
): Promise<VerificationHouseholdRecord> {
  const { data, error } = await client
    .from('households')
    .select(HOUSEHOLD_COLUMNS)
    .eq('id', householdId)
    .single<VerificationHouseholdRow>();

  if (error) {
    throw error;
  }

  return mapHousehold(data);
}

export async function listVerificationMembers(
  client: SupabaseClient,
  householdId: string,
): Promise<VerificationMemberRecord[]> {
  const { data, error } = await client
    .from('household_members')
    .select(MEMBER_COLUMNS)
    .eq('household_id', householdId)
    .order('full_name', { ascending: true })
    .returns<VerificationMemberRow[]>();

  if (error) {
    throw error;
  }

  return (data ?? []).map(mapMember);
}

export async function listVerificationLogs(
  client: SupabaseClient,
  options: { householdId?: string; limit?: number } = {},
): Promise<VerificationLogRecord[]> {
  let query = client.from('qr_verifications').select(LOG_COLUMNS).order('created_at', { ascending: false });

  if (options.householdId) {
    query = query.eq('household_id', options.householdId);
  }

  if (options.limit) {
    query = query.limit(options.limit);
  }

  const { data, error } = await query.returns<VerificationLogRow[]>();
  if (error) {
    throw error;
  }

  return (data ?? []).map(mapLog);
}

export async function createVerificationLog(
  client: SupabaseClient,
  input: CreateVerificationLogInput,
): Promise<VerificationLogRecord> {
  const recentLogs = input.householdId
    ? await listVerificationLogs(client, { householdId: input.householdId, limit: 10 })
    : [];
  const duplicate = recentLogs.find((log) => {
    const ageMinutes = (Date.now() - new Date(log.createdAt).getTime()) / 60000;
    return log.result === 'success' && ageMinutes <= 60;
  });

  const result = duplicate && input.result === 'success' ? 'duplicate' : input.result;
  const notes =
    duplicate && input.result === 'success'
      ? `${input.notes ? `${input.notes} ` : ''}Duplicate successful verification within the last hour.`
      : input.notes;

  const { data, error } = await client
    .from('qr_verifications')
    .insert({
      qr_code: input.qrCode,
      household_id: input.householdId,
      household_member_id: input.householdMemberId,
      verification_mode: input.verificationMode,
      result,
      notes,
      verified_by: input.verifiedBy,
    })
    .select(LOG_COLUMNS)
    .single<VerificationLogRow>();

  if (error) {
    throw error;
  }

  return mapLog(data);
}
