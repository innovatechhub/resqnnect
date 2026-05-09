import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { LatLngTuple } from 'leaflet';
import { useEffect, useMemo, useState } from 'react';
import { CircleMarker, MapContainer, Popup, TileLayer, useMap } from 'react-leaflet';
import { Link } from 'react-router-dom';

import { RefreshCw } from 'lucide-react';
import { SectionHeader } from '../components/system/SectionHeader';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { useAuth } from '../features/auth/useAuth';
import {
  RESCUE_REQUEST_STATUS_BADGE_CLASSES,
  RESCUE_REQUEST_STATUS_LABELS,
} from '../features/rescueRequests/presentation';
import { getSupabaseClient } from '../services/supabase/client';
import { listLatestRescuerLocations } from '../services/supabase/liveLocation';
import { listRescueRequests } from '../services/supabase/rescueRequests';

import 'leaflet/dist/leaflet.css';

const DEFAULT_CENTER: LatLngTuple = [11.201, 122.06];
const ACTIVE_REQUEST_STATUSES = ['pending', 'acknowledged', 'assigned', 'in_progress'] as const;

function formatRelativeTime(isoString: string): string {
  const diffMs = Date.now() - new Date(isoString).getTime();
  const diffMin = Math.floor(diffMs / 60_000);
  if (diffMin < 1) return 'just now';
  if (diffMin === 1) return '1 min ago';
  if (diffMin < 60) return `${diffMin} min ago`;
  const diffHr = Math.floor(diffMin / 60);
  return `${diffHr}h ago`;
}

function AllMarkersViewport({ points }: { points: LatLngTuple[] }) {
  const map = useMap();
  useEffect(() => {
    if (points.length === 0) return;
    if (points.length === 1) {
      map.setView(points[0], 14);
      return;
    }
    map.fitBounds(points, { padding: [40, 40], maxZoom: 16 });
  }, [map, points]);
  return null;
}

export function LiveMapPage() {
  const auth = useAuth();
  const client = useMemo(() => getSupabaseClient(), []);
  const queryClient = useQueryClient();
  const [showRescuers, setShowRescuers] = useState(true);
  const [showRequests, setShowRequests] = useState(true);
  const [lastRefreshed, setLastRefreshed] = useState(new Date());

  const barangayId =
    auth.role === 'barangay_official' ? (auth.profile?.barangayId ?? null) : null;

  const rescuerLocationsQuery = useQuery({
    queryKey: ['live-map-rescuers', barangayId],
    queryFn: () => listLatestRescuerLocations(client!, { barangayId, sinceMinutes: 30 }),
    enabled: Boolean(client),
    refetchInterval: 30_000,
  });

  const requestsQuery = useQuery({
    queryKey: ['live-map-requests', barangayId],
    queryFn: () =>
      listRescueRequests(client!, {
        barangayId: barangayId ?? undefined,
      }),
    enabled: Boolean(client),
    refetchInterval: 30_000,
    select: (data) => data.filter((r) => (ACTIVE_REQUEST_STATUSES as readonly string[]).includes(r.status)),
  });

  useEffect(() => {
    if (!client) return;

    const channel = client
      .channel('live-map-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rescuer_locations' }, () => {
        void queryClient.invalidateQueries({ queryKey: ['live-map-rescuers', barangayId] });
        setLastRefreshed(new Date());
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rescue_requests' }, () => {
        void queryClient.invalidateQueries({ queryKey: ['live-map-requests', barangayId] });
      })
      .subscribe();

    return () => {
      void client.removeChannel(channel);
    };
  }, [barangayId, client, queryClient]);

  function handleRefresh() {
    void rescuerLocationsQuery.refetch();
    void requestsQuery.refetch();
    setLastRefreshed(new Date());
  }

  const rescuers = rescuerLocationsQuery.data ?? [];
  const requests = requestsQuery.data ?? [];

  const allPoints = useMemo<LatLngTuple[]>(() => {
    const pts: LatLngTuple[] = [];
    if (showRescuers) {
      for (const r of rescuers) pts.push([r.latitude, r.longitude]);
    }
    if (showRequests) {
      for (const rq of requests) {
        if (rq.latitude !== null && rq.longitude !== null) {
          pts.push([rq.latitude, rq.longitude]);
        }
      }
    }
    return pts;
  }, [rescuers, requests, showRescuers, showRequests]);

  const requestDetailBase =
    auth.role === 'mdrrmo_admin' ? '/app/admin/rescue-requests' : '/app/barangay/rescue-requests';

  return (
    <section className="space-y-4">
      <SectionHeader
        title="Live Map"
        summary="Real-time view of active rescuer positions and open rescue requests."
      />

      <div className="relative">
        <MapContainer
          center={DEFAULT_CENTER}
          zoom={13}
          className="w-full rounded-xl border border-border"
          style={{ height: 'calc(100vh - 220px)', minHeight: 400 }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <AllMarkersViewport points={allPoints} />

          {showRescuers &&
            rescuers.map((r) => (
              <CircleMarker
                key={r.rescuerId}
                center={[r.latitude, r.longitude]}
                radius={12}
                pathOptions={{ color: '#1d4ed8', fillColor: '#3b82f6', fillOpacity: 0.85, weight: 2 }}
              >
                <Popup>
                  <div className="space-y-0.5 text-sm">
                    <p className="font-semibold">{r.rescuerName}</p>
                    <p className="text-muted-foreground">Last seen: {formatRelativeTime(r.recordedAt)}</p>
                    {r.accuracyMeters !== null && (
                      <p className="text-xs text-muted-foreground">±{r.accuracyMeters.toFixed(0)} m accuracy</p>
                    )}
                  </div>
                </Popup>
              </CircleMarker>
            ))}

          {showRequests &&
            requests.map((rq) => {
              if (rq.latitude === null || rq.longitude === null) return null;
              return (
                <CircleMarker
                  key={rq.id}
                  center={[rq.latitude, rq.longitude]}
                  radius={10}
                  pathOptions={{ color: '#b91c1c', fillColor: '#ef4444', fillOpacity: 0.8, weight: 2 }}
                >
                  <Popup>
                    <div className="space-y-1 text-sm">
                      <p className="font-semibold">{rq.emergencyType}</p>
                      <p>{rq.peopleCount} {rq.peopleCount === 1 ? 'person' : 'people'}</p>
                      {rq.locationText ? <p className="text-xs text-muted-foreground">{rq.locationText}</p> : null}
                      <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${RESCUE_REQUEST_STATUS_BADGE_CLASSES[rq.status]}`}>
                        {RESCUE_REQUEST_STATUS_LABELS[rq.status]}
                      </span>
                      <div className="pt-1">
                        <Link
                          to={`${requestDetailBase}/${rq.id}`}
                          className="text-xs text-blue-600 underline hover:text-blue-800"
                        >
                          View details →
                        </Link>
                      </div>
                    </div>
                  </Popup>
                </CircleMarker>
              );
            })}
        </MapContainer>

        {/* Controls overlay */}
        <div className="absolute right-3 top-3 z-[1000] flex flex-col gap-2">
          <Card className="shadow-md">
            <CardContent className="p-3 space-y-2 text-sm">
              <div className="flex items-center justify-between gap-4">
                <span className="font-medium text-foreground">Live Map</span>
                <Button type="button" variant="outline" size="sm" onClick={handleRefresh}>
                  <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
                  Refresh
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Updated {formatRelativeTime(lastRefreshed.toISOString())}
              </p>
              <div className="space-y-1.5 border-t pt-2">
                <label className="flex cursor-pointer items-center gap-2 text-xs">
                  <input
                    type="checkbox"
                    checked={showRescuers}
                    onChange={(e) => setShowRescuers(e.target.checked)}
                    className="rounded"
                  />
                  <span className="inline-block h-3 w-3 rounded-full bg-blue-500" />
                  Rescuers ({rescuers.length})
                </label>
                <label className="flex cursor-pointer items-center gap-2 text-xs">
                  <input
                    type="checkbox"
                    checked={showRequests}
                    onChange={(e) => setShowRequests(e.target.checked)}
                    className="rounded"
                  />
                  <span className="inline-block h-3 w-3 rounded-full bg-red-500" />
                  Active Requests ({requests.length})
                </label>
              </div>
            </CardContent>
          </Card>

          {/* Legend */}
          <Card className="shadow-md">
            <CardContent className="p-3 space-y-1.5 text-xs text-muted-foreground">
              <p className="font-medium text-foreground">Legend</p>
              <div className="flex items-center gap-2">
                <span className="inline-block h-3 w-3 rounded-full border-2 border-blue-700 bg-blue-500" />
                Rescuer position
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-block h-3 w-3 rounded-full border-2 border-red-700 bg-red-500" />
                Rescue request
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {rescuerLocationsQuery.isLoading || requestsQuery.isLoading ? (
        <p className="text-sm text-muted-foreground">Loading map data…</p>
      ) : null}
    </section>
  );
}
