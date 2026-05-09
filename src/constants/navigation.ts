import type { UserRole } from '../types/auth';

export interface NavLinkItem {
  icon: string;
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
    { to: '/app/admin/dashboard', label: 'Dashboard', icon: 'layout-dashboard' },
    { to: '/app/admin/rescue-requests', label: 'Rescue Requests', icon: 'siren' },
    { to: '/app/admin/rescue-operations', label: 'Rescue Operations', icon: 'shield-plus' },
    { to: '/app/admin/live-map', label: 'Live Map', icon: 'map-pinned' },
    { to: '/app/admin/evacuation-centers', label: 'Evacuation Centers', icon: 'building-2' },
    { to: '/app/admin/user-access', label: 'User Access', icon: 'user-cog' },
    { to: '/app/admin/relief', label: 'Relief Oversight', icon: 'boxes' },
    { to: '/app/admin/reports', label: 'Reports', icon: 'bar-chart-3' },
  ],
  barangay_official: [
    { to: '/app/barangay/dashboard', label: 'Dashboard', icon: 'layout-dashboard' },
    { to: '/app/barangay/households', label: 'Households', icon: 'users-round' },
    { to: '/app/barangay/rescue-requests', label: 'Rescue Requests', icon: 'siren' },
    { to: '/app/barangay/live-map', label: 'Live Map', icon: 'map-pinned' },
    { to: '/app/barangay/evacuee-verification', label: 'Evacuee Verification', icon: 'scan-line' },
    { to: '/app/barangay/relief', label: 'Relief Distribution', icon: 'package-check' },
    { to: '/app/barangay/reports', label: 'Barangay Reports', icon: 'bar-chart-3' },
  ],
  rescuer: [
    { to: '/app/rescuer/dashboard', label: 'Dashboard', icon: 'layout-dashboard' },
    { to: '/app/rescuer/missions', label: 'Assigned Missions', icon: 'clipboard-list' },
    { to: '/app/rescuer/live-location', label: 'Live Location', icon: 'map-pinned' },
    { to: '/app/rescuer/history', label: 'Mission History', icon: 'history' },
  ],
  household: [
    { to: '/app/household/dashboard', label: 'Dashboard', icon: 'layout-dashboard' },
    { to: '/app/household/rescue-requests', label: 'Rescue Requests', icon: 'siren' },
    { to: '/app/household/qr-profile', label: 'QR Profile', icon: 'qr-code' },
    { to: '/app/household/evacuation-status', label: 'Evacuation Status', icon: 'tent' },
  ],
};

export function getRoleHomePath(role: UserRole): string {
  return ROLE_HOME_PATHS[role];
}
