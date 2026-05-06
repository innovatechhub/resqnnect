import type { SupabaseClient } from '@supabase/supabase-js';

interface RescuerLocationRow {
  id: string;
  assigned_rescuer_id: string;
  rescue_assignment_id: string | null;
  latitude: number | string;
  longitude: number | string;
  accuracy_meters: number | string | null;
  recorded_at: string;
  created_at: string;
}

interface RescuerLocationInsertRow {
  assigned_rescuer_id: string;
  rescue_assignment_id: string | null;
  latitude: number;
  longitude: number;
  accuracy_meters: number | null;
  recorded_at: string;
}

export interface RescuerLocationRecord {
  id: string;
  assignedRescuerId: string;
  rescueAssignmentId: string | null;
  latitude: number;
  longitude: number;
  accuracyMeters: number | null;
  recordedAt: string;
  createdAt: string;
}

export interface ListRescuerLocationsOptions {
  assignedRescuerId: string;
  rescueAssignmentId?: string;
  limit?: number;
}

export interface PublishRescuerLocationInput {
  assignedRescuerId: string;
  rescueAssignmentId: string | null;
  latitude: number;
  longitude: number;
  accuracyMeters: number | null;
  recordedAt?: string;
}

const RESCUER_LOCATION_COLUMNS =
  'id, assigned_rescuer_id, rescue_assignment_id, latitude, longitude, accuracy_meters, recorded_at, created_at';

function toNumber(value: number | string): number {
  return typeof value === 'number' ? value : Number(value);
}

function toNumberOrNull(value: number | string | null): number | null {
  if (value === null) {
    return null;
  }

  return typeof value === 'number' ? value : Number(value);
}

function mapRescuerLocationRow(row: RescuerLocationRow): RescuerLocationRecord {
  return {
    id: row.id,
    assignedRescuerId: row.assigned_rescuer_id,
    rescueAssignmentId: row.rescue_assignment_id,
    latitude: toNumber(row.latitude),
    longitude: toNumber(row.longitude),
    accuracyMeters: toNumberOrNull(row.accuracy_meters),
    recordedAt: row.recorded_at,
    createdAt: row.created_at,
  };
}

export async function listRescuerLocations(
  client: SupabaseClient,
  options: ListRescuerLocationsOptions,
): Promise<RescuerLocationRecord[]> {
  let query = client
    .from('rescuer_locations')
    .select(RESCUER_LOCATION_COLUMNS)
    .eq('assigned_rescuer_id', options.assignedRescuerId)
    .order('recorded_at', { ascending: true });

  if (options.rescueAssignmentId) {
    query = query.eq('rescue_assignment_id', options.rescueAssignmentId);
  }

  if (options.limit && options.limit > 0) {
    query = query.limit(options.limit);
  }

  const { data, error } = await query.returns<RescuerLocationRow[]>();
  if (error) {
    throw error;
  }

  return (data ?? []).map(mapRescuerLocationRow);
}

export async function publishRescuerLocation(
  client: SupabaseClient,
  input: PublishRescuerLocationInput,
): Promise<RescuerLocationRecord> {
  const payload: RescuerLocationInsertRow = {
    assigned_rescuer_id: input.assignedRescuerId,
    rescue_assignment_id: input.rescueAssignmentId,
    latitude: input.latitude,
    longitude: input.longitude,
    accuracy_meters: input.accuracyMeters,
    recorded_at: input.recordedAt ?? new Date().toISOString(),
  };

  const { data, error } = await client
    .from('rescuer_locations')
    .insert(payload)
    .select(RESCUER_LOCATION_COLUMNS)
    .single<RescuerLocationRow>();

  if (error) {
    throw error;
  }

  return mapRescuerLocationRow(data);
}
