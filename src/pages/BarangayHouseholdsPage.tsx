import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';

import { HOUSEHOLD_STATUSES } from '../constants/households';
import { SectionHeader } from '../components/system/SectionHeader';
import { Alert, AlertDescription } from '../components/ui/alert';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select } from '../components/ui/select';
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

const errorClass = 'mt-1 text-xs text-destructive';

function formatStatus(status: HouseholdRecord['status']): string {
  return status === 'active' ? 'Active' : status === 'evacuated' ? 'Evacuated' : 'Inactive';
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

  const [households, setHouseholds] = useState<HouseholdRecord[]>([]);
  const [householdsError, setHouseholdsError] = useState<string | null>(null);
  const [isLoadingHouseholds, setIsLoadingHouseholds] = useState(false);
  const [selectedHouseholdId, setSelectedHouseholdId] = useState<string | null>(null);

  const [householdForm, setHouseholdForm] = useState(INITIAL_HOUSEHOLD_FORM_VALUES);
  const [householdFormErrors, setHouseholdFormErrors] = useState<HouseholdFormErrors>({});
  const [editingHouseholdId, setEditingHouseholdId] = useState<string | null>(null);
  const [isSubmittingHousehold, setIsSubmittingHousehold] = useState(false);
  const [householdActionError, setHouseholdActionError] = useState<string | null>(null);

  const [members, setMembers] = useState<HouseholdMemberRecord[]>([]);
  const [membersError, setMembersError] = useState<string | null>(null);
  const [isLoadingMembers, setIsLoadingMembers] = useState(false);
  const [memberForm, setMemberForm] = useState(INITIAL_MEMBER_FORM_VALUES);
  const [memberFormErrors, setMemberFormErrors] = useState<HouseholdMemberFormErrors>({});
  const [editingMemberId, setEditingMemberId] = useState<string | null>(null);
  const [isSubmittingMember, setIsSubmittingMember] = useState(false);
  const [memberActionError, setMemberActionError] = useState<string | null>(null);

  const barangayId = auth.profile?.barangayId ?? null;
  const selectedHousehold = useMemo(
    () => households.find((item) => item.id === selectedHouseholdId) ?? null,
    [households, selectedHouseholdId],
  );

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

  async function onHouseholdSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const result = validateHouseholdForm(householdForm);
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
      const saved = editingHouseholdId
        ? await updateHousehold(client, editingHouseholdId, result.normalized)
        : await createHousehold(client, { ...result.normalized, barangayId });
      setHouseholdForm(INITIAL_HOUSEHOLD_FORM_VALUES);
      setHouseholdFormErrors({});
      setEditingHouseholdId(null);
      await refreshHouseholds(saved.id);
    } catch (error) {
      setHouseholdActionError(error instanceof Error ? error.message : 'Failed to save household.');
    } finally {
      setIsSubmittingHousehold(false);
    }
  }

  async function onDeleteHousehold(item: HouseholdRecord) {
    if (!client || !window.confirm(`Delete household "${item.addressText}" and all members?`)) {
      return;
    }
    try {
      await deleteHousehold(client, item.id);
      if (editingHouseholdId === item.id) {
        setHouseholdForm(INITIAL_HOUSEHOLD_FORM_VALUES);
        setEditingHouseholdId(null);
      }
      await refreshHouseholds();
    } catch (error) {
      setHouseholdActionError(error instanceof Error ? error.message : 'Failed to delete household.');
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
      setMemberForm(INITIAL_MEMBER_FORM_VALUES);
      setMemberFormErrors({});
      setEditingMemberId(null);
      await refreshMembers(selectedHouseholdId);
    } catch (error) {
      setMemberActionError(error instanceof Error ? error.message : 'Failed to save member.');
    } finally {
      setIsSubmittingMember(false);
    }
  }

  async function onDeleteMember(item: HouseholdMemberRecord) {
    if (!client || !window.confirm(`Delete member "${item.fullName}"?`)) {
      return;
    }
    try {
      await deleteHouseholdMember(client, item.id);
      if (editingMemberId === item.id) {
        setMemberForm(INITIAL_MEMBER_FORM_VALUES);
        setEditingMemberId(null);
      }
      if (selectedHouseholdId) {
        await refreshMembers(selectedHouseholdId);
      }
    } catch (error) {
      setMemberActionError(error instanceof Error ? error.message : 'Failed to delete member.');
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
        summary="Barangay-scoped household/member CRUD with validation."
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

      <div className="grid gap-4 xl:grid-cols-2">
        <Card className="bg-muted/35">
          <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="text-base">Households</CardTitle>
            <Button type="button" variant="outline" size="sm" onClick={() => void refreshHouseholds()}>
              Refresh
            </Button>
          </div>
          </CardHeader>
          <CardContent className="space-y-3">
          {isLoadingHouseholds ? <p className="text-sm text-muted-foreground">Loading...</p> : null}
          <div className="space-y-2">
            {households.map((item) => (
              <div
                key={item.id}
                className={`rounded-lg border p-2 ${
                  selectedHouseholdId === item.id
                    ? 'border-primary/40 bg-primary/10'
                    : 'border-border bg-card'
                }`}
              >
                <button type="button" onClick={() => setSelectedHouseholdId(item.id)} className="w-full text-left">
                  <p className="text-sm font-semibold text-foreground">{item.addressText}</p>
                  <p className="text-xs text-muted-foreground">
                    {item.householdCode ?? 'N/A'} | {formatStatus(item.status)}
                  </p>
                </button>
                <div className="mt-2 flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setEditingHouseholdId(item.id);
                      setHouseholdForm(toHouseholdFormValues(item));
                      setHouseholdFormErrors({});
                    }}
                  >
                    Edit
                  </Button>
                  <Button type="button" variant="destructive" size="sm" onClick={() => void onDeleteHousehold(item)}>
                    Delete
                  </Button>
                </div>
              </div>
            ))}
            {!isLoadingHouseholds && households.length === 0 ? (
              <p className="text-sm text-muted-foreground">No households yet.</p>
            ) : null}
          </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">{editingHouseholdId ? 'Edit Household' : 'Create Household'}</CardTitle>
          </CardHeader>
          <CardContent>
          <form className="mt-3 space-y-2" onSubmit={onHouseholdSubmit} noValidate>
            <Textarea
              value={householdForm.addressText}
              onChange={(event) => setHouseholdForm((previous) => ({ ...previous, addressText: event.target.value }))}
              rows={2}
              placeholder="Address"
            />
            {householdFormErrors.addressText ? <p className={errorClass}>{householdFormErrors.addressText}</p> : null}
            <div className="grid gap-2 sm:grid-cols-2">
              <Input
                value={householdForm.householdCode}
                onChange={(event) => setHouseholdForm((previous) => ({ ...previous, householdCode: event.target.value }))}
                placeholder="Household code"
              />
              <Select
                value={householdForm.status}
                onChange={(event) =>
                  setHouseholdForm((previous) => ({ ...previous, status: event.target.value as HouseholdFormValues['status'] }))
                }
              >
                {HOUSEHOLD_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {formatStatus(status)}
                  </option>
                ))}
              </Select>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <Input
                value={householdForm.latitude}
                onChange={(event) => setHouseholdForm((previous) => ({ ...previous, latitude: event.target.value }))}
                placeholder="Latitude"
              />
              <Input
                value={householdForm.longitude}
                onChange={(event) => setHouseholdForm((previous) => ({ ...previous, longitude: event.target.value }))}
                placeholder="Longitude"
              />
            </div>
            {householdFormErrors.latitude ? <p className={errorClass}>{householdFormErrors.latitude}</p> : null}
            {householdFormErrors.longitude ? <p className={errorClass}>{householdFormErrors.longitude}</p> : null}
            <Input
              value={householdForm.qrCode}
              onChange={(event) => setHouseholdForm((previous) => ({ ...previous, qrCode: event.target.value }))}
              placeholder="QR value"
            />
            {householdFormErrors.householdCode ? <p className={errorClass}>{householdFormErrors.householdCode}</p> : null}
            {householdFormErrors.qrCode ? <p className={errorClass}>{householdFormErrors.qrCode}</p> : null}
            {householdActionError ? (
              <Alert variant="destructive">
                <AlertDescription>{householdActionError}</AlertDescription>
              </Alert>
            ) : null}
            <div className="flex gap-2">
              <Button type="submit" disabled={isSubmittingHousehold || !barangayId}>
                {isSubmittingHousehold ? 'Saving...' : editingHouseholdId ? 'Update' : 'Create'}
              </Button>
              {editingHouseholdId ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setEditingHouseholdId(null);
                    setHouseholdForm(INITIAL_HOUSEHOLD_FORM_VALUES);
                    setHouseholdFormErrors({});
                  }}
                >
                  Cancel
                </Button>
              ) : null}
            </div>
          </form>
          </CardContent>
        </Card>

        <Card className="xl:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Household Detail and Family Members</CardTitle>
          </CardHeader>
          <CardContent>
          {!selectedHousehold ? (
            <p className="mt-2 text-sm text-muted-foreground">Select a household to manage members.</p>
          ) : (
            <div className="mt-2 space-y-3">
              <p className="text-sm text-muted-foreground">
                {selectedHousehold.addressText} | {formatStatus(selectedHousehold.status)} | Members: {members.length}
              </p>
              {membersError ? (
                <Alert variant="destructive">
                  <AlertDescription>{membersError}</AlertDescription>
                </Alert>
              ) : null}
              {isLoadingMembers ? <p className="text-sm text-muted-foreground">Loading members...</p> : null}
              <div className="grid gap-2 md:grid-cols-2">
                <div className="space-y-2">
                  {members.map((item) => (
                    <div key={item.id} className="rounded-lg border border-border bg-muted/35 p-2">
                      <p className="text-sm font-semibold text-foreground">{item.fullName}</p>
                      <p className="text-xs text-muted-foreground">
                        {item.relationshipToHead ?? 'Unspecified'} | {item.sex ?? 'Unspecified'} | {item.birthDate ?? 'No birth date'}
                      </p>
                      <div className="mt-2 flex gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setEditingMemberId(item.id);
                            setMemberForm(toMemberFormValues(item));
                            setMemberFormErrors({});
                          }}
                        >
                          Edit
                        </Button>
                        <Button type="button" variant="destructive" size="sm" onClick={() => void onDeleteMember(item)}>
                          Delete
                        </Button>
                      </div>
                    </div>
                  ))}
                  {!isLoadingMembers && members.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No members yet.</p>
                  ) : null}
                </div>
                <form className="space-y-2 rounded-lg border border-border bg-muted/35 p-3" onSubmit={onMemberSubmit} noValidate>
                  <h3 className="text-sm font-semibold text-foreground">{editingMemberId ? 'Edit Member' : 'Add Member'}</h3>
                  <Input
                    value={memberForm.fullName}
                    onChange={(event) => setMemberForm((previous) => ({ ...previous, fullName: event.target.value }))}
                    placeholder="Full name"
                  />
                  {memberFormErrors.fullName ? <p className={errorClass}>{memberFormErrors.fullName}</p> : null}
                  <Input
                    value={memberForm.relationshipToHead}
                    onChange={(event) =>
                      setMemberForm((previous) => ({ ...previous, relationshipToHead: event.target.value }))
                    }
                    placeholder="Relationship to head"
                  />
                  {memberFormErrors.relationshipToHead ? <p className={errorClass}>{memberFormErrors.relationshipToHead}</p> : null}
                  <div className="grid gap-2 sm:grid-cols-2">
                    <Input
                      type="date"
                      value={memberForm.birthDate}
                      onChange={(event) => setMemberForm((previous) => ({ ...previous, birthDate: event.target.value }))}
                    />
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
                  </div>
                  {memberFormErrors.birthDate ? <p className={errorClass}>{memberFormErrors.birthDate}</p> : null}
                  {memberFormErrors.sex ? <p className={errorClass}>{memberFormErrors.sex}</p> : null}
                  <Label className="flex items-center gap-2 text-sm text-muted-foreground">
                    <input type="checkbox" checked={memberForm.isVulnerable} onChange={(event) => setMemberForm((previous) => ({ ...previous, isVulnerable: event.target.checked }))} />
                    Mark vulnerable
                  </Label>
                  <Textarea
                    value={memberForm.vulnerabilityNotes}
                    onChange={(event) =>
                      setMemberForm((previous) => ({ ...previous, vulnerabilityNotes: event.target.value }))
                    }
                    rows={2}
                    placeholder="Vulnerability notes"
                  />
                  {memberFormErrors.vulnerabilityNotes ? <p className={errorClass}>{memberFormErrors.vulnerabilityNotes}</p> : null}
                  {memberActionError ? (
                    <Alert variant="destructive">
                      <AlertDescription>{memberActionError}</AlertDescription>
                    </Alert>
                  ) : null}
                  <div className="flex gap-2">
                    <Button type="submit" disabled={isSubmittingMember}>
                      {isSubmittingMember ? 'Saving...' : editingMemberId ? 'Update' : 'Add'}
                    </Button>
                    {editingMemberId ? (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setEditingMemberId(null);
                          setMemberForm(INITIAL_MEMBER_FORM_VALUES);
                          setMemberFormErrors({});
                        }}
                      >
                        Cancel
                      </Button>
                    ) : null}
                  </div>
                </form>
              </div>
            </div>
          )}
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
