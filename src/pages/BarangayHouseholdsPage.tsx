import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import QRCode from 'qrcode';
import { Download, MapPinned, RefreshCw, Home, Users } from 'lucide-react';

import { HOUSEHOLD_STATUSES } from '../constants/households';
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
import { Textarea } from '../components/ui/textarea';
import { useAuth } from '../features/auth/useAuth';
import {
  INITIAL_HOUSEHOLD_FORM_VALUES,
  INITIAL_MEMBER_FORM_VALUES,
  validateHouseholdForm,
  validateHouseholdMemberForm,
} from '../features/households/validation';
import type {
  HouseholdFormErrors,
  HouseholdFormValues,
  HouseholdMemberFormErrors,
  HouseholdMemberFormValues,
} from '../features/households/types';
import { getSupabaseClient } from '../services/supabase/client';
import {
  createHousehold,
  createHouseholdMember,
  deleteHousehold,
  deleteHouseholdMember,
  listHouseholdMembers,
  listHouseholds,
  updateHousehold,
  updateHouseholdMember,
  type HouseholdMemberRecord,
  type HouseholdRecord,
} from '../services/supabase/households';
import { getPageCount, paginateItems, sortByKey, type SortDirection } from '../lib/table';

const errorClass = 'mt-1 text-xs text-destructive';
const ID_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const MAX_CREATE_RETRIES = 5;
const RELATIONSHIP_OPTIONS = [
  'Head',
  'Spouse',
  'Child',
  'Parent',
  'Sibling',
  'Grandparent',
  'Grandchild',
  'Relative',
  'Boarder',
  'Helper',
  'Other',
] as const;

function randomIdSegment(length: number): string {
  const cryptoObject = globalThis.crypto;
  if (cryptoObject && 'getRandomValues' in cryptoObject) {
    const bytes = new Uint8Array(length);
    cryptoObject.getRandomValues(bytes);
    return Array.from(bytes)
      .map((value) => ID_CHARS[value % ID_CHARS.length])
      .join('');
  }

  return Array.from({ length }, () => ID_CHARS[Math.floor(Math.random() * ID_CHARS.length)]).join('');
}

function buildAutoHouseholdIdentifiers(): Pick<HouseholdFormValues, 'householdCode' | 'qrCode'> {
  const now = new Date();
  const dateStamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
  const householdCode = `HH-${dateStamp}-${randomIdSegment(6)}`;
  const qrCode = `RESQ-HH-${dateStamp}-${randomIdSegment(12)}`;

  return { householdCode, qrCode };
}

function toErrorMessage(error: unknown, fallbackMessage: string): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  if (error && typeof error === 'object') {
    const candidate = error as { message?: unknown; details?: unknown; hint?: unknown };
    const parts = [candidate.message, candidate.details, candidate.hint].filter(
      (value): value is string => typeof value === 'string' && value.trim().length > 0,
    );
    if (parts.length > 0) {
      return parts.join(' ');
    }
  }

  return fallbackMessage;
}

function isHouseholdIdentifierConflict(error: unknown): boolean {
  if (!error || typeof error !== 'object') {
    return false;
  }

  const candidate = error as { code?: unknown; message?: unknown; details?: unknown };
  if (candidate.code !== '23505') {
    return false;
  }

  const combinedText = `${typeof candidate.message === 'string' ? candidate.message : ''} ${
    typeof candidate.details === 'string' ? candidate.details : ''
  }`.toLowerCase();

  return combinedText.includes('household_code') || combinedText.includes('qr_code');
}

function parseOptionalNumber(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}

function sanitizeFileName(value: string): string {
  return value.replace(/[^a-z0-9-_]+/gi, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
}

function formatStatus(status: HouseholdRecord['status']): string {
  return status === 'active' ? 'Active' : status === 'evacuated' ? 'Evacuated' : 'Inactive';
}

function statusBadgeClass(status: HouseholdRecord['status']): string {
  if (status === 'active') {
    return 'bg-emerald-100 text-emerald-800';
  }
  if (status === 'evacuated') {
    return 'bg-amber-100 text-amber-800';
  }
  return 'bg-muted text-muted-foreground';
}

function toHouseholdFormValues(item: HouseholdRecord): HouseholdFormValues {
  return {
    householdCode: item.householdCode ?? '',
    addressText: item.addressText,
    status: item.status,
    qrCode: item.qrCode ?? '',
    latitude: item.latitude === null ? '' : String(item.latitude),
    longitude: item.longitude === null ? '' : String(item.longitude),
  };
}

function toMemberFormValues(item: HouseholdMemberRecord): HouseholdMemberFormValues {
  return {
    fullName: item.fullName,
    relationshipToHead: item.relationshipToHead ?? '',
    birthDate: item.birthDate ?? '',
    sex: item.sex ?? '',
    isVulnerable: item.isVulnerable,
    vulnerabilityNotes: item.vulnerabilityNotes ?? '',
  };
}

export function BarangayHouseholdsPage() {
  const auth = useAuth();
  const client = useMemo(() => getSupabaseClient(), []);
  const toast = useToast();

  const [households, setHouseholds] = useState<HouseholdRecord[]>([]);
  const [householdsError, setHouseholdsError] = useState<string | null>(null);
  const [isLoadingHouseholds, setIsLoadingHouseholds] = useState(false);
  const [selectedHouseholdId, setSelectedHouseholdId] = useState<string | null>(null);
  const [householdSearch, setHouseholdSearch] = useState('');
  const [householdSortDirection, setHouseholdSortDirection] = useState<SortDirection>('asc');
  const [householdPage, setHouseholdPage] = useState(0);

  const [householdForm, setHouseholdForm] = useState(INITIAL_HOUSEHOLD_FORM_VALUES);
  const [householdFormErrors, setHouseholdFormErrors] = useState<HouseholdFormErrors>({});
  const [editingHouseholdId, setEditingHouseholdId] = useState<string | null>(null);
  const [isHouseholdDialogOpen, setIsHouseholdDialogOpen] = useState(false);
  const [isSubmittingHousehold, setIsSubmittingHousehold] = useState(false);
  const [householdActionError, setHouseholdActionError] = useState<string | null>(null);
  const [isLocationPickerOpen, setIsLocationPickerOpen] = useState(false);

  const [members, setMembers] = useState<HouseholdMemberRecord[]>([]);
  const [membersError, setMembersError] = useState<string | null>(null);
  const [isLoadingMembers, setIsLoadingMembers] = useState(false);
  const [memberForm, setMemberForm] = useState(INITIAL_MEMBER_FORM_VALUES);
  const [memberFormErrors, setMemberFormErrors] = useState<HouseholdMemberFormErrors>({});
  const [editingMemberId, setEditingMemberId] = useState<string | null>(null);
  const [isMemberDialogOpen, setIsMemberDialogOpen] = useState(false);
  const [isSubmittingMember, setIsSubmittingMember] = useState(false);
  const [memberActionError, setMemberActionError] = useState<string | null>(null);
  const [memberSearch, setMemberSearch] = useState('');
  const [memberSortDirection, setMemberSortDirection] = useState<SortDirection>('asc');
  const [memberPage, setMemberPage] = useState(0);
  const [pendingDeleteHousehold, setPendingDeleteHousehold] = useState<HouseholdRecord | null>(null);
  const [pendingDeleteMember, setPendingDeleteMember] = useState<HouseholdMemberRecord | null>(null);
  const pageSize = 8;

  const barangayId = auth.profile?.barangayId ?? null;
  const selectedHousehold = useMemo(
    () => households.find((item) => item.id === selectedHouseholdId) ?? null,
    [households, selectedHouseholdId],
  );
  const filteredHouseholds = useMemo(() => {
    const query = householdSearch.trim().toLowerCase();
    const scoped = query
      ? households.filter((item) =>
          [item.householdCode, item.addressText, item.qrCode].some((value) =>
            (value ?? '').toLowerCase().includes(query),
          ),
        )
      : households;
    return sortByKey(scoped, (item) => item.addressText, householdSortDirection);
  }, [householdSearch, householdSortDirection, households]);
  const householdPageCount = getPageCount(filteredHouseholds.length, pageSize);
  const pagedHouseholds = useMemo(
    () => paginateItems(filteredHouseholds, householdPage, pageSize),
    [filteredHouseholds, householdPage],
  );
  const filteredMembers = useMemo(() => {
    const query = memberSearch.trim().toLowerCase();
    const scoped = query
      ? members.filter((item) =>
          [item.fullName, item.relationshipToHead, item.sex, item.vulnerabilityNotes].some((value) =>
            (value ?? '').toLowerCase().includes(query),
          ),
        )
      : members;
    return sortByKey(scoped, (item) => item.fullName, memberSortDirection);
  }, [memberSearch, memberSortDirection, members]);
  const memberPageCount = getPageCount(filteredMembers.length, pageSize);
  const pagedMembers = useMemo(() => paginateItems(filteredMembers, memberPage, pageSize), [filteredMembers, memberPage]);

  const refreshHouseholds = useCallback(
    async (preferredId?: string) => {
      if (!client) {
        return;
      }
      setIsLoadingHouseholds(true);
      setHouseholdsError(null);
      try {
        const data = await listHouseholds(client);
        setHouseholds(data);
        setSelectedHouseholdId((current) => {
          if (preferredId && data.some((item) => item.id === preferredId)) {
            return preferredId;
          }
          if (current && data.some((item) => item.id === current)) {
            return current;
          }
          return data[0]?.id ?? null;
        });
      } catch (error) {
        setHouseholdsError(error instanceof Error ? error.message : 'Failed to load households.');
      } finally {
        setIsLoadingHouseholds(false);
      }
    },
    [client],
  );

  const refreshMembers = useCallback(
    async (householdId: string) => {
      if (!client) {
        return;
      }
      setIsLoadingMembers(true);
      setMembersError(null);
      try {
        setMembers(await listHouseholdMembers(client, householdId));
      } catch (error) {
        setMembersError(error instanceof Error ? error.message : 'Failed to load members.');
      } finally {
        setIsLoadingMembers(false);
      }
    },
    [client],
  );

  useEffect(() => {
    if (auth.status === 'authenticated' && auth.role === 'barangay_official' && client) {
      void refreshHouseholds();
    }
  }, [auth.role, auth.status, client, refreshHouseholds]);

  useEffect(() => {
    if (!selectedHouseholdId) {
      setMembers([]);
      return;
    }
    void refreshMembers(selectedHouseholdId);
  }, [refreshMembers, selectedHouseholdId]);
  useEffect(() => {
    setHouseholdPage(0);
  }, [householdSearch, householdSortDirection]);
  useEffect(() => {
    setMemberPage(0);
  }, [memberSearch, memberSortDirection, selectedHouseholdId]);

  function openCreateHouseholdDialog() {
    const identifiers = buildAutoHouseholdIdentifiers();
    setEditingHouseholdId(null);
    setHouseholdForm({
      ...INITIAL_HOUSEHOLD_FORM_VALUES,
      householdCode: identifiers.householdCode,
      qrCode: identifiers.qrCode,
    });
    setHouseholdFormErrors({});
    setHouseholdActionError(null);
    setIsHouseholdDialogOpen(true);
  }

  function openEditHouseholdDialog(item: HouseholdRecord) {
    setEditingHouseholdId(item.id);
    setHouseholdForm(toHouseholdFormValues(item));
    setHouseholdFormErrors({});
    setHouseholdActionError(null);
    setIsHouseholdDialogOpen(true);
  }

  async function onHouseholdSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const needsAutoIdentifiers = !householdForm.householdCode.trim() || !householdForm.qrCode.trim();
    const workingForm = needsAutoIdentifiers
      ? { ...householdForm, ...buildAutoHouseholdIdentifiers() }
      : householdForm;

    if (needsAutoIdentifiers) {
      setHouseholdForm(workingForm);
    }

    const result = validateHouseholdForm(workingForm);
    setHouseholdFormErrors(result.errors);
    setHouseholdActionError(null);
    if (!result.normalized) {
      return;
    }
    if (!client) {
      setHouseholdActionError('Supabase is unavailable.');
      return;
    }
    if (!barangayId) {
      setHouseholdActionError('No barangay assigned to this user.');
      return;
    }

    setIsSubmittingHousehold(true);
    try {
      let saved: HouseholdRecord | null = null;

      if (editingHouseholdId) {
        saved = await updateHousehold(client, editingHouseholdId, result.normalized);
      } else {
        const baseInput = { ...result.normalized, barangayId };
        let pendingInput = baseInput;

        for (let attempt = 0; attempt < MAX_CREATE_RETRIES; attempt += 1) {
          try {
            saved = await createHousehold(client, pendingInput);
            break;
          } catch (error) {
            const canRetry = isHouseholdIdentifierConflict(error) && attempt < MAX_CREATE_RETRIES - 1;
            if (!canRetry) {
              throw error;
            }

            const regenerated = buildAutoHouseholdIdentifiers();
            pendingInput = {
              ...baseInput,
              householdCode: regenerated.householdCode,
              qrCode: regenerated.qrCode,
            };
            setHouseholdForm((current) => ({
              ...current,
              householdCode: regenerated.householdCode,
              qrCode: regenerated.qrCode,
            }));
          }
        }
      }

      if (!saved) {
        throw new Error('Household save did not return a record.');
      }

      setIsHouseholdDialogOpen(false);
      setHouseholdForm(INITIAL_HOUSEHOLD_FORM_VALUES);
      setEditingHouseholdId(null);
      toast.success(editingHouseholdId ? 'Household updated' : 'Household created', 'Household record has been saved successfully.');
      await refreshHouseholds(saved.id);
    } catch (error) {
      const message = toErrorMessage(error, 'Failed to save household.');
      if (message.toLowerCase().includes('row-level security policy for table "households"')) {
        setHouseholdActionError(
          'Household create is blocked by database policy. Run the latest supabase/sql/002_phase3_rls.sql in Supabase SQL Editor, then sign out and sign in again.',
        );
      } else {
        setHouseholdActionError(message);
      }
      toast.error('Save failed', message);
    } finally {
      setIsSubmittingHousehold(false);
    }
  }

  async function onDeleteHousehold(item: HouseholdRecord) {
    if (!client) {
      return;
    }
    try {
      await deleteHousehold(client, item.id);
      setPendingDeleteHousehold(null);
      toast.success('Household deleted', 'The household record has been removed.');
      await refreshHouseholds();
    } catch (error) {
      const message = toErrorMessage(error, 'Failed to delete household.');
      setHouseholdActionError(message);
      toast.error('Delete failed', message);
    }
  }

  function openCreateMemberDialog() {
    setEditingMemberId(null);
    setMemberForm(INITIAL_MEMBER_FORM_VALUES);
    setMemberFormErrors({});
    setMemberActionError(null);
    setIsMemberDialogOpen(true);
  }

  function openEditMemberDialog(item: HouseholdMemberRecord) {
    setEditingMemberId(item.id);
    setMemberForm(toMemberFormValues(item));
    setMemberFormErrors({});
    setMemberActionError(null);
    setIsMemberDialogOpen(true);
  }

  async function onDownloadQr(item: HouseholdRecord) {
    const qrValue = (item.qrCode ?? '').trim();
    if (!qrValue) {
      setHouseholdActionError('This household has no QR value to download yet.');
      return;
    }

    try {
      const dataUrl = await QRCode.toDataURL(qrValue, {
        errorCorrectionLevel: 'M',
        margin: 2,
        width: 720,
      });
      const link = document.createElement('a');
      const baseName = sanitizeFileName(item.householdCode ?? item.id) || item.id;
      link.href = dataUrl;
      link.download = `${baseName}-qr.png`;
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      setHouseholdActionError(toErrorMessage(error, 'Failed to generate downloadable QR image.'));
    }
  }

  async function onMemberSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const result = validateHouseholdMemberForm(memberForm);
    setMemberFormErrors(result.errors);
    setMemberActionError(null);
    if (!result.normalized || !selectedHouseholdId || !client) {
      return;
    }
    setIsSubmittingMember(true);
    try {
      if (editingMemberId) {
        await updateHouseholdMember(client, editingMemberId, result.normalized);
      } else {
        await createHouseholdMember(client, { ...result.normalized, householdId: selectedHouseholdId });
      }
      setIsMemberDialogOpen(false);
      setMemberForm(INITIAL_MEMBER_FORM_VALUES);
      setEditingMemberId(null);
      toast.success(editingMemberId ? 'Member updated' : 'Member added', 'Household member record has been saved.');
      await refreshMembers(selectedHouseholdId);
    } catch (error) {
      const message = toErrorMessage(error, 'Failed to save member.');
      setMemberActionError(message);
      toast.error('Save failed', message);
    } finally {
      setIsSubmittingMember(false);
    }
  }

  async function onDeleteMember(item: HouseholdMemberRecord) {
    if (!client) {
      return;
    }
    try {
      await deleteHouseholdMember(client, item.id);
      setPendingDeleteMember(null);
      toast.success('Member removed', 'Household member has been deleted.');
      if (selectedHouseholdId) {
        await refreshMembers(selectedHouseholdId);
      }
    } catch (error) {
      const message = toErrorMessage(error, 'Failed to delete member.');
      setMemberActionError(message);
      toast.error('Delete failed', message);
    }
  }

  if (!client) {
    return (
      <Alert variant="warning">
        <AlertDescription>Configure Supabase env variables to use household CRUD.</AlertDescription>
      </Alert>
    );
  }

  return (
    <section className="space-y-5">
      <SectionHeader
        missionTag="Mission 5"
        title="Household Registry"
        summary="Barangay-scoped household and family-member records with searchable tabular workflow."
      />

      {auth.role === 'barangay_official' && !barangayId ? (
        <Alert variant="destructive">
          <AlertDescription>No `profiles.barangay_id` is set for this user.</AlertDescription>
        </Alert>
      ) : null}
      {householdsError ? (
        <Alert variant="destructive">
          <AlertDescription>{householdsError}</AlertDescription>
        </Alert>
      ) : null}

      <Card className="bg-muted/35">
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle className="text-base">Households</CardTitle>
            <div className="flex gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => void refreshHouseholds()}>
                Refresh
              </Button>
              <Button type="button" size="sm" onClick={openCreateHouseholdDialog}>
                New Household
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <DataTableToolbar
            value={householdSearch}
            onValueChange={setHouseholdSearch}
            placeholder="Search household code, address, or QR"
            summary={`${filteredHouseholds.length} household records`}
          />
          {isLoadingHouseholds ? (
            <TableSkeleton rows={5} />
          ) : (
          <TableContainer>
            <Table>
              <TableHead>
                <tr>
                  <SortableHeader
                    sortKey="address"
                    currentSort="address"
                    currentDir={householdSortDirection}
                    onSort={(_, dir) => setHouseholdSortDirection(dir ?? 'asc')}
                  >
                    Household / Address
                  </SortableHeader>
                  <TableHeaderCell>Status</TableHeaderCell>
                  <TableHeaderCell>Coordinates</TableHeaderCell>
                  <TableHeaderCell>QR Value</TableHeaderCell>
                  <TableHeaderCell className="text-right">Actions</TableHeaderCell>
                </tr>
              </TableHead>
              <TableBody>
                {pagedHouseholds.map((item) => (
                  <TableRow key={item.id} className={selectedHouseholdId === item.id ? 'bg-primary/10' : undefined}>
                    <TableCell>
                      <p className="font-medium">{item.householdCode ?? 'Uncoded'}</p>
                      <p className="text-xs text-muted-foreground">{item.addressText}</p>
                    </TableCell>
                    <TableCell>
                      <Badge className={statusBadgeClass(item.status)}>{formatStatus(item.status)}</Badge>
                    </TableCell>
                    <TableCell>
                      {item.latitude !== null && item.longitude !== null
                        ? `${item.latitude.toFixed(5)}, ${item.longitude.toFixed(5)}`
                        : 'N/A'}
                    </TableCell>
                    <TableCell>
                      {item.qrCode ? (
                        <div className="flex items-center gap-2">
                          <code className="text-xs">{item.qrCode}</code>
                          <Button type="button" variant="outline" size="sm" onClick={() => void onDownloadQr(item)}>
                            <Download className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">Not generated</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-2">
                        <Button type="button" variant="outline" size="sm" onClick={() => setSelectedHouseholdId(item.id)}>
                          View
                        </Button>
                        <Button type="button" variant="outline" size="sm" onClick={() => openEditHouseholdDialog(item)}>
                          Edit
                        </Button>
                        <Button type="button" variant="destructive" size="sm" onClick={() => setPendingDeleteHousehold(item)}>
                          Delete
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          )}
          {!isLoadingHouseholds && households.length === 0 && (
            <EmptyState
              icon={Home}
              title="No households registered"
              description="Create the first household record for this barangay."
            />
          )}
          <div className="mt-3">
            <DataTablePagination
              page={householdPage}
              pageCount={householdPageCount}
              totalCount={filteredHouseholds.length}
              pageSize={pageSize}
              onPageChange={setHouseholdPage}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle className="text-base">
              Family Members {selectedHousehold ? `- ${selectedHousehold.householdCode ?? selectedHousehold.addressText}` : ''}
            </CardTitle>
            <Button type="button" size="sm" disabled={!selectedHouseholdId} onClick={openCreateMemberDialog}>
              New Member
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {selectedHousehold ? (
            <div className="mb-3 rounded-lg border border-border bg-muted/30 p-3">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Selected Household QR</p>
              {selectedHousehold.qrCode ? (
                <div className="mt-1 flex items-center gap-2">
                  <code className="text-xs">{selectedHousehold.qrCode}</code>
                  <Button type="button" variant="outline" size="sm" onClick={() => void onDownloadQr(selectedHousehold)}>
                    <Download className="mr-1 h-3.5 w-3.5" />
                    Download QR
                  </Button>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">No QR value assigned yet.</p>
              )}
            </div>
          ) : null}
          {membersError ? (
            <Alert variant="destructive" className="mb-3">
              <AlertDescription>{membersError}</AlertDescription>
            </Alert>
          ) : null}
          <DataTableToolbar
            value={memberSearch}
            onValueChange={setMemberSearch}
            placeholder="Search name, relationship, sex, or notes"
            summary={`${filteredMembers.length} family members`}
            className="mb-3"
          />
          {isLoadingMembers ? (
            <TableSkeleton rows={4} />
          ) : (
          <TableContainer>
            <Table>
              <TableHead>
                <tr>
                  <SortableHeader
                    sortKey="name"
                    currentSort="name"
                    currentDir={memberSortDirection}
                    onSort={(_, dir) => setMemberSortDirection(dir ?? 'asc')}
                  >
                    Name
                  </SortableHeader>
                  <TableHeaderCell>Relationship</TableHeaderCell>
                  <TableHeaderCell>Birth Date</TableHeaderCell>
                  <TableHeaderCell>Sex</TableHeaderCell>
                  <TableHeaderCell>Vulnerability</TableHeaderCell>
                  <TableHeaderCell className="text-right">Actions</TableHeaderCell>
                </tr>
              </TableHead>
              <TableBody>
                {pagedMembers.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.fullName}</TableCell>
                    <TableCell>{item.relationshipToHead ?? 'N/A'}</TableCell>
                    <TableCell>{item.birthDate ?? 'N/A'}</TableCell>
                    <TableCell>{item.sex ?? 'N/A'}</TableCell>
                    <TableCell>
                      {item.isVulnerable ? (
                        <span className="text-xs font-semibold text-amber-800">Priority</span>
                      ) : (
                        <span className="text-xs text-muted-foreground">No</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-2">
                        <Button type="button" variant="outline" size="sm" onClick={() => openEditMemberDialog(item)}>
                          Edit
                        </Button>
                        <Button type="button" variant="destructive" size="sm" onClick={() => setPendingDeleteMember(item)}>
                          Delete
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          )}
          {!isLoadingMembers && selectedHouseholdId && members.length === 0 ? (
            <EmptyState icon={Users} title="No members yet" description="Add the first household member using the button above." />
          ) : null}
          {!selectedHouseholdId ? <p className="mt-3 text-sm text-muted-foreground">Select a household first.</p> : null}
          {selectedHouseholdId ? (
            <div className="mt-3">
              <DataTablePagination
                page={memberPage}
                pageCount={memberPageCount}
                totalCount={filteredMembers.length}
                pageSize={pageSize}
                onPageChange={setMemberPage}
              />
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Dialog
        open={isHouseholdDialogOpen}
        onOpenChange={setIsHouseholdDialogOpen}
        title={editingHouseholdId ? 'Update Household' : 'Create Household'}
        description="Maintain household core profile and geolocation."
        footer={
          <Button type="submit" form="household-form" disabled={isSubmittingHousehold || !barangayId}>
            {isSubmittingHousehold ? 'Saving...' : editingHouseholdId ? 'Update' : 'Create'}
          </Button>
        }
      >
        <form id="household-form" className="space-y-3" onSubmit={onHouseholdSubmit} noValidate>
          <div>
            <Label className="mb-1 block text-xs uppercase tracking-wide text-muted-foreground">Address</Label>
            <div className="relative">
              <Textarea
                value={householdForm.addressText}
                onChange={(event) => setHouseholdForm((previous) => ({ ...previous, addressText: event.target.value }))}
                rows={2}
                placeholder="Street, purok, barangay, municipality"
                className="pr-12"
              />
              <Button
                type="button"
                variant="secondary"
                size="icon"
                onClick={() => setIsLocationPickerOpen(true)}
                title="Pinpoint location on map"
                className="absolute bottom-2 right-2 h-7 w-7 rounded-full bg-emerald-600 text-white hover:bg-emerald-700"
              >
                <MapPinned className="h-3.5 w-3.5" />
              </Button>
            </div>
            {householdFormErrors.addressText ? <p className={errorClass}>{householdFormErrors.addressText}</p> : null}
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label className="mb-1 block text-xs uppercase tracking-wide text-muted-foreground">Household Code</Label>
              <div className="flex gap-2">
                <Input value={householdForm.householdCode} readOnly />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  title="Generate new household code and QR value"
                  onClick={() => {
                    const identifiers = buildAutoHouseholdIdentifiers();
                    setHouseholdForm((previous) => ({
                      ...previous,
                      householdCode: identifiers.householdCode,
                      qrCode: identifiers.qrCode,
                    }));
                  }}
                >
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">Auto-generated. Use refresh to regenerate.</p>
              {householdFormErrors.householdCode ? <p className={errorClass}>{householdFormErrors.householdCode}</p> : null}
            </div>
            <div>
              <Label className="mb-1 block text-xs uppercase tracking-wide text-muted-foreground">Status</Label>
              <Select
                value={householdForm.status}
                onChange={(event) =>
                  setHouseholdForm((previous) => ({
                    ...previous,
                    status: event.target.value as HouseholdFormValues['status'],
                  }))
                }
              >
                {HOUSEHOLD_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {formatStatus(status)}
                  </option>
                ))}
              </Select>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label className="mb-1 block text-xs uppercase tracking-wide text-muted-foreground">Latitude</Label>
              <Input
                value={householdForm.latitude}
                onChange={(event) => setHouseholdForm((previous) => ({ ...previous, latitude: event.target.value }))}
              />
              {householdFormErrors.latitude ? <p className={errorClass}>{householdFormErrors.latitude}</p> : null}
            </div>
            <div>
              <Label className="mb-1 block text-xs uppercase tracking-wide text-muted-foreground">Longitude</Label>
              <Input
                value={householdForm.longitude}
                onChange={(event) => setHouseholdForm((previous) => ({ ...previous, longitude: event.target.value }))}
              />
              {householdFormErrors.longitude ? <p className={errorClass}>{householdFormErrors.longitude}</p> : null}
            </div>
          </div>
          <div>
            <Label className="mb-1 block text-xs uppercase tracking-wide text-muted-foreground">QR Value</Label>
            <Input value={householdForm.qrCode} readOnly />
            <p className="mt-1 text-xs text-muted-foreground">Auto-generated from the same identifier batch.</p>
            {householdFormErrors.qrCode ? <p className={errorClass}>{householdFormErrors.qrCode}</p> : null}
          </div>
          {householdActionError ? (
            <Alert variant="destructive">
              <AlertDescription>{householdActionError}</AlertDescription>
            </Alert>
          ) : null}
        </form>
      </Dialog>

      <Dialog
        open={isMemberDialogOpen}
        onOpenChange={setIsMemberDialogOpen}
        title={editingMemberId ? 'Update Family Member' : 'Add Family Member'}
        description="Keep household member details and vulnerability markers updated."
        footer={
          <Button type="submit" form="member-form" disabled={isSubmittingMember || !selectedHouseholdId}>
            {isSubmittingMember ? 'Saving...' : editingMemberId ? 'Update' : 'Create'}
          </Button>
        }
      >
        <form id="member-form" className="space-y-3" onSubmit={onMemberSubmit} noValidate>
          <div>
            <Label className="mb-1 block text-xs uppercase tracking-wide text-muted-foreground">Full Name</Label>
            <Input
              value={memberForm.fullName}
              onChange={(event) => setMemberForm((previous) => ({ ...previous, fullName: event.target.value }))}
            />
            {memberFormErrors.fullName ? <p className={errorClass}>{memberFormErrors.fullName}</p> : null}
          </div>
          <div>
            <Label className="mb-1 block text-xs uppercase tracking-wide text-muted-foreground">Relationship</Label>
            <Select
              value={memberForm.relationshipToHead}
              onChange={(event) =>
                setMemberForm((previous) => ({ ...previous, relationshipToHead: event.target.value }))
              }
            >
              <option value="">Unspecified</option>
              {RELATIONSHIP_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
              {memberForm.relationshipToHead &&
              !RELATIONSHIP_OPTIONS.includes(memberForm.relationshipToHead as (typeof RELATIONSHIP_OPTIONS)[number]) ? (
                <option value={memberForm.relationshipToHead}>{memberForm.relationshipToHead}</option>
              ) : null}
            </Select>
            {memberFormErrors.relationshipToHead ? <p className={errorClass}>{memberFormErrors.relationshipToHead}</p> : null}
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label className="mb-1 block text-xs uppercase tracking-wide text-muted-foreground">Birth Date</Label>
              <Input
                type="date"
                value={memberForm.birthDate}
                onChange={(event) => setMemberForm((previous) => ({ ...previous, birthDate: event.target.value }))}
              />
              {memberFormErrors.birthDate ? <p className={errorClass}>{memberFormErrors.birthDate}</p> : null}
            </div>
            <div>
              <Label className="mb-1 block text-xs uppercase tracking-wide text-muted-foreground">Sex</Label>
              <Select
                value={memberForm.sex}
                onChange={(event) =>
                  setMemberForm((previous) => ({ ...previous, sex: event.target.value as HouseholdMemberFormValues['sex'] }))
                }
              >
                <option value="">Unspecified</option>
                <option value="female">Female</option>
                <option value="male">Male</option>
                <option value="other">Other</option>
              </Select>
              {memberFormErrors.sex ? <p className={errorClass}>{memberFormErrors.sex}</p> : null}
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            <input
              type="checkbox"
              checked={memberForm.isVulnerable}
              onChange={(event) => setMemberForm((previous) => ({ ...previous, isVulnerable: event.target.checked }))}
            />
            Mark as vulnerable
          </label>
          <div>
            <Label className="mb-1 block text-xs uppercase tracking-wide text-muted-foreground">Vulnerability Notes</Label>
            <Textarea
              value={memberForm.vulnerabilityNotes}
              onChange={(event) => setMemberForm((previous) => ({ ...previous, vulnerabilityNotes: event.target.value }))}
              rows={2}
            />
            {memberFormErrors.vulnerabilityNotes ? <p className={errorClass}>{memberFormErrors.vulnerabilityNotes}</p> : null}
          </div>
          {memberActionError ? (
            <Alert variant="destructive">
              <AlertDescription>{memberActionError}</AlertDescription>
            </Alert>
          ) : null}
        </form>
      </Dialog>

      <ConfirmDialog
        open={Boolean(pendingDeleteHousehold)}
        onOpenChange={(open) => {
          if (!open) {
            setPendingDeleteHousehold(null);
          }
        }}
        title="Delete household"
        description={
          pendingDeleteHousehold
            ? `Delete "${pendingDeleteHousehold.addressText}" and all linked family members?`
            : ''
        }
        confirmLabel="Delete household"
        onConfirm={() => (pendingDeleteHousehold ? onDeleteHousehold(pendingDeleteHousehold) : undefined)}
      />

      <ConfirmDialog
        open={Boolean(pendingDeleteMember)}
        onOpenChange={(open) => {
          if (!open) {
            setPendingDeleteMember(null);
          }
        }}
        title="Delete family member"
        description={pendingDeleteMember ? `Delete "${pendingDeleteMember.fullName}" from this household?` : ''}
        confirmLabel="Delete member"
        onConfirm={() => (pendingDeleteMember ? onDeleteMember(pendingDeleteMember) : undefined)}
      />

      <LocationPickerDialog
        open={isLocationPickerOpen}
        onOpenChange={setIsLocationPickerOpen}
        title="Pinpoint Household Location"
        initialLocationText={householdForm.addressText}
        initialLatitude={parseOptionalNumber(householdForm.latitude)}
        initialLongitude={parseOptionalNumber(householdForm.longitude)}
        onSelect={(value) =>
          setHouseholdForm((current) => ({
            ...current,
            addressText: value.locationText,
            latitude: value.latitude.toFixed(6),
            longitude: value.longitude.toFixed(6),
          }))
        }
      />
    </section>
  );
}
