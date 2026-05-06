import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';

import { SectionHeader } from '../components/system/SectionHeader';
import { Alert, AlertDescription } from '../components/ui/alert';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Label } from '../components/ui/label';
import { Select } from '../components/ui/select';
import { useAuth } from '../features/auth/useAuth';
import {
  RESCUE_MISSION_STATUS_BADGE_CLASSES,
  RESCUE_MISSION_STATUS_LABELS,
  RESCUER_UPDATEABLE_MISSION_STATUSES,
} from '../features/rescueOperations/presentation';
import { getSupabaseClient } from '../services/supabase/client';
import {
  listRescueAssignments,
  syncRequestStatusFromMission,
  updateRescueAssignmentStatus,
} from '../services/supabase/rescueOperations';

interface RescuerMissionsPageProps {
  mode: 'active' | 'history';
}

function formatTimestamp(value: string | null): string {
  if (!value) {
    return 'Not recorded';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

function RescuerMissionsPageBase({ mode }: RescuerMissionsPageProps) {
  const auth = useAuth();
  const client = useMemo(() => getSupabaseClient(), []);
  const queryClient = useQueryClient();
  const [actionError, setActionError] = useState<string | null>(null);

  const userId = auth.user?.id ?? null;
  const isHistoryMode = mode === 'history';
  const queryKey = useMemo(() => ['rescue-assignments', 'rescuer', userId] as const, [userId]);

  const assignmentsQuery = useQuery({
    queryKey,
    enabled: Boolean(client && auth.status === 'authenticated' && auth.role === 'rescuer' && userId),
    queryFn: async () => listRescueAssignments(client!, { assignedTo: userId! }),
  });

  const updateStatusMutation = useMutation({
    mutationFn: async (payload: { assignmentId: string; status: (typeof RESCUER_UPDATEABLE_MISSION_STATUSES)[number] }) => {
      if (!client) {
        throw new Error('Supabase is unavailable.');
      }

      const assignment = await updateRescueAssignmentStatus(client, payload.assignmentId, payload.status);
      await syncRequestStatusFromMission(client, assignment.rescueRequestId, assignment.status);
      return assignment;
    },
    onSuccess: async () => {
      setActionError(null);
      await queryClient.invalidateQueries({ queryKey });
    },
  });

  useEffect(() => {
    if (!client || !userId) {
      return;
    }

    const channel = client
      .channel(`rescue-assignments-rescuer-${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'rescue_assignments',
          filter: `assigned_to=eq.${userId}`,
        },
        () => {
          void queryClient.invalidateQueries({ queryKey });
        },
      )
      .subscribe();

    return () => {
      void client.removeChannel(channel);
    };
  }, [client, queryClient, queryKey, userId]);

  const missions = useMemo(() => {
    const source = assignmentsQuery.data ?? [];
    return source.filter((item) => (isHistoryMode ? item.status === 'closed' : item.status !== 'closed'));
  }, [assignmentsQuery.data, isHistoryMode]);

  async function onStatusChange(assignmentId: string, status: (typeof RESCUER_UPDATEABLE_MISSION_STATUSES)[number]) {
    try {
      await updateStatusMutation.mutateAsync({ assignmentId, status });
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Failed to update mission status.');
    }
  }

  if (!client) {
    return (
      <Alert variant="warning">
        <AlertDescription>Configure Supabase env variables to use mission workflows.</AlertDescription>
      </Alert>
    );
  }

  return (
    <section className="space-y-5">
      <SectionHeader
        missionTag="Mission 7"
        title={isHistoryMode ? 'Mission History' : 'Assigned Missions'}
        summary={
          isHistoryMode
            ? 'Review completed missions with pickup and handover timestamps.'
            : 'Track active assignments and push field status updates.'
        }
      />

      {actionError ? (
        <Alert variant="destructive">
          <AlertDescription>{actionError}</AlertDescription>
        </Alert>
      ) : null}

      <Card className="bg-muted/35">
        <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-base">
            {isHistoryMode ? 'Completed Mission Records' : 'Active Mission Queue'}
          </CardTitle>
          <Button type="button" variant="outline" size="sm" onClick={() => void assignmentsQuery.refetch()}>
            Refresh
          </Button>
        </div>
        </CardHeader>
        <CardContent>

        {assignmentsQuery.isLoading ? <p className="mt-3 text-sm text-muted-foreground">Loading missions...</p> : null}
        {assignmentsQuery.isError ? (
          <Alert variant="destructive" className="mt-3">
            <AlertDescription>
              {assignmentsQuery.error instanceof Error ? assignmentsQuery.error.message : 'Failed to load missions.'}
            </AlertDescription>
          </Alert>
        ) : null}

        <div className="mt-3 space-y-2">
          {missions.map((mission) => (
            <article key={mission.id} className="rounded-lg border border-border bg-card p-3 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    {mission.rescueRequest?.emergencyType ?? 'Mission'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Severity {mission.rescueRequest?.severityLevel ?? '-'} | Affected {mission.rescueRequest?.peopleCount ?? '-'} |{' '}
                    {mission.teamName ?? 'No team label'}
                  </p>
                </div>
                <Badge className={RESCUE_MISSION_STATUS_BADGE_CLASSES[mission.status]}>
                  {RESCUE_MISSION_STATUS_LABELS[mission.status]}
                </Badge>
              </div>

              <p className="mt-2 text-sm text-muted-foreground">
                {mission.assignmentNotes ?? 'No assignment notes available.'}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Pickup: {formatTimestamp(mission.pickupAt)} | Handover: {formatTimestamp(mission.handoverAt)}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">Updated {formatTimestamp(mission.updatedAt)}</p>

              {!isHistoryMode ? (
                <Label className="mt-2 flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
                  <span>Update Status</span>
                  <Select
                    value={mission.status}
                    disabled={updateStatusMutation.isPending}
                    onChange={(event) =>
                      void onStatusChange(
                        mission.id,
                        event.target.value as (typeof RESCUER_UPDATEABLE_MISSION_STATUSES)[number],
                      )
                    }
                    className="h-8 min-w-36 text-xs"
                  >
                    {RESCUER_UPDATEABLE_MISSION_STATUSES.map((status) => (
                      <option key={status} value={status}>
                        {RESCUE_MISSION_STATUS_LABELS[status]}
                      </option>
                    ))}
                  </Select>
                </Label>
              ) : null}
            </article>
          ))}
          {!assignmentsQuery.isLoading && missions.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {isHistoryMode ? 'No completed missions yet.' : 'No active assignments yet.'}
            </p>
          ) : null}
        </div>
        </CardContent>
      </Card>
    </section>
  );
}

export function RescuerMissionsPage() {
  return <RescuerMissionsPageBase mode="active" />;
}

export function RescuerMissionHistoryPage() {
  return <RescuerMissionsPageBase mode="history" />;
}
