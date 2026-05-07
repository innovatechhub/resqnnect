import { useQuery } from '@tanstack/react-query';
import { useMemo, useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { RefreshCw, ClipboardList, MapPinned, History } from 'lucide-react';

import { useAuth } from '../features/auth/useAuth';
import { DashboardBarChart } from '../components/system/DashboardBarChart';
import { StatCard } from '../components/system/StatCard';
import { StatCardSkeleton } from '../components/system/SkeletonCard';
import { SectionHeader } from '../components/system/SectionHeader';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { getSupabaseClient } from '../services/supabase/client';
import { getDashboardMetrics } from '../services/supabase/reports';
import { formatTimestamp } from '../lib/format';

const REFETCH_INTERVAL_MS = 30_000;

const quickActions = [
  { label: 'Assigned Missions', to: '/app/rescuer/missions', icon: ClipboardList, color: 'text-primary' },
  { label: 'Live Location', to: '/app/rescuer/live-location', icon: MapPinned, color: 'text-rose-600' },
  { label: 'Mission History', to: '/app/rescuer/history', icon: History, color: 'text-muted-foreground' },
] as const;

export function RescuerDashboardPage() {
  const auth = useAuth();
  const client = useMemo(() => getSupabaseClient(), []);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const metricsQuery = useQuery({
    queryKey: ['dashboard-metrics', 'rescuer', auth.user?.id],
    enabled: Boolean(client && auth.user?.id),
    refetchInterval: REFETCH_INTERVAL_MS,
    queryFn: async () => getDashboardMetrics(client!, { userId: auth.user!.id }),
  });

  useEffect(() => {
    if (metricsQuery.dataUpdatedAt > 0) {
      setLastUpdated(new Date(metricsQuery.dataUpdatedAt));
    }
  }, [metricsQuery.dataUpdatedAt]);

  const isLoading = metricsQuery.isLoading;
  const isRefetching = metricsQuery.isFetching;
  const metrics = metricsQuery.data;

  const rescuerStats = [
    { label: 'Assigned Missions', value: String(metrics?.assignedMissions ?? '-') },
    { label: 'Active Requests', value: String(metrics?.activeRescueRequests ?? '-') },
    { label: 'Open Centers', value: String(metrics?.openEvacuationCenters ?? '-') },
    { label: 'Relief Items', value: String(metrics?.reliefItems ?? '-') },
  ];
  const chartData = [
    { label: 'Assigned', value: metrics?.assignedMissions ?? 0, color: '#1d4ed8' },
    { label: 'Active', value: metrics?.activeRescueRequests ?? 0, color: '#0f766e' },
    { label: 'Centers', value: metrics?.openEvacuationCenters ?? 0, color: '#c2410c' },
    { label: 'Relief', value: metrics?.reliefItems ?? 0, color: '#7c3aed' },
  ];

  const headerActions = (
    <div className="flex items-center gap-2">
      {lastUpdated ? (
        <span className="text-xs text-muted-foreground">Updated {formatTimestamp(lastUpdated)}</span>
      ) : null}
      <Button
        type="button"
        size="sm"
        variant="outline"
        onClick={() => metricsQuery.refetch()}
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
        eyebrow="Rescuer Dashboard"
        title="Field Mission Overview"
        summary="Operational queue metrics and mission context for field responders."
        actions={headerActions}
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {isLoading
          ? Array.from({ length: 4 }).map((_, i) => <StatCardSkeleton key={i} />)
          : rescuerStats.map((item) => <StatCard key={item.label} label={item.label} value={item.value} />)}
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2 sm:grid-cols-3">
          {quickActions.map((action) => {
            const Icon = action.icon;
            return (
              <Link
                key={action.to}
                to={action.to}
                className="flex items-center gap-2 rounded-md border border-border/80 bg-muted/35 px-3 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
              >
                <Icon className={`h-4 w-4 ${action.color}`} />
                {action.label}
              </Link>
            );
          })}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Responder Workload Snapshot</CardTitle>
        </CardHeader>
        <CardContent>
          <DashboardBarChart data={chartData} />
        </CardContent>
      </Card>
    </section>
  );
}
