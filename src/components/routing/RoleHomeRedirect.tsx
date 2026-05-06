import { Navigate } from 'react-router-dom';

import { getRoleHomePath } from '../../constants/navigation';
import { useAuth } from '../../features/auth/useAuth';
import { Card, CardContent } from '../ui/card';

export function RoleHomeRedirect() {
  const auth = useAuth();

  if (auth.status === 'loading') {
    return (
      <Card className="bg-muted/35">
        <CardContent className="px-4 py-3 text-sm text-muted-foreground">Resolving dashboard route...</CardContent>
      </Card>
    );
  }

  if (auth.status !== 'authenticated' || !auth.role) {
    return <Navigate replace to="/login" />;
  }

  return <Navigate replace to={getRoleHomePath(auth.role)} />;
}
