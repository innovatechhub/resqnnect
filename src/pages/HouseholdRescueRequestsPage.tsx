import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';

import { RESCUE_REQUEST_STATUSES, type RescueRequestStatus } from '../constants/status';
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
  RESCUE_REQUEST_STATUS_BADGE_CLASSES,
  RESCUE_REQUEST_STATUS_LABELS,
} from '../features/rescueRequests/presentation';
import type { RescueRequestFormValues } from '../features/rescueRequests/types';
import {
  INITIAL_RESCUE_REQUEST_FORM_VALUES,
  normalizeRescueRequestFormValues,
  rescueRequestFormSchema,
} from '../features/rescueRequests/validation';
import { getSupabaseClient } from '../services/supabase/client';
import {
  createRescueRequest,
  getCurrentRescueRequesterContext,
  listRescueRequests,
} from '../services/supabase/rescueRequests';

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

function formatCoordinates(latitude: number | null, longitude: number | null): string {
  if (latitude === null || longitude === null) {
    return 'No coordinates';
  }

  return `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;
}

export function HouseholdRescueRequestsPage() {
  const auth = useAuth();
  const client = useMemo(() => getSupabaseClient(), []);
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<'all' | RescueRequestStatus>('all');
  const [submitError, setSubmitError] = useState<string | null>(null);

  const userId = auth.user?.id ?? null;
  const requestsQueryKey = useMemo(() => ['rescue-requests', 'household', userId] as const, [userId]);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<RescueRequestFormValues>({
    resolver: zodResolver(rescueRequestFormSchema),
    defaultValues: INITIAL_RESCUE_REQUEST_FORM_VALUES,
  });

  const contextQuery = useQuery({
    queryKey: ['rescue-request-context', userId],
    enabled: Boolean(client && auth.status === 'authenticated' && auth.role === 'household' && userId),
    queryFn: async () => getCurrentRescueRequesterContext(client!),
  });

  const requestsQuery = useQuery({
    queryKey: requestsQueryKey,
    enabled: Boolean(client && auth.status === 'authenticated' && auth.role === 'household' && userId),
    queryFn: async () => listRescueRequests(client!, { requestedBy: userId! }),
  });

  const createRequestMutation = useMutation({
    mutationFn: async (values: RescueRequestFormValues) => {
      if (!client || !userId) {
        throw new Error('You must be logged in to submit a rescue request.');
      }

      const normalized = normalizeRescueRequestFormValues(values);
      const barangayId = contextQuery.data?.barangayId ?? auth.profile?.barangayId ?? null;
      if (!barangayId) {
        throw new Error('No barangay is assigned to this profile. Contact your barangay operator.');
      }

      return createRescueRequest(client, {
        requestedBy: userId,
        barangayId,
        householdId: contextQuery.data?.householdId ?? null,
        emergencyType: normalized.emergencyType,
        severityLevel: normalized.severityLevel,
        peopleCount: normalized.peopleCount,
        locationText: normalized.locationText,
        latitude: normalized.latitude,
        longitude: normalized.longitude,
        details: normalized.details,
        photoUrl: normalized.photoUrl,
      });
    },
    onSuccess: async () => {
      reset(INITIAL_RESCUE_REQUEST_FORM_VALUES);
      setSubmitError(null);
      await queryClient.invalidateQueries({ queryKey: requestsQueryKey });
    },
  });

  useEffect(() => {
    if (!client || !userId) {
      return;
    }

    const channel = client
      .channel(`rescue-requests-household-${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'rescue_requests',
          filter: `requested_by=eq.${userId}`,
        },
        () => {
          void queryClient.invalidateQueries({ queryKey: requestsQueryKey });
        },
      )
      .subscribe();

    return () => {
      void client.removeChannel(channel);
    };
  }, [client, queryClient, requestsQueryKey, userId]);

  const filteredRequests = useMemo(() => {
    const items = requestsQuery.data ?? [];
    if (statusFilter === 'all') {
      return items;
    }

    return items.filter((item) => item.status === statusFilter);
  }, [requestsQuery.data, statusFilter]);

  async function onSubmit(values: RescueRequestFormValues) {
    try {
      await createRequestMutation.mutateAsync(values);
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Failed to submit rescue request.');
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
      <SectionHeader
        missionTag="Mission 6"
        title="My Rescue Requests"
        summary="Submit emergency requests and track status updates in real time."
      />

      {contextQuery.isError ? (
        <Alert variant="destructive">
          <AlertDescription>
            {contextQuery.error instanceof Error
              ? contextQuery.error.message
              : 'Failed to resolve profile context for request submission.'}
          </AlertDescription>
        </Alert>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-[1.1fr_1fr]">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Submit New Request</CardTitle>
          </CardHeader>
          <CardContent>
          <form className="mt-3 space-y-3" noValidate onSubmit={(event) => void handleSubmit(onSubmit)(event)}>
            <div>
              <Label className="mb-1 block text-xs uppercase tracking-wide text-muted-foreground">Emergency Type</Label>
              <Input placeholder="Flood, medical, landslide..." {...register('emergencyType')} />
              {errors.emergencyType ? <p className={errorClass}>{errors.emergencyType.message}</p> : null}
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label className="mb-1 block text-xs uppercase tracking-wide text-muted-foreground">
                  Severity (1-5)
                </Label>
                <Select {...register('severityLevel')}>
                  <option value="1">1 - Low</option>
                  <option value="2">2 - Moderate</option>
                  <option value="3">3 - High</option>
                  <option value="4">4 - Critical</option>
                  <option value="5">5 - Life Threatening</option>
                </Select>
                {errors.severityLevel ? <p className={errorClass}>{errors.severityLevel.message}</p> : null}
              </div>
              <div>
                <Label className="mb-1 block text-xs uppercase tracking-wide text-muted-foreground">People Count</Label>
                <Input type="number" min={1} step={1} {...register('peopleCount')} />
                {errors.peopleCount ? <p className={errorClass}>{errors.peopleCount.message}</p> : null}
              </div>
            </div>

            <div>
              <Label className="mb-1 block text-xs uppercase tracking-wide text-muted-foreground">Location Details</Label>
              <Input placeholder="Street, purok, landmark" {...register('locationText')} />
              {errors.locationText ? <p className={errorClass}>{errors.locationText.message}</p> : null}
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label className="mb-1 block text-xs uppercase tracking-wide text-muted-foreground">Latitude</Label>
                <Input placeholder="11.0000000" {...register('latitude')} />
                {errors.latitude ? <p className={errorClass}>{errors.latitude.message}</p> : null}
              </div>
              <div>
                <Label className="mb-1 block text-xs uppercase tracking-wide text-muted-foreground">Longitude</Label>
                <Input placeholder="122.0000000" {...register('longitude')} />
                {errors.longitude ? <p className={errorClass}>{errors.longitude.message}</p> : null}
              </div>
            </div>

            <div>
              <Label className="mb-1 block text-xs uppercase tracking-wide text-muted-foreground">Situation Details</Label>
              <Textarea
                rows={3}
                placeholder="Describe current conditions, hazards, and immediate needs."
                {...register('details')}
              />
              {errors.details ? <p className={errorClass}>{errors.details.message}</p> : null}
            </div>

            <div>
              <Label className="mb-1 block text-xs uppercase tracking-wide text-muted-foreground">
                Photo URL (Optional)
              </Label>
              <Input placeholder="https://..." {...register('photoUrl')} />
              {errors.photoUrl ? <p className={errorClass}>{errors.photoUrl.message}</p> : null}
            </div>

            {submitError ? (
              <Alert variant="destructive">
                <AlertDescription>{submitError}</AlertDescription>
              </Alert>
            ) : null}

            <Button
              type="submit"
              disabled={createRequestMutation.isPending || contextQuery.isLoading}
            >
              {createRequestMutation.isPending ? 'Submitting...' : 'Submit Rescue Request'}
            </Button>
          </form>
          </CardContent>
        </Card>

        <Card className="bg-muted/35">
          <CardHeader className="pb-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle className="text-base">Request Timeline</CardTitle>
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

          {requestsQuery.isLoading ? <p className="mt-3 text-sm text-muted-foreground">Loading requests...</p> : null}
          {requestsQuery.isError ? (
            <Alert variant="destructive" className="mt-3">
              <AlertDescription>
                {requestsQuery.error instanceof Error ? requestsQuery.error.message : 'Failed to load rescue requests.'}
              </AlertDescription>
            </Alert>
          ) : null}

          <div className="mt-3 space-y-2">
            {filteredRequests.map((item) => (
              <div key={item.id} className="rounded-lg border border-border bg-card p-3 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-foreground">{item.emergencyType}</p>
                  <Badge className={RESCUE_REQUEST_STATUS_BADGE_CLASSES[item.status]}>
                    {RESCUE_REQUEST_STATUS_LABELS[item.status]}
                  </Badge>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Severity {item.severityLevel} | Affected {item.peopleCount} | {formatCoordinates(item.latitude, item.longitude)}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">{item.details}</p>
                <p className="mt-2 text-xs text-muted-foreground">Last updated {formatTimestamp(item.updatedAt)}</p>
              </div>
            ))}
            {!requestsQuery.isLoading && filteredRequests.length === 0 ? (
              <p className="text-sm text-muted-foreground">No rescue requests in this filter yet.</p>
            ) : null}
          </div>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
