# ResQnnect Mission 3 Data Model and RLS

## Goal
Provide an initial production-oriented Supabase schema and row-level security baseline for core emergency operations modules.

## SQL Files
- `supabase/sql/001_phase3_schema.sql`
  - Creates enums for roles and statuses.
  - Creates normalized domain tables with primary/foreign keys.
  - Adds `created_at`, `updated_at`, `created_by` patterns.
  - Adds indexes for common filtering and joins.
  - Adds `set_updated_at` trigger for mutable tables.
- `supabase/sql/002_phase3_rls.sql`
  - Creates helper functions for current role/barangay/household context.
  - Enables RLS on all domain tables.
  - Adds role-scoped policies for admin, barangay officials, rescuers, and households.
- `supabase/sql/002b_demo_auth_users.sql`
  - Precheck script that validates required demo auth users exist.
  - Does not insert into `auth.users`; create users from Supabase Authentication UI.
- `supabase/sql/003_phase3_demo_seed.sql`
  - Seeds barangays, role-bound profiles, households, members, rescue requests, assignments, and rescuer locations.
  - Uses idempotent upserts for repeatable local/demo setup.

## Core Tables Included
- `roles`, `profiles`, `barangays`
- `households`, `household_members`
- `rescue_requests`, `rescue_assignments`, `rescuer_locations`
- `evacuation_centers`, `evacuee_records`
- `relief_inventory`, `relief_distributions`
- `qr_verifications`, `notifications`, `activity_logs`

## Auth Alignment
- `profiles.id` maps to `auth.users.id`.
- `profiles.role` uses the canonical role set:
  - `mdrrmo_admin`
  - `barangay_official`
  - `rescuer`
  - `household`
- This aligns with the Mission 2 frontend auth/profile resolver.

## Apply Order
1. Run `001_phase3_schema.sql`.
2. Run `002_phase3_rls.sql`.
3. Create demo auth users in Supabase Authentication UI.
4. Run `002b_demo_auth_users.sql` to verify users exist.
5. Run `003_phase3_demo_seed.sql`.
6. Validate with test users per role and confirm policy boundaries.

## Notes
- Policies are a secure baseline and may be tightened per workflow as modules are implemented.
- Some write paths are intentionally scoped to admin/official until feature-specific service layers are added.
