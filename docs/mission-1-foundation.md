# ResQnnect Mission 1 Foundation

## Architecture Overview
ResQnnect uses a modular frontend shape to keep emergency workflows maintainable as features expand.

- `app`: app entry, router configuration, and global composition
- `components`: shared UI shells and routing/system helpers
- `pages`: route-level page containers
- `features`: feature modules (to be implemented in later missions)
- `services`: infrastructure clients and data access scaffolding
- `lib`: shared utility and configuration logic
- `types`: cross-cutting domain and interface types
- `constants`: shared enums/statuses/route metadata

### Runtime Stack
- React + Vite + TypeScript
- Tailwind CSS for UI foundation
- React Router for page and module routing
- Supabase client bootstrap guarded by environment checks

## Role-Based Route Map (Mission 1)
- `/` public landing page
- `/login` auth placeholder page
- `/app` guarded shell route (role metadata + guard scaffold)
- `/app/households` Mission 1 home placeholder
- `/app/rescue-requests` placeholder
- `/app/rescue-operations` placeholder
- `/app/evacuation` placeholder
- `/app/relief-distribution` placeholder
- `/unauthorized` unauthorized page
- `*` not-found page

Role vocabulary used in metadata and domain models:
- `mdrrmo_admin` -> MDRRMO Admin
- `barangay_official` -> Barangay Official
- `rescuer` -> Rescuer
- `household` -> Household/Resident

## Initial Normalized Schema Draft
The following schema is a planning draft for Missions 2-5 and beyond:

- `roles`: role master table
- `profiles`: user profile, role, barangay affiliation
- `barangays`: barangay records
- `households`: household registry entries, keyed to barangay
- `household_members`: members tied to household
- `rescue_requests`: emergency requests with lifecycle status and severity
- `rescue_assignments`: assignment and mission tracking
- `rescuer_locations`: realtime location feed storage
- `evacuation_centers`: center metadata, capacity, occupancy
- `evacuee_records`: evacuee check-in and verification data
- `relief_inventory`: stock records
- `relief_distributions`: released aid logs
- `qr_verifications`: QR/manual verification events
- `activity_logs`: audit trail across critical actions

Common columns guideline:
- `id` primary key
- `status` where lifecycle applies
- `created_at`, `updated_at`
- `created_by` for auditable actions

## High-Level RLS Direction
- Enable RLS on all domain tables by default.
- Use `profiles.role` and `profiles.barangay_id` as primary policy inputs.
- Restrict barangay-level records so officials can only access their barangay.
- Allow MDRRMO admin for municipality-wide control paths.
- Restrict rescuer data access to assigned missions and required operational records.
- Allow household/resident access only to own profile, own household, and own requests.
- Keep write policies narrower than read policies for critical status transitions.

## Mission 1 Deliverables
- Vite + TypeScript migration complete
- Tailwind + responsive shell complete
- Route metadata and guard scaffold complete
- Supabase env-safe client bootstrap complete
- Documentation baseline for architecture/schema/RLS complete
