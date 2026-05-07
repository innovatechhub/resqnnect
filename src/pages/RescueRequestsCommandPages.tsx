import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

import { RESCUE_REQUEST_STATUSES, type RescueRequestStatus } from '../constants/status';
import { SectionHeader } from '../components/system/SectionHeader';
import { Alert, AlertDescription } from '../components/ui/alert';
import { Badge } from '../components/ui/badge';
import { Button, buttonVariants } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { DataTablePagination, DataTableToolbar } from '../components/ui/data-table-controls';
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
import { getPageCount, paginateItems, sortByKey, type SortDirection } from '../lib/table';

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
    return 'N/A';
  }

  return `${request.latitude.toFixed(5)}, ${request.longitude.toFixed(5)}`;
}

function RescueRequestsCommandPage({ title, summary, scope }: CommandPageConfig) {
  const auth = useAuth();
  const client = useMemo(() => getSupabaseClient(), []);
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<'all' | RescueRequestStatus>('all');
  const [actionError, setActionError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [page, setPage] = useState(0);
  const pageSize = 8;

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
    const byStatus = statusFilter === 'all' ? requests : requests.filter((item) => item.status === statusFilter);
    const query = search.trim().toLowerCase();
    const searched = query
      ? byStatus.filter((item) =>
          [item.emergencyType, item.locationText, item.details, item.requestedBy].some((value) =>
            (value ?? '').toLowerCase().includes(query),
          ),
        )
      : byStatus;
    return sortByKey(searched, (item) => item.updatedAt, sortDirection);
  }, [requestsQuery.data, search, sortDirection, statusFilter]);
  const pageCount = getPageCount(filteredRequests.length, pageSize);
  const pagedRequests = useMemo(() => paginateItems(filteredRequests, page, pageSize), [filteredRequests, page]);

  useEffect(() => {
    setPage(0);
  }, [search, sortDirection, statusFilter]);

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
            <CardTitle className="text-base">Incident Queue</CardTitle>
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
          <DataTableToolbar
            value={search}
            onValueChange={setSearch}
            placeholder="Search emergency, location, details, or requester"
            summary={`${filteredRequests.length} incidents`}
          />
          <TableContainer>
            <Table>
              <TableHead>
                <tr>
                  <TableHeaderCell>Emergency</TableHeaderCell>
                  <TableHeaderCell>Severity</TableHeaderCell>
                  <TableHeaderCell>People</TableHeaderCell>
                  <TableHeaderCell>Location</TableHeaderCell>
                  <TableHeaderCell>Status</TableHeaderCell>
                  <TableHeaderCell>
                    <button type="button" onClick={() => setSortDirection((value) => (value === 'asc' ? 'desc' : 'asc'))}>
                      Updated
                    </button>
                  </TableHeaderCell>
                  <TableHeaderCell className="text-right">Actions</TableHeaderCell>
                </tr>
              </TableHead>
              <TableBody>
                {pagedRequests.map((request) => {
                  const isUpdatingThisRequest =
                    updateStatusMutation.isPending && updateStatusMutation.variables?.requestId === request.id;

                  return (
                    <TableRow key={request.id}>
                      <TableCell>
                        <p className="font-medium">{request.emergencyType}</p>
                        <p className="text-xs text-muted-foreground">{request.details.slice(0, 90)}</p>
                      </TableCell>
                      <TableCell>{request.severityLevel}</TableCell>
                      <TableCell>{request.peopleCount}</TableCell>
                      <TableCell>
                        <p>{request.locationText ?? 'N/A'}</p>
                        <p className="text-xs text-muted-foreground">{formatCoordinates(request)}</p>
                      </TableCell>
                      <TableCell>
                        <Badge className={RESCUE_REQUEST_STATUS_BADGE_CLASSES[request.status]}>
                          {RESCUE_REQUEST_STATUS_LABELS[request.status]}
                        </Badge>
                      </TableCell>
                      <TableCell>{formatTimestamp(request.updatedAt)}</TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-2">
                          <Link to={request.id} className={buttonVariants({ variant: 'outline', size: 'sm' })}>
                            Details
                          </Link>
                          <Label className="sr-only" htmlFor={`status-${request.id}`}>
                            Status
                          </Label>
                          <Select
                            id={`status-${request.id}`}
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
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
          {!requestsQuery.isLoading && filteredRequests.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">No rescue requests in this filter.</p>
          ) : null}
          <div className="mt-3">
            <DataTablePagination
              page={page}
              pageCount={pageCount}
              totalCount={filteredRequests.length}
              pageSize={pageSize}
              onPageChange={setPage}
            />
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
