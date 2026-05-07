import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';

import { RESCUE_MISSION_STATUSES, type RescueMissionStatus } from '../constants/status';
import { SectionHeader } from '../components/system/SectionHeader';
import { Alert, AlertDescription } from '../components/ui/alert';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { DataTablePagination, DataTableToolbar } from '../components/ui/data-table-controls';
import { Dialog } from '../components/ui/dialog';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select } from '../components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableHeaderCell,
  TableRow,
} from '../components/ui/table';
import { Textarea } from '../components/ui/textarea';
import { useAuth } from '../features/auth/useAuth';
import {
  RESCUE_MISSION_STATUS_BADGE_CLASSES,
  RESCUE_MISSION_STATUS_LABELS,
} from '../features/rescueOperations/presentation';
import type {
  RescueAssignmentFormValues,
  RescueAssignmentStatusUpdateInput,
} from '../features/rescueOperations/types';
import {
  INITIAL_RESCUE_ASSIGNMENT_FORM_VALUES,
  normalizeRescueAssignmentFormValues,
  rescueAssignmentFormSchema,
} from '../features/rescueOperations/validation';
import { getSupabaseClient } from '../services/supabase/client';
import {
  createRescueAssignment,
  listRescueAssignments,
  listRescuerProfiles,
  syncRequestStatusFromMission,
  updateRescueAssignmentStatus,
} from '../services/supabase/rescueOperations';
import { listRescueRequests } from '../services/supabase/rescueRequests';
import { getPageCount, paginateItems, sortByKey, type SortDirection } from '../lib/table';

const errorClass = 'mt-1 text-xs text-destructive';

function formatTimestamp(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

function formatRescueRequestOptionLabel(item: {
  emergencyType: string;
  severityLevel: number;
  peopleCount: number;
  status: string;
}): string {
  return `${item.emergencyType} | Severity ${item.severityLevel} | ${item.peopleCount} pax | ${item.status}`;
}

function formatRequestStatusLabel(status: string): string {
  return status.replaceAll('_', ' ');
}

export function AdminRescueOperationsPage() {
  const auth = useAuth();
  const client = useMemo(() => getSupabaseClient(), []);
  const queryClient = useQueryClient();
  const [actionError, setActionError] = useState<string | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [page, setPage] = useState(0);
  const userId = auth.user?.id ?? null;
  const pageSize = 8;

  const requestsQueryKey = ['rescue-requests', 'operations-options', 'admin'] as const;
  const rescuersQueryKey = ['rescuer-profiles', 'admin'] as const;
  const assignmentsQueryKey = ['rescue-assignments', 'admin'] as const;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<RescueAssignmentFormValues>({
    resolver: zodResolver(rescueAssignmentFormSchema),
    defaultValues: INITIAL_RESCUE_ASSIGNMENT_FORM_VALUES,
  });

  const requestsQuery = useQuery({
    queryKey: requestsQueryKey,
    enabled: Boolean(client && auth.status === 'authenticated' && auth.role === 'mdrrmo_admin'),
    queryFn: async () => listRescueRequests(client!),
  });

  const rescuersQuery = useQuery({
    queryKey: rescuersQueryKey,
    enabled: Boolean(client && auth.status === 'authenticated' && auth.role === 'mdrrmo_admin'),
    queryFn: async () => listRescuerProfiles(client!),
  });

  const assignmentsQuery = useQuery({
    queryKey: assignmentsQueryKey,
    enabled: Boolean(client && auth.status === 'authenticated' && auth.role === 'mdrrmo_admin'),
    queryFn: async () => listRescueAssignments(client!),
  });

  const createAssignmentMutation = useMutation({
    mutationFn: async (values: RescueAssignmentFormValues) => {
      if (!client || !userId) {
        throw new Error('You must be logged in to create assignments.');
      }

      const normalized = normalizeRescueAssignmentFormValues(values);
      const assignment = await createRescueAssignment(client, {
        rescueRequestId: normalized.rescueRequestId,
        assignedTo: normalized.assignedTo,
        assignedBy: userId,
        teamName: normalized.teamName,
        assignmentNotes: normalized.assignmentNotes,
      });
      await syncRequestStatusFromMission(client, assignment.rescueRequestId, assignment.status);
      return assignment;
    },
    onSuccess: async () => {
      reset(INITIAL_RESCUE_ASSIGNMENT_FORM_VALUES);
      setActionError(null);
      setIsCreateDialogOpen(false);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: assignmentsQueryKey }),
        queryClient.invalidateQueries({ queryKey: requestsQueryKey }),
      ]);
    },
  });

  const updateAssignmentStatusMutation = useMutation({
    mutationFn: async (input: RescueAssignmentStatusUpdateInput) => {
      if (!client) {
        throw new Error('Supabase is unavailable.');
      }

      const assignment = await updateRescueAssignmentStatus(client, input.assignmentId, input.status);
      await syncRequestStatusFromMission(client, assignment.rescueRequestId, assignment.status);
      return assignment;
    },
    onSuccess: async () => {
      setActionError(null);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: assignmentsQueryKey }),
        queryClient.invalidateQueries({ queryKey: requestsQueryKey }),
      ]);
    },
  });

  useEffect(() => {
    if (!client) {
      return;
    }

    const channel = client
      .channel('rescue-operations-admin')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'rescue_assignments' },
        () => {
          void queryClient.invalidateQueries({ queryKey: assignmentsQueryKey });
        },
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'rescue_requests' },
        () => {
          void queryClient.invalidateQueries({ queryKey: requestsQueryKey });
        },
      )
      .subscribe();

    return () => {
      void client.removeChannel(channel);
    };
  }, [client, queryClient]);

  const openRequests = useMemo(
    () =>
      (requestsQuery.data ?? []).filter((item) =>
        ['pending', 'acknowledged', 'assigned', 'in_progress'].includes(item.status),
      ),
    [requestsQuery.data],
  );
  const rescuerMap = useMemo(() => {
    const result = new Map<string, string>();
    for (const rescuer of rescuersQuery.data ?? []) {
      result.set(rescuer.id, rescuer.fullName ?? rescuer.id);
    }
    return result;
  }, [rescuersQuery.data]);
  const filteredAssignments = useMemo(() => {
    const query = search.trim().toLowerCase();
    const scoped = query
      ? (assignmentsQuery.data ?? []).filter((assignment) =>
          [
            assignment.rescueRequest?.emergencyType,
            assignment.teamName,
            assignment.assignmentNotes,
            rescuerMap.get(assignment.assignedTo),
          ].some((value) => (value ?? '').toLowerCase().includes(query)),
        )
      : (assignmentsQuery.data ?? []);

    return sortByKey(scoped, (assignment) => assignment.updatedAt, sortDirection);
  }, [assignmentsQuery.data, rescuerMap, search, sortDirection]);
  const pageCount = getPageCount(filteredAssignments.length, pageSize);
  const pagedAssignments = useMemo(() => paginateItems(filteredAssignments, page, pageSize), [filteredAssignments, page]);

  useEffect(() => {
    setPage(0);
  }, [search, sortDirection]);

  async function onCreateAssignment(values: RescueAssignmentFormValues) {
    try {
      await createAssignmentMutation.mutateAsync(values);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Failed to create rescue assignment.');
    }
  }

  async function onStatusChange(assignmentId: string, status: RescueMissionStatus) {
    try {
      await updateAssignmentStatusMutation.mutateAsync({ assignmentId, status });
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Failed to update assignment status.');
    }
  }

  if (!client) {
    return (
      <Alert variant="warning">
        <AlertDescription>Configure Supabase env variables to use rescue operations workflows.</AlertDescription>
      </Alert>
    );
  }

  return (
    <section className="space-y-5">
      <SectionHeader
        missionTag="Mission 7"
        title="Rescue Operations Command"
        summary="Assignment queue and mission lifecycle controls for MDRRMO dispatch."
      />

      {actionError ? (
        <Alert variant="destructive">
          <AlertDescription>{actionError}</AlertDescription>
        </Alert>
      ) : null}

      <Card className="bg-muted/35">
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle className="text-base">Mission Queue</CardTitle>
            <div className="flex gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => void assignmentsQuery.refetch()}>
                Refresh
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={() => setIsCreateDialogOpen(true)}
                disabled={openRequests.length === 0 || rescuersQuery.isLoading}
              >
                New Assignment
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <DataTableToolbar
            value={search}
            onValueChange={setSearch}
            placeholder="Search request, team, rescuer, or notes"
            summary={`${filteredAssignments.length} assignments`}
          />
          <TableContainer>
            <Table>
              <TableHead>
                <tr>
                  <TableHeaderCell>Request</TableHeaderCell>
                  <TableHeaderCell>Rescuer</TableHeaderCell>
                  <TableHeaderCell>Team</TableHeaderCell>
                  <TableHeaderCell>Status</TableHeaderCell>
                  <TableHeaderCell>
                    <button type="button" onClick={() => setSortDirection((value) => (value === 'asc' ? 'desc' : 'asc'))}>
                      Updated
                    </button>
                  </TableHeaderCell>
                  <TableHeaderCell className="text-right">Lifecycle</TableHeaderCell>
                </tr>
              </TableHead>
              <TableBody>
                {pagedAssignments.map((assignment) => (
                  <TableRow key={assignment.id}>
                    <TableCell>
                      <p className="font-medium">{assignment.rescueRequest?.emergencyType ?? 'Unlinked Request'}</p>
                      {assignment.rescueRequest ? (
                        <div className="space-y-0.5 text-xs text-muted-foreground">
                          <p>
                            Severity {assignment.rescueRequest.severityLevel} | {assignment.rescueRequest.peopleCount} people
                          </p>
                          <p>{assignment.rescueRequest.locationText ?? 'Location not provided'}</p>
                          <p className="capitalize">{formatRequestStatusLabel(assignment.rescueRequest.status)}</p>
                        </div>
                      ) : (
                        <p className="text-xs text-muted-foreground">Request details unavailable</p>
                      )}
                    </TableCell>
                    <TableCell>{rescuerMap.get(assignment.assignedTo) ?? assignment.assignedTo}</TableCell>
                    <TableCell>{assignment.teamName ?? 'N/A'}</TableCell>
                    <TableCell>
                      <Badge className={RESCUE_MISSION_STATUS_BADGE_CLASSES[assignment.status]}>
                        {RESCUE_MISSION_STATUS_LABELS[assignment.status]}
                      </Badge>
                    </TableCell>
                    <TableCell>{formatTimestamp(assignment.updatedAt)}</TableCell>
                    <TableCell>
                      <div className="flex justify-end">
                        <Select
                          value={assignment.status}
                          disabled={updateAssignmentStatusMutation.isPending}
                          onChange={(event) =>
                            void onStatusChange(assignment.id, event.target.value as RescueMissionStatus)
                          }
                          className="h-8 min-w-44 text-xs"
                        >
                          {RESCUE_MISSION_STATUSES.map((status) => (
                            <option key={status} value={status}>
                              {RESCUE_MISSION_STATUS_LABELS[status]}
                            </option>
                          ))}
                        </Select>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          {!assignmentsQuery.isLoading && (assignmentsQuery.data ?? []).length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">No assignments yet.</p>
          ) : null}
          <div className="mt-3">
            <DataTablePagination
              page={page}
              pageCount={pageCount}
              totalCount={filteredAssignments.length}
              pageSize={pageSize}
              onPageChange={setPage}
            />
          </div>
        </CardContent>
      </Card>

      <Dialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        title="Create Assignment"
        description="Assign an active rescue request to a rescuer and dispatch team."
        footer={
          <Button
            type="submit"
            form="assignment-form"
            disabled={
              createAssignmentMutation.isPending || requestsQuery.isLoading || rescuersQuery.isLoading || openRequests.length === 0
            }
          >
            {createAssignmentMutation.isPending ? 'Assigning...' : 'Create Assignment'}
          </Button>
        }
      >
        <form id="assignment-form" className="space-y-3" noValidate onSubmit={(event) => void handleSubmit(onCreateAssignment)(event)}>
          <div>
            <Label className="mb-1 block text-xs uppercase tracking-wide text-muted-foreground">Rescue Request</Label>
            <Select {...register('rescueRequestId')}>
              <option value="">Select request</option>
              {openRequests.map((item) => (
                <option key={item.id} value={item.id}>
                  {formatRescueRequestOptionLabel(item)}
                </option>
              ))}
            </Select>
            {errors.rescueRequestId ? <p className={errorClass}>{errors.rescueRequestId.message}</p> : null}
          </div>

          <div>
            <Label className="mb-1 block text-xs uppercase tracking-wide text-muted-foreground">Rescuer</Label>
            <Select {...register('assignedTo')}>
              <option value="">Select rescuer</option>
              {(rescuersQuery.data ?? []).map((rescuer) => (
                <option key={rescuer.id} value={rescuer.id}>
                  {rescuer.fullName ?? rescuer.id}
                </option>
              ))}
            </Select>
            {errors.assignedTo ? <p className={errorClass}>{errors.assignedTo.message}</p> : null}
          </div>

          <div>
            <Label className="mb-1 block text-xs uppercase tracking-wide text-muted-foreground">Team Name</Label>
            <Input placeholder="Alpha Team" {...register('teamName')} />
            {errors.teamName ? <p className={errorClass}>{errors.teamName.message}</p> : null}
          </div>

          <div>
            <Label className="mb-1 block text-xs uppercase tracking-wide text-muted-foreground">Assignment Notes</Label>
            <Textarea
              rows={3}
              placeholder="Dispatch constraints, hazards, and instructions."
              {...register('assignmentNotes')}
            />
            {errors.assignmentNotes ? <p className={errorClass}>{errors.assignmentNotes.message}</p> : null}
          </div>
        </form>
      </Dialog>
    </section>
  );
}
