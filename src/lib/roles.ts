import type { UserRole } from '../types/auth';

const USER_ROLES: UserRole[] = ['mdrrmo_admin', 'barangay_official', 'rescuer', 'household'];

export function parseUserRole(value: unknown): UserRole | null {
  if (typeof value !== 'string') {
    return null;
  }

  return USER_ROLES.includes(value as UserRole) ? (value as UserRole) : null;
}
