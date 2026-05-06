# ResQnnect Mission 8 Live Location

## Goal
Implement rescuer live-location publishing and map tracking for field visibility and dispatch awareness.

## Scope Delivered
- Route activation at `/app/rescuer/live-location`.
- Geolocation controls:
  - start/stop continuous GPS tracking
  - publish current location manually
- Assignment-context selection for each published location point.
- Realtime map visualization of movement trail using Leaflet + OpenStreetMap.
- Recent location logs with coordinate, accuracy, and timestamp metadata.

## Service Layer
- `src/services/supabase/liveLocation.ts`
  - `listRescuerLocations`
  - `publishRescuerLocation`
- Typed mapping normalizes numeric coordinates and accuracy fields.

## Query and Realtime
- TanStack Query handles location list loading and invalidation.
- Supabase realtime listener on `rescuer_locations` keeps the trail view fresh while updates are inserted.
- Location publishing throttles writes by interval and movement distance to avoid excessive inserts.

## Map Layer
- `react-leaflet` + `leaflet` integrated into Vite app.
- Leaflet CSS imported at app bootstrap (`src/main.tsx`).
- Map viewport auto-adjusts to current trail bounds and highlights latest position.

## Routing
- `src/app/router.tsx` now routes:
  - `/app/rescuer/live-location` -> `RescuerLiveLocationPage`
