import type { SupabaseClient } from '@supabase/supabase-js';

import { isRescueRequestStatus, type RescueRequestStatus } from '../../constants/status';

interface RescueRequestRow {
  id: string;
  household_id: string | null;
  requested_by: string;
  barangay_id: string;
  emergency_type: string;
  severity_level: number;
  people_count: number;
  location_text: string | null;
  latitude: number | string | null;
  longitude: number | string | null;
  details: string;
  photo_url: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

interface RescueRequestInsertRow {
  household_id: string | null;
  requested_by: string;
  barangay_id: string;
  emergency_type: string;
  severity_level: number;
  people_count: number;
  location_text: string | null;
  latitude: number | null;
  longitude: number | null;
  details: string;
  photo_url: string | null;
}

interface RescueRequestUpdateStatusRow {
  status: RescueRequestStatus;
}

export interface RescueRequestRecord {
  id: string;
  householdId: string | null;
  requestedBy: string;
  barangayId: string;
  emergencyType: string;
  severityLevel: number;
  peopleCount: number;
  locationText: string | null;
  latitude: number | null;
  longitude: number | null;
  details: string;
  photoUrl: string | null;
  status: RescueRequestStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CreateRescueRequestInput {
  householdId: string | null;
  requestedBy: string;
  barangayId: string;
  emergencyType: string;
  severityLevel: number;
  peopleCount: number;
  locationText: string | null;
  latitude: number | null;
  longitude: number | null;
  details: string;
  photoUrl: string | null;
}

export interface ListRescueRequestsOptions {
  barangayId?: string;
  requestedBy?: string;
  status?: RescueRequestStatus;
}

export interface CurrentRescueRequesterContext {
  barangayId: string | null;
  householdId: string | null;
}

const RESCUE_REQUEST_COLUMNS =
  'id, household_id, requested_by, barangay_id, emergency_type, severity_level, people_count, location_text, latitude, longitude, details, photo_url, status, created_at, updated_at';

function normalizeStatus(status: string): RescueRequestStatus {
  return isRescueRequestStatus(status) ? status : 'pending';
}

function toNumberOrNull(value: number | string | null): number | null {
  if (value === null) {
    return null;
  }

  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function mapRescueRequestRow(row: RescueRequestRow): RescueRequestRecord {
  return {
    id: row.id,
    householdId: row.household_id,
    requestedBy: row.requested_by,
    barangayId: row.barangay_id,
    emergencyType: row.emergency_type,
    severityLevel: row.severity_level,
    peopleCount: row.people_count,
    locationText: row.location_text,
    latitude: toNumberOrNull(row.latitude),
    longitude: toNumberOrNull(row.longitude),
    details: row.details,
    photoUrl: row.photo_url,
    status: normalizeStatus(row.status),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function listRescueRequests(
  client: SupabaseClient,
  options: ListRescueRequestsOptions = {},
): Promise<RescueRequestRecord[]> {
  let query = client
    .from('rescue_requests')
    .select(RESCUE_REQUEST_COLUMNS)
    .order('created_at', { ascending: false });

  if (options.barangayId) {
    query = query.eq('barangay_id', options.barangayId);
  }

  if (options.requestedBy) {
    query = query.eq('requested_by', options.requestedBy);
  }

  if (options.status) {
    query = query.eq('status', options.status);
  }

  const { data, error } = await query.returns<RescueRequestRow[]>();
  if (error) {
    throw error;
  }

  return (data ?? []).map(mapRescueRequestRow);
}

export async function getRescueRequest(client: SupabaseClient, requestId: string): Promise<RescueRequestRecord> {
  const { data, error } = await client
    .from('rescue_requests')
    .select(RESCUE_REQUEST_COLUMNS)
    .eq('id', requestId)
    .single<RescueRequestRow>();

  if (error) {
    throw error;
  }

  return mapRescueRequestRow(data);
}

export async function createRescueRequest(
  client: SupabaseClient,
  input: CreateRescueRequestInput,
): Promise<RescueRequestRecord> {
  const payload: RescueRequestInsertRow = {
    household_id: input.householdId,
    requested_by: input.requestedBy,
    barangay_id: input.barangayId,
    emergency_type: input.emergencyType,
    severity_level: input.severityLevel,
    people_count: input.peopleCount,
    location_text: input.locationText,
    latitude: input.latitude,
    longitude: input.longitude,
    details: input.details,
    photo_url: input.photoUrl,
  };

  const { data, error } = await client
    .from('rescue_requests')
    .insert(payload)
    .select(RESCUE_REQUEST_COLUMNS)
    .single<RescueRequestRow>();
  if (error) {
    throw error;
  }

  return mapRescueRequestRow(data);
}

export async function updateRescueRequestStatus(
  client: SupabaseClient,
  requestId: string,
  status: RescueRequestStatus,
): Promise<RescueRequestRecord> {
  const payload: RescueRequestUpdateStatusRow = { status };

  const { data, error } = await client
    .from('rescue_requests')
    .update(payload)
    .eq('id', requestId)
    .select(RESCUE_REQUEST_COLUMNS)
    .single<RescueRequestRow>();
  if (error) {
    throw error;
  }

  return mapRescueRequestRow(data);
}

export async function getCurrentRescueRequesterContext(
  client: SupabaseClient,
): Promise<CurrentRescueRequesterContext> {
  const [{ data: barangayData, error: barangayError }, { data: householdData, error: householdError }] =
    await Promise.all([
      client.rpc('current_user_barangay_id'),
      client.rpc('current_user_household_id'),
    ]);

  if (barangayError) {
    throw barangayError;
  }

  if (householdError) {
    throw householdError;
  }

  return {
    barangayId: typeof barangayData === 'string' ? barangayData : null,
    householdId: typeof householdData === 'string' ? householdData : null,
  };
}
