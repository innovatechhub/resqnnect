# ResQnnect Mission 11 Reports and Analytics

## Goal
Implement dashboard summaries, operational charts, and exportable reports for municipal and barangay users.

## Scope Delivered
- Municipal reports at `/app/admin/reports`.
- Barangay reports at `/app/barangay/reports`.
- Request status and mission status charts using Recharts.
- Evacuation capacity snapshot.
- Relief stock snapshot.
- CSV export for core operational metrics.
- Role dashboards now load live Supabase metrics.

## Service Layer
- `src/services/supabase/reports.ts`
  - `getDashboardMetrics`
  - `getOperationalReport`

## Build Notes
The Vite build is configured with manual chunks for React, Supabase, maps, QR, and chart libraries so the added reporting and scanning dependencies do not inflate the main application chunk.
