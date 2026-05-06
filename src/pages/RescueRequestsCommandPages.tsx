import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';

import { RESCUE_REQUEST_STATUSES, type RescueRequestStatus } from '../constants/status';
import { SectionHeader } from '../components/system/SectionHeader';
import { Alert, AlertDescription } from '../components/ui/alert';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Label } from '../components/ui/label';
import { Select } from '../components/ui/select';
import { useAuth } from '../features/auth/useAuth';
import {
  RESCUE_REQUEST_STATUS_BADGE_CLASSES,
  RESCUE_REQUEST_STATUS_LABELS,
} from '../features/rescueRequests/presentation';
import type { RescueRequestStatusUpdateInput } from '../features/rescueRequests/types';
import { getSupabaseClient } from '../services/supabase/client';
import {
  listRescueRequests,
  updateRescueRequestStatus,
  type RescueRequestRecord,
} from '../services/supabase/rescueRequests';

interface CommandPageConfig {
  title: string;
  summary: string;
  scope: 'admin' | 'barangay';
}

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

function formatCoordinates(request: RescueRequestRecord): string {
  if (request.latitude === null || request.longitude === null) {
    return 'Coordinates unavailable';
  }

  return `${request.latitude.toFixed(5)}, ${request.longitude.toFixed(5)}`;
}

function RescueRequestsCommandPage({ title, summary, scope }: CommandPageConfig) {
  const auth = useAuth();
  const client = useMemo(() => getSupabaseClient(), []);
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<'all' | RescueRequestStatus>('all');
  const [actionError, setActionError] = useState<string | null>(null);

  const barangayId = auth.profile?.barangayId ?? null;
  const canLoadRequests =
    auth.status === 'authenticated' &&
    (scope === 'admin'
      ? auth.role === 'mdrrmo_admin'
      : auth.role === 'barangay_official' && typeof barangayId === 'string' && barangayId.length > 0);

  const queryKey = useMemo(
    () => ['rescue-requests', scope, scope === 'barangay' ? barangayId : 'all'] as const,
    [barangayId, scope],
  );

  const requestsQuery = useQuery({
    queryKey,
    enabled: Boolean(client && canLoadRequests),
    queryFn: async () =>
      listRescueRequests(client!, {
        barangayId: scope === 'barangay' ? barangayId ?? undefined : undefined,
      }),
  });

  const updateStatusMutation = useMutation({
    mutationFn: async (input: RescueRequestStatusUpdateInput) => {
      if (!client) {
        throw new Error('Supabase is unavailable.');
      }

      return updateRescueRequestStatus(client, input.requestId, input.status);
    },
    onSuccess: async () => {
      setActionError(null);
      await queryClient.invalidateQueries({ queryKey });
    },
  });

  useEffect(() => {
    if (!client || !canLoadRequests) {
      return;
    }

    const channel = client
      .channel(`rescue-requests-${scope}-${barangayId ?? 'all'}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'rescue_requests',
          filter: scope === 'barangay' && barangayId ? `barangay_id=eq.${barangayId}` : undefined,
        },
        () => {
          void queryClient.invalidateQueries({ queryKey });
        },
      )
      .subscribe();

    return () => {
      void client.removeChannel(channel);
    };
  }, [barangayId, canLoadRequests, client, queryClient, queryKey, scope]);

  const filteredRequests = useMemo(() => {
    const requests = requestsQuery.data ?? [];
    if (statusFilter === 'all') {
      return requests;
    }

    return requests.filter((item) => item.status === statusFilter);
  }, [requestsQuery.data, statusFilter]);

  async function onStatusChange(requestId: string, nextStatus: RescueRequestStatus) {
    try {
      await updateStatusMutation.mutateAsync({ requestId, status: nextStatus });
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Failed to update request status.');
    }
  }

  if (!client) {
    return (
      <Alert variant="warning">
        <AlertDescription>Configure Supabase env variables to use rescue request workflows.</AlertDescription>
      </Alert>
    );
  }

  return (
    <section className="space-y-5">
      <SectionHeader missionTag="Mission 6" title={title} summary={summary} />

      {scope === 'barangay' && !barangayId ? (
        <Alert variant="destructive">
          <AlertDescription>No `profiles.barangay_id` is set for this user.</AlertDescription>
        </Alert>
      ) : null}
      {actionError ? (
        <Alert variant="destructive">
          <AlertDescription>{actionError}</AlertDescription>
        </Alert>
      ) : null}

      <Card className="bg-muted/35">
        <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="text-base">Active Queue</CardTitle>
          <div className="flex items-center gap-2">
            <Select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as 'all' | RescueRequestStatus)}
              className="h-8 text-xs"
            >
              <option value="all">All statuses</option>
              {RESCUE_REQUEST_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {RESCUE_REQUEST_STATUS_LABELS[status]}
                </option>
              ))}
            </Select>
            <Button type="button" variant="outline" size="sm" onClick={() => void requestsQuery.refetch()}>
              Refresh
            </Button>
          </div>
        </div>
        </CardHeader>
        <CardContent>

        {requestsQuery.isLoading ? <p className="mt-3 text-sm text-muted-foreground">Loading rescue requests...</p> : null}
        {requestsQuery.isError ? (
          <Alert variant="destructive" className="mt-3">
            <AlertDescription>
              {requestsQuery.error instanceof Error ? requestsQuery.error.message : 'Failed to load rescue requests.'}
            </AlertDescription>
          </Alert>
        ) : null}

        <div className="mt-3 space-y-2">
          {filteredRequests.map((request) => {
            const isUpdatingThisRequest =
              updateStatusMutation.isPending && updateStatusMutation.variables?.requestId === request.id;

            return (
              <article key={request.id} className="rounded-lg border border-border bg-card p-3 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-foreground">{request.emergencyType}</p>
                    <p className="text-xs text-muted-foreground">
                      Severity {request.severityLevel} | Affected {request.peopleCount} | Requested by{' '}
                      <span className="font-mono">{request.requestedBy}</span>
                    </p>
                  </div>
                  <Badge className={RESCUE_REQUEST_STATUS_BADGE_CLASSES[request.status]}>
                    {RESCUE_REQUEST_STATUS_LABELS[request.status]}
                  </Badge>
                </div>

                <p className="mt-2 text-sm text-muted-foreground">{request.details}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {request.locationText ?? 'No location text'} | {formatCoordinates(request)}
                </p>

                <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                  <p className="text-xs text-muted-foreground">Updated {formatTimestamp(request.updatedAt)}</p>
                  <Label className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
                    <span>Status</span>
                    <Select
                      value={request.status}
                      disabled={isUpdatingThisRequest}
                      onChange={(event) =>
                        void onStatusChange(request.id, event.target.value as RescueRequestStatus)
                      }
                      className="h-8 min-w-36 text-xs"
                    >
                      {RESCUE_REQUEST_STATUSES.map((status) => (
                        <option key={status} value={status}>
                          {RESCUE_REQUEST_STATUS_LABELS[status]}
                        </option>
                      ))}
                    </Select>
                  </Label>
                </div>
              </article>
            );
          })}
          {!requestsQuery.isLoading && filteredRequests.length === 0 ? (
            <p className="text-sm text-muted-foreground">No rescue requests in this filter.</p>
          ) : null}
        </div>
        </CardContent>
      </Card>
    </section>
  );
}

export function AdminRescueRequestsPage() {
  return (
    <RescueRequestsCommandPage
      scope="admin"
      title="Rescue Requests Command Board"
      summary="Municipality-wide incident queue for triage, dispatch preparation, and cross-barangay monitoring."
    />
  );
}

export function BarangayRescueRequestsPage() {
  return (
    <RescueRequestsCommandPage
      scope="barangay"
      title="Barangay Rescue Requests"
      summary="Barangay-level incident queue for triage, acknowledgement, and response status coordination."
    />
  );
}
