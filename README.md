# ResQnnect

Mission 1 + Mission 2 foundation for ResQnnect, a real-time calamity rescue and evacuee monitoring platform.

## Stack
- React 19 + Vite
- TypeScript
- Tailwind CSS
- React Router
- Supabase client + auth/session scaffold
- React Hook Form + Zod
- TanStack Query

## Setup
1. Install dependencies:
   ```bash
   npm install
   ```
2. Create environment file:
   ```bash
   copy .env.example .env
   ```
3. Run development server:
   ```bash
   npm run dev
   ```

## Scripts
- `npm run dev` start local development server
- `npm run build` run TypeScript build checks and Vite production build
- `npm run preview` preview production build locally
- `npm run lint` run TypeScript no-emit checks

## Mission 1 Notes
- Supabase keys are optional for this scaffold.
- Missing `VITE_SUPABASE_URL` or `VITE_SUPABASE_ANON_KEY` will show a visible warning banner and console warning.
- Foundation documentation is available at `docs/mission-1-foundation.md`.

## Mission 2 Notes
- Authentication state is bootstrapped from Supabase session on app load.
- Profile/role resolution tries `profiles` table first, then safely falls back to auth metadata/default role.
- Route guards now enforce authenticated access and role metadata.
- If Supabase is not configured, login and protected routes remain safe and show explicit configuration feedback.

## Mission 3 Notes
- SQL schema and RLS baseline are provided in:
  - `supabase/sql/001_phase3_schema.sql`
  - `supabase/sql/002_phase3_rls.sql`
- Demo auth precheck helper is provided in:
  - `supabase/sql/002b_demo_auth_users.sql`
- Demo seed data is provided in:
  - `supabase/sql/003_phase3_demo_seed.sql`
- Detailed data-model notes are in `docs/mission-3-schema-rls.md`.
- Run schema first, then RLS policies, create demo auth users in Supabase Authentication, run `002b_demo_auth_users.sql` to verify, then run demo seed.

## Mission 4 Notes
- Role-based route groups are now active:
  - `/app/admin/*`
  - `/app/barangay/*`
  - `/app/rescuer/*`
  - `/app/household/*`
- `/app` auto-redirects authenticated users to their role dashboard.
- Role-scoped navigation and dashboard placeholders are implemented in the shared shell.
- Details: `docs/mission-4-role-routing-layouts.md`.

## Mission 5 Notes
- Barangay household registry CRUD is now active at `/app/barangay/households`.
- Household detail and family-member CRUD are included in the same workflow view.
- Input validation and normalization are centralized in:
  - `src/features/households/validation.ts`
- Supabase household domain operations are centralized in:
  - `src/services/supabase/households.ts`
- Details: `docs/mission-5-household-registry.md`.

## Mission 6 Notes
- Rescue request workflows are now active in role routes:
  - `/app/household/rescue-requests` (submit + timeline)
  - `/app/barangay/rescue-requests` (barangay queue + status triage)
  - `/app/admin/rescue-requests` (municipality command board + status triage)
- Rescue request validation is centralized in:
  - `src/features/rescueRequests/validation.ts`
- Supabase rescue request operations are centralized in:
  - `src/services/supabase/rescueRequests.ts`
- Realtime refresh is wired through Supabase Postgres changes on `rescue_requests`.
- Details: `docs/mission-6-rescue-requests.md`.

## Mission 7 Notes
- Rescue operations assignment workflow is now active at:
  - `/app/admin/rescue-operations`
- Rescuer mission workflows are now active at:
  - `/app/rescuer/missions` (active assignments + status updates)
  - `/app/rescuer/history` (completed mission history)
- Supabase rescue operations domain operations are centralized in:
  - `src/services/supabase/rescueOperations.ts`
- Assignment status transitions now synchronize rescue request statuses.
- Realtime refresh is wired through Supabase Postgres changes on `rescue_assignments`.
- Details: `docs/mission-7-rescue-operations.md`.

## Mission 8 Notes
- Rescuer live location workflow is now active at:
  - `/app/rescuer/live-location`
- Live location page includes:
  - geolocation watch start/stop controls
  - one-shot location publishing
  - assignment-context tagging for location points
  - realtime movement trail map using Leaflet/OpenStreetMap
- Supabase live location operations are centralized in:
  - `src/services/supabase/liveLocation.ts`
- Realtime refresh is wired through Supabase Postgres changes on `rescuer_locations`.
- Details: `docs/mission-8-live-location.md`.

## Mission 9 Notes
- Barangay evacuee verification is active at `/app/barangay/evacuee-verification`.
- Household QR profile is active at `/app/household/qr-profile`.
- QR generation uses `qrcode`; camera scanning uses `html5-qrcode`.
- Verification logs are written to `qr_verifications`, with duplicate/conflict handling.
- Details: `docs/mission-9-evacuee-verification.md`.

## Mission 10 Notes
- Evacuation center management is active at `/app/admin/evacuation-centers`.
- Household evacuation status is active at `/app/household/evacuation-status`.
- Relief inventory and distribution workflows are active at:
  - `/app/admin/relief`
  - `/app/barangay/relief`
- Details: `docs/mission-10-evacuation-relief.md`.

## Mission 11 Notes
- Reports and analytics are active at:
  - `/app/admin/reports`
  - `/app/barangay/reports`
- Report charts use Recharts and include CSV export.
- Role dashboards now load live Supabase metrics instead of static placeholders.
- Details: `docs/mission-11-reports-analytics.md`.
