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
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select } from '../components/ui/select';
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

export function AdminRescueOperationsPage() {
  const auth = useAuth();
  const client = useMemo(() => getSupabaseClient(), []);
  const queryClient = useQueryClient();
  const [actionError, setActionError] = useState<string | null>(null);
  const userId = auth.user?.id ?? null;

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
        summary="Assign responders to rescue requests and manage mission progress across teams."
      />

      {actionError ? (
        <Alert variant="destructive">
          <AlertDescription>{actionError}</AlertDescription>
        </Alert>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-[1fr_1.2fr]">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Create Assignment</CardTitle>
          </CardHeader>
          <CardContent>
          <form className="mt-3 space-y-3" noValidate onSubmit={(event) => void handleSubmit(onCreateAssignment)(event)}>
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

            <Button
              type="submit"
              disabled={
                createAssignmentMutation.isPending ||
                requestsQuery.isLoading ||
                rescuersQuery.isLoading ||
                openRequests.length === 0
              }
            >
              {createAssignmentMutation.isPending ? 'Assigning...' : 'Create Assignment'}
            </Button>
          </form>
          </CardContent>
        </Card>

        <Card className="bg-muted/35">
          <CardHeader className="pb-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle className="text-base">Mission Queue</CardTitle>
            <Button type="button" variant="outline" size="sm" onClick={() => void assignmentsQuery.refetch()}>
              Refresh
            </Button>
          </div>
          </CardHeader>
          <CardContent>

          {assignmentsQuery.isLoading ? <p className="mt-3 text-sm text-muted-foreground">Loading assignments...</p> : null}
          {assignmentsQuery.isError ? (
            <Alert variant="destructive" className="mt-3">
              <AlertDescription>
                {assignmentsQuery.error instanceof Error
                  ? assignmentsQuery.error.message
                  : 'Failed to load assignments.'}
              </AlertDescription>
            </Alert>
          ) : null}

          <div className="mt-3 space-y-2">
            {(assignmentsQuery.data ?? []).map((assignment) => (
              <article key={assignment.id} className="rounded-lg border border-border bg-card p-3 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-foreground">
                      {assignment.rescueRequest?.emergencyType ?? 'Unlinked Request'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Rescuer: {rescuerMap.get(assignment.assignedTo) ?? assignment.assignedTo}
                      {assignment.teamName ? ` | Team: ${assignment.teamName}` : ''}
                    </p>
                  </div>
                  <Badge className={RESCUE_MISSION_STATUS_BADGE_CLASSES[assignment.status]}>
                    {RESCUE_MISSION_STATUS_LABELS[assignment.status]}
                  </Badge>
                </div>

                <p className="mt-2 text-sm text-muted-foreground">
                  {assignment.assignmentNotes ?? 'No assignment notes.'}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Updated {formatTimestamp(assignment.updatedAt)}
                </p>

                <Label className="mt-2 flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
                  <span>Status</span>
                  <Select
                    value={assignment.status}
                    disabled={updateAssignmentStatusMutation.isPending}
                    onChange={(event) =>
                      void onStatusChange(assignment.id, event.target.value as RescueMissionStatus)
                    }
                    className="h-8 min-w-36 text-xs"
                  >
                    {RESCUE_MISSION_STATUSES.map((status) => (
                      <option key={status} value={status}>
                        {RESCUE_MISSION_STATUS_LABELS[status]}
                      </option>
                    ))}
                  </Select>
                </Label>
              </article>
            ))}
            {!assignmentsQuery.isLoading && (assignmentsQuery.data ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground">No assignments yet.</p>
            ) : null}
          </div>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
