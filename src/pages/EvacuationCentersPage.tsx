import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { MapPinned, Building2, Users } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

import { LocationPickerDialog } from '../components/system/LocationPickerDialog';
import { SectionHeader } from '../components/system/SectionHeader';
import { EmptyState } from '../components/system/EmptyState';
import { TableSkeleton } from '../components/system/SkeletonCard';
import { Alert, AlertDescription } from '../components/ui/alert';
import { useToast } from '../components/ui/toast';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { ConfirmDialog } from '../components/ui/confirm-dialog';
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
  SortableHeader,
} from '../components/ui/table';
import { useAuth } from '../features/auth/useAuth';
import { getSupabaseClient } from '../services/supabase/client';
import {
  createEvacuationCenter,
  listEvacuationCenters,
  listEvacueeRecords,
  updateEvacuationCenter,
  updateEvacueeStatus,
  type EvacuationCenterRecord,
  type EvacuationCenterStatus,
  type UpsertEvacuationCenterInput,
} from '../services/supabase/evacuation';
import { listBarangays } from '../services/supabase/admin';
import { getPageCount, paginateItems, sortByKey, type SortDirection } from '../lib/table';

const blankForm = {
  name: '',
  locationText: '',
  latitude: '',
  longitude: '',
  capacity: '0',
  currentOccupancy: '0',
  status: 'standby' as EvacuationCenterStatus,
  barangayId: '',
};

function parseOptionalNumber(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}

function capacityClass(center: EvacuationCenterRecord): string {
  if (center.status === 'full') {
    return 'bg-destructive/10 text-destructive';
  }
  if (center.status === 'open') {
    return 'bg-emerald-100 text-emerald-800';
  }
  return 'bg-muted text-muted-foreground';
}

export function EvacuationCentersPage() {
  const auth = useAuth();
  const client = useMemo(() => getSupabaseClient(), []);
  const queryClient = useQueryClient();
  const toast = useToast();
  const [editingCenter, setEditingCenter] = useState<EvacuationCenterRecord | null>(null);
  const [form, setForm] = useState(blankForm);
  const [isCenterDialogOpen, setIsCenterDialogOpen] = useState(false);
  const [selectedCenterId, setSelectedCenterId] = useState<string>('');
  const [actionError, setActionError] = useState<string | null>(null);
  const [centerSearch, setCenterSearch] = useState('');
  const [centerSortDirection, setCenterSortDirection] = useState<SortDirection>('asc');
  const [centerPage, setCenterPage] = useState(0);
  const [evacueeSearch, setEvacueeSearch] = useState('');
  const [evacueeSortDirection, setEvacueeSortDirection] = useState<SortDirection>('asc');
  const [evacueePage, setEvacueePage] = useState(0);
  const [pendingCheckOutId, setPendingCheckOutId] = useState<string | null>(null);
  const [isLocationPickerOpen, setIsLocationPickerOpen] = useState(false);
  const pageSize = 8;
  const isAdmin = auth.role === 'mdrrmo_admin';
  const barangayId = auth.role === 'barangay_official' ? auth.profile?.barangayId ?? null : null;

  const barangaysQuery = useQuery({
    queryKey: ['barangays'],
    enabled: Boolean(client && isAdmin),
    queryFn: async () => listBarangays(client!),
  });

  const centersQuery = useQuery({
    queryKey: ['evacuation-centers', auth.role, barangayId ?? 'all'],
    enabled: Boolean(client),
    queryFn: async () => listEvacuationCenters(client!, { barangayId: barangayId ?? undefined }),
  });

  const evacueesQuery = useQuery({
    queryKey: ['evacuee-records', selectedCenterId],
    enabled: Boolean(client && selectedCenterId),
    queryFn: async () => listEvacueeRecords(client!, { evacuationCenterId: selectedCenterId }),
  });

  const saveCenterMutation = useMutation({
    mutationFn: async () => {
      if (!client) {
        throw new Error('Supabase is unavailable.');
      }

      const resolvedBarangayId = editingCenter?.barangayId ?? (isAdmin ? form.barangayId : barangayId);
      if (!resolvedBarangayId) {
        throw isAdmin
          ? new Error('Please select a barangay for this evacuation center.')
          : new Error('Barangay officials need a barangay profile assignment to manage centers.');
      }

      const capacity = Number(form.capacity);
      const currentOccupancy = Number(form.currentOccupancy);
      if (!form.name.trim() || !form.locationText.trim() || !Number.isFinite(capacity) || capacity < 0) {
        throw new Error('Center name, location, and valid capacity are required.');
      }
      if (!Number.isFinite(currentOccupancy) || currentOccupancy < 0 || currentOccupancy > capacity) {
        throw new Error('Current occupancy must be between zero and capacity.');
      }

      const payload: UpsertEvacuationCenterInput = {
        barangayId: resolvedBarangayId,
        name: form.name.trim(),
        locationText: form.locationText.trim(),
        latitude: parseOptionalNumber(form.latitude),
        longitude: parseOptionalNumber(form.longitude),
        capacity,
        currentOccupancy,
        status: form.status,
      };

      return editingCenter
        ? updateEvacuationCenter(client, editingCenter.id, payload)
        : createEvacuationCenter(client, payload);
    },
    onSuccess: async (_data) => {
      const wasEditing = !!editingCenter;
      setActionError(null);
      setEditingCenter(null);
      setForm(blankForm);
      setIsCenterDialogOpen(false);
      toast.success(wasEditing ? 'Center updated' : 'Center created', wasEditing ? 'Evacuation center details saved.' : 'New evacuation center has been created.');
      await queryClient.invalidateQueries({ queryKey: ['evacuation-centers'] });
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : 'Failed to save evacuation center.';
      setActionError(message);
      toast.error('Save failed', message);
    },
  });
  const filteredCenters = useMemo(() => {
    const query = centerSearch.trim().toLowerCase();
    const scoped = query
      ? (centersQuery.data ?? []).filter((center) =>
          [center.name, center.locationText, center.status].some((value) => value.toLowerCase().includes(query)),
        )
      : (centersQuery.data ?? []);
    return sortByKey(scoped, (center) => center.name, centerSortDirection);
  }, [centerSearch, centerSortDirection, centersQuery.data]);
  const centerPageCount = getPageCount(filteredCenters.length, pageSize);
  const pagedCenters = useMemo(() => paginateItems(filteredCenters, centerPage, pageSize), [centerPage, filteredCenters]);
  const filteredEvacuees = useMemo(() => {
    const query = evacueeSearch.trim().toLowerCase();
    const scoped = query
      ? (evacueesQuery.data ?? []).filter((record) =>
          [record.householdLabel, record.householdMemberName, record.status, record.checkInAt].some((value) =>
            (value ?? '').toLowerCase().includes(query),
          ),
        )
      : (evacueesQuery.data ?? []);
    return sortByKey(scoped, (record) => record.checkInAt, evacueeSortDirection);
  }, [evacueeSearch, evacueeSortDirection, evacueesQuery.data]);
  const evacueePageCount = getPageCount(filteredEvacuees.length, pageSize);
  const pagedEvacuees = useMemo(() => paginateItems(filteredEvacuees, evacueePage, pageSize), [evacueePage, filteredEvacuees]);

  useEffect(() => {
    setCenterPage(0);
  }, [centerSearch, centerSortDirection]);

  useEffect(() => {
    setEvacueePage(0);
  }, [evacueeSearch, evacueeSortDirection, selectedCenterId]);

  async function saveCenter() {
    try {
      await saveCenterMutation.mutateAsync();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to save evacuation center.';
      setActionError(message);
    }
  }

  async function closeEvacuee(recordId: string) {
    if (!client) {
      return;
    }
    try {
      await updateEvacueeStatus(client, recordId, 'checked_out');
      setPendingCheckOutId(null);
      await queryClient.invalidateQueries({ queryKey: ['evacuee-records', selectedCenterId] });
      await queryClient.invalidateQueries({ queryKey: ['evacuation-centers'] });
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Failed to update evacuee record.');
    }
  }

  function openCreateDialog() {
    setEditingCenter(null);
    setForm(blankForm);
    setActionError(null);
    setIsCenterDialogOpen(true);
  }

  function openEditDialog(center: EvacuationCenterRecord) {
    setEditingCenter(center);
    setForm({
      name: center.name,
      locationText: center.locationText,
      latitude: center.latitude?.toString() ?? '',
      longitude: center.longitude?.toString() ?? '',
      capacity: String(center.capacity),
      currentOccupancy: String(center.currentOccupancy),
      status: center.status,
    });
    setActionError(null);
    setIsCenterDialogOpen(true);
  }

  if (!client) {
    return (
      <Alert variant="warning">
        <AlertDescription>Configure Supabase env variables to manage evacuation centers.</AlertDescription>
      </Alert>
    );
  }

  return (
    <section className="space-y-5">
      <SectionHeader
        missionTag="Mission 10"
        title="Evacuation Centers"
        summary="Capacity board and evacuee roster with modal-based center create and update."
      />

      {actionError ? (
        <Alert variant="destructive">
          <AlertDescription>{actionError}</AlertDescription>
        </Alert>
      ) : null}

      <Card className="bg-muted/35">
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle className="text-base">Center Capacity Table</CardTitle>
            <div className="flex gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => void centersQuery.refetch()}>
                Refresh
              </Button>
              <Button type="button" size="sm" onClick={openCreateDialog}>
                New Center
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <DataTableToolbar
            value={centerSearch}
            onValueChange={setCenterSearch}
            placeholder="Search center name, location, or status"
            summary={`${filteredCenters.length} centers`}
          />
          {centersQuery.isLoading ? (
            <TableSkeleton rows={5} />
          ) : (
          <TableContainer>
            <Table>
              <TableHead>
                <tr>
                  <SortableHeader
                    sortKey="name"
                    currentSort="name"
                    currentDir={centerSortDirection}
                    onSort={(_, dir) => setCenterSortDirection(dir ?? 'asc')}
                  >
                    Name
                  </SortableHeader>
                  <TableHeaderCell>Location</TableHeaderCell>
                  <TableHeaderCell>Status</TableHeaderCell>
                  <TableHeaderCell>Occupancy</TableHeaderCell>
                  <TableHeaderCell className="text-right">Actions</TableHeaderCell>
                </tr>
              </TableHead>
              <TableBody>
                {pagedCenters.map((center) => (
                  <TableRow key={center.id}>
                    <TableCell className="font-medium">{center.name}</TableCell>
                    <TableCell>{center.locationText}</TableCell>
                    <TableCell>
                      <Badge className={capacityClass(center)}>{center.status}</Badge>
                    </TableCell>
                    <TableCell>
                      {center.currentOccupancy}/{center.capacity}
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-2">
                        <Button type="button" size="sm" variant="outline" onClick={() => setSelectedCenterId(center.id)}>
                          Evacuees
                        </Button>
                        <Button type="button" size="sm" variant="outline" onClick={() => openEditDialog(center)}>
                          Edit
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          )}
          {!centersQuery.isLoading && (centersQuery.data ?? []).length === 0 && (
            <EmptyState
              icon={Building2}
              title="No evacuation centers"
              description="Create the first center using the New Center button above."
            />
          )}
          <div className="mt-3">
            <DataTablePagination
              page={centerPage}
              pageCount={centerPageCount}
              totalCount={filteredCenters.length}
              pageSize={pageSize}
              onPageChange={setCenterPage}
            />
          </div>
        </CardContent>
      </Card>

      {selectedCenterId ? (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Evacuee Records</CardTitle>
          </CardHeader>
          <CardContent>
            <DataTableToolbar
              value={evacueeSearch}
              onValueChange={setEvacueeSearch}
              placeholder="Search household, member name, status, or date"
              summary={`${filteredEvacuees.length} evacuee records`}
              className="mb-3"
            />
            {evacueesQuery.isLoading ? (
              <TableSkeleton rows={4} />
            ) : (
            <TableContainer>
              <Table>
                <TableHead>
                  <tr>
                    <TableHeaderCell>Household</TableHeaderCell>
                    <TableHeaderCell>Member</TableHeaderCell>
                    <TableHeaderCell>Status</TableHeaderCell>
                    <SortableHeader
                      sortKey="checkIn"
                      currentSort="checkIn"
                      currentDir={evacueeSortDirection}
                      onSort={(_, dir) => setEvacueeSortDirection(dir ?? 'asc')}
                    >
                      Check-In
                    </SortableHeader>
                    <TableHeaderCell className="text-right">Actions</TableHeaderCell>
                  </tr>
                </TableHead>
                <TableBody>
                  {pagedEvacuees.map((record) => (
                    <TableRow key={record.id}>
                      <TableCell>{record.householdLabel ?? 'Unlinked household'}</TableCell>
                      <TableCell>{record.householdMemberName ?? 'Household-level'}</TableCell>
                      <TableCell>{record.status}</TableCell>
                      <TableCell>{record.checkInAt}</TableCell>
                      <TableCell>
                        <div className="flex justify-end">
                          {record.status === 'checked_in' ? (
                            <Button type="button" size="sm" variant="outline" onClick={() => setPendingCheckOutId(record.id)}>
                              Check Out
                            </Button>
                          ) : null}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
            )}
            {!evacueesQuery.isLoading && (evacueesQuery.data ?? []).length === 0 && (
              <EmptyState
                icon={Users}
                title="No evacuees recorded"
                description="No evacuees have been checked into this center yet."
              />
            )}
            <div className="mt-3">
              <DataTablePagination
                page={evacueePage}
                pageCount={evacueePageCount}
                totalCount={filteredEvacuees.length}
                pageSize={pageSize}
                onPageChange={setEvacueePage}
              />
            </div>
          </CardContent>
        </Card>
      ) : null}

      <Dialog
        open={isCenterDialogOpen}
        onOpenChange={setIsCenterDialogOpen}
        title={editingCenter ? 'Edit Evacuation Center' : 'Create Evacuation Center'}
        description="Center profile, capacity, and occupancy."
        footer={
          <Button type="button" onClick={() => void saveCenter()} disabled={saveCenterMutation.isPending}>
            {saveCenterMutation.isPending ? 'Saving...' : editingCenter ? 'Update Center' : 'Create Center'}
          </Button>
        }
      >
        <div className="space-y-3">
          {isAdmin && !editingCenter ? (
            <div>
              <Label className="mb-1 block text-xs uppercase tracking-wide text-muted-foreground">Barangay</Label>
              <Select
                value={form.barangayId}
                onChange={(event) => setForm({ ...form, barangayId: event.target.value })}
              >
                <option value="">— Select barangay —</option>
                {(barangaysQuery.data ?? []).map((b) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </Select>
            </div>
          ) : null}
          <div>
            <Label className="mb-1 block text-xs uppercase tracking-wide text-muted-foreground">Name</Label>
            <Input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
          </div>
          <div>
            <Label className="mb-1 block text-xs uppercase tracking-wide text-muted-foreground">Location</Label>
            <div className="flex gap-2">
              <Input
                value={form.locationText}
                onChange={(event) => setForm({ ...form, locationText: event.target.value })}
                placeholder="Search or describe the center area"
              />
              <Button type="button" variant="outline" onClick={() => setIsLocationPickerOpen(true)}>
                <MapPinned className="h-4 w-4" />
                Pick on Map
              </Button>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label className="mb-1 block text-xs uppercase tracking-wide text-muted-foreground">Latitude</Label>
              <Input value={form.latitude} onChange={(event) => setForm({ ...form, latitude: event.target.value })} />
            </div>
            <div>
              <Label className="mb-1 block text-xs uppercase tracking-wide text-muted-foreground">Longitude</Label>
              <Input value={form.longitude} onChange={(event) => setForm({ ...form, longitude: event.target.value })} />
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <Label className="mb-1 block text-xs uppercase tracking-wide text-muted-foreground">Capacity</Label>
              <Input
                type="number"
                min={0}
                value={form.capacity}
                onChange={(event) => setForm({ ...form, capacity: event.target.value })}
              />
            </div>
            <div>
              <Label className="mb-1 block text-xs uppercase tracking-wide text-muted-foreground">Occupancy</Label>
              <Input
                type="number"
                min={0}
                value={form.currentOccupancy}
                onChange={(event) => setForm({ ...form, currentOccupancy: event.target.value })}
              />
            </div>
            <div>
              <Label className="mb-1 block text-xs uppercase tracking-wide text-muted-foreground">Status</Label>
              <Select
                value={form.status}
                onChange={(event) => setForm({ ...form, status: event.target.value as EvacuationCenterStatus })}
              >
                <option value="standby">Standby</option>
                <option value="open">Open</option>
                <option value="full">Full</option>
                <option value="closed">Closed</option>
              </Select>
            </div>
          </div>
        </div>
      </Dialog>

      <ConfirmDialog
        open={Boolean(pendingCheckOutId)}
        onOpenChange={(open) => {
          if (!open) {
            setPendingCheckOutId(null);
          }
        }}
        title="Check out evacuee"
        description="Mark this active evacuee record as checked out?"
        confirmLabel="Confirm check out"
        onConfirm={() => (pendingCheckOutId ? closeEvacuee(pendingCheckOutId) : undefined)}
      />

      <LocationPickerDialog
        open={isLocationPickerOpen}
        onOpenChange={setIsLocationPickerOpen}
        title="Pinpoint Evacuation Center"
        initialLocationText={form.locationText}
        initialLatitude={parseOptionalNumber(form.latitude)}
        initialLongitude={parseOptionalNumber(form.longitude)}
        onSelect={(value) =>
          setForm((current) => ({
            ...current,
            locationText: value.locationText,
            latitude: value.latitude.toFixed(6),
            longitude: value.longitude.toFixed(6),
          }))
        }
      />
    </section>
  );
}
