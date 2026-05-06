import { Navigate, Outlet, createBrowserRouter, type RouteObject } from 'react-router-dom';

import { AppShell } from '../components/layout/AppShell';
import { RoleHomeRedirect } from '../components/routing/RoleHomeRedirect';
import { RouteGuard } from '../components/routing/RouteGuard';
import { APP_ROUTES } from '../constants/routes';
import { BarangayDashboardPage } from '../pages/BarangayDashboardPage';
import { AdminRescueOperationsPage } from '../pages/AdminRescueOperationsPage';
import { HouseholdDashboardPage } from '../pages/HouseholdDashboardPage';
import { HouseholdRescueRequestsPage } from '../pages/HouseholdRescueRequestsPage';
import { LandingPage } from '../pages/LandingPage';
import { LoginPage } from '../pages/LoginPage';
import { BarangayHouseholdsPage } from '../pages/BarangayHouseholdsPage';
import { MdrrmoDashboardPage } from '../pages/MdrrmoDashboardPage';
import { ModulePlaceholderPage } from '../pages/ModulePlaceholderPage';
import { NotFoundPage } from '../pages/NotFoundPage';
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
        path: 'rescue-operations',
        element: <AdminRescueOperationsPage />,
      },
      {
        path: 'evacuation-centers',
        element: (
          <ModulePlaceholderPage
            moduleName="Evacuation Centers Monitor"
            summary="Capacity, occupancy, and center availability across the municipality."
          />
        ),
      },
      {
        path: 'relief',
        element: (
          <ModulePlaceholderPage
            moduleName="Relief Oversight"
            summary="Municipality-wide relief inventory oversight and distribution audit."
          />
        ),
      },
      {
        path: 'reports',
        element: (
          <ModulePlaceholderPage
            moduleName="Operations Reports"
            summary="Consolidated analytics and export workflows for MDRRMO leadership."
          />
        ),
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
        path: 'evacuee-verification',
        element: (
          <ModulePlaceholderPage
            moduleName="Evacuee Verification"
            summary="QR and manual verification queue for evacuee intake validation."
          />
        ),
      },
      {
        path: 'relief',
        element: (
          <ModulePlaceholderPage
            moduleName="Relief Distribution"
            summary="Barangay-level release logging and beneficiary verification workflow."
          />
        ),
      },
      {
        path: 'reports',
        element: (
          <ModulePlaceholderPage
            moduleName="Barangay Reports"
            summary="Filtered operational reports for barangay planning and accountability."
          />
        ),
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
        path: 'qr-profile',
        element: (
          <ModulePlaceholderPage
            moduleName="Household QR Profile"
            summary="Resident QR identifier and verification history summary."
          />
        ),
      },
      {
        path: 'evacuation-status',
        element: (
          <ModulePlaceholderPage
            moduleName="Evacuation Status"
            summary="Current center assignment, occupancy context, and family status."
          />
        ),
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
    element: <LandingPage />,
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
