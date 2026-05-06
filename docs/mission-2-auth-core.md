# ResQnnect Mission 2 Auth Core

## Goal
Implement Supabase auth/session bootstrapping, profile-role resolution, and protected route behavior for the Mission 1 scaffold.

## What Was Added
- `AuthProvider` global state with:
  - session bootstrap from `supabase.auth.getSession()`
  - `onAuthStateChange` subscription
  - `signInWithPassword`, `signOut`, and `refreshAuth` actions
- `useAuth` hook for role-aware app state access.
- `RouteGuard` updated to enforce:
  - loading state while resolving auth
  - redirect to `/login` when unauthenticated/unavailable/error
  - role-based redirects to `/unauthorized`
- `LoginPage` upgraded from placeholder to working auth form.
- `AppShell` and pages now read role/user data from auth context.

## Profile Loading Strategy
1. Query `profiles` table by authenticated user ID.
2. If query succeeds, use the `profiles.role`.
3. If profile is missing or query fails, fallback to auth metadata role.
4. If metadata role is missing/invalid, fallback to `household`.
5. Expose warnings in UI when fallback logic is used.

## Safety Defaults
- Missing env keys keep auth in `unavailable` state.
- No client-only bypass to protected routes.
- Auth errors and missing configuration are surfaced in UI for explicit operator feedback.
