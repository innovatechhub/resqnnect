import type { UserRole } from './auth';

export interface AppRouteMeta {
  title: string;
  requiresAuth?: boolean;
  allowedRoles?: readonly UserRole[];
}

export interface AppRouteDefinition {
  path: string;
  meta: AppRouteMeta;
}
