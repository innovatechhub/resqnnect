# ResQnnect Mission 7 Rescue Operations

## Goal
Implement rescue assignment and mission-status workflows for MDRRMO operators and rescuers.

## Scope Delivered
- Admin rescue operations command at `/app/admin/rescue-operations`:
  - assign rescuers to rescue requests
  - update mission status lifecycle
- Rescuer mission queue at `/app/rescuer/missions`:
  - view assigned missions
  - update mission status in field operations
- Rescuer mission history at `/app/rescuer/history`:
  - review closed missions
  - inspect pickup/handover timestamps

## Service Layer
- `src/services/supabase/rescueOperations.ts`
  - `listRescueAssignments`
  - `listRescuerProfiles`
  - `createRescueAssignment`
  - `updateRescueAssignmentStatus`
  - `syncRequestStatusFromMission`
- Includes typed mapping for assignment rows and joined rescue-request summaries.

## Status Synchronization
- Assignment lifecycle updates now map to rescue-request status updates:
  - `queued`/`assigned` -> `assigned`
  - `en_route`/`on_site`/`pickup_complete` -> `in_progress`
  - `handover_complete` -> `rescued`
  - `closed` -> `closed`

## Forms and Validation
- Admin assignment form uses React Hook Form + Zod.
- Validation source:
  - `src/features/rescueOperations/validation.ts`

## Query and Realtime
- TanStack Query handles loading, mutation invalidation, and refresh behavior.
- Supabase realtime listeners are attached to:
  - `rescue_assignments`
  - `rescue_requests` (admin command context)

## Routing
- `src/app/router.tsx` now routes:
  - `/app/admin/rescue-operations` -> `AdminRescueOperationsPage`
  - `/app/rescuer/missions` -> `RescuerMissionsPage`
  - `/app/rescuer/history` -> `RescuerMissionHistoryPage`
