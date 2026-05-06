# ResQnnect Mission 5 Household Registry

## Goal
Implement barangay-scoped Household Registry CRUD with form validation and a reusable service layer.

## Scope Delivered
- Barangay household list with live Supabase loading states.
- Household create, update, and delete flows.
- Household detail view with linked family-member management.
- Family-member create, update, and delete flows.

## Validation Coverage
- Household form:
  - required address
  - optional household/QR code length checks
  - latitude/longitude numeric parsing and range validation
  - coordinate-pair consistency checks
- Household member form:
  - required full name
  - relationship length check
  - birth date format/future-date checks
  - sex enum validation
  - vulnerability notes required when member is marked vulnerable

## Service Layer
- `src/services/supabase/households.ts`
  - `listHouseholds`
  - `createHousehold`
  - `updateHousehold`
  - `deleteHousehold`
  - `listHouseholdMembers`
  - `createHouseholdMember`
  - `updateHouseholdMember`
  - `deleteHouseholdMember`

All functions use typed row mapping and rely on existing RLS for barangay scoping.

## Routing
- `/app/barangay/households` now uses `BarangayHouseholdsPage` instead of a placeholder.
- Existing role guard behavior remains unchanged.
