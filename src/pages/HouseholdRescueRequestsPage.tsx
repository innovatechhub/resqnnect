import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2, MapPin, UploadCloud, X } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router-dom';

import { RESCUE_REQUEST_STATUSES, type RescueRequestStatus } from '../constants/status';
import { SectionHeader } from '../components/system/SectionHeader';
import { Alert, AlertDescription } from '../components/ui/alert';
import { Badge } from '../components/ui/badge';
import { buttonVariants, Button } from '../components/ui/button';
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
import { getPageCount, paginateItems, sortByKey, type SortDirection } from '../lib/table';

const EMERGENCY_TYPES = [
  'Flood',
  'Landslide',
  'Medical Emergency',
  'Fire',
  'Strong Winds / Typhoon',
  'Structural Collapse',
  'Earthquake',
  'Missing Person',
  'Drowning',
  'Other',
] as const;

const errorClass = 'mt-1 text-xs text-destructive';

type GeoStatus = 'idle' | 'acquiring' | 'acquired' | 'error';

function formatTimestamp(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(date);
}

function formatCoordinates(latitude: number | null, longitude: number | null): string {
  if (latitude === null || longitude === null) return 'N/A';
  return `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;
}

async function uploadRescuePhoto(
  client: ReturnType<typeof getSupabaseClient>,
  file: File,
  userId: string,
): Promise<string> {
  if (!client) throw new Error('Supabase unavailable.');
  const ext = file.name.split('.').pop() ?? 'jpg';
  const path = `${userId}/${Date.now()}.${ext}`;
  const { error } = await client.storage.from('rescue-photos').upload(path, file, { upsert: false });
  if (error) throw error;
  const { data } = client.storage.from('rescue-photos').getPublicUrl(path);
  return data.publicUrl;
}

export function HouseholdRescueRequestsPage() {
  const auth = useAuth();
  const client = useMemo(() => getSupabaseClient(), []);
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<'all' | RescueRequestStatus>('all');
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [page, setPage] = useState(0);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [geoStatus, setGeoStatus] = useState<GeoStatus>('idle');
  const [geoError, setGeoError] = useState<string | null>(null);
  const [showOtherType, setShowOtherType] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pageSize = 8;

  const userId = auth.user?.id ?? null;
  const requestsQueryKey = useMemo(() => ['rescue-requests', 'household', userId] as const, [userId]);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<RescueRequestFormValues>({
    resolver: zodResolver(rescueRequestFormSchema),
    defaultValues: INITIAL_RESCUE_REQUEST_FORM_VALUES,
  });

  const emergencyTypeValue = watch('emergencyType');

  const acquireGeolocation = useCallback(() => {
    if (!navigator.geolocation) {
      setGeoStatus('error');
      setGeoError('Geolocation is not supported by this browser.');
      return;
    }
    setGeoStatus('acquiring');
    setGeoError(null);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setValue('latitude', position.coords.latitude.toFixed(7), { shouldValidate: true });
        setValue('longitude', position.coords.longitude.toFixed(7), { shouldValidate: true });
        setGeoStatus('acquired');
      },
      (err) => {
        setGeoStatus('error');
        setGeoError(err.message ?? 'Unable to retrieve your location.');
      },
      { enableHighAccuracy: true, timeout: 10_000 },
    );
  }, [setValue]);

  useEffect(() => {
    if (isCreateDialogOpen) {
      acquireGeolocation();
    } else {
      setGeoStatus('idle');
      setGeoError(null);
      setPhotoFile(null);
      setPhotoPreview(null);
      setShowOtherType(false);
    }
  }, [isCreateDialogOpen, acquireGeolocation]);

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
    mutationFn: async ({ values, photoUrl }: { values: RescueRequestFormValues; photoUrl: string | null }) => {
      if (!client || !userId) throw new Error('You must be logged in to submit a rescue request.');

      const normalized = normalizeRescueRequestFormValues(values);
      const barangayId = contextQuery.data?.barangayId ?? auth.profile?.barangayId ?? null;
      if (!barangayId) throw new Error('No barangay is assigned to this profile. Contact your barangay operator.');

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
        photoUrl,
      });
    },
    onSuccess: async () => {
      reset(INITIAL_RESCUE_REQUEST_FORM_VALUES);
      setSubmitError(null);
      setIsCreateDialogOpen(false);
      await queryClient.invalidateQueries({ queryKey: requestsQueryKey });
    },
  });

  useEffect(() => {
    if (!client || !userId) return;
    const channel = client
      .channel(`rescue-requests-household-${userId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rescue_requests', filter: `requested_by=eq.${userId}` }, () => {
        void queryClient.invalidateQueries({ queryKey: requestsQueryKey });
      })
      .subscribe();
    return () => { void client.removeChannel(channel); };
  }, [client, queryClient, requestsQueryKey, userId]);

  const filteredRequests = useMemo(() => {
    const items = requestsQuery.data ?? [];
    const byStatus = statusFilter === 'all' ? items : items.filter((item) => item.status === statusFilter);
    const query = search.trim().toLowerCase();
    const searched = query
      ? byStatus.filter((item) =>
          [item.emergencyType, item.locationText, item.details].some((value) => (value ?? '').toLowerCase().includes(query)),
        )
      : byStatus;
    return sortByKey(searched, (item) => item.updatedAt, sortDirection);
  }, [requestsQuery.data, search, sortDirection, statusFilter]);

  const pageCount = getPageCount(filteredRequests.length, pageSize);
  const pagedRequests = useMemo(() => paginateItems(filteredRequests, page, pageSize), [filteredRequests, page]);

  useEffect(() => { setPage(0); }, [search, sortDirection, statusFilter]);

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    setPhotoFile(file);
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => setPhotoPreview(e.target?.result as string);
      reader.readAsDataURL(file);
    } else {
      setPhotoPreview(null);
    }
  }

  function clearPhoto() {
    setPhotoFile(null);
    setPhotoPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  async function onSubmit(values: RescueRequestFormValues) {
    try {
      let photoUrl: string | null = null;
      if (photoFile && userId) {
        try {
          photoUrl = await uploadRescuePhoto(client, photoFile, userId);
        } catch {
          setSubmitError('Photo upload failed — submitting without photo. You may retry with a different image.');
        }
      }
      await createRequestMutation.mutateAsync({ values, photoUrl });
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
        summary="Create emergency incidents via modal form and track your queue in table format."
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

      <Card className="bg-muted/35">
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle className="text-base">Request Timeline</CardTitle>
            <div className="flex gap-2">
              <Select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value as 'all' | RescueRequestStatus)}
                className="h-8 text-xs"
              >
                <option value="all">All statuses</option>
                {RESCUE_REQUEST_STATUSES.map((status) => (
                  <option key={status} value={status}>{RESCUE_REQUEST_STATUS_LABELS[status]}</option>
                ))}
              </Select>
              <Button type="button" variant="outline" size="sm" onClick={() => void requestsQuery.refetch()}>
                Refresh
              </Button>
              <Button type="button" size="sm" onClick={() => setIsCreateDialogOpen(true)}>
                New Request
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <DataTableToolbar
            value={search}
            onValueChange={setSearch}
            placeholder="Search emergency, location, or details"
            summary={`${filteredRequests.length} rescue requests`}
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
                {pagedRequests.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <p className="font-medium">{item.emergencyType}</p>
                      <p className="text-xs text-muted-foreground">{item.details.slice(0, 90)}</p>
                    </TableCell>
                    <TableCell>{item.severityLevel}</TableCell>
                    <TableCell>{item.peopleCount}</TableCell>
                    <TableCell>
                      <p>{item.locationText ?? 'N/A'}</p>
                      <p className="text-xs text-muted-foreground">{formatCoordinates(item.latitude, item.longitude)}</p>
                    </TableCell>
                    <TableCell>
                      <Badge className={RESCUE_REQUEST_STATUS_BADGE_CLASSES[item.status]}>
                        {RESCUE_REQUEST_STATUS_LABELS[item.status]}
                      </Badge>
                    </TableCell>
                    <TableCell>{formatTimestamp(item.updatedAt)}</TableCell>
                    <TableCell>
                      <div className="flex justify-end">
                        <Link to={`../rescue-requests/${item.id}`} className={buttonVariants({ variant: 'outline', size: 'sm' })}>
                          Details
                        </Link>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          {!requestsQuery.isLoading && filteredRequests.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">No rescue requests in this filter yet.</p>
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

      <Dialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        title="Submit Rescue Request"
        description="Provide incident severity, affected people count, and location details."
        footer={
          <Button type="submit" form="rescue-request-form" disabled={createRequestMutation.isPending || contextQuery.isLoading}>
            {createRequestMutation.isPending ? 'Submitting...' : 'Submit Request'}
          </Button>
        }
      >
        <form id="rescue-request-form" className="space-y-3" noValidate onSubmit={(event) => void handleSubmit(onSubmit)(event)}>

          {/* Emergency Type — dropdown */}
          <div>
            <Label className="mb-1 block text-xs uppercase tracking-wide text-muted-foreground">Emergency Type</Label>
            <Select
              {...register('emergencyType')}
              onChange={(event) => {
                const value = event.target.value;
                setShowOtherType(value === 'Other');
                register('emergencyType').onChange(event);
              }}
            >
              <option value="">— Select emergency type —</option>
              {EMERGENCY_TYPES.map((type) => (
                <option key={type} value={type}>{type}</option>
              ))}
            </Select>
            {showOtherType ? (
              <Input
                className="mt-2"
                placeholder="Describe the emergency type..."
                onChange={(event) => setValue('emergencyType', event.target.value, { shouldValidate: true })}
              />
            ) : null}
            {errors.emergencyType ? <p className={errorClass}>{errors.emergencyType.message}</p> : null}
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label className="mb-1 block text-xs uppercase tracking-wide text-muted-foreground">Severity (1-5)</Label>
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

          {/* GPS — auto-acquired */}
          <div>
            <div className="mb-1 flex items-center justify-between">
              <Label className="text-xs uppercase tracking-wide text-muted-foreground">GPS Location</Label>
              <div className="flex items-center gap-1.5">
                {geoStatus === 'acquiring' ? (
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Loader2 className="h-3 w-3 animate-spin" /> Acquiring…
                  </span>
                ) : geoStatus === 'acquired' ? (
                  <Badge className="bg-emerald-100 text-emerald-800 text-xs">
                    <MapPin className="mr-0.5 h-3 w-3" /> Location acquired
                  </Badge>
                ) : geoStatus === 'error' ? (
                  <Badge className="bg-destructive/15 text-destructive text-xs">GPS unavailable</Badge>
                ) : null}
                {geoStatus !== 'acquiring' ? (
                  <button
                    type="button"
                    className="text-xs text-primary underline underline-offset-2"
                    onClick={acquireGeolocation}
                  >
                    {geoStatus === 'acquired' ? 'Retry' : 'Get location'}
                  </button>
                ) : null}
              </div>
            </div>
            {geoError ? <p className="mb-1 text-xs text-destructive">{geoError}</p> : null}
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label className="mb-1 block text-xs text-muted-foreground">Latitude</Label>
                <Input placeholder="Auto-filled" {...register('latitude')} />
                {errors.latitude ? <p className={errorClass}>{errors.latitude.message}</p> : null}
              </div>
              <div>
                <Label className="mb-1 block text-xs text-muted-foreground">Longitude</Label>
                <Input placeholder="Auto-filled" {...register('longitude')} />
                {errors.longitude ? <p className={errorClass}>{errors.longitude.message}</p> : null}
              </div>
            </div>
          </div>

          <div>
            <Label className="mb-1 block text-xs uppercase tracking-wide text-muted-foreground">Situation Details</Label>
            <Textarea rows={3} placeholder="Describe current conditions and urgent needs." {...register('details')} />
            {errors.details ? <p className={errorClass}>{errors.details.message}</p> : null}
          </div>

          {/* Photo — file upload with preview */}
          <div>
            <Label className="mb-1 block text-xs uppercase tracking-wide text-muted-foreground">Photo (Optional)</Label>
            {photoPreview ? (
              <div className="relative w-full overflow-hidden rounded-md border border-border">
                <img src={photoPreview} alt="Preview" className="max-h-40 w-full object-cover" />
                <button
                  type="button"
                  onClick={clearPhoto}
                  className="absolute right-1.5 top-1.5 rounded-full bg-background/80 p-0.5 text-destructive backdrop-blur hover:bg-background"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex w-full cursor-pointer flex-col items-center gap-1.5 rounded-md border border-dashed border-border bg-muted/30 px-4 py-5 text-sm text-muted-foreground transition-colors hover:border-primary/60 hover:bg-muted/50"
              >
                <UploadCloud className="h-6 w-6" />
                <span>Tap to take a photo or choose from gallery</span>
                <span className="text-xs">JPG, PNG, WEBP — max 10 MB</span>
              </button>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>

          {/* Hidden photoUrl field — value injected at submit time, kept for schema compat */}
          <input type="hidden" {...register('photoUrl')} />

          {submitError ? (
            <Alert variant="destructive">
              <AlertDescription>{submitError}</AlertDescription>
            </Alert>
          ) : null}
        </form>
      </Dialog>
    </section>
  );
}
