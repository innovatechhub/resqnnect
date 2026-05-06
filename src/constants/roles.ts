import type { UserRole } from '../types/auth';

export const ROLE_LABELS: Record<UserRole, string> = {
  mdrrmo_admin: 'MDRRMO Admin',
  barangay_official: 'Barangay Official',
  rescuer: 'Rescuer',
  household: 'Household/Resident',
};
