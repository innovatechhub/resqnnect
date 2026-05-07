import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

import { SectionHeader } from '../components/system/SectionHeader';
import { StatCard } from '../components/system/StatCard';
import { Alert, AlertDescription } from '../components/ui/alert';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
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
import { getDashboardMetrics, getOperationalReport } from '../services/supabase/reports';

interface ReportsPageProps {
  scope: 'admin' | 'barangay';
}

function downloadCsv(filename: string, rows: Array<Record<string, string | number>>) {
  const headers = Object.keys(rows[0] ?? { metric: '', value: '' });
  const csv = [
    headers.join(','),
    ...rows.map((row) => headers.map((header) => JSON.stringify(row[header] ?? '')).join(',')),
  ].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function ReportsPage({ scope }: ReportsPageProps) {
  const auth = useAuth();
  const client = useMemo(() => getSupabaseClient(), []);
  const barangayId = scope === 'barangay' ? auth.profile?.barangayId ?? undefined : undefined;

  const metricsQuery = useQuery({
    queryKey: ['dashboard-metrics', scope, barangayId ?? 'all'],
    enabled: Boolean(client),
    queryFn: async () => getDashboardMetrics(client!, { barangayId }),
  });

  const reportQuery = useQuery({
    queryKey: ['operational-report', scope, barangayId ?? 'all'],
    enabled: Boolean(client),
    queryFn: async () => getOperationalReport(client!, { barangayId }),
  });

  const metrics = metricsQuery.data;
  const exportRows = metrics
    ? [
        { metric: 'Rescue requests', value: metrics.rescueRequests },
        { metric: 'Active rescue requests', value: metrics.activeRescueRequests },
        { metric: 'Assigned missions', value: metrics.assignedMissions },
        { metric: 'Open evacuation centers', value: metrics.openEvacuationCenters },
        { metric: 'Evacuation occupancy', value: metrics.evacuationOccupancy },
        { metric: 'Registered households', value: metrics.registeredHouseholds },
        { metric: 'Low stock items', value: metrics.lowStockItems },
        { metric: 'Verification logs', value: metrics.verificationLogs },
      ]
    : [];

  if (!client) {
    return (
      <Alert variant="warning">
        <AlertDescription>Configure Supabase env variables to view reports.</AlertDescription>
      </Alert>
    );
  }

  return (
    <section className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <SectionHeader
          missionTag="Mission 11"
          title={scope === 'admin' ? 'Municipal Reports' : 'Barangay Reports'}
          summary="Tabular summaries and CSV export for operations reporting."
        />
        <Button
          type="button"
          variant="outline"
          disabled={exportRows.length === 0}
          onClick={() => downloadCsv(`resqnnect-${scope}-report.csv`, exportRows)}
        >
          Export CSV
        </Button>
      </div>

      {metricsQuery.isError || reportQuery.isError ? (
        <Alert variant="destructive">
          <AlertDescription>
            {metricsQuery.error instanceof Error
              ? metricsQuery.error.message
              : reportQuery.error instanceof Error
                ? reportQuery.error.message
                : 'Failed to load reports.'}
          </AlertDescription>
        </Alert>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Rescue Requests" value={metrics?.rescueRequests ?? '-'} />
        <StatCard label="Active Requests" value={metrics?.activeRescueRequests ?? '-'} />
        <StatCard label="Open Centers" value={metrics?.openEvacuationCenters ?? '-'} />
        <StatCard label="Low Stock Items" value={metrics?.lowStockItems ?? '-'} />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Request Status Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <TableContainer>
              <Table>
                <TableHead>
                  <tr>
                    <TableHeaderCell>Status</TableHeaderCell>
                    <TableHeaderCell>Count</TableHeaderCell>
                  </tr>
                </TableHead>
                <TableBody>
                  {Object.entries(reportQuery.data?.requestStatusCounts ?? {}).map(([status, count]) => (
                    <TableRow key={status}>
                      <TableCell>{status.replaceAll('_', ' ')}</TableCell>
                      <TableCell>{count}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Mission Status Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <TableContainer>
              <Table>
                <TableHead>
                  <tr>
                    <TableHeaderCell>Status</TableHeaderCell>
                    <TableHeaderCell>Count</TableHeaderCell>
                  </tr>
                </TableHead>
                <TableBody>
                  {Object.entries(reportQuery.data?.missionStatusCounts ?? {}).map(([status, count]) => (
                    <TableRow key={status}>
                      <TableCell>{status.replaceAll('_', ' ')}</TableCell>
                      <TableCell>{count}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
