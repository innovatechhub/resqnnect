# ResQnnect Mission 6 Rescue Requests

## Goal
Implement end-to-end rescue request workflows across household, barangay, and MDRRMO admin routes with role-scoped RLS behavior.

## Scope Delivered
- Household submission workflow at `/app/household/rescue-requests`.
- Household request timeline with status filter and realtime updates.
- Barangay command board at `/app/barangay/rescue-requests`.
- MDRRMO command board at `/app/admin/rescue-requests`.
- Status triage controls for authorized operator roles.

## Validation and Forms
- Rescue request form now uses React Hook Form + Zod.
- Validation coverage includes:
  - emergency type required and length checks
  - severity level range (`1-5`)
  - people count minimum validation
  - coordinate numeric/range validation
  - latitude/longitude pair consistency
  - optional photo URL format checks
  - detailed situation narrative requirement
- Validation source:
  - `src/features/rescueRequests/validation.ts`

## Service Layer
- `src/services/supabase/rescueRequests.ts`
  - `listRescueRequests`
  - `createRescueRequest`
  - `updateRescueRequestStatus`
  - `getCurrentRescueRequesterContext`
- Typed row mapping normalizes numeric and enum-like fields for frontend safety.

## Query and Realtime
- TanStack Query provider is now configured in app bootstrap.
- Rescue-request pages use query caching and mutation invalidation.
- Supabase realtime listeners trigger query invalidation on `rescue_requests` changes.

## Routing
- `src/app/router.tsx` now routes rescue request pages to functional implementations for:
  - admin
  - barangay
  - household
