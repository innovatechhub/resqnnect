import type { SupabaseClient } from '@supabase/supabase-js';

import type { RescueMissionStatus, RescueRequestStatus } from '../../constants/status';
import { RESCUE_MISSION_STATUSES, RESCUE_REQUEST_STATUSES } from '../../constants/status';
import { listEvacuationCenters } from './evacuation';
import { listReliefInventory } from './relief';
import { listRescueAssignments } from './rescueOperations';
import { listRescueRequests } from './rescueRequests';

export interface DashboardMetrics {
  rescueRequests: number;
  activeRescueRequests: number;
  assignedMissions: number;
  openEvacuationCenters: number;
  evacuationOccupancy: number;
  registeredHouseholds: number;
  vulnerableMembers: number;
  lowStockItems: number;
  reliefItems: number;
  verificationLogs: number;
}

export interface OperationalReport {
  requestStatusCounts: Record<RescueRequestStatus, number>;
  missionStatusCounts: Record<RescueMissionStatus, number>;
  rescueRequests: Awaited<ReturnType<typeof listRescueRequests>>;
  rescueAssignments: Awaited<ReturnType<typeof listRescueAssignments>>;
  evacuationCenters: Awaited<ReturnType<typeof listEvacuationCenters>>;
  reliefInventory: Awaited<ReturnType<typeof listReliefInventory>>;
}

async function countRows(
  client: SupabaseClient,
  table: string,
  filters: Array<{ column: string; value: string | number | boolean }> = [],
): Promise<number> {
  let query = client.from(table).select('id', { count: 'exact', head: true });

  for (const filter of filters) {
    query = query.eq(filter.column, filter.value);
  }

  const { count, error } = await query;
  if (error) {
    throw error;
  }

  return count ?? 0;
}

export async function getDashboardMetrics(
  client: SupabaseClient,
  options: { barangayId?: string; userId?: string } = {},
): Promise<DashboardMetrics> {
  const requestFilters = options.barangayId ? [{ column: 'barangay_id', value: options.barangayId }] : [];
  const householdFilters = options.barangayId ? [{ column: 'barangay_id', value: options.barangayId }] : [];
  const centerFilters = options.barangayId ? [{ column: 'barangay_id', value: options.barangayId }] : [];
  const inventoryFilters = options.barangayId ? [{ column: 'barangay_id', value: options.barangayId }] : [];
  const userRequestFilters = options.userId ? [{ column: 'requested_by', value: options.userId }] : requestFilters;

  const [
    rescueRequests,
    assignedMissions,
    openEvacuationCenters,
    registeredHouseholds,
    vulnerableMembers,
    lowStockItems,
    reliefItems,
    verificationLogs,
    centers,
    scopedRequests,
  ] = await Promise.all([
    countRows(client, 'rescue_requests', userRequestFilters),
    countRows(client, 'rescue_assignments', options.userId ? [{ column: 'assigned_to', value: options.userId }] : []),
    countRows(client, 'evacuation_centers', [...centerFilters, { column: 'status', value: 'open' }]),
    countRows(client, 'households', householdFilters),
    countRows(client, 'household_members', [{ column: 'is_vulnerable', value: true }]),
    countRows(client, 'relief_inventory', [...inventoryFilters, { column: 'status', value: 'low_stock' }]),
    countRows(client, 'relief_inventory', inventoryFilters),
    countRows(client, 'qr_verifications'),
    listEvacuationCenters(client, { barangayId: options.barangayId }),
    listRescueRequests(client, {
      barangayId: options.barangayId,
      requestedBy: options.userId,
    }),
  ]);

  return {
    rescueRequests,
    activeRescueRequests: scopedRequests.filter((request) => !['rescued', 'transferred', 'closed'].includes(request.status))
      .length,
    assignedMissions,
    openEvacuationCenters,
    evacuationOccupancy: centers.reduce((sum, center) => sum + center.currentOccupancy, 0),
    registeredHouseholds,
    vulnerableMembers,
    lowStockItems,
    reliefItems,
    verificationLogs,
  };
}

export async function getOperationalReport(
  client: SupabaseClient,
  options: { barangayId?: string } = {},
): Promise<OperationalReport> {
  const [requests, allAssignments, evacuationCenters, reliefInventory] = await Promise.all([
    listRescueRequests(client, { barangayId: options.barangayId }),
    listRescueAssignments(client),
    listEvacuationCenters(client, { barangayId: options.barangayId }),
    listReliefInventory(client, { barangayId: options.barangayId }),
  ]);
  const assignments = options.barangayId
    ? allAssignments.filter((assignment) => assignment.rescueRequest?.barangayId === options.barangayId)
    : allAssignments;

  const requestStatusCounts = Object.fromEntries(RESCUE_REQUEST_STATUSES.map((status) => [status, 0])) as Record<
    RescueRequestStatus,
    number
  >;
  const missionStatusCounts = Object.fromEntries(RESCUE_MISSION_STATUSES.map((status) => [status, 0])) as Record<
    RescueMissionStatus,
    number
  >;

  for (const request of requests) {
    requestStatusCounts[request.status] += 1;
  }

  for (const assignment of assignments) {
    missionStatusCounts[assignment.status] += 1;
  }

  return {
    requestStatusCounts,
    missionStatusCounts,
    rescueRequests: requests,
    rescueAssignments: assignments,
    evacuationCenters,
    reliefInventory,
  };
}
