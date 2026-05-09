import type { SupabaseClient } from '@supabase/supabase-js';

export interface ActiveRescuerLocation {
  rescuerId: string;
  rescuerName: string;
  latitude: number;
  longitude: number;
  accuracyMeters: number | null;
  recordedAt: string;
}

export interface RescuerTrailPoint {
  lat: number;
  lng: number;
  recordedAt: string;
}

export interface RescuerTrail {
  rescuerId: string;
  rescuerName: string;
  points: RescuerTrailPoint[];
}

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

interface RescuerLocationWithProfile {
  id: string;
  assigned_rescuer_id: string;
  latitude: number | string;
  longitude: number | string;
  accuracy_meters: number | string | null;
  recorded_at: string;
  profile: { full_name: string | null; barangay_id: string | null } | null;
}

export async function listLatestRescuerLocations(
  client: SupabaseClient,
  options: { barangayId?: string | null; sinceMinutes?: number } = {},
): Promise<ActiveRescuerLocation[]> {
  const sinceMinutes = options.sinceMinutes ?? 30;
  const since = new Date(Date.now() - sinceMinutes * 60 * 1000).toISOString();

  const { data, error } = await client
    .from('rescuer_locations')
    .select('id, assigned_rescuer_id, latitude, longitude, accuracy_meters, recorded_at, profile:assigned_rescuer_id (full_name, barangay_id)')
    .gte('recorded_at', since)
    .order('recorded_at', { ascending: false })
    .returns<RescuerLocationWithProfile[]>();

  if (error) {
    throw error;
  }

  const rows = data ?? [];
  const seen = new Set<string>();
  const results: ActiveRescuerLocation[] = [];

  for (const row of rows) {
    if (seen.has(row.assigned_rescuer_id)) {
      continue;
    }
    if (options.barangayId && row.profile?.barangay_id !== options.barangayId) {
      continue;
    }
    seen.add(row.assigned_rescuer_id);
    results.push({
      rescuerId: row.assigned_rescuer_id,
      rescuerName: row.profile?.full_name ?? 'Unknown Rescuer',
      latitude: toNumber(row.latitude),
      longitude: toNumber(row.longitude),
      accuracyMeters: toNumberOrNull(row.accuracy_meters),
      recordedAt: row.recorded_at,
    });
  }

  return results;
}

export async function listLocationsForRequest(
  client: SupabaseClient,
  rescueRequestId: string,
): Promise<RescuerTrail[]> {
  const { data: assignments, error: assignError } = await client
    .from('rescue_assignments')
    .select('assigned_to')
    .eq('rescue_request_id', rescueRequestId);

  if (assignError) {
    throw assignError;
  }

  const rescuerIds = (assignments ?? []).map((a: { assigned_to: string }) => a.assigned_to);
  if (rescuerIds.length === 0) {
    return [];
  }

  const { data: locations, error: locError } = await client
    .from('rescuer_locations')
    .select('assigned_rescuer_id, latitude, longitude, recorded_at, profile:assigned_rescuer_id (full_name)')
    .in('assigned_rescuer_id', rescuerIds)
    .order('recorded_at', { ascending: true })
    .returns<Array<{ assigned_rescuer_id: string; latitude: number | string; longitude: number | string; recorded_at: string; profile: { full_name: string | null } | null }>>();

  if (locError) {
    throw locError;
  }

  const trailMap = new Map<string, RescuerTrail>();
  for (const loc of locations ?? []) {
    const existing = trailMap.get(loc.assigned_rescuer_id);
    const point: RescuerTrailPoint = {
      lat: toNumber(loc.latitude),
      lng: toNumber(loc.longitude),
      recordedAt: loc.recorded_at,
    };
    if (existing) {
      existing.points.push(point);
    } else {
      trailMap.set(loc.assigned_rescuer_id, {
        rescuerId: loc.assigned_rescuer_id,
        rescuerName: loc.profile?.full_name ?? 'Unknown Rescuer',
        points: [point],
      });
    }
  }

  return Array.from(trailMap.values());
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
