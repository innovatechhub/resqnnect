import type { SupabaseClient } from '@supabase/supabase-js';

export type EvacuationCenterStatus = 'open' | 'closed' | 'full' | 'standby';
export type EvacueeStatus = 'checked_in' | 'checked_out' | 'transferred';

interface EvacuationCenterRow {
  id: string;
  barangay_id: string;
  name: string;
  location_text: string;
  latitude: number | string | null;
  longitude: number | string | null;
  capacity: number;
  current_occupancy: number;
  status: string;
  created_at: string;
  updated_at: string;
}

interface EvacueeRecordRow {
  id: string;
  evacuation_center_id: string;
  household_id: string | null;
  household_member_id: string | null;
  status: string;
  check_in_at: string;
  check_out_at: string | null;
  verified_by: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  household?: {
    household_code: string | null;
    address_text: string;
  } | null;
  household_member?: {
    full_name: string;
  } | null;
}

export interface EvacuationCenterRecord {
  id: string;
  barangayId: string;
  name: string;
  locationText: string;
  latitude: number | null;
  longitude: number | null;
  capacity: number;
  currentOccupancy: number;
  status: EvacuationCenterStatus;
  createdAt: string;
  updatedAt: string;
}

export interface EvacueeRecord {
  id: string;
  evacuationCenterId: string;
  householdId: string | null;
  householdMemberId: string | null;
  householdLabel: string | null;
  householdMemberName: string | null;
  status: EvacueeStatus;
  checkInAt: string;
  checkOutAt: string | null;
  verifiedBy: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface UpsertEvacuationCenterInput {
  barangayId: string;
  name: string;
  locationText: string;
  latitude: number | null;
  longitude: number | null;
  capacity: number;
  currentOccupancy: number;
  status: EvacuationCenterStatus;
}

export interface CreateEvacueeRecordInput {
  evacuationCenterId: string;
  householdId: string | null;
  householdMemberId: string | null;
  verifiedBy: string;
  notes: string | null;
}

const CENTER_COLUMNS =
  'id, barangay_id, name, location_text, latitude, longitude, capacity, current_occupancy, status, created_at, updated_at';
const EVACUEE_COLUMNS =
  'id, evacuation_center_id, household_id, household_member_id, status, check_in_at, check_out_at, verified_by, notes, created_at, updated_at, household:household_id(household_code, address_text), household_member:household_member_id(full_name)';
const CENTER_STATUSES: readonly EvacuationCenterStatus[] = ['open', 'closed', 'full', 'standby'];
const EVACUEE_STATUSES: readonly EvacueeStatus[] = ['checked_in', 'checked_out', 'transferred'];

function toNumberOrNull(value: number | string | null): number | null {
  if (value === null) {
    return null;
  }

  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeCenterStatus(status: string): EvacuationCenterStatus {
  return CENTER_STATUSES.includes(status as EvacuationCenterStatus)
    ? (status as EvacuationCenterStatus)
    : 'standby';
}

function normalizeEvacueeStatus(status: string): EvacueeStatus {
  return EVACUEE_STATUSES.includes(status as EvacueeStatus) ? (status as EvacueeStatus) : 'checked_in';
}

function mapCenter(row: EvacuationCenterRow): EvacuationCenterRecord {
  return {
    id: row.id,
    barangayId: row.barangay_id,
    name: row.name,
    locationText: row.location_text,
    latitude: toNumberOrNull(row.latitude),
    longitude: toNumberOrNull(row.longitude),
    capacity: row.capacity,
    currentOccupancy: row.current_occupancy,
    status: normalizeCenterStatus(row.status),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapEvacuee(row: EvacueeRecordRow): EvacueeRecord {
  const householdLabel = row.household
    ? row.household.household_code ?? row.household.address_text
    : null;

  return {
    id: row.id,
    evacuationCenterId: row.evacuation_center_id,
    householdId: row.household_id,
    householdMemberId: row.household_member_id,
    householdLabel,
    householdMemberName: row.household_member?.full_name ?? null,
    status: normalizeEvacueeStatus(row.status),
    checkInAt: row.check_in_at,
    checkOutAt: row.check_out_at,
    verifiedBy: row.verified_by,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function listEvacuationCenters(
  client: SupabaseClient,
  options: { barangayId?: string } = {},
): Promise<EvacuationCenterRecord[]> {
  let query = client.from('evacuation_centers').select(CENTER_COLUMNS).order('name', { ascending: true });

  if (options.barangayId) {
    query = query.eq('barangay_id', options.barangayId);
  }

  const { data, error } = await query.returns<EvacuationCenterRow[]>();
  if (error) {
    throw error;
  }

  return (data ?? []).map(mapCenter);
}

export async function createEvacuationCenter(
  client: SupabaseClient,
  input: UpsertEvacuationCenterInput,
): Promise<EvacuationCenterRecord> {
  const { data, error } = await client
    .from('evacuation_centers')
    .insert({
      barangay_id: input.barangayId,
      name: input.name,
      location_text: input.locationText,
      latitude: input.latitude,
      longitude: input.longitude,
      capacity: input.capacity,
      current_occupancy: input.currentOccupancy,
      status: input.status,
    })
    .select(CENTER_COLUMNS)
    .single<EvacuationCenterRow>();

  if (error) {
    throw error;
  }

  return mapCenter(data);
}

export async function updateEvacuationCenter(
  client: SupabaseClient,
  centerId: string,
  input: UpsertEvacuationCenterInput,
): Promise<EvacuationCenterRecord> {
  const { data, error } = await client
    .from('evacuation_centers')
    .update({
      barangay_id: input.barangayId,
      name: input.name,
      location_text: input.locationText,
      latitude: input.latitude,
      longitude: input.longitude,
      capacity: input.capacity,
      current_occupancy: input.currentOccupancy,
      status: input.status,
    })
    .eq('id', centerId)
    .select(CENTER_COLUMNS)
    .single<EvacuationCenterRow>();

  if (error) {
    throw error;
  }

  return mapCenter(data);
}

export async function listEvacueeRecords(
  client: SupabaseClient,
  options: { evacuationCenterId?: string; householdId?: string } = {},
): Promise<EvacueeRecord[]> {
  let query = client.from('evacuee_records').select(EVACUEE_COLUMNS).order('check_in_at', { ascending: false });

  if (options.evacuationCenterId) {
    query = query.eq('evacuation_center_id', options.evacuationCenterId);
  }

  if (options.householdId) {
    query = query.eq('household_id', options.householdId);
  }

  const { data, error } = await query.returns<EvacueeRecordRow[]>();
  if (error) {
    throw error;
  }

  return (data ?? []).map(mapEvacuee);
}

export async function checkInEvacuee(
  client: SupabaseClient,
  input: CreateEvacueeRecordInput,
): Promise<EvacueeRecord> {
  const existing = await listEvacueeRecords(client, { householdId: input.householdId ?? undefined });
  const activeDuplicate = existing.find(
    (record) =>
      record.status === 'checked_in' &&
      (input.householdMemberId ? record.householdMemberId === input.householdMemberId : true),
  );

  if (activeDuplicate) {
    throw new Error('This household/member already has an active evacuation check-in.');
  }

  const { data, error } = await client
    .from('evacuee_records')
    .insert({
      evacuation_center_id: input.evacuationCenterId,
      household_id: input.householdId,
      household_member_id: input.householdMemberId,
      status: 'checked_in',
      verified_by: input.verifiedBy,
      notes: input.notes,
    })
    .select(EVACUEE_COLUMNS)
    .single<EvacueeRecordRow>();

  if (error) {
    throw error;
  }

  const center = await getEvacuationCenter(client, input.evacuationCenterId);
  await updateEvacuationCenter(client, input.evacuationCenterId, {
    barangayId: center.barangayId,
    name: center.name,
    locationText: center.locationText,
    latitude: center.latitude,
    longitude: center.longitude,
    capacity: center.capacity,
    currentOccupancy: Math.min(center.capacity || Number.MAX_SAFE_INTEGER, center.currentOccupancy + 1),
    status: center.capacity > 0 && center.currentOccupancy + 1 >= center.capacity ? 'full' : center.status,
  });

  return mapEvacuee(data);
}

export async function updateEvacueeStatus(
  client: SupabaseClient,
  recordId: string,
  status: EvacueeStatus,
): Promise<EvacueeRecord> {
  const { data, error } = await client
    .from('evacuee_records')
    .update({
      status,
      check_out_at: status === 'checked_out' ? new Date().toISOString() : null,
    })
    .eq('id', recordId)
    .select(EVACUEE_COLUMNS)
    .single<EvacueeRecordRow>();

  if (error) {
    throw error;
  }

  return mapEvacuee(data);
}

export async function getEvacuationCenter(
  client: SupabaseClient,
  centerId: string,
): Promise<EvacuationCenterRecord> {
  const { data, error } = await client
    .from('evacuation_centers')
    .select(CENTER_COLUMNS)
    .eq('id', centerId)
    .single<EvacuationCenterRow>();

  if (error) {
    throw error;
  }

  return mapCenter(data);
}
