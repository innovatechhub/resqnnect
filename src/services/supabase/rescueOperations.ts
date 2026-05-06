import type { SupabaseClient } from '@supabase/supabase-js';

import {
  isRescueMissionStatus,
  isRescueRequestStatus,
  type RescueMissionStatus,
  type RescueRequestStatus,
} from '../../constants/status';
import { updateRescueRequestStatus } from './rescueRequests';

interface RescueRequestSummaryRow {
  id: string;
  emergency_type: string;
  severity_level: number;
  people_count: number;
  barangay_id: string;
  location_text: string | null;
  status: string;
}

interface RescueAssignmentRow {
  id: string;
  rescue_request_id: string;
  assigned_to: string;
  assigned_by: string;
  team_name: string | null;
  status: string;
  assignment_notes: string | null;
  pickup_at: string | null;
  handover_at: string | null;
  created_at: string;
  updated_at: string;
  rescue_request: RescueRequestSummaryRow | null;
}

interface RescueAssignmentInsertRow {
  rescue_request_id: string;
  assigned_to: string;
  assigned_by: string;
  team_name: string | null;
  status: RescueMissionStatus;
  assignment_notes: string | null;
}

interface RescueAssignmentUpdateRow {
  status: RescueMissionStatus;
  pickup_at?: string;
  handover_at?: string;
}

interface RescuerProfileRow {
  id: string;
  full_name: string | null;
  barangay_id: string | null;
}

export interface RescueRequestSummaryRecord {
  id: string;
  emergencyType: string;
  severityLevel: number;
  peopleCount: number;
  barangayId: string;
  locationText: string | null;
  status: RescueRequestStatus;
}

export interface RescueAssignmentRecord {
  id: string;
  rescueRequestId: string;
  assignedTo: string;
  assignedBy: string;
  teamName: string | null;
  status: RescueMissionStatus;
  assignmentNotes: string | null;
  pickupAt: string | null;
  handoverAt: string | null;
  createdAt: string;
  updatedAt: string;
  rescueRequest: RescueRequestSummaryRecord | null;
}

export interface CreateRescueAssignmentInput {
  rescueRequestId: string;
  assignedTo: string;
  assignedBy: string;
  teamName: string | null;
  assignmentNotes: string | null;
  status?: RescueMissionStatus;
}

export interface ListRescueAssignmentsOptions {
  assignedTo?: string;
  rescueRequestId?: string;
  statuses?: RescueMissionStatus[];
}

export interface RescuerProfileRecord {
  id: string;
  fullName: string | null;
  barangayId: string | null;
}

const RESCUE_REQUEST_SUMMARY_COLUMNS =
  'id, emergency_type, severity_level, people_count, barangay_id, location_text, status';
const RESCUE_ASSIGNMENT_COLUMNS =
  'id, rescue_request_id, assigned_to, assigned_by, team_name, status, assignment_notes, pickup_at, handover_at, created_at, updated_at';

function normalizeMissionStatus(status: string): RescueMissionStatus {
  return isRescueMissionStatus(status) ? status : 'assigned';
}

function mapRescueRequestStatusFromAssignment(status: RescueMissionStatus): RescueRequestStatus {
  if (status === 'queued' || status === 'assigned') {
    return 'assigned';
  }

  if (status === 'en_route' || status === 'on_site' || status === 'pickup_complete') {
    return 'in_progress';
  }

  if (status === 'handover_complete') {
    return 'rescued';
  }

  return 'closed';
}

function mapRescueRequestSummary(row: RescueRequestSummaryRow): RescueRequestSummaryRecord {
  return {
    id: row.id,
    emergencyType: row.emergency_type,
    severityLevel: row.severity_level,
    peopleCount: row.people_count,
    barangayId: row.barangay_id,
    locationText: row.location_text,
    status: isRescueRequestStatus(row.status) ? row.status : 'pending',
  };
}

function mapRescueAssignment(row: RescueAssignmentRow): RescueAssignmentRecord {
  return {
    id: row.id,
    rescueRequestId: row.rescue_request_id,
    assignedTo: row.assigned_to,
    assignedBy: row.assigned_by,
    teamName: row.team_name,
    status: normalizeMissionStatus(row.status),
    assignmentNotes: row.assignment_notes,
    pickupAt: row.pickup_at,
    handoverAt: row.handover_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    rescueRequest: row.rescue_request ? mapRescueRequestSummary(row.rescue_request) : null,
  };
}

export async function listRescueAssignments(
  client: SupabaseClient,
  options: ListRescueAssignmentsOptions = {},
): Promise<RescueAssignmentRecord[]> {
  let query = client
    .from('rescue_assignments')
    .select(`${RESCUE_ASSIGNMENT_COLUMNS}, rescue_request:rescue_request_id (${RESCUE_REQUEST_SUMMARY_COLUMNS})`)
    .order('updated_at', { ascending: false });

  if (options.assignedTo) {
    query = query.eq('assigned_to', options.assignedTo);
  }

  if (options.rescueRequestId) {
    query = query.eq('rescue_request_id', options.rescueRequestId);
  }

  if (options.statuses && options.statuses.length > 0) {
    query = query.in('status', options.statuses);
  }

  const { data, error } = await query.returns<RescueAssignmentRow[]>();
  if (error) {
    throw error;
  }

  return (data ?? []).map(mapRescueAssignment);
}

export async function listRescuerProfiles(client: SupabaseClient): Promise<RescuerProfileRecord[]> {
  const { data, error } = await client
    .from('profiles')
    .select('id, full_name, barangay_id')
    .eq('role', 'rescuer')
    .order('full_name', { ascending: true })
    .returns<RescuerProfileRow[]>();

  if (error) {
    throw error;
  }

  return (data ?? []).map((row) => ({
    id: row.id,
    fullName: row.full_name,
    barangayId: row.barangay_id,
  }));
}

export async function createRescueAssignment(
  client: SupabaseClient,
  input: CreateRescueAssignmentInput,
): Promise<RescueAssignmentRecord> {
  const payload: RescueAssignmentInsertRow = {
    rescue_request_id: input.rescueRequestId,
    assigned_to: input.assignedTo,
    assigned_by: input.assignedBy,
    team_name: input.teamName,
    assignment_notes: input.assignmentNotes,
    status: input.status ?? 'assigned',
  };

  const { data, error } = await client
    .from('rescue_assignments')
    .insert(payload)
    .select(`${RESCUE_ASSIGNMENT_COLUMNS}, rescue_request:rescue_request_id (${RESCUE_REQUEST_SUMMARY_COLUMNS})`)
    .single<RescueAssignmentRow>();

  if (error) {
    throw error;
  }

  return mapRescueAssignment(data);
}

export async function updateRescueAssignmentStatus(
  client: SupabaseClient,
  assignmentId: string,
  status: RescueMissionStatus,
): Promise<RescueAssignmentRecord> {
  const nowIso = new Date().toISOString();
  const payload: RescueAssignmentUpdateRow = {
    status,
  };
  if (status === 'pickup_complete') {
    payload.pickup_at = nowIso;
  }
  if (status === 'handover_complete' || status === 'closed') {
    payload.handover_at = nowIso;
  }

  const { data, error } = await client
    .from('rescue_assignments')
    .update(payload)
    .eq('id', assignmentId)
    .select(`${RESCUE_ASSIGNMENT_COLUMNS}, rescue_request:rescue_request_id (${RESCUE_REQUEST_SUMMARY_COLUMNS})`)
    .single<RescueAssignmentRow>();

  if (error) {
    throw error;
  }

  return mapRescueAssignment(data);
}

export async function syncRequestStatusFromMission(
  client: SupabaseClient,
  requestId: string,
  missionStatus: RescueMissionStatus,
): Promise<void> {
  await updateRescueRequestStatus(client, requestId, mapRescueRequestStatusFromAssignment(missionStatus));
}
