# ResQnnect Mission 10 Evacuation Centers and Relief

## Goal
Implement evacuation center capacity monitoring, household evacuation status, relief inventory, and distribution logs.

## Scope Delivered
- Evacuation center management at `/app/admin/evacuation-centers`.
- Center capacity and occupancy board with status controls.
- Evacuee check-out records for active center assignments.
- Household evacuation status at `/app/household/evacuation-status`.
- Relief inventory and release workflow at `/app/admin/relief` and `/app/barangay/relief`.
- Inventory decrements when relief is distributed.
- Low-stock/depleted status is derived from remaining quantity and reorder level.

## Service Layer
- `src/services/supabase/evacuation.ts`
  - `listEvacuationCenters`
  - `createEvacuationCenter`
  - `updateEvacuationCenter`
  - `listEvacueeRecords`
  - `checkInEvacuee`
  - `updateEvacueeStatus`
- `src/services/supabase/relief.ts`
  - `listReliefInventory`
  - `createReliefInventory`
  - `updateReliefInventory`
  - `listReliefDistributions`
  - `createReliefDistribution`

## Data Model Alignment
Uses the Mission 3 tables:
- `evacuation_centers`
- `evacuee_records`
- `relief_inventory`
- `relief_distributions`
