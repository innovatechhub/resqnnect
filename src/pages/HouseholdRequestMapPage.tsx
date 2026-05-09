import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { LatLngTuple } from 'leaflet';
import L from 'leaflet';
import { useEffect, useMemo } from 'react';
import { CircleMarker, MapContainer, Marker, Polyline, Popup, TileLayer, useMap } from 'react-leaflet';
import { Link, useParams } from 'react-router-dom';

import { ArrowLeft, Users } from 'lucide-react';
import { EmptyState } from '../components/system/EmptyState';
import { Alert, AlertDescription } from '../components/ui/alert';
import { Badge } from '../components/ui/badge';
import { buttonVariants } from '../components/ui/button';
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
import {
  RESCUE_REQUEST_STATUS_BADGE_CLASSES,
  RESCUE_REQUEST_STATUS_LABELS,
} from '../features/rescueRequests/presentation';
import { RESCUE_MISSION_STATUS_LABELS } from '../features/rescueOperations/presentation';
import { getSupabaseClient } from '../services/supabase/client';
import { listLocationsForRequest } from '../services/supabase/liveLocation';
import { getRescueRequest } from '../services/supabase/rescueRequests';
import { listRescueAssignments } from '../services/supabase/rescueOperations';

import 'leaflet/dist/leaflet.css';

// Fix default marker icon for Leaflet in Vite/webpack environments
const requestIcon = L.divIcon({
  className: '',
  html: `<div style="width:18px;height:18px;background:#ef4444;border:3px solid #b91c1c;border-radius:50%;box-shadow:0 1px 4px rgba(0,0,0,0.4)"></div>`,
  iconSize: [18, 18],
  iconAnchor: [9, 9],
});

const DEFAULT_CENTER: LatLngTuple = [11.201, 122.06];

function formatRelativeTime(isoString: string): string {
  const diffMs = Date.now() - new Date(isoString).getTime();
  const diffMin = Math.floor(diffMs / 60_000);
  if (diffMin < 1) return 'just now';
  if (diffMin === 1) return '1 min ago';
  if (diffMin < 60) return `${diffMin} min ago`;
  const diffHr = Math.floor(diffMin / 60);
  return `${diffHr}h ago`;
}

function formatTimestamp(isoString: string): string {
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return isoString;
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'short', timeStyle: 'short' }).format(date);
}

interface MapGroupProps {
  trailPoints: LatLngTuple[];
  latest: { lat: number; lng: number; recordedAt: string } | undefined;
  color: string;
  rescuerName: string;
}

function MapGroup({ trailPoints, latest, color, rescuerName }: MapGroupProps) {
  return (
    <>
      {trailPoints.length > 1 ? (
        <Polyline positions={trailPoints} pathOptions={{ color, weight: 3, dashArray: '6 4', opacity: 0.7 }} />
      ) : null}
      {latest ? (
        <CircleMarker
          center={[latest.lat, latest.lng]}
          radius={11}
          pathOptions={{ color, fillColor: color, fillOpacity: 0.85, weight: 2 }}
        >
          <Popup>
            <div className="space-y-0.5 text-sm">
              <p className="font-semibold">{rescuerName}</p>
              <p className="text-muted-foreground">Last seen: {formatRelativeTime(latest.recordedAt)}</p>
            </div>
          </Popup>
        </CircleMarker>
      ) : null}
    </>
  );
}

function MapViewportController({ points }: { points: LatLngTuple[] }) {
  const map = useMap();
  useEffect(() => {
    if (points.length === 0) return;
    if (points.length === 1) {
      map.setView(points[0], 16);
      return;
    }
    map.fitBounds(points, { padding: [32, 32], maxZoom: 17 });
  }, [map, points]);
  return null;
}

const RESCUER_TRAIL_COLORS = ['#2563eb', '#16a34a', '#7c3aed', '#d97706', '#0891b2'];

export function HouseholdRequestMapPage() {
  const { requestId } = useParams<{ requestId: string }>();
  const client = useMemo(() => getSupabaseClient(), []);
  const queryClient = useQueryClient();

  const requestQuery = useQuery({
    queryKey: ['household-map-request', requestId],
    queryFn: () => getRescueRequest(client!, requestId!),
    enabled: Boolean(client && requestId),
  });

  const assignmentsQuery = useQuery({
    queryKey: ['household-map-assignments', requestId],
    queryFn: () => listRescueAssignments(client!, { rescueRequestId: requestId! }),
    enabled: Boolean(client && requestId),
    refetchInterval: 15_000,
  });

  const trailsQuery = useQuery({
    queryKey: ['household-map-trails', requestId],
    queryFn: () => listLocationsForRequest(client!, requestId!),
    enabled: Boolean(client && requestId),
    refetchInterval: 15_000,
  });

  useEffect(() => {
    if (!client || !requestId) return;

    const channel = client
      .channel(`household-map-${requestId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rescuer_locations' }, () => {
        void queryClient.invalidateQueries({ queryKey: ['household-map-trails', requestId] });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rescue_assignments' }, () => {
        void queryClient.invalidateQueries({ queryKey: ['household-map-assignments', requestId] });
        void queryClient.invalidateQueries({ queryKey: ['household-map-trails', requestId] });
      })
      .subscribe();

    return () => {
      void client.removeChannel(channel);
    };
  }, [client, queryClient, requestId]);

  const request = requestQuery.data ?? null;
  const assignments = assignmentsQuery.data ?? [];
  const trails = trailsQuery.data ?? [];

  const requestHasCoords = request?.latitude !== null && request?.latitude !== undefined &&
    request?.longitude !== null && request?.longitude !== undefined;

  const allPoints = useMemo<LatLngTuple[]>(() => {
    const pts: LatLngTuple[] = [];
    if (requestHasCoords && request) {
      pts.push([request.latitude!, request.longitude!]);
    }
    for (const trail of trails) {
      for (const pt of trail.points) {
        pts.push([pt.lat, pt.lng]);
      }
    }
    return pts;
  }, [request, trails, requestHasCoords]);

  const trailMap = useMemo(() => {
    const map = new Map<string, (typeof trails)[number]>();
    for (const t of trails) map.set(t.rescuerId, t);
    return map;
  }, [trails]);

  return (
    <section className="space-y-4">
      <div className="flex items-center gap-3">
        <Link to="/app/household/rescue-requests" className={buttonVariants({ variant: 'outline', size: 'sm' })}>
          <ArrowLeft className="mr-1.5 h-4 w-4" />
          Back to Requests
        </Link>
        <div>
          <h1 className="text-lg font-semibold text-foreground">
            {request ? `${request.emergencyType} — Live Tracking` : 'Live Tracking'}
          </h1>
          {request ? (
            <div className="flex items-center gap-2 mt-0.5">
              <Badge className={RESCUE_REQUEST_STATUS_BADGE_CLASSES[request.status]}>
                {RESCUE_REQUEST_STATUS_LABELS[request.status]}
              </Badge>
              <span className="text-xs text-muted-foreground">{request.peopleCount} {request.peopleCount === 1 ? 'person' : 'people'}</span>
            </div>
          ) : null}
        </div>
      </div>

      {!requestHasCoords && !requestQuery.isLoading ? (
        <Alert variant="warning">
          <AlertDescription>
            Location coordinates are not available for this request. The map cannot display your pin.
          </AlertDescription>
        </Alert>
      ) : null}

      <MapContainer
        center={DEFAULT_CENTER}
        zoom={13}
        className="w-full rounded-xl border border-border"
        style={{ height: 'calc(100vh - 320px)', minHeight: 380 }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapViewportController points={allPoints} />

        {requestHasCoords && request ? (
          <Marker position={[request.latitude!, request.longitude!]} icon={requestIcon}>
            <Popup>
              <div className="space-y-0.5 text-sm">
                <p className="font-semibold">Your rescue request</p>
                <p>{request.emergencyType}</p>
                {request.locationText ? (
                  <p className="text-xs text-muted-foreground">{request.locationText}</p>
                ) : null}
              </div>
            </Popup>
          </Marker>
        ) : null}

        {trails.map((trail, index) => {
          const color = RESCUER_TRAIL_COLORS[index % RESCUER_TRAIL_COLORS.length];
          const trailPoints: LatLngTuple[] = trail.points.map((p) => [p.lat, p.lng]);
          const latest = trail.points.at(-1);

          return (
            <MapGroup key={trail.rescuerId} trailPoints={trailPoints} latest={latest} color={color} rescuerName={trail.rescuerName} />
          );
        })}
      </MapContainer>

      <Card className="bg-muted/35">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Assigned Rescuers</CardTitle>
        </CardHeader>
        <CardContent>
          {assignments.length === 0 ? (
            <EmptyState
              icon={Users}
              title="No rescuers assigned yet"
              description="Your request is in the queue. A rescuer will be assigned shortly."
            />
          ) : (
            <TableContainer>
              <Table>
                <TableHead>
                  <tr>
                    <TableHeaderCell>Rescuer / Team</TableHeaderCell>
                    <TableHeaderCell>Mission Status</TableHeaderCell>
                    <TableHeaderCell>Last Location</TableHeaderCell>
                  </tr>
                </TableHead>
                <TableBody>
                  {assignments.map((a) => {
                    const trail = trailMap.get(a.assignedTo);
                    const latest = trail?.points.at(-1);
                    return (
                      <TableRow key={a.id}>
                        <TableCell className="font-medium">{a.teamName ?? 'Rescue Team'}</TableCell>
                        <TableCell>
                          <Badge variant="secondary">{RESCUE_MISSION_STATUS_LABELS[a.status]}</Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {latest ? formatTimestamp(latest.recordedAt) : 'No location yet'}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>
    </section>
  );
}
