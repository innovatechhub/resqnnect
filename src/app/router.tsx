import { Navigate, Outlet, createBrowserRouter, type RouteObject } from 'react-router-dom';

import { AppShell } from '../components/layout/AppShell';
import { RoleHomeRedirect } from '../components/routing/RoleHomeRedirect';
import { RouteGuard } from '../components/routing/RouteGuard';
import { APP_ROUTES } from '../constants/routes';
import { BarangayDashboardPage } from '../pages/BarangayDashboardPage';
import { BarangayEvacueeVerificationPage } from '../pages/BarangayEvacueeVerificationPage';
import { AdminRescueOperationsPage } from '../pages/AdminRescueOperationsPage';
import { AdminUserAccessPage } from '../pages/AdminUserAccessPage';
import { EvacuationCentersPage } from '../pages/EvacuationCentersPage';
import { HouseholdDashboardPage } from '../pages/HouseholdDashboardPage';
import { HouseholdEvacuationStatusPage } from '../pages/HouseholdEvacuationStatusPage';
import { HouseholdQrProfilePage } from '../pages/HouseholdQrProfilePage';
import { HouseholdRescueRequestsPage } from '../pages/HouseholdRescueRequestsPage';
import { LoginPage } from '../pages/LoginPage';
import { BarangayHouseholdsPage } from '../pages/BarangayHouseholdsPage';
import { MdrrmoDashboardPage } from '../pages/MdrrmoDashboardPage';
import { NotFoundPage } from '../pages/NotFoundPage';
import { ReliefDistributionPage } from '../pages/ReliefDistributionPage';
import { ReportsPage } from '../pages/ReportsPage';
import { RescueRequestDetailPage } from '../pages/RescueRequestDetailPage';
import { RescuerDashboardPage } from '../pages/RescuerDashboardPage';
import { RescuerLiveLocationPage } from '../pages/RescuerLiveLocationPage';
import { RescuerMissionHistoryPage, RescuerMissionsPage } from '../pages/RescuerMissionsPages';
import { AdminRescueRequestsPage, BarangayRescueRequestsPage } from '../pages/RescueRequestsCommandPages';
import { UnauthorizedPage } from '../pages/UnauthorizedPage';

const appChildren: RouteObject[] = [
  {
    index: true,
    element: <RoleHomeRedirect />,
  },
  {
    path: 'admin',
    element: (
      <RouteGuard meta={APP_ROUTES.ADMIN_ROOT.meta}>
        <Outlet />
      </RouteGuard>
    ),
    children: [
      {
        index: true,
        element: <Navigate replace to="dashboard" />,
      },
      {
        path: 'dashboard',
        element: <MdrrmoDashboardPage />,
      },
      {
        path: 'rescue-requests',
        element: <AdminRescueRequestsPage />,
      },
      {
        path: 'rescue-requests/:requestId',
        element: <RescueRequestDetailPage />,
      },
      {
        path: 'rescue-operations',
        element: <AdminRescueOperationsPage />,
      },
      {
        path: 'evacuation-centers',
        element: <EvacuationCentersPage />,
      },
      {
        path: 'user-access',
        element: <AdminUserAccessPage />,
      },
      {
        path: 'relief',
        element: <ReliefDistributionPage />,
      },
      {
        path: 'reports',
        element: <ReportsPage scope="admin" />,
      },
    ],
  },
  {
    path: 'barangay',
    element: (
      <RouteGuard meta={APP_ROUTES.BARANGAY_ROOT.meta}>
        <Outlet />
      </RouteGuard>
    ),
    children: [
      {
        index: true,
        element: <Navigate replace to="dashboard" />,
      },
      {
        path: 'dashboard',
        element: <BarangayDashboardPage />,
      },
      {
        path: 'households',
        element: <BarangayHouseholdsPage />,
      },
      {
        path: 'rescue-requests',
        element: <BarangayRescueRequestsPage />,
      },
      {
        path: 'rescue-requests/:requestId',
        element: <RescueRequestDetailPage />,
      },
      {
        path: 'evacuee-verification',
        element: <BarangayEvacueeVerificationPage />,
      },
      {
        path: 'relief',
        element: <ReliefDistributionPage />,
      },
      {
        path: 'reports',
        element: <ReportsPage scope="barangay" />,
      },
    ],
  },
  {
    path: 'rescuer',
    element: (
      <RouteGuard meta={APP_ROUTES.RESCUER_ROOT.meta}>
        <Outlet />
      </RouteGuard>
    ),
    children: [
      {
        index: true,
        element: <Navigate replace to="dashboard" />,
      },
      {
        path: 'dashboard',
        element: <RescuerDashboardPage />,
      },
      {
        path: 'missions',
        element: <RescuerMissionsPage />,
      },
      {
        path: 'live-location',
        element: <RescuerLiveLocationPage />,
      },
      {
        path: 'history',
        element: <RescuerMissionHistoryPage />,
      },
    ],
  },
  {
    path: 'household',
    element: (
      <RouteGuard meta={APP_ROUTES.HOUSEHOLD_ROOT.meta}>
        <Outlet />
      </RouteGuard>
    ),
    children: [
      {
        index: true,
        element: <Navigate replace to="dashboard" />,
      },
      {
        path: 'dashboard',
        element: <HouseholdDashboardPage />,
      },
      {
        path: 'rescue-requests',
        element: <HouseholdRescueRequestsPage />,
      },
      {
        path: 'rescue-requests/:requestId',
        element: <RescueRequestDetailPage />,
      },
      {
        path: 'qr-profile',
        element: <HouseholdQrProfilePage />,
      },
      {
        path: 'evacuation-status',
        element: <HouseholdEvacuationStatusPage />,
      },
    ],
  },
  {
    path: 'households',
    element: <RoleHomeRedirect />,
  },
  {
    path: 'rescue-requests',
    element: <RoleHomeRedirect />,
  },
  {
    path: 'rescue-operations',
    element: <RoleHomeRedirect />,
  },
  {
    path: 'evacuation',
    element: <RoleHomeRedirect />,
  },
  {
    path: 'relief-distribution',
    element: <RoleHomeRedirect />,
  },
];

export const appRouter = createBrowserRouter([
  {
    path: '/',
    element: <Navigate replace to="/login" />,
  },
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/app',
    element: (
      <RouteGuard meta={APP_ROUTES.APP_ROOT.meta}>
        <AppShell />
      </RouteGuard>
    ),
    children: appChildren,
  },
  {
    path: '/unauthorized',
    element: <UnauthorizedPage />,
  },
  {
    path: '*',
    element: <NotFoundPage />,
  },
]);
