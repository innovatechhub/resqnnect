import { useQuery } from '@tanstack/react-query';
import { useMemo, useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { RefreshCw } from 'lucide-react';

import { DashboardBarChart } from '../components/system/DashboardBarChart';
import { SectionHeader } from '../components/system/SectionHeader';
import { StatCard } from '../components/system/StatCard';
import { StatCardSkeleton, ListCardSkeleton } from '../components/system/SkeletonCard';
import { Alert, AlertDescription } from '../components/ui/alert';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { getSupabaseClient } from '../services/supabase/client';
import { getDashboardMetrics, getOperationalReport } from '../services/supabase/reports';
import { formatTimeAgo, prettyStatus, formatTimestamp } from '../lib/format';

const ACTIVE_REQUEST_STATUSES = new Set(['pending', 'acknowledged', 'assigned', 'in_progress']);
const ACTIVE_MISSION_STATUSES = new Set(['queued', 'assigned', 'en_route', 'on_site', 'pickup_complete']);
const REFETCH_INTERVAL_MS = 30_000;

export function MdrrmoDashboardPage() {
  const client = useMemo(() => getSupabaseClient(), []);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const metricsQuery = useQuery({
    queryKey: ['dashboard-metrics', 'admin'],
    enabled: Boolean(client),
    refetchInterval: REFETCH_INTERVAL_MS,
    queryFn: async () => getDashboardMetrics(client!),
  });
  const reportQuery = useQuery({
    queryKey: ['dashboard-report', 'admin'],
    enabled: Boolean(client),
    refetchInterval: REFETCH_INTERVAL_MS,
    queryFn: async () => getOperationalReport(client!),
  });

  useEffect(() => {
    if (metricsQuery.dataUpdatedAt > 0) {
      setLastUpdated(new Date(metricsQuery.dataUpdatedAt));
    }
  }, [metricsQuery.dataUpdatedAt]);

  const isLoading = metricsQuery.isLoading || reportQuery.isLoading;
  const isRefetching = metricsQuery.isFetching || reportQuery.isFetching;

  const metrics = metricsQuery.data;
  const report = reportQuery.data;
  const evacuationCenters = report?.evacuationCenters ?? [];
  const totalCapacity = evacuationCenters.reduce((sum, center) => sum + center.capacity, 0);
  const totalOccupancy = evacuationCenters.reduce((sum, center) => sum + center.currentOccupancy, 0);
  const utilizationRate = totalCapacity > 0 ? (totalOccupancy / totalCapacity) * 100 : null;
  const missionBacklog = Object.entries(report?.missionStatusCounts ?? {}).reduce(
    (sum, [status, count]) => (ACTIVE_MISSION_STATUSES.has(status) ? sum + count : sum),
    0,
  );
  const adminStats = [
    { label: 'Active Rescue Requests', value: String(metrics?.activeRescueRequests ?? '-') },
    { label: 'Active Mission Backlog', value: String(missionBacklog) },
    { label: 'Open Evacuation Centers', value: String(metrics?.openEvacuationCenters ?? '-') },
    { label: 'Evacuation Occupancy', value: String(metrics?.evacuationOccupancy ?? '-') },
    { label: 'Low Stock Items', value: String(metrics?.lowStockItems ?? '-') },
    { label: 'Center Utilization', value: utilizationRate === null ? '-' : `${utilizationRate.toFixed(0)}%` },
  ];
  const requestChartData = Object.entries(report?.requestStatusCounts ?? {}).map(([label, value]) => ({
    label: prettyStatus(label),
    value,
    color: '#0f766e',
  }));
  const missionChartData = Object.entries(report?.missionStatusCounts ?? {}).map(([label, value]) => ({
    label: prettyStatus(label),
    value,
    color: '#1d4ed8',
  }));
  const priorityRequests = (report?.rescueRequests ?? [])
    .filter((request) => ACTIVE_REQUEST_STATUSES.has(request.status))
    .sort((a, b) => {
      if (b.severityLevel !== a.severityLevel) return b.severityLevel - a.severityLevel;
      if (b.peopleCount !== a.peopleCount) return b.peopleCount - a.peopleCount;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    })
    .slice(0, 6);
  const supplyWatchlist = (report?.reliefInventory ?? [])
    .filter((item) => item.status === 'low_stock' || item.status === 'depleted')
    .sort((a, b) => {
      if (a.status !== b.status) return a.status === 'depleted' ? -1 : 1;
      return a.quantityOnHand - b.quantityOnHand;
    })
    .slice(0, 6);
  const pulseItems = [
    metrics?.activeRescueRequests
      ? { label: `${metrics.activeRescueRequests} rescue requests are active across the municipality.`, tone: 'alert' }
      : { label: 'No active rescue requests reported.', tone: 'ok' },
    missionBacklog > 0
      ? { label: `${missionBacklog} missions are still in active execution states.`, tone: 'warning' }
      : { label: 'No active mission backlog at this time.', tone: 'ok' },
    metrics?.lowStockItems
      ? { label: `${metrics.lowStockItems} relief items are low or depleted.`, tone: 'warning' }
      : { label: 'Relief inventory is currently healthy.', tone: 'ok' },
  ] as const;

  async function handleRefresh() {
    await Promise.all([metricsQuery.refetch(), reportQuery.refetch()]);
  }

  const headerActions = (
    <div className="flex items-center gap-2">
      {lastUpdated ? (
        <span className="text-xs text-muted-foreground">
          Updated {formatTimestamp(lastUpdated)}
        </span>
      ) : null}
      <Button
        type="button"
        size="sm"
        variant="outline"
        onClick={handleRefresh}
        disabled={isRefetching}
        className="gap-1.5"
      >
        <RefreshCw className={`h-3.5 w-3.5 ${isRefetching ? 'animate-spin' : ''}`} />
        {isRefetching ? 'Refreshing…' : 'Refresh'}
      </Button>
    </div>
  );

  return (
    <section className="space-y-5">
      <SectionHeader
        eyebrow="MDRRMO Dashboard"
        title="Municipality Operations Overview"
        summary="Consolidated rescue, mission, evacuation, and relief telemetry. Auto-refreshes every 30 seconds."
        actions={headerActions}
      />

      {metricsQuery.isError || reportQuery.isError ? (
        <Alert variant="destructive">
          <AlertDescription>
            {metricsQuery.error instanceof Error
              ? metricsQuery.error.message
              : reportQuery.error instanceof Error
                ? reportQuery.error.message
                : 'Failed to load dashboard analytics.'}
          </AlertDescription>
        </Alert>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {isLoading
          ? Array.from({ length: 6 }).map((_, i) => <StatCardSkeleton key={i} />)
          : adminStats.map((item) => <StatCard key={item.label} label={item.label} value={item.value} />)}
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Mission Status Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <DashboardBarChart data={missionChartData} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Request Status Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <DashboardBarChart data={requestChartData} />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Operational Pulse</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {isLoading ? (
            <ListCardSkeleton rows={3} />
          ) : (
            pulseItems.map((item) => (
              <div key={item.label} className="flex items-start gap-2 rounded-md border border-border/70 bg-muted/35 px-3 py-2">
                <Badge
                  variant="secondary"
                  className={
                    item.tone === 'alert'
                      ? 'bg-destructive/15 text-destructive'
                      : item.tone === 'warning'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-emerald-100 text-emerald-800'
                  }
                >
                  {item.tone === 'alert' ? 'High' : item.tone === 'warning' ? 'Watch' : 'OK'}
                </Badge>
                <p className="text-sm text-foreground">{item.label}</p>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Priority Rescue Queue</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {isLoading ? (
              <ListCardSkeleton rows={4} />
            ) : priorityRequests.length > 0 ? (
              priorityRequests.map((request) => (
                <div key={request.id} className="rounded-md border border-border/70 bg-muted/35 px-3 py-2">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-medium text-foreground">{request.emergencyType}</p>
                    <Badge className="bg-rose-100 text-rose-800">S{request.severityLevel}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {request.peopleCount} people • {prettyStatus(request.status)} • {formatTimeAgo(request.createdAt)}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">{request.locationText ?? 'No location text provided'}</p>
                </div>
              ))
            ) : (
              <div className="rounded-md border border-border/50 bg-muted/20 px-3 py-5 text-center">
                <p className="text-sm text-muted-foreground">No active rescue requests in queue.</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="text-base">Supply Watchlist</CardTitle>
              <Link to="/app/admin/relief" className="text-xs font-medium text-primary hover:underline">
                Open relief module
              </Link>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {isLoading ? (
              <ListCardSkeleton rows={4} />
            ) : supplyWatchlist.length > 0 ? (
              supplyWatchlist.map((item) => (
                <div key={item.id} className="rounded-md border border-border/70 bg-muted/35 px-3 py-2">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-medium text-foreground">{item.itemName}</p>
                    <Badge className={item.status === 'depleted' ? 'bg-destructive text-destructive-foreground' : 'bg-amber-100 text-amber-800'}>
                      {prettyStatus(item.status)}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {item.quantityOnHand} {item.unit} on hand • reorder at {item.reorderLevel}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {item.evacuationCenterName ? `Center: ${item.evacuationCenterName}` : 'No center assigned'}
                  </p>
                </div>
              ))
            ) : (
              <div className="rounded-md border border-border/50 bg-muted/20 px-3 py-5 text-center">
                <p className="text-sm text-muted-foreground">No low-stock or depleted items right now.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
