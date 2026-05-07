import type { AppRouteDefinition } from '../types/routing';

export const APP_ROUTES = {
  LOGIN: {
    path: '/login',
    meta: {
      title: 'Sign In',
    },
  },
  APP_ROOT: {
    path: '/app',
    meta: {
      title: 'Operations Hub',
      requiresAuth: true,
      allowedRoles: ['mdrrmo_admin', 'barangay_official', 'rescuer', 'household'],
    },
  },
  ADMIN_ROOT: {
    path: '/app/admin',
    meta: {
      title: 'MDRRMO Admin',
      requiresAuth: true,
      allowedRoles: ['mdrrmo_admin'],
    },
  },
  BARANGAY_ROOT: {
    path: '/app/barangay',
    meta: {
      title: 'Barangay Official',
      requiresAuth: true,
      allowedRoles: ['barangay_official'],
    },
  },
  RESCUER_ROOT: {
    path: '/app/rescuer',
    meta: {
      title: 'Rescuer',
      requiresAuth: true,
      allowedRoles: ['rescuer'],
    },
  },
  HOUSEHOLD_ROOT: {
    path: '/app/household',
    meta: {
      title: 'Household/Resident',
      requiresAuth: true,
      allowedRoles: ['household'],
    },
  },
  UNAUTHORIZED: {
    path: '/unauthorized',
    meta: {
      title: 'Unauthorized',
    },
  },
} as const satisfies Record<string, AppRouteDefinition>;
