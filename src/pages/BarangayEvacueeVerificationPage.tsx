import { Html5QrcodeScanner } from 'html5-qrcode';
import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

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
import { getSupabaseClient } from '../services/supabase/client';
import { checkInEvacuee, listEvacuationCenters } from '../services/supabase/evacuation';
import {
  createVerificationLog,
  findHouseholdByQrCode,
  listVerificationLogs,
  listVerificationMembers,
  searchVerificationHouseholds,
  type VerificationHouseholdRecord,
  type VerificationMemberRecord,
  type VerificationMode,
  type VerificationResult,
} from '../services/supabase/verification';

function formatDateTime(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(date);
}

function resultVariant(result: VerificationResult): string {
  if (result === 'success') {
    return 'bg-emerald-100 text-emerald-800';
  }
  if (result === 'duplicate') {
    return 'bg-amber-100 text-amber-800';
  }
  return 'bg-destructive/10 text-destructive';
}

export function BarangayEvacueeVerificationPage() {
  const auth = useAuth();
  const client = useMemo(() => getSupabaseClient(), []);
  const queryClient = useQueryClient();
  const barangayId = auth.profile?.barangayId ?? null;
  const [query, setQuery] = useState('');
  const [scanEnabled, setScanEnabled] = useState(false);
  const [isStartingScanner, setIsStartingScanner] = useState(false);
  const [scannerError, setScannerError] = useState<string | null>(null);
  const [selectedHousehold, setSelectedHousehold] = useState<VerificationHouseholdRecord | null>(null);
  const [selectedMemberId, setSelectedMemberId] = useState('');
  const [selectedCenterId, setSelectedCenterId] = useState('');
  const [notes, setNotes] = useState('');
  const [actionError, setActionError] = useState<string | null>(null);

  const householdQuery = useQuery({
    queryKey: ['verification-households', barangayId, query],
    enabled: Boolean(client && barangayId),
    queryFn: async () => searchVerificationHouseholds(client!, { query, barangayId: barangayId ?? undefined }),
  });

  const membersQuery = useQuery({
    queryKey: ['verification-members', selectedHousehold?.id],
    enabled: Boolean(client && selectedHousehold?.id),
    queryFn: async () => listVerificationMembers(client!, selectedHousehold!.id),
  });

  const centersQuery = useQuery({
    queryKey: ['evacuation-centers', 'barangay', barangayId],
    enabled: Boolean(client && barangayId),
    queryFn: async () => listEvacuationCenters(client!, { barangayId: barangayId ?? undefined }),
  });

  const logsQuery = useQuery({
    queryKey: ['verification-logs', selectedHousehold?.id ?? 'recent'],
    enabled: Boolean(client),
    queryFn: async () => listVerificationLogs(client!, { householdId: selectedHousehold?.id, limit: 12 }),
  });

  useEffect(() => {
    if (!scanEnabled) {
      return;
    }

    const scanner = new Html5QrcodeScanner('qr-reader', { fps: 8, qrbox: { width: 220, height: 220 } }, false);
    scanner.render(
      (decodedText) => {
        setQuery(decodedText);
        setScannerError(null);
        setScanEnabled(false);
        void scanner.clear();
        void (async () => {
          if (!client) {
            return;
          }
          const household = await findHouseholdByQrCode(client, decodedText);
          setSelectedHousehold(household);
        })();
      },
      () => undefined,
    );

    return () => {
      void scanner.clear().catch(() => undefined);
    };
  }, [client, scanEnabled]);

  async function toggleScanner() {
    if (scanEnabled) {
      setScanEnabled(false);
      setScannerError(null);
      return;
    }

    if (!window.isSecureContext && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
      setScannerError('Camera scanner requires HTTPS (or localhost). Open this app using HTTPS and try again.');
      return;
    }

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setScannerError('This browser does not support camera access APIs.');
      return;
    }

    setIsStartingScanner(true);
    setScannerError(null);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      stream.getTracks().forEach((track) => track.stop());
      setScanEnabled(true);
    } catch (error) {
      const name = error instanceof DOMException ? error.name : '';
      if (name === 'NotAllowedError' || name === 'SecurityError') {
        setScannerError('Camera permission is blocked. Allow camera access in your browser settings, then retry.');
      } else if (name === 'NotFoundError') {
        setScannerError('No camera device was found on this device.');
      } else if (name === 'NotReadableError') {
        setScannerError('Camera is currently in use by another app or browser tab.');
      } else {
        setScannerError(error instanceof Error ? error.message : 'Failed to start camera scanner.');
      }
    } finally {
      setIsStartingScanner(false);
    }
  }

  const verificationMutation = useMutation({
    mutationFn: async (mode: VerificationMode) => {
      if (!client || !auth.user) {
        throw new Error('You must be signed in to verify evacuees.');
      }
      if (!selectedHousehold) {
        throw new Error('Select a household before recording verification.');
      }

      return createVerificationLog(client, {
        qrCode: selectedHousehold.qrCode ?? selectedHousehold.householdCode ?? selectedHousehold.id,
        householdId: selectedHousehold.id,
        householdMemberId: selectedMemberId || null,
        verificationMode: mode,
        result: 'success',
        notes: notes || null,
        verifiedBy: auth.user.id,
      });
    },
    onSuccess: async () => {
      setActionError(null);
      await queryClient.invalidateQueries({ queryKey: ['verification-logs'] });
      await queryClient.invalidateQueries({ queryKey: ['verification-logs', selectedHousehold?.id ?? 'recent'] });
    },
  });

  const checkInMutation = useMutation({
    mutationFn: async () => {
      if (!client || !auth.user) {
        throw new Error('You must be signed in to check in evacuees.');
      }
      if (!selectedHousehold || !selectedCenterId) {
        throw new Error('Select a household and evacuation center first.');
      }

      await verificationMutation.mutateAsync('qr');
      return checkInEvacuee(client, {
        evacuationCenterId: selectedCenterId,
        householdId: selectedHousehold.id,
        householdMemberId: selectedMemberId || null,
        verifiedBy: auth.user.id,
        notes: notes || null,
      });
    },
    onSuccess: async () => {
      setActionError(null);
      await queryClient.invalidateQueries({ queryKey: ['evacuation-centers'] });
    },
  });

  async function recordFailedScan() {
    try {
      if (!client || !auth.user) {
        throw new Error('You must be signed in to record verification.');
      }
      await createVerificationLog(client, {
        qrCode: query || 'manual-missing',
        householdId: selectedHousehold?.id ?? null,
        householdMemberId: selectedMemberId || null,
        verificationMode: query ? 'qr' : 'manual_name',
        result: selectedHousehold ? 'conflict' : 'failed',
        notes: notes || 'Verification failed or conflicted with selected records.',
        verifiedBy: auth.user.id,
      });
      await logsQuery.refetch();
      setActionError(null);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Failed to record verification.');
    }
  }

  async function runMutation(action: () => Promise<unknown>) {
    try {
      await action();
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Verification action failed.');
    }
  }

  if (!client) {
    return (
      <Alert variant="warning">
        <AlertDescription>Configure Supabase env variables to use verification workflows.</AlertDescription>
      </Alert>
    );
  }

  return (
    <section className="space-y-5">
      <SectionHeader
        missionTag="Mission 9"
        title="Evacuee Verification"
        summary="Verify household QR codes, fallback to manual lookup, record verification logs, and check evacuees into centers."
      />

      {!barangayId ? (
        <Alert variant="destructive">
          <AlertDescription>No barangay is assigned to this operator profile.</AlertDescription>
        </Alert>
      ) : null}
      {actionError ? (
        <Alert variant="destructive">
          <AlertDescription>{actionError}</AlertDescription>
        </Alert>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Lookup and Verify</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col gap-2 sm:flex-row">
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="QR code, household code, or address"
              />
              <Button type="button" variant="outline" disabled={isStartingScanner} onClick={() => void toggleScanner()}>
                {isStartingScanner ? 'Starting...' : scanEnabled ? 'Stop Scanner' : 'Scan QR'}
              </Button>
            </div>
            {scannerError ? (
              <Alert variant="warning">
                <AlertDescription>{scannerError}</AlertDescription>
              </Alert>
            ) : null}
            {scanEnabled ? <div id="qr-reader" className="overflow-hidden rounded-md border border-border" /> : null}

            <div className="grid gap-2">
              {(householdQuery.data ?? []).map((household) => (
                <button
                  key={household.id}
                  type="button"
                  onClick={() => {
                    setSelectedHousehold(household);
                    setSelectedMemberId('');
                  }}
                  className={`rounded-md border p-3 text-left text-sm transition ${
                    selectedHousehold?.id === household.id
                      ? 'border-primary bg-primary/10'
                      : 'border-border bg-muted/30 hover:border-primary/40'
                  }`}
                >
                  <span className="block font-semibold">{household.householdCode ?? 'Uncoded household'}</span>
                  <span className="block text-xs text-muted-foreground">{household.addressText}</span>
                  <span className="block text-xs text-muted-foreground">
                    Head: {household.headName ?? 'Unassigned'}
                  </span>
                  <span className="block text-xs text-muted-foreground">
                    Family members: {household.familyMemberCount}
                  </span>
                  <span className="block font-mono text-xs text-muted-foreground">
                    {household.qrCode ?? 'No QR assigned'}
                  </span>
                </button>
              ))}
              {!householdQuery.isLoading && (householdQuery.data ?? []).length === 0 ? (
                <p className="text-sm text-muted-foreground">No households found.</p>
              ) : null}
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label className="mb-1 block text-xs uppercase tracking-wide text-muted-foreground">Member</Label>
                <Select value={selectedMemberId} onChange={(event) => setSelectedMemberId(event.target.value)}>
                  <option value="">Whole household</option>
                  {(membersQuery.data ?? []).map((member: VerificationMemberRecord) => (
                    <option key={member.id} value={member.id}>
                      {member.fullName}
                      {member.isVulnerable ? ' (vulnerable)' : ''}
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <Label className="mb-1 block text-xs uppercase tracking-wide text-muted-foreground">
                  Evacuation Center
                </Label>
                <Select value={selectedCenterId} onChange={(event) => setSelectedCenterId(event.target.value)}>
                  <option value="">No check-in</option>
                  {(centersQuery.data ?? []).map((center) => (
                    <option key={center.id} value={center.id}>
                      {center.name} ({center.currentOccupancy}/{center.capacity})
                    </option>
                  ))}
                </Select>
              </div>
            </div>

            <div>
              <Label className="mb-1 block text-xs uppercase tracking-wide text-muted-foreground">Notes</Label>
              <Textarea value={notes} onChange={(event) => setNotes(event.target.value)} rows={3} />
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                disabled={!selectedHousehold || verificationMutation.isPending}
                onClick={() => void runMutation(() => verificationMutation.mutateAsync(query ? 'qr' : 'manual_name'))}
              >
                Record Verification
              </Button>
              <Button
                type="button"
                variant="secondary"
                disabled={!selectedHousehold || !selectedCenterId || checkInMutation.isPending}
                onClick={() => void runMutation(() => checkInMutation.mutateAsync())}
              >
                Verify and Check In
              </Button>
              <Button type="button" variant="outline" onClick={() => void recordFailedScan()}>
                Record Failed/Conflict
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-muted/35">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Verification Logs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {(logsQuery.data ?? []).map((log) => (
                <article key={log.id} className="rounded-md border border-border bg-card p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-mono text-xs">{log.qrCode}</p>
                    <Badge className={resultVariant(log.result)}>{log.result}</Badge>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {log.verificationMode.replaceAll('_', ' ')} | {formatDateTime(log.createdAt)}
                  </p>
                  {log.notes ? <p className="mt-2 text-sm text-muted-foreground">{log.notes}</p> : null}
                </article>
              ))}
              {!logsQuery.isLoading && (logsQuery.data ?? []).length === 0 ? (
                <p className="text-sm text-muted-foreground">No verification logs yet.</p>
              ) : null}
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
