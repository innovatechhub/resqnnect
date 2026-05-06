import { Link } from 'react-router-dom';

import { ROLE_LABELS } from '../constants/roles';
import { useAuth } from '../features/auth/useAuth';
import { buttonVariants } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';

export function UnauthorizedPage() {
  const auth = useAuth();
  const roleLabel = auth.role ? ROLE_LABELS[auth.role] : 'Unknown role';

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10">
      <Card className="w-full max-w-md border-destructive/35 text-center shadow-card">
        <CardHeader>
          <CardTitle className="font-display text-2xl text-destructive">Unauthorized Access</CardTitle>
          <CardDescription>Your current role cannot access this route.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="mb-5 text-xs text-muted-foreground">Resolved role: {roleLabel}</p>
          <Link to="/app" className={buttonVariants({ variant: 'secondary' })}>
            Return to Dashboard
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
