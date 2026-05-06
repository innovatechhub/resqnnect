import type { UserRole } from '../types/auth';

export interface NavLinkItem {
  to: string;
  label: string;
}

export const ROLE_HOME_PATHS: Record<UserRole, string> = {
  mdrrmo_admin: '/app/admin/dashboard',
  barangay_official: '/app/barangay/dashboard',
  rescuer: '/app/rescuer/dashboard',
  household: '/app/household/dashboard',
};

export const ROLE_NAV_LINKS: Record<UserRole, readonly NavLinkItem[]> = {
  mdrrmo_admin: [
    { to: '/app/admin/dashboard', label: 'Dashboard' },
    { to: '/app/admin/rescue-requests', label: 'Rescue Requests' },
    { to: '/app/admin/rescue-operations', label: 'Rescue Operations' },
    { to: '/app/admin/evacuation-centers', label: 'Evacuation Centers' },
    { to: '/app/admin/relief', label: 'Relief Oversight' },
    { to: '/app/admin/reports', label: 'Reports' },
  ],
  barangay_official: [
    { to: '/app/barangay/dashboard', label: 'Dashboard' },
    { to: '/app/barangay/households', label: 'Households' },
    { to: '/app/barangay/rescue-requests', label: 'Rescue Requests' },
    { to: '/app/barangay/evacuee-verification', label: 'Evacuee Verification' },
    { to: '/app/barangay/relief', label: 'Relief Distribution' },
    { to: '/app/barangay/reports', label: 'Barangay Reports' },
  ],
  rescuer: [
    { to: '/app/rescuer/dashboard', label: 'Dashboard' },
    { to: '/app/rescuer/missions', label: 'Assigned Missions' },
    { to: '/app/rescuer/live-location', label: 'Live Location' },
    { to: '/app/rescuer/history', label: 'Mission History' },
  ],
  household: [
    { to: '/app/household/dashboard', label: 'Dashboard' },
    { to: '/app/household/rescue-requests', label: 'Rescue Requests' },
    { to: '/app/household/qr-profile', label: 'QR Profile' },
    { to: '/app/household/evacuation-status', label: 'Evacuation Status' },
  ],
};

export function getRoleHomePath(role: UserRole): string {
  return ROLE_HOME_PATHS[role];
}
