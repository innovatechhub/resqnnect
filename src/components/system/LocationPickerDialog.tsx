import type { LatLngTuple } from 'leaflet';
import { Loader2, MapPinned, Search } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { CircleMarker, MapContainer, TileLayer, useMap, useMapEvents } from 'react-leaflet';

import { cn } from '../../lib/utils';
import { Button } from '../ui/button';
import { Dialog } from '../ui/dialog';
import { Input } from '../ui/input';

interface LocationPickerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  initialLocationText?: string;
  initialLatitude?: number | null;
  initialLongitude?: number | null;
  onSelect: (value: { locationText: string; latitude: number; longitude: number }) => void;
}

interface SearchResult {
  display_name: string;
  lat: string;
  lon: string;
}

const DEFAULT_CENTER: LatLngTuple = [11.201, 122.06];
const DEFAULT_ZOOM = 14;

function formatCoordinate(value: number): string {
  return value.toFixed(6);
}

function MapViewportController({ center, zoom }: { center: LatLngTuple; zoom: number }) {
  const map = useMap();

  useEffect(() => {
    map.setView(center, zoom);
  }, [center, map, zoom]);

  return null;
}

function MapSelectionLayer({
  position,
  onSelect,
}: {
  position: LatLngTuple | null;
  onSelect: (position: LatLngTuple) => void;
}) {
  useMapEvents({
    click(event) {
      onSelect([event.latlng.lat, event.latlng.lng]);
    },
  });

  if (!position) {
    return null;
  }

  return (
    <CircleMarker
      center={position}
      radius={10}
      pathOptions={{ color: '#0f172a', fillColor: '#2a8cf7', fillOpacity: 0.9 }}
    />
  );
}

export function LocationPickerDialog({
  open,
  onOpenChange,
  title = 'Pick Location',
  initialLocationText = '',
  initialLatitude = null,
  initialLongitude = null,
  onSelect,
}: LocationPickerDialogProps) {
  const [searchQuery, setSearchQuery] = useState(initialLocationText);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isResolvingAddress, setIsResolvingAddress] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedLabel, setSelectedLabel] = useState(initialLocationText);
  const [selectedPosition, setSelectedPosition] = useState<LatLngTuple | null>(
    initialLatitude !== null && initialLongitude !== null ? [initialLatitude, initialLongitude] : null,
  );
  const [mapCenter, setMapCenter] = useState<LatLngTuple>(
    initialLatitude !== null && initialLongitude !== null ? [initialLatitude, initialLongitude] : DEFAULT_CENTER,
  );
  const [mapZoom, setMapZoom] = useState(initialLatitude !== null && initialLongitude !== null ? 16 : DEFAULT_ZOOM);

  async function searchLocationByQuery(rawQuery: string) {
    const query = rawQuery.trim();
    if (!query) {
      setResults([]);
      return;
    }

    setIsSearching(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        q: query,
        format: 'jsonv2',
        limit: '5',
      });
      const response = await fetch(`https://nominatim.openstreetmap.org/search?${params.toString()}`);
      if (!response.ok) {
        throw new Error('Search request failed.');
      }

      const payload = (await response.json()) as SearchResult[];
      setResults(payload);
      if (payload.length === 0) {
        setError('No areas matched that search.');
      }
    } catch (searchError) {
      setError(searchError instanceof Error ? searchError.message : 'Failed to search location.');
    } finally {
      setIsSearching(false);
    }
  }

  useEffect(() => {
    if (!open) {
      return;
    }

    const initialQuery = initialLocationText.trim();
    setSearchQuery(initialLocationText);
    setSelectedLabel(initialLocationText);
    setResults([]);
    setError(null);

    if (initialLatitude !== null && initialLongitude !== null) {
      const position: LatLngTuple = [initialLatitude, initialLongitude];
      setSelectedPosition(position);
      setMapCenter(position);
      setMapZoom(16);
      if (initialQuery) {
        void searchLocationByQuery(initialQuery);
      }
      return;
    }

    setSelectedPosition(null);
    setMapCenter(DEFAULT_CENTER);
    setMapZoom(DEFAULT_ZOOM);
    if (initialQuery) {
      void searchLocationByQuery(initialQuery);
    }
  }, [initialLatitude, initialLocationText, initialLongitude, open]);

  const selectedCoordinates = useMemo(() => {
    if (!selectedPosition) {
      return null;
    }

    return {
      latitude: selectedPosition[0],
      longitude: selectedPosition[1],
    };
  }, [selectedPosition]);

  async function searchLocation() {
    await searchLocationByQuery(searchQuery);
  }

  async function reverseGeocode(position: LatLngTuple) {
    setIsResolvingAddress(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        lat: String(position[0]),
        lon: String(position[1]),
        format: 'jsonv2',
      });
      const response = await fetch(`https://nominatim.openstreetmap.org/reverse?${params.toString()}`);
      if (!response.ok) {
        throw new Error('Failed to read address from map point.');
      }

      const payload = (await response.json()) as { display_name?: string };
      if (payload.display_name) {
        setSelectedLabel(payload.display_name);
        setSearchQuery(payload.display_name);
      }
    } catch (reverseError) {
      setError(reverseError instanceof Error ? reverseError.message : 'Failed to read address from point.');
    } finally {
      setIsResolvingAddress(false);
    }
  }

  function handleResultSelect(result: SearchResult) {
    const latitude = Number(result.lat);
    const longitude = Number(result.lon);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      setError('Search result returned invalid coordinates.');
      return;
    }

    const position: LatLngTuple = [latitude, longitude];
    setSelectedPosition(position);
    setSelectedLabel(result.display_name);
    setSearchQuery(result.display_name);
    setMapCenter(position);
    setMapZoom(17);
    setError(null);
  }

  function handleMapSelect(position: LatLngTuple) {
    setSelectedPosition(position);
    setMapCenter(position);
    setMapZoom(17);
    void reverseGeocode(position);
  }

  function applySelection() {
    if (!selectedCoordinates) {
      setError('Select a point on the map or from search results first.');
      return;
    }

    onSelect({
      locationText: selectedLabel.trim() || `${formatCoordinate(selectedCoordinates.latitude)}, ${formatCoordinate(selectedCoordinates.longitude)}`,
      latitude: selectedCoordinates.latitude,
      longitude: selectedCoordinates.longitude,
    });
    onOpenChange(false);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      description="Search an area, then click the map to refine the exact point."
      className="max-w-5xl"
      showDefaultCloseButton={false}
      footer={
        <>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" onClick={applySelection}>
            Use Location
          </Button>
        </>
      }
    >
      <div className="grid gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="block text-xs uppercase tracking-wide text-muted-foreground">Search Area</label>
            <div className="flex gap-2">
              <Input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Street, landmark, barangay, municipality"
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault();
                    void searchLocation();
                  }
                }}
              />
              <Button type="button" variant="outline" size="icon" onClick={() => void searchLocation()} disabled={isSearching}>
                {isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Search Results</p>
              <p className="text-xs text-muted-foreground">{results.length} found</p>
            </div>
            <div className="max-h-56 space-y-2 overflow-auto pr-1">
              {results.map((result) => {
                const isActive =
                  selectedCoordinates &&
                  Number(result.lat) === selectedCoordinates.latitude &&
                  Number(result.lon) === selectedCoordinates.longitude;

                return (
                  <button
                    key={`${result.lat}-${result.lon}-${result.display_name}`}
                    type="button"
                    onClick={() => handleResultSelect(result)}
                    className={cn(
                      'w-full rounded-md border px-3 py-2 text-left text-sm transition-colors',
                      isActive ? 'border-primary bg-primary/5' : 'border-border bg-background hover:bg-accent',
                    )}
                  >
                    <p className="font-medium text-foreground">{result.display_name}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {Number(result.lat).toFixed(5)}, {Number(result.lon).toFixed(5)}
                    </p>
                  </button>
                );
              })}
              {!isSearching && results.length === 0 ? (
                <div className="rounded-md border border-dashed border-border px-3 py-4 text-sm text-muted-foreground">
                  Search for an area to jump the map closer to the target location.
                </div>
              ) : null}
            </div>
          </div>

          <div className="rounded-md border border-border bg-muted/35 p-3 text-sm">
            <div className="flex items-center gap-2">
              <MapPinned className="h-4 w-4 text-primary" />
              <p className="font-medium text-foreground">Selected Location</p>
            </div>
            {selectedCoordinates ? (
              <div className="mt-2 space-y-1 text-muted-foreground">
                <p>{selectedLabel || 'Pinned point without address label'}</p>
                <p>
                  {formatCoordinate(selectedCoordinates.latitude)}, {formatCoordinate(selectedCoordinates.longitude)}
                </p>
                {isResolvingAddress ? <p>Resolving address...</p> : null}
              </div>
            ) : (
              <p className="mt-2 text-muted-foreground">Click the map or choose a search result.</p>
            )}
          </div>

          {error ? <p className="text-sm text-destructive">{error}</p> : null}
        </div>

        <div className="overflow-hidden rounded-lg border border-border">
          <div className="h-[420px] w-full">
            <MapContainer center={mapCenter} zoom={mapZoom} className="h-full w-full">
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <MapViewportController center={mapCenter} zoom={mapZoom} />
              <MapSelectionLayer position={selectedPosition} onSelect={handleMapSelect} />
            </MapContainer>
          </div>
          <div className="border-t border-border bg-muted/35 px-3 py-2 text-xs text-muted-foreground">
            Click anywhere on the map to refine the exact point.
          </div>
        </div>
      </div>
    </Dialog>
  );
}
