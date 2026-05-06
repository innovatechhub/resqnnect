import { Navigate, useLocation } from 'react-router-dom';
import type { PropsWithChildren } from 'react';

import { Card, CardContent } from '../ui/card';
import { useAuth } from '../../features/auth/useAuth';
import type { AppRouteMeta } from '../../types/routing';

interface RouteGuardProps {
  meta: AppRouteMeta;
}

export function RouteGuard({ children, meta }: PropsWithChildren<RouteGuardProps>) {
  const auth = useAuth();
  const location = useLocation();

  if (!meta.requiresAuth) {
    return <>{children}</>;
  }

  if (auth.status === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <Card className="shadow-card">
          <CardContent className="px-5 py-4 text-sm text-muted-foreground">Resolving your session...</CardContent>
        </Card>
      </div>
    );
  }

  if (auth.status === 'unavailable') {
    return <Navigate replace to="/login" state={{ from: location.pathname }} />;
  }

  if (auth.status === 'error') {
    return <Navigate replace to="/login" state={{ from: location.pathname }} />;
  }

  if (auth.status !== 'authenticated') {
    return <Navigate replace to="/login" state={{ from: location.pathname }} />;
  }

  if (!auth.role) {
    return <Navigate replace to="/unauthorized" />;
  }

  if (meta.allowedRoles && !meta.allowedRoles.includes(auth.role)) {
    return <Navigate replace to="/unauthorized" />;
  }

  return <>{children}</>;
}
