import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';

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
import { useAuth } from '../features/auth/useAuth';
import { getSupabaseClient } from '../services/supabase/client';
import { listEvacuationCenters } from '../services/supabase/evacuation';
import { listHouseholdMembers, listHouseholds } from '../services/supabase/households';
import {
  createReliefDistribution,
  createReliefInventory,
  listReliefDistributions,
  listReliefInventory,
  type ReliefInventoryRecord,
} from '../services/supabase/relief';
import { getPageCount, paginateItems, sortByKey, type SortDirection } from '../lib/table';

const inventoryFormInitial = {
  itemName: '',
  unit: 'packs',
  quantityOnHand: '0',
  reorderLevel: '0',
  evacuationCenterId: '',
};

const distributionFormInitial = {
  inventoryId: '',
  householdId: '',
  householdMemberId: '',
  beneficiaryName: '',
  quantity: '1',
  referenceNo: '',
  evacuationCenterId: '',
};

const inventoryUnitOptions = ['packs', 'pieces', 'boxes', 'sacks', 'kg', 'grams', 'liters', 'bottles'];

function inventoryBadge(item: ReliefInventoryRecord): string {
  if (item.status === 'depleted') {
    return 'bg-destructive/10 text-destructive';
  }
  if (item.status === 'low_stock') {
    return 'bg-amber-100 text-amber-800';
  }
  return 'bg-emerald-100 text-emerald-800';
}

function formatDateTime(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(date);
}

export function ReliefDistributionPage() {
  const auth = useAuth();
  const client = useMemo(() => getSupabaseClient(), []);
  const queryClient = useQueryClient();
  const barangayId = auth.role === 'barangay_official' ? auth.profile?.barangayId ?? null : null;
  const [inventoryForm, setInventoryForm] = useState(inventoryFormInitial);
  const [distributionForm, setDistributionForm] = useState(distributionFormInitial);
  const [isInventoryDialogOpen, setIsInventoryDialogOpen] = useState(false);
  const [isDistributionDialogOpen, setIsDistributionDialogOpen] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [inventorySearch, setInventorySearch] = useState('');
  const [inventorySortDirection, setInventorySortDirection] = useState<SortDirection>('asc');
  const [inventoryPage, setInventoryPage] = useState(0);
  const [distributionSearch, setDistributionSearch] = useState('');
  const [distributionSortDirection, setDistributionSortDirection] = useState<SortDirection>('desc');
  const [distributionPage, setDistributionPage] = useState(0);
  const pageSize = 8;

  const inventoryQuery = useQuery({
    queryKey: ['relief-inventory', barangayId ?? 'all'],
    enabled: Boolean(client),
    queryFn: async () => listReliefInventory(client!, { barangayId: barangayId ?? undefined }),
  });

  const distributionsQuery = useQuery({
    queryKey: ['relief-distributions'],
    enabled: Boolean(client),
    queryFn: async () => listReliefDistributions(client!),
  });

  const householdsQuery = useQuery({
    queryKey: ['relief-households', barangayId ?? 'all'],
    enabled: Boolean(client),
    queryFn: async () => listHouseholds(client!),
  });
  const householdMembersQuery = useQuery({
    queryKey: ['relief-household-members', distributionForm.householdId || 'none'],
    enabled: Boolean(client) && Boolean(distributionForm.householdId),
    queryFn: async () => listHouseholdMembers(client!, distributionForm.householdId),
  });

  const centersQuery = useQuery({
    queryKey: ['relief-centers', barangayId ?? 'all'],
    enabled: Boolean(client),
    queryFn: async () => listEvacuationCenters(client!, { barangayId: barangayId ?? undefined }),
  });

  const createInventoryMutation = useMutation({
    mutationFn: async () => {
      if (!client) {
        throw new Error('Supabase is unavailable.');
      }
      const quantity = Number(inventoryForm.quantityOnHand);
      const reorderLevel = Number(inventoryForm.reorderLevel);
      if (!inventoryForm.itemName.trim() || !inventoryForm.unit.trim() || quantity < 0 || reorderLevel < 0) {
        throw new Error('Item name, unit, quantity, and reorder level are required.');
      }

      return createReliefInventory(client, {
        barangayId,
        evacuationCenterId: inventoryForm.evacuationCenterId || null,
        itemName: inventoryForm.itemName.trim(),
        unit: inventoryForm.unit.trim(),
        quantityOnHand: quantity,
        reorderLevel,
      });
    },
    onSuccess: async () => {
      setInventoryForm(inventoryFormInitial);
      setActionError(null);
      setIsInventoryDialogOpen(false);
      await queryClient.invalidateQueries({ queryKey: ['relief-inventory'] });
    },
  });

  const createDistributionMutation = useMutation({
    mutationFn: async () => {
      if (!client || !auth.user) {
        throw new Error('You must be signed in to release relief goods.');
      }
      const quantity = Number(distributionForm.quantity);
      if (!distributionForm.inventoryId || !distributionForm.beneficiaryName.trim() || quantity <= 0) {
        throw new Error('Inventory item, beneficiary, and positive quantity are required.');
      }

      return createReliefDistribution(client, {
        reliefInventoryId: distributionForm.inventoryId,
        evacuationCenterId: distributionForm.evacuationCenterId || null,
        householdId: distributionForm.householdId || null,
        householdMemberId: distributionForm.householdMemberId || null,
        beneficiaryName: distributionForm.beneficiaryName.trim(),
        quantity,
        releasedBy: auth.user.id,
        referenceNo: distributionForm.referenceNo.trim() || null,
      });
    },
    onSuccess: async () => {
      setDistributionForm(distributionFormInitial);
      setActionError(null);
      setIsDistributionDialogOpen(false);
      await queryClient.invalidateQueries({ queryKey: ['relief-inventory'] });
      await queryClient.invalidateQueries({ queryKey: ['relief-distributions'] });
    },
  });

  const filteredInventory = useMemo(() => {
    const query = inventorySearch.trim().toLowerCase();
    const scoped = query
      ? (inventoryQuery.data ?? []).filter((item) =>
          [item.itemName, item.unit, item.status, item.evacuationCenterName].some((value) =>
            (value ?? '').toLowerCase().includes(query),
          ),
        )
      : (inventoryQuery.data ?? []);
    return sortByKey(scoped, (item) => item.itemName, inventorySortDirection);
  }, [inventoryQuery.data, inventorySearch, inventorySortDirection]);
  const inventoryPageCount = getPageCount(filteredInventory.length, pageSize);
  const pagedInventory = useMemo(() => paginateItems(filteredInventory, inventoryPage, pageSize), [filteredInventory, inventoryPage]);

  const filteredDistributions = useMemo(() => {
    const query = distributionSearch.trim().toLowerCase();
    const scoped = query
      ? (distributionsQuery.data ?? []).filter((item) =>
          [item.beneficiaryName, item.referenceNo, item.evacuationCenterName, item.householdLabel, item.householdMemberName].some((value) =>
            (value ?? '').toLowerCase().includes(query),
          ),
        )
      : (distributionsQuery.data ?? []);
    return sortByKey(scoped, (item) => item.distributedAt, distributionSortDirection);
  }, [distributionSearch, distributionSortDirection, distributionsQuery.data]);
  const distributionPageCount = getPageCount(filteredDistributions.length, pageSize);
  const pagedDistributions = useMemo(
    () => paginateItems(filteredDistributions, distributionPage, pageSize),
    [distributionPage, filteredDistributions],
  );

  useEffect(() => {
    setInventoryPage(0);
  }, [inventorySearch, inventorySortDirection]);

  useEffect(() => {
    setDistributionPage(0);
  }, [distributionSearch, distributionSortDirection]);

  async function run(action: () => Promise<unknown>, fallback: string) {
    try {
      await action();
    } catch (error) {
      setActionError(error instanceof Error ? error.message : fallback);
    }
  }

  if (!client) {
    return (
      <Alert variant="warning">
        <AlertDescription>Configure Supabase env variables to manage relief distribution.</AlertDescription>
      </Alert>
    );
  }

  return (
    <section className="space-y-5">
      <SectionHeader
        missionTag="Mission 10"
        title="Relief Distribution"
        summary="Structured inventory and release tables with modal entry forms."
      />

      {actionError ? (
        <Alert variant="destructive">
          <AlertDescription>{actionError}</AlertDescription>
        </Alert>
      ) : null}

      <Card className="bg-muted/35">
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle className="text-base">Inventory</CardTitle>
            <div className="flex gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => void inventoryQuery.refetch()}>
                Refresh
              </Button>
              <Button type="button" size="sm" onClick={() => setIsInventoryDialogOpen(true)}>
                Add Inventory
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <DataTableToolbar
            value={inventorySearch}
            onValueChange={setInventorySearch}
            placeholder="Search item, unit, status, or center"
            summary={`${filteredInventory.length} inventory records`}
          />
          <TableContainer>
            <Table>
              <TableHead>
                <tr>
                  <TableHeaderCell>
                    <button type="button" onClick={() => setInventorySortDirection((value) => (value === 'asc' ? 'desc' : 'asc'))}>
                      Item
                    </button>
                  </TableHeaderCell>
                  <TableHeaderCell>Stock</TableHeaderCell>
                  <TableHeaderCell>Reorder Level</TableHeaderCell>
                  <TableHeaderCell>Status</TableHeaderCell>
                  <TableHeaderCell>Center</TableHeaderCell>
                </tr>
              </TableHead>
              <TableBody>
                {pagedInventory.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.itemName}</TableCell>
                    <TableCell>
                      {item.quantityOnHand} {item.unit}
                    </TableCell>
                    <TableCell>{item.reorderLevel}</TableCell>
                    <TableCell>
                      <Badge className={inventoryBadge(item)}>{item.status.replace('_', ' ')}</Badge>
                    </TableCell>
                    <TableCell>{item.evacuationCenterName ?? 'Barangay/Municipal'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          {!inventoryQuery.isLoading && (inventoryQuery.data ?? []).length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">No relief inventory yet.</p>
          ) : null}
          <div className="mt-3">
            <DataTablePagination
              page={inventoryPage}
              pageCount={inventoryPageCount}
              totalCount={filteredInventory.length}
              pageSize={pageSize}
              onPageChange={setInventoryPage}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle className="text-base">Distribution Log</CardTitle>
            <Button type="button" size="sm" onClick={() => setIsDistributionDialogOpen(true)}>
              Release Relief
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <DataTableToolbar
            value={distributionSearch}
            onValueChange={setDistributionSearch}
            placeholder="Search beneficiary, reference, household, or center"
            summary={`${filteredDistributions.length} relief releases`}
          />
          <TableContainer>
            <Table>
              <TableHead>
                <tr>
                  <TableHeaderCell>Beneficiary</TableHeaderCell>
                  <TableHeaderCell>Relief Item</TableHeaderCell>
                  <TableHeaderCell>Quantity</TableHeaderCell>
                  <TableHeaderCell>Reference</TableHeaderCell>
                  <TableHeaderCell>Household</TableHeaderCell>
                  <TableHeaderCell>Center</TableHeaderCell>
                  <TableHeaderCell>
                    <button
                      type="button"
                      onClick={() => setDistributionSortDirection((value) => (value === 'asc' ? 'desc' : 'asc'))}
                    >
                      Released At
                    </button>
                  </TableHeaderCell>
                </tr>
              </TableHead>
              <TableBody>
                {pagedDistributions.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <p className="font-medium">{item.beneficiaryName}</p>
                      <p className="text-xs text-muted-foreground">{item.householdMemberName ?? 'Household beneficiary'}</p>
                    </TableCell>
                    <TableCell>{item.reliefItemName ? `${item.reliefItemName} (${item.reliefItemUnit ?? 'unit'})` : 'Unknown item'}</TableCell>
                    <TableCell>{item.quantity}</TableCell>
                    <TableCell>{item.referenceNo ?? 'N/A'}</TableCell>
                    <TableCell>{item.householdLabel ?? 'No household linked'}</TableCell>
                    <TableCell>{item.evacuationCenterName ?? 'N/A'}</TableCell>
                    <TableCell>{formatDateTime(item.distributedAt)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          {!distributionsQuery.isLoading && (distributionsQuery.data ?? []).length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">No relief distributions yet.</p>
          ) : null}
          <div className="mt-3">
            <DataTablePagination
              page={distributionPage}
              pageCount={distributionPageCount}
              totalCount={filteredDistributions.length}
              pageSize={pageSize}
              onPageChange={setDistributionPage}
            />
          </div>
        </CardContent>
      </Card>

      <Dialog
        open={isInventoryDialogOpen}
        onOpenChange={setIsInventoryDialogOpen}
        title="Add Inventory"
        description="Create a new relief inventory record."
        footer={
          <Button
            type="button"
            disabled={createInventoryMutation.isPending}
            onClick={() => void run(() => createInventoryMutation.mutateAsync(), 'Failed to add inventory.')}
          >
            {createInventoryMutation.isPending ? 'Saving...' : 'Create Item'}
          </Button>
        }
      >
        <div className="space-y-3">
          <div>
            <Label className="mb-1 block text-xs uppercase tracking-wide text-muted-foreground">Item Name</Label>
            <Input
              value={inventoryForm.itemName}
              onChange={(event) => setInventoryForm({ ...inventoryForm, itemName: event.target.value })}
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <Label className="mb-1 block text-xs uppercase tracking-wide text-muted-foreground">Unit</Label>
              <Select value={inventoryForm.unit} onChange={(event) => setInventoryForm({ ...inventoryForm, unit: event.target.value })}>
                {inventoryUnitOptions.map((unit) => (
                  <option key={unit} value={unit}>
                    {unit}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label className="mb-1 block text-xs uppercase tracking-wide text-muted-foreground">Quantity</Label>
              <Input
                type="number"
                min={0}
                value={inventoryForm.quantityOnHand}
                onChange={(event) => setInventoryForm({ ...inventoryForm, quantityOnHand: event.target.value })}
              />
            </div>
            <div>
              <Label className="mb-1 block text-xs uppercase tracking-wide text-muted-foreground">Reorder Level</Label>
              <Input
                type="number"
                min={0}
                value={inventoryForm.reorderLevel}
                onChange={(event) => setInventoryForm({ ...inventoryForm, reorderLevel: event.target.value })}
              />
            </div>
          </div>
          <div>
            <Label className="mb-1 block text-xs uppercase tracking-wide text-muted-foreground">Center Scope</Label>
            <Select
              value={inventoryForm.evacuationCenterId}
              onChange={(event) => setInventoryForm({ ...inventoryForm, evacuationCenterId: event.target.value })}
            >
              <option value="">Barangay/Municipal stock</option>
              {(centersQuery.data ?? []).map((center) => (
                <option key={center.id} value={center.id}>
                  {center.name}
                </option>
              ))}
            </Select>
          </div>
        </div>
      </Dialog>

      <Dialog
        open={isDistributionDialogOpen}
        onOpenChange={setIsDistributionDialogOpen}
        title="Release Relief"
        description="Allocate relief goods to household or evacuee beneficiaries."
        footer={
          <Button
            type="button"
            disabled={createDistributionMutation.isPending}
            onClick={() =>
              void run(() => createDistributionMutation.mutateAsync(), 'Failed to release relief goods.')
            }
          >
            {createDistributionMutation.isPending ? 'Releasing...' : 'Release'}
          </Button>
        }
      >
        <div className="space-y-3">
          <div>
            <Label className="mb-1 block text-xs uppercase tracking-wide text-muted-foreground">Inventory Item</Label>
            <Select
              value={distributionForm.inventoryId}
              onChange={(event) => setDistributionForm({ ...distributionForm, inventoryId: event.target.value })}
            >
              <option value="">Select inventory item</option>
              {(inventoryQuery.data ?? []).map((item) => (
                <option key={item.id} value={item.id}>
                  {item.itemName} ({item.quantityOnHand} {item.unit})
                </option>
              ))}
            </Select>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label className="mb-1 block text-xs uppercase tracking-wide text-muted-foreground">Household</Label>
              <Select
                value={distributionForm.householdId}
                onChange={(event) => {
                  setDistributionForm({
                    ...distributionForm,
                    householdId: event.target.value,
                    householdMemberId: '',
                    beneficiaryName: '',
                  });
                }}
              >
                <option value="">No household link</option>
                {(householdsQuery.data ?? []).map((household) => (
                  <option key={household.id} value={household.id}>
                    {household.householdCode ?? household.addressText}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label className="mb-1 block text-xs uppercase tracking-wide text-muted-foreground">Beneficiary</Label>
              {distributionForm.householdId && (householdMembersQuery.data ?? []).length > 0 ? (
                <Select
                  value={distributionForm.householdMemberId}
                  onChange={(event) => {
                    const member = (householdMembersQuery.data ?? []).find((item) => item.id === event.target.value);
                    setDistributionForm({
                      ...distributionForm,
                      householdMemberId: event.target.value,
                      beneficiaryName: member?.fullName ?? '',
                    });
                  }}
                >
                  <option value="">Select beneficiary member</option>
                  {(householdMembersQuery.data ?? []).map((member) => (
                    <option key={member.id} value={member.id}>
                      {member.fullName}
                    </option>
                  ))}
                </Select>
              ) : (
                <Input
                  value={distributionForm.beneficiaryName}
                  onChange={(event) => setDistributionForm({ ...distributionForm, beneficiaryName: event.target.value })}
                  placeholder={
                    distributionForm.householdId && !householdMembersQuery.isLoading
                      ? 'No members found; enter beneficiary name'
                      : undefined
                  }
                />
              )}
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <Label className="mb-1 block text-xs uppercase tracking-wide text-muted-foreground">Quantity</Label>
              <Input
                type="number"
                min={1}
                value={distributionForm.quantity}
                onChange={(event) => setDistributionForm({ ...distributionForm, quantity: event.target.value })}
              />
            </div>
            <div>
              <Label className="mb-1 block text-xs uppercase tracking-wide text-muted-foreground">Reference No.</Label>
              <Input
                value={distributionForm.referenceNo}
                onChange={(event) => setDistributionForm({ ...distributionForm, referenceNo: event.target.value })}
              />
            </div>
            <div>
              <Label className="mb-1 block text-xs uppercase tracking-wide text-muted-foreground">Center</Label>
              <Select
                value={distributionForm.evacuationCenterId}
                onChange={(event) => setDistributionForm({ ...distributionForm, evacuationCenterId: event.target.value })}
              >
                <option value="">No center</option>
                {(centersQuery.data ?? []).map((center) => (
                  <option key={center.id} value={center.id}>
                    {center.name}
                  </option>
                ))}
              </Select>
            </div>
          </div>
        </div>
      </Dialog>
    </section>
  );
}
