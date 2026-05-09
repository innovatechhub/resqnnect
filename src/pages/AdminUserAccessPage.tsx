import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ShieldCheck, Users } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

import { SectionHeader } from '../components/system/SectionHeader';
import { EmptyState } from '../components/system/EmptyState';
import { TableSkeleton } from '../components/system/SkeletonCard';
import { Alert, AlertDescription } from '../components/ui/alert';
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
import { useToast } from '../components/ui/toast';
import { getPageCount, paginateItems, sortByKey, type SortDirection } from '../lib/table';
import { ROLE_LABELS } from '../constants/roles';
import { getSupabaseClient } from '../services/supabase/client';
import {
  createManagedUserAccess,
  deleteUserAccess,
  listBarangays,
  listUserAccessRecords,
  updateUserAccess,
  type UserAccessRecord,
} from '../services/supabase/admin';
import type { UserRole } from '../types/auth';

const ROLE_OPTIONS: UserRole[] = ['mdrrmo_admin', 'barangay_official', 'rescuer', 'household'];

const blankForm = {
  email: '',
  password: '',
  fullName: '',
  role: 'household' as UserRole,
  barangayId: '',
};

function roleBadgeClass(role: UserRole): string {
  if (role === 'mdrrmo_admin') {
    return 'bg-slate-900 text-white';
  }
  if (role === 'barangay_official') {
    return 'bg-sky-100 text-sky-800';
  }
  if (role === 'rescuer') {
    return 'bg-emerald-100 text-emerald-800';
  }
  return 'bg-muted text-muted-foreground';
}

function formatDateTime(value: string | null): string {
  if (!value) {
    return 'Not approved';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(date);
}

function compactId(value: string): string {
  if (value.length <= 12) {
    return value;
  }

  return `${value.slice(0, 8)}...${value.slice(-4)}`;
}

export function AdminUserAccessPage() {
  const client = useMemo(() => getSupabaseClient(), []);
  const queryClient = useQueryClient();
  const toast = useToast();
  const [search, setSearch] = useState('');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [page, setPage] = useState(0);
  const [editingUser, setEditingUser] = useState<UserAccessRecord | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isCreateMode, setIsCreateMode] = useState(false);
  const [form, setForm] = useState(blankForm);
  const [actionError, setActionError] = useState<string | null>(null);
  const [pendingDeleteUser, setPendingDeleteUser] = useState<UserAccessRecord | null>(null);
  const pageSize = 8;

  const usersQuery = useQuery({
    queryKey: ['admin-user-access'],
    enabled: Boolean(client),
    queryFn: async () => listUserAccessRecords(client!),
  });

  const barangaysQuery = useQuery({
    queryKey: ['admin-barangays'],
    enabled: Boolean(client),
    queryFn: async () => listBarangays(client!),
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!client) {
        throw new Error('Supabase is unavailable.');
      }

      const trimmedEmail = form.email.trim();
      const trimmedName = form.fullName.trim();
      if (isCreateMode) {
        if (!trimmedEmail) {
          throw new Error('Email is required.');
        }
        if (form.password.length < 8) {
          throw new Error('Password must be at least 8 characters.');
        }
      }
      if (!trimmedName) {
        throw new Error('Full name is required.');
      }

      const barangayRequired = form.role === 'barangay_official' || form.role === 'rescuer';
      if (barangayRequired && !form.barangayId) {
        throw new Error('Barangay assignment is required for barangay officials and rescuers.');
      }

      if (!editingUser) {
        if (!isCreateMode) {
          throw new Error('No user selected.');
        }

        return createManagedUserAccess(client, {
          email: trimmedEmail,
          password: form.password,
          fullName: trimmedName,
          role: form.role,
          barangayId: form.barangayId || null,
        });
      }

      return updateUserAccess(client, editingUser.id, {
        fullName: trimmedName,
        role: form.role,
        barangayId: form.barangayId || null,
      });
    },
    onSuccess: async (_data, _vars, _ctx) => {
      const isCreate = isCreateMode;
      setActionError(null);
      setIsDialogOpen(false);
      setEditingUser(null);
      setForm(blankForm);
      toast.success(isCreate ? 'User created' : 'User updated', isCreate ? 'New user account has been created.' : 'User access settings saved.');
      await queryClient.invalidateQueries({ queryKey: ['admin-user-access'] });
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : 'Failed to save user.';
      setActionError(message);
      toast.error('Save failed', message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (!client || !pendingDeleteUser) {
        throw new Error('No user selected.');
      }

      await deleteUserAccess(client, pendingDeleteUser.id);
    },
    onSuccess: async () => {
      setPendingDeleteUser(null);
      setActionError(null);
      toast.success('User removed', 'The user account has been deleted.');
      await queryClient.invalidateQueries({ queryKey: ['admin-user-access'] });
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : 'Failed to delete user.';
      toast.error('Delete failed', message);
    },
  });

  const filteredUsers = useMemo(() => {
    const query = search.trim().toLowerCase();
    const scoped = query
      ? (usersQuery.data ?? []).filter((item) =>
          [
            item.fullName,
            ROLE_LABELS[item.role],
            item.barangay?.name,
            item.barangay?.code,
            item.id,
          ].some((value) => (value ?? '').toLowerCase().includes(query)),
        )
      : (usersQuery.data ?? []);

    return sortByKey(scoped, (item) => item.fullName ?? item.id, sortDirection);
  }, [search, sortDirection, usersQuery.data]);
  const pageCount = getPageCount(filteredUsers.length, pageSize);
  const pagedUsers = useMemo(() => paginateItems(filteredUsers, page, pageSize), [filteredUsers, page]);

  useEffect(() => {
    setPage(0);
  }, [search, sortDirection]);

  function openEditDialog(user: UserAccessRecord) {
    setIsCreateMode(false);
    setEditingUser(user);
    setForm({
      email: '',
      password: '',
      fullName: user.fullName ?? '',
      role: user.role,
      barangayId: user.barangayId ?? '',
    });
    setActionError(null);
    setIsDialogOpen(true);
  }

  function openCreateDialog() {
    setIsCreateMode(true);
    setEditingUser(null);
    setForm(blankForm);
    setActionError(null);
    setIsDialogOpen(true);
  }

  if (!client) {
    return (
      <Alert variant="warning">
        <AlertDescription>Configure Supabase env variables to manage user access.</AlertDescription>
      </Alert>
    );
  }

  return (
    <section className="space-y-5">
      <SectionHeader
        missionTag="Admin Setup"
        title="User Access Control"
        summary="Assign roles and barangay scope from the admin UI so operational pages unlock without manual SQL edits."
      />

      {usersQuery.isError || barangaysQuery.isError || actionError ? (
        <Alert variant="destructive">
          <AlertDescription>
            {actionError ??
              (usersQuery.error instanceof Error
                ? usersQuery.error.message
                : barangaysQuery.error instanceof Error
                  ? barangaysQuery.error.message
                  : 'Failed to load user access controls.')}
          </AlertDescription>
        </Alert>
      ) : null}

      <Card className="bg-muted/35">
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <CardTitle className="text-base">Profiles Access Table</CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">
                Use this to fix missing barangay assignments and adjust operational roles.
              </p>
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => void usersQuery.refetch()}>
                Refresh
              </Button>
              <Button type="button" size="sm" onClick={openCreateDialog}>
                Add User
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <DataTableToolbar
            value={search}
            onValueChange={setSearch}
            placeholder="Search name, role, barangay, or profile ID"
            summary={`${filteredUsers.length} profiles`}
          />
          {usersQuery.isLoading ? (
            <TableSkeleton rows={5} />
          ) : (
          <TableContainer>
            <Table>
              <TableHead>
                <tr>
                  <SortableHeader
                    sortKey="name"
                    currentSort="name"
                    currentDir={sortDirection}
                    onSort={(_, dir) => setSortDirection(dir ?? 'asc')}
                  >
                    User
                  </SortableHeader>
                  <TableHeaderCell>Role</TableHeaderCell>
                  <TableHeaderCell>Barangay</TableHeaderCell>
                  <TableHeaderCell>Approval</TableHeaderCell>
                  <TableHeaderCell className="text-right">Actions</TableHeaderCell>
                </tr>
              </TableHead>
              <TableBody>
                {pagedUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <p className="font-medium">{user.fullName ?? 'Unnamed profile'}</p>
                      <p className="text-xs text-muted-foreground">Account {compactId(user.id)}</p>
                    </TableCell>
                    <TableCell>
                      <Badge className={roleBadgeClass(user.role)}>{ROLE_LABELS[user.role]}</Badge>
                    </TableCell>
                    <TableCell>
                      {user.barangay ? (
                        <div>
                          <p className="font-medium">{user.barangay.name}</p>
                          <p className="text-xs text-muted-foreground">{user.barangay.code}</p>
                        </div>
                      ) : (
                        <span className="text-sm text-amber-700">Unassigned</span>
                      )}
                    </TableCell>
                    <TableCell>{formatDateTime(user.approvedAt)}</TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-2">
                        <Button type="button" size="sm" variant="outline" onClick={() => openEditDialog(user)}>
                          Update
                        </Button>
                        <Button type="button" size="sm" variant="destructive" onClick={() => setPendingDeleteUser(user)}>
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
          {!usersQuery.isLoading && (usersQuery.data ?? []).length === 0 && (
            <EmptyState
              icon={Users}
              title="No user profiles found"
              description="Create the first user with the Add User button above."
            />
          )}
          <div className="mt-3">
            <DataTablePagination
              page={page}
              pageCount={pageCount}
              totalCount={filteredUsers.length}
              pageSize={pageSize}
              onPageChange={setPage}
            />
          </div>
        </CardContent>
      </Card>

      <Dialog
        open={isDialogOpen}
        onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) {
            setIsCreateMode(false);
            setEditingUser(null);
            setForm(blankForm);
          }
        }}
        title={isCreateMode ? 'Add User Access' : 'Update User Access'}
        description={
          isCreateMode
            ? 'Create a new auth account and access profile in one step.'
            : 'Set the operational role and barangay scope for this profile.'
        }
        footer={
          <Button type="button" onClick={() => void saveMutation.mutateAsync()} disabled={saveMutation.isPending}>
            {saveMutation.isPending ? 'Saving...' : isCreateMode ? 'Create User' : 'Save Access'}
          </Button>
        }
      >
        <div className="space-y-4">
          <div className="rounded-lg border border-border bg-muted/35 p-3 text-sm">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-primary" />
              <p className="font-medium text-foreground">Profile</p>
            </div>
            <p className="mt-2 text-foreground">{isCreateMode ? 'New account and access profile' : editingUser?.fullName ?? 'Unnamed profile'}</p>
            <p className="text-xs text-muted-foreground">
              {isCreateMode ? 'Admin-managed account creation' : editingUser ? `Account ${compactId(editingUser.id)}` : ''}
            </p>
          </div>

          {isCreateMode ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label className="mb-1 block text-xs uppercase tracking-wide text-muted-foreground">Email</Label>
                <Input
                  type="email"
                  value={form.email}
                  placeholder="new.user@example.com"
                  onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
                />
              </div>
              <div>
                <Label className="mb-1 block text-xs uppercase tracking-wide text-muted-foreground">Password</Label>
                <Input
                  type="password"
                  value={form.password}
                  placeholder="At least 8 characters"
                  onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
                />
              </div>
            </div>
          ) : null}

          <div>
            <Label className="mb-1 block text-xs uppercase tracking-wide text-muted-foreground">Full Name</Label>
            <Input value={form.fullName} onChange={(event) => setForm((current) => ({ ...current, fullName: event.target.value }))} />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label className="mb-1 block text-xs uppercase tracking-wide text-muted-foreground">Role</Label>
              <Select
                value={form.role}
                onChange={(event) => {
                  const nextRole = event.target.value as UserRole;
                  setForm((current) => ({
                    ...current,
                    role: nextRole,
                    barangayId: nextRole === 'mdrrmo_admin' || nextRole === 'household' ? '' : current.barangayId,
                  }));
                }}
              >
                {ROLE_OPTIONS.map((role) => (
                  <option key={role} value={role}>
                    {ROLE_LABELS[role]}
                  </option>
                ))}
              </Select>
            </div>

            <div>
              <Label className="mb-1 block text-xs uppercase tracking-wide text-muted-foreground">Barangay</Label>
              <Select
                value={form.barangayId}
                disabled={form.role === 'mdrrmo_admin' || form.role === 'household'}
                onChange={(event) => setForm((current) => ({ ...current, barangayId: event.target.value }))}
              >
                <option value="">
                  {form.role === 'mdrrmo_admin' || form.role === 'household'
                    ? 'No barangay required'
                    : 'Select barangay'}
                </option>
                {(barangaysQuery.data ?? []).map((barangay) => (
                  <option key={barangay.id} value={barangay.id}>
                    {barangay.name} ({barangay.code})
                  </option>
                ))}
              </Select>
            </div>
          </div>
        </div>
      </Dialog>

      <ConfirmDialog
        open={Boolean(pendingDeleteUser)}
        onOpenChange={(open) => {
          if (!open) {
            setPendingDeleteUser(null);
          }
        }}
        title="Delete user access"
        description={
          pendingDeleteUser
            ? `Delete the profile access record for "${pendingDeleteUser.fullName ?? pendingDeleteUser.id}"?`
            : ''
        }
        confirmLabel="Delete user"
        isPending={deleteMutation.isPending}
        onConfirm={() => void deleteMutation.mutateAsync()}
      />
    </section>
  );
}
