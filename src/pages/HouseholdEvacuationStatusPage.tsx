import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

import { SectionHeader } from '../components/system/SectionHeader';
import { Alert, AlertDescription } from '../components/ui/alert';
import { Badge } from '../components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { getSupabaseClient } from '../services/supabase/client';
import { listEvacuationCenters, listEvacueeRecords } from '../services/supabase/evacuation';
import { getCurrentRescueRequesterContext } from '../services/supabase/rescueRequests';

function formatDateTime(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(date);
}

export function HouseholdEvacuationStatusPage() {
  const client = useMemo(() => getSupabaseClient(), []);

  const contextQuery = useQuery({
    queryKey: ['household-evacuation-context'],
    enabled: Boolean(client),
    queryFn: async () => getCurrentRescueRequesterContext(client!),
  });

  const recordsQuery = useQuery({
    queryKey: ['household-evacuation-records', contextQuery.data?.householdId],
    enabled: Boolean(client && contextQuery.data?.householdId),
    queryFn: async () => listEvacueeRecords(client!, { householdId: contextQuery.data!.householdId! }),
  });

  const centersQuery = useQuery({
    queryKey: ['household-evacuation-centers', contextQuery.data?.barangayId],
    enabled: Boolean(client && contextQuery.data?.barangayId),
    queryFn: async () => listEvacuationCenters(client!, { barangayId: contextQuery.data?.barangayId ?? undefined }),
  });

  const activeRecord = (recordsQuery.data ?? []).find((record) => record.status === 'checked_in');
  const activeCenter = activeRecord
    ? (centersQuery.data ?? []).find((center) => center.id === activeRecord.evacuationCenterId)
    : null;

  if (!client) {
    return (
      <Alert variant="warning">
        <AlertDescription>Configure Supabase env variables to view evacuation status.</AlertDescription>
      </Alert>
    );
  }

  return (
    <section className="space-y-5">
      <SectionHeader
        missionTag="Mission 10"
        title="Evacuation Status"
        summary="Track household evacuation center assignment, check-in history, and nearby center capacity."
      />

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Current Assignment</CardTitle>
        </CardHeader>
        <CardContent>
          {activeRecord && activeCenter ? (
            <div className="space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-lg font-semibold">{activeCenter.name}</p>
                <Badge>{activeRecord.status}</Badge>
              </div>
              <p className="text-sm text-muted-foreground">{activeCenter.locationText}</p>
              <p className="text-sm">
                Checked in {formatDateTime(activeRecord.checkInAt)} | Capacity {activeCenter.currentOccupancy}/
                {activeCenter.capacity}
              </p>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No active evacuation center check-in is recorded.</p>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card className="bg-muted/35">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">History</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {(recordsQuery.data ?? []).map((record) => (
                <article key={record.id} className="rounded-md border border-border bg-card p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-mono text-xs">{record.evacuationCenterId}</p>
                    <Badge>{record.status}</Badge>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    In: {formatDateTime(record.checkInAt)}
                    {record.checkOutAt ? ` | Out: ${formatDateTime(record.checkOutAt)}` : ''}
                  </p>
                  {record.notes ? <p className="mt-2 text-sm text-muted-foreground">{record.notes}</p> : null}
                </article>
              ))}
              {!recordsQuery.isLoading && (recordsQuery.data ?? []).length === 0 ? (
                <p className="text-sm text-muted-foreground">No evacuation records yet.</p>
              ) : null}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Nearby Centers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {(centersQuery.data ?? []).map((center) => (
                <article key={center.id} className="rounded-md border border-border p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-semibold">{center.name}</p>
                    <Badge>{center.status}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">{center.locationText}</p>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full bg-primary"
                      style={{ width: `${center.capacity ? (center.currentOccupancy / center.capacity) * 100 : 0}%` }}
                    />
                  </div>
                </article>
              ))}
              {!centersQuery.isLoading && (centersQuery.data ?? []).length === 0 ? (
                <p className="text-sm text-muted-foreground">No centers are available for your barangay yet.</p>
              ) : null}
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
