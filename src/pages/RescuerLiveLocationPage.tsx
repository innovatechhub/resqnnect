import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { LatLngTuple } from 'leaflet';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CircleMarker, MapContainer, Polyline, Popup, TileLayer, useMap } from 'react-leaflet';

import { SectionHeader } from '../components/system/SectionHeader';
import { Alert, AlertDescription } from '../components/ui/alert';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Label } from '../components/ui/label';
import { Select } from '../components/ui/select';
import { useAuth } from '../features/auth/useAuth';
import {
  ACTIVE_RESCUE_MISSION_STATUSES,
  RESCUE_MISSION_STATUS_LABELS,
} from '../features/rescueOperations/presentation';
import { getSupabaseClient } from '../services/supabase/client';
import { listRescuerLocations, publishRescuerLocation } from '../services/supabase/liveLocation';
import { listRescueAssignments } from '../services/supabase/rescueOperations';

interface LiveSnapshot {
  latitude: number;
  longitude: number;
  accuracyMeters: number | null;
  recordedAt: string;
}

const DEFAULT_CENTER: LatLngTuple = [11.201, 122.06];
const PUBLISH_INTERVAL_MS = 10_000;
const MIN_DISTANCE_METERS = 8;

function formatTimestamp(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

function formatMeters(value: number | null): string {
  if (value === null) {
    return 'n/a';
  }

  return `${value.toFixed(1)} m`;
}

function haversineMeters(a: { latitude: number; longitude: number }, b: { latitude: number; longitude: number }): number {
  const toRadians = (value: number) => (value * Math.PI) / 180;
  const earthRadius = 6_371_000;

  const dLat = toRadians(b.latitude - a.latitude);
  const dLng = toRadians(b.longitude - a.longitude);
  const lat1 = toRadians(a.latitude);
  const lat2 = toRadians(b.latitude);
  const sinLat = Math.sin(dLat / 2);
  const sinLng = Math.sin(dLng / 2);
  const h = sinLat * sinLat + Math.cos(lat1) * Math.cos(lat2) * sinLng * sinLng;

  return 2 * earthRadius * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

function mapPositionFromGeolocation(position: GeolocationPosition): LiveSnapshot {
  return {
    latitude: position.coords.latitude,
    longitude: position.coords.longitude,
    accuracyMeters: Number.isFinite(position.coords.accuracy) ? position.coords.accuracy : null,
    recordedAt: new Date(position.timestamp).toISOString(),
  };
}

function geolocationErrorMessage(error: GeolocationPositionError): string {
  if (error.code === error.PERMISSION_DENIED) {
    return 'Location permission was denied. Enable GPS/browser location access.';
  }
  if (error.code === error.POSITION_UNAVAILABLE) {
    return 'Position unavailable. Check GPS signal and retry.';
  }
  if (error.code === error.TIMEOUT) {
    return 'Location request timed out. Try again.';
  }
  return 'Failed to read location.';
}

function MapViewportController({ points }: { points: LatLngTuple[] }) {
  const map = useMap();

  useEffect(() => {
    if (points.length === 0) {
      return;
    }

    if (points.length === 1) {
      map.setView(points[0], 16);
      return;
    }

    map.fitBounds(points, { padding: [28, 28], maxZoom: 17 });
  }, [map, points]);

  return null;
}

export function RescuerLiveLocationPage() {
  const auth = useAuth();
  const client = useMemo(() => getSupabaseClient(), []);
  const queryClient = useQueryClient();

  const [selectedAssignmentId, setSelectedAssignmentId] = useState<string | null>(null);
  const [isTracking, setIsTracking] = useState(false);
  const [trackingError, setTrackingError] = useState<string | null>(null);
  const [latestSnapshot, setLatestSnapshot] = useState<LiveSnapshot | null>(null);

  const userId = auth.user?.id ?? null;
  const selectedAssignmentIdRef = useRef<string | null>(null);
  const watchIdRef = useRef<number | null>(null);
  const publishInFlightRef = useRef(false);
  const lastPublishedAtRef = useRef(0);
  const lastPublishedPointRef = useRef<{ latitude: number; longitude: number } | null>(null);

  useEffect(() => {
    selectedAssignmentIdRef.current = selectedAssignmentId;
  }, [selectedAssignmentId]);

  const assignmentsQuery = useQuery({
    queryKey: ['rescue-assignments', 'rescuer-live-location', userId],
    enabled: Boolean(client && auth.status === 'authenticated' && auth.role === 'rescuer' && userId),
    queryFn: async () =>
      listRescueAssignments(client!, {
        assignedTo: userId!,
        statuses: ACTIVE_RESCUE_MISSION_STATUSES,
      }),
  });

  useEffect(() => {
    const activeAssignments = assignmentsQuery.data ?? [];
    if (activeAssignments.length === 0) {
      if (selectedAssignmentId !== null) {
        setSelectedAssignmentId(null);
      }
      return;
    }

    if (selectedAssignmentId && activeAssignments.some((item) => item.id === selectedAssignmentId)) {
      return;
    }

    setSelectedAssignmentId(activeAssignments[0].id);
  }, [assignmentsQuery.data, selectedAssignmentId]);

  const locationsQueryKey = useMemo(
    () => ['rescuer-locations', userId, selectedAssignmentId ?? 'all'] as const,
    [selectedAssignmentId, userId],
  );

  const locationsQuery = useQuery({
    queryKey: locationsQueryKey,
    enabled: Boolean(client && auth.status === 'authenticated' && auth.role === 'rescuer' && userId),
    queryFn: async () =>
      listRescuerLocations(client!, {
        assignedRescuerId: userId!,
        rescueAssignmentId: selectedAssignmentId ?? undefined,
        limit: 300,
      }),
  });

  const publishMutation = useMutation({
    mutationFn: async (snapshot: LiveSnapshot) => {
      if (!client || !userId) {
        throw new Error('You must be logged in as rescuer to publish location.');
      }

      return publishRescuerLocation(client, {
        assignedRescuerId: userId,
        rescueAssignmentId: selectedAssignmentIdRef.current,
        latitude: snapshot.latitude,
        longitude: snapshot.longitude,
        accuracyMeters: snapshot.accuracyMeters,
        recordedAt: snapshot.recordedAt,
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: locationsQueryKey });
    },
  });

  const publishSnapshot = useCallback(
    async (snapshot: LiveSnapshot, force: boolean) => {
      if (!client || !userId) {
        return;
      }

      const now = Date.now();
      const lastPoint = lastPublishedPointRef.current;
      const intervalReached = now - lastPublishedAtRef.current >= PUBLISH_INTERVAL_MS;
      const movedEnough =
        lastPoint === null
          ? true
          : haversineMeters(
              { latitude: lastPoint.latitude, longitude: lastPoint.longitude },
              { latitude: snapshot.latitude, longitude: snapshot.longitude },
            ) >= MIN_DISTANCE_METERS;

      if (!force && !intervalReached && !movedEnough) {
        return;
      }

      if (publishInFlightRef.current) {
        return;
      }

      publishInFlightRef.current = true;
      try {
        await publishMutation.mutateAsync(snapshot);
        lastPublishedAtRef.current = now;
        lastPublishedPointRef.current = {
          latitude: snapshot.latitude,
          longitude: snapshot.longitude,
        };
        setTrackingError(null);
      } catch (error) {
        setTrackingError(error instanceof Error ? error.message : 'Failed to publish location.');
      } finally {
        publishInFlightRef.current = false;
      }
    },
    [client, publishMutation, userId],
  );

  const stopTracking = useCallback(() => {
    if (watchIdRef.current !== null && navigator.geolocation) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setIsTracking(false);
  }, []);

  const startTracking = useCallback(() => {
    if (!navigator.geolocation) {
      setTrackingError('Geolocation is not supported in this browser.');
      return;
    }

    if (watchIdRef.current !== null) {
      return;
    }

    setTrackingError(null);
    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const snapshot = mapPositionFromGeolocation(position);
        setLatestSnapshot(snapshot);
        void publishSnapshot(snapshot, false);
      },
      (error) => {
        setTrackingError(geolocationErrorMessage(error));
        stopTracking();
      },
      {
        enableHighAccuracy: true,
        timeout: 15_000,
        maximumAge: 5_000,
      },
    );

    watchIdRef.current = watchId;
    setIsTracking(true);
  }, [publishSnapshot, stopTracking]);

  const publishCurrentLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setTrackingError('Geolocation is not supported in this browser.');
      return;
    }

    setTrackingError(null);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const snapshot = mapPositionFromGeolocation(position);
        setLatestSnapshot(snapshot);
        void publishSnapshot(snapshot, true);
      },
      (error) => {
        setTrackingError(geolocationErrorMessage(error));
      },
      {
        enableHighAccuracy: true,
        timeout: 15_000,
        maximumAge: 0,
      },
    );
  }, [publishSnapshot]);

  useEffect(() => {
    if (!client || !userId) {
      return;
    }

    const channel = client
      .channel(`rescuer-locations-${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'rescuer_locations',
          filter: `assigned_rescuer_id=eq.${userId}`,
        },
        () => {
          void queryClient.invalidateQueries({ queryKey: locationsQueryKey });
        },
      )
      .subscribe();

    return () => {
      void client.removeChannel(channel);
    };
  }, [client, locationsQueryKey, queryClient, userId]);

  useEffect(() => () => stopTracking(), [stopTracking]);

  const persistedLocations = locationsQuery.data ?? [];
  const latestPersisted = persistedLocations.length > 0 ? persistedLocations[persistedLocations.length - 1] : null;
  const latestDisplaySnapshot = latestSnapshot
    ? latestSnapshot
    : latestPersisted
      ? {
          latitude: latestPersisted.latitude,
          longitude: latestPersisted.longitude,
          accuracyMeters: latestPersisted.accuracyMeters,
          recordedAt: latestPersisted.recordedAt,
        }
      : null;

  const trailPoints = useMemo(() => {
    const points: LatLngTuple[] = persistedLocations.map((item) => [item.latitude, item.longitude]);

    if (!latestSnapshot) {
      return points;
    }

    const latestPoint: LatLngTuple = [latestSnapshot.latitude, latestSnapshot.longitude];
    const last = points[points.length - 1];
    if (!last || last[0] !== latestPoint[0] || last[1] !== latestPoint[1]) {
      points.push(latestPoint);
    }

    return points;
  }, [latestSnapshot, persistedLocations]);

  const mapCenter = trailPoints.length > 0 ? trailPoints[trailPoints.length - 1] : DEFAULT_CENTER;

  if (!client) {
    return (
      <Alert variant="warning">
        <AlertDescription>Configure Supabase env variables to use live location tracking.</AlertDescription>
      </Alert>
    );
  }

  return (
    <section className="space-y-5">
      <SectionHeader
        missionTag="Mission 8"
        title="Live Location Sharing"
        summary="Publish responder GPS updates and visualize the active movement trail in real time."
      />

      {trackingError ? (
        <Alert variant="destructive">
          <AlertDescription>{trackingError}</AlertDescription>
        </Alert>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-[1fr_1.25fr]">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Tracking Controls</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">

          <Label className="block text-xs uppercase tracking-wide text-muted-foreground">
            Active Assignment
            <Select
              value={selectedAssignmentId ?? ''}
              onChange={(event) => setSelectedAssignmentId(event.target.value || null)}
              className="mt-1"
            >
              <option value="">No assignment context</option>
              {(assignmentsQuery.data ?? []).map((assignment) => (
                <option key={assignment.id} value={assignment.id}>
                  {(assignment.rescueRequest?.emergencyType ?? 'Mission') +
                    ` | ${RESCUE_MISSION_STATUS_LABELS[assignment.status]}`}
                </option>
              ))}
            </Select>
          </Label>

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              onClick={isTracking ? stopTracking : startTracking}
              variant={isTracking ? 'destructive' : 'default'}
            >
              {isTracking ? 'Stop Tracking' : 'Start Tracking'}
            </Button>
            <Button
              type="button"
              onClick={publishCurrentLocation}
              disabled={publishMutation.isPending}
              variant="outline"
            >
              {publishMutation.isPending ? 'Publishing...' : 'Publish Current Location'}
            </Button>
            <Button type="button" variant="outline" onClick={() => void locationsQuery.refetch()}>
              Refresh Trail
            </Button>
          </div>

          <div className="rounded-lg border border-border bg-muted/45 p-3 text-sm text-muted-foreground">
            <p>
              Tracker: <span className="font-semibold text-foreground">{isTracking ? 'Active' : 'Stopped'}</span>
            </p>
            <p className="mt-1">
              Points in view: <span className="font-semibold text-foreground">{persistedLocations.length}</span>
            </p>
            {latestDisplaySnapshot ? (
              <>
                <p className="mt-1">
                  Latest:{' '}
                  <span className="font-semibold text-foreground">
                    {latestDisplaySnapshot.latitude.toFixed(5)}, {latestDisplaySnapshot.longitude.toFixed(5)}
                  </span>
                </p>
                <p className="mt-1">
                  Accuracy:{' '}
                  <span className="font-semibold text-foreground">{formatMeters(latestDisplaySnapshot.accuracyMeters)}</span>
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Recorded {formatTimestamp(latestDisplaySnapshot.recordedAt)}
                </p>
              </>
            ) : (
              <p className="mt-1 text-xs text-muted-foreground">No position snapshot yet.</p>
            )}
          </div>

          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-foreground">Recent Logs</h3>
            <div className="max-h-56 space-y-2 overflow-auto pr-1">
              {persistedLocations
                .slice(-12)
                .reverse()
                .map((item) => (
                  <div key={item.id} className="rounded-lg border border-border bg-muted/45 p-2">
                    <p className="text-xs font-semibold text-foreground">
                      {item.latitude.toFixed(5)}, {item.longitude.toFixed(5)}
                    </p>
                    <p className="text-xs text-muted-foreground">Accuracy {formatMeters(item.accuracyMeters)}</p>
                    <p className="text-xs text-muted-foreground">{formatTimestamp(item.recordedAt)}</p>
                  </div>
                ))}
              {!locationsQuery.isLoading && persistedLocations.length === 0 ? (
                <p className="text-sm text-muted-foreground">No location points yet.</p>
              ) : null}
            </div>
          </div>
          </CardContent>
        </Card>

        <Card className="bg-muted/35">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Live Map Trail</CardTitle>
          </CardHeader>
          <CardContent>
          <div className="h-[460px] overflow-hidden rounded-xl border border-border">
            <MapContainer center={mapCenter} zoom={15} className="h-full w-full">
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <MapViewportController points={trailPoints} />
              {trailPoints.length > 1 ? (
                <Polyline positions={trailPoints} pathOptions={{ color: '#0f172a', weight: 4, opacity: 0.8 }} />
              ) : null}
              {latestDisplaySnapshot ? (
                <CircleMarker
                  center={[latestDisplaySnapshot.latitude, latestDisplaySnapshot.longitude]}
                  radius={9}
                  pathOptions={{ color: '#0f172a', fillColor: '#2a8cf7', fillOpacity: 0.85 }}
                >
                  <Popup>
                    <div className="space-y-1 text-xs">
                      <p className="font-semibold">Latest Position</p>
                      <p>{latestDisplaySnapshot.latitude.toFixed(5)}, {latestDisplaySnapshot.longitude.toFixed(5)}</p>
                      <p>Accuracy: {formatMeters(latestDisplaySnapshot.accuracyMeters)}</p>
                      <p>{formatTimestamp(latestDisplaySnapshot.recordedAt)}</p>
                    </div>
                  </Popup>
                </CircleMarker>
              ) : null}
            </MapContainer>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Trail updates from `rescuer_locations` with realtime sync for the signed-in rescuer.
          </p>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
