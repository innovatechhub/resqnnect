import QRCode from 'qrcode';
import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';

import { SectionHeader } from '../components/system/SectionHeader';
import { Alert, AlertDescription } from '../components/ui/alert';
import { Badge } from '../components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { getSupabaseClient } from '../services/supabase/client';
import { getCurrentRescueRequesterContext } from '../services/supabase/rescueRequests';
import {
  getVerificationHousehold,
  listVerificationLogs,
  listVerificationMembers,
} from '../services/supabase/verification';

function formatDateTime(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(date);
}

export function HouseholdQrProfilePage() {
  const client = useMemo(() => getSupabaseClient(), []);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);

  const contextQuery = useQuery({
    queryKey: ['household-qr-context'],
    enabled: Boolean(client),
    queryFn: async () => getCurrentRescueRequesterContext(client!),
  });

  const householdQuery = useQuery({
    queryKey: ['household-qr-profile', contextQuery.data?.householdId],
    enabled: Boolean(client && contextQuery.data?.householdId),
    queryFn: async () => getVerificationHousehold(client!, contextQuery.data!.householdId!),
  });

  const membersQuery = useQuery({
    queryKey: ['household-qr-members', householdQuery.data?.id],
    enabled: Boolean(client && householdQuery.data?.id),
    queryFn: async () => listVerificationMembers(client!, householdQuery.data!.id),
  });

  const logsQuery = useQuery({
    queryKey: ['household-qr-logs', householdQuery.data?.id],
    enabled: Boolean(client && householdQuery.data?.id),
    queryFn: async () => listVerificationLogs(client!, { householdId: householdQuery.data!.id, limit: 20 }),
  });

  useEffect(() => {
    const qrValue = householdQuery.data?.qrCode ?? householdQuery.data?.householdCode ?? '';
    if (!qrValue) {
      setQrDataUrl(null);
      return;
    }

    void QRCode.toDataURL(qrValue, { errorCorrectionLevel: 'M', margin: 2, width: 260 }).then(setQrDataUrl);
  }, [householdQuery.data?.householdCode, householdQuery.data?.qrCode]);

  if (!client) {
    return (
      <Alert variant="warning">
        <AlertDescription>Configure Supabase env variables to view your household QR profile.</AlertDescription>
      </Alert>
    );
  }

  return (
    <section className="space-y-5">
      <SectionHeader
        missionTag="Mission 9"
        title="Household QR Profile"
        summary="View your household identifier, registered family members, and verification history."
      />

      {contextQuery.isError || householdQuery.isError ? (
        <Alert variant="destructive">
          <AlertDescription>
            {contextQuery.error instanceof Error
              ? contextQuery.error.message
              : householdQuery.error instanceof Error
                ? householdQuery.error.message
                : 'Failed to load household QR profile.'}
          </AlertDescription>
        </Alert>
      ) : null}

      {!contextQuery.isLoading && !contextQuery.data?.householdId ? (
        <Alert variant="warning">
          <AlertDescription>No household is linked to this profile yet. Contact your barangay operator.</AlertDescription>
        </Alert>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-[0.8fr_1.2fr]">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">QR Identifier</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex min-h-72 items-center justify-center rounded-md border border-border bg-white p-4">
              {qrDataUrl ? (
                <img src={qrDataUrl} alt="Household QR code" className="h-64 w-64" />
              ) : (
                <p className="text-sm text-muted-foreground">No QR code assigned.</p>
              )}
            </div>
            <div className="space-y-1 text-sm">
              <p>
                <span className="font-semibold">Household:</span>{' '}
                {householdQuery.data?.householdCode ?? 'Uncoded household'}
              </p>
              <p>
                <span className="font-semibold">QR value:</span>{' '}
                <span className="font-mono">{householdQuery.data?.qrCode ?? 'Not assigned'}</span>
              </p>
              <p className="text-muted-foreground">{householdQuery.data?.addressText}</p>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Registered Members</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-2 sm:grid-cols-2">
                {(membersQuery.data ?? []).map((member) => (
                  <article key={member.id} className="rounded-md border border-border p-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-semibold">{member.fullName}</p>
                      {member.isVulnerable ? <Badge variant="warning">Priority</Badge> : null}
                    </div>
                    <p className="text-xs text-muted-foreground">{member.relationshipToHead ?? 'Family member'}</p>
                  </article>
                ))}
                {!membersQuery.isLoading && (membersQuery.data ?? []).length === 0 ? (
                  <p className="text-sm text-muted-foreground">No members are registered yet.</p>
                ) : null}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-muted/35">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Verification History</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {(logsQuery.data ?? []).map((log) => (
                  <article key={log.id} className="rounded-md border border-border bg-card p-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-semibold">{log.verificationMode.replaceAll('_', ' ')}</p>
                      <Badge>{log.result}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">{formatDateTime(log.createdAt)}</p>
                    {log.notes ? <p className="mt-1 text-sm text-muted-foreground">{log.notes}</p> : null}
                  </article>
                ))}
                {!logsQuery.isLoading && (logsQuery.data ?? []).length === 0 ? (
                  <p className="text-sm text-muted-foreground">No verification events recorded yet.</p>
                ) : null}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
}
