import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import { SectionHeader } from '../components/system/SectionHeader';
import { Alert, AlertDescription } from '../components/ui/alert';
import { Badge } from '../components/ui/badge';
import { buttonVariants } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Select } from '../components/ui/select';
import { RESCUE_REQUEST_STATUSES, type RescueRequestStatus } from '../constants/status';
import {
  RESCUE_REQUEST_STATUS_BADGE_CLASSES,
  RESCUE_REQUEST_STATUS_LABELS,
} from '../features/rescueRequests/presentation';
import { getSupabaseClient } from '../services/supabase/client';
import { listRescueAssignments } from '../services/supabase/rescueOperations';
import { getRescueRequest, updateRescueRequestStatus } from '../services/supabase/rescueRequests';

function formatDateTime(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(date);
}

export function RescueRequestDetailPage() {
  const { requestId = '' } = useParams();
  const client = useMemo(() => getSupabaseClient(), []);
  const queryClient = useQueryClient();
  const [actionError, setActionError] = useState<string | null>(null);

  const requestQuery = useQuery({
    queryKey: ['rescue-request-detail', requestId],
    enabled: Boolean(client && requestId),
    queryFn: async () => getRescueRequest(client!, requestId),
  });

  const assignmentsQuery = useQuery({
    queryKey: ['rescue-request-assignments', requestId],
    enabled: Boolean(client && requestId),
    queryFn: async () => listRescueAssignments(client!, { rescueRequestId: requestId }),
  });

  const updateMutation = useMutation({
    mutationFn: async (status: RescueRequestStatus) => updateRescueRequestStatus(client!, requestId, status),
    onSuccess: async () => {
      setActionError(null);
      await queryClient.invalidateQueries({ queryKey: ['rescue-request-detail', requestId] });
      await queryClient.invalidateQueries({ queryKey: ['rescue-requests'] });
    },
  });

  async function updateStatus(status: RescueRequestStatus) {
    try {
      await updateMutation.mutateAsync(status);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Failed to update request status.');
    }
  }

  if (!client) {
    return (
      <Alert variant="warning">
        <AlertDescription>Configure Supabase env variables to view rescue request details.</AlertDescription>
      </Alert>
    );
  }

  const request = requestQuery.data;

  return (
    <section className="space-y-5">
      <SectionHeader
        missionTag="Mission 6"
        title="Rescue Request Detail"
        summary="Incident details, location context, assignments, and status audit context."
      />

      {actionError || requestQuery.isError ? (
        <Alert variant="destructive">
          <AlertDescription>
            {actionError ??
              (requestQuery.error instanceof Error ? requestQuery.error.message : 'Failed to load request detail.')}
          </AlertDescription>
        </Alert>
      ) : null}

      {!request && requestQuery.isLoading ? <p className="text-sm text-muted-foreground">Loading request...</p> : null}

      {request ? (
        <>
          <Card>
            <CardHeader className="pb-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <CardTitle className="text-base">{request.emergencyType}</CardTitle>
                <Badge className={RESCUE_REQUEST_STATUS_BADGE_CLASSES[request.status]}>
                  {RESCUE_REQUEST_STATUS_LABELS[request.status]}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-3">
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Severity</p>
                  <p className="font-semibold">{request.severityLevel}/5</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">People Affected</p>
                  <p className="font-semibold">{request.peopleCount}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Updated</p>
                  <p className="font-semibold">{formatDateTime(request.updatedAt)}</p>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">{request.details}</p>
              <p className="text-sm">
                {request.locationText ?? 'No location text'} |{' '}
                {request.latitude !== null && request.longitude !== null
                  ? `${request.latitude.toFixed(5)}, ${request.longitude.toFixed(5)}`
                  : 'No coordinates'}
              </p>
              {request.photoUrl ? (
                <a href={request.photoUrl} target="_blank" rel="noreferrer" className="text-sm font-medium text-primary">
                  View attached photo
                </a>
              ) : null}
              <div className="flex flex-wrap items-center gap-2">
                <Select
                  value={request.status}
                  disabled={updateMutation.isPending}
                  onChange={(event) => void updateStatus(event.target.value as RescueRequestStatus)}
                  className="max-w-56"
                >
                  {RESCUE_REQUEST_STATUSES.map((status) => (
                    <option key={status} value={status}>
                      {RESCUE_REQUEST_STATUS_LABELS[status]}
                    </option>
                  ))}
                </Select>
                <Link to=".." className={buttonVariants({ variant: 'outline' })}>
                  Back to Queue
                </Link>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-muted/35">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Assignments</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {(assignmentsQuery.data ?? []).map((assignment) => (
                  <article key={assignment.id} className="rounded-md border border-border bg-card p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="font-semibold">{assignment.teamName ?? 'Assigned rescuer'}</p>
                      <Badge>{assignment.status.replaceAll('_', ' ')}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Pickup: {assignment.pickupAt ? formatDateTime(assignment.pickupAt) : 'Pending'} | Handover:{' '}
                      {assignment.handoverAt ? formatDateTime(assignment.handoverAt) : 'Pending'}
                    </p>
                    {assignment.assignmentNotes ? (
                      <p className="mt-2 text-sm text-muted-foreground">{assignment.assignmentNotes}</p>
                    ) : null}
                  </article>
                ))}
                {!assignmentsQuery.isLoading && (assignmentsQuery.data ?? []).length === 0 ? (
                  <p className="text-sm text-muted-foreground">No assignment is linked to this request yet.</p>
                ) : null}
              </div>
            </CardContent>
          </Card>
        </>
      ) : null}
    </section>
  );
}
