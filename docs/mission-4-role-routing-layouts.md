# ResQnnect Mission 4 Route Protection and Layouts

## Goal
Implement role-based route groups with dedicated dashboards and enforce role access boundaries using the existing auth state.

## Route Group Structure
- `/app` -> authenticated role-home redirect
- `/app/admin/*` -> `mdrrmo_admin` only
- `/app/barangay/*` -> `barangay_official` only
- `/app/rescuer/*` -> `rescuer` only
- `/app/household/*` -> `household` only

## Dashboards Added
- MDRRMO Admin dashboard
- Barangay Official dashboard
- Rescuer dashboard
- Household/Resident dashboard

Each role group has an index redirect to its dashboard and placeholder module routes for upcoming missions.

## Access Control Behavior
- `/app` guarded for authenticated users.
- Nested role groups are guarded with strict `allowedRoles`.
- Unauthorized role access redirects to `/unauthorized`.
- Loading and unavailable auth states are handled before protected route rendering.

## Layout Reuse
- A single shared shell (`AppShell`) is reused across all role groups.
- Sidebar navigation is role-aware and driven by a role-to-links map.
- Header shows resolved role and supports sign out.
