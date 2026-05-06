import { Link } from 'react-router-dom';

import { useAuth } from '../../features/auth/useAuth';
import { cn } from '../../lib/utils';
import { Alert, AlertDescription } from '../ui/alert';
import { buttonVariants } from '../ui/button';

export function EnvBanner() {
  const auth = useAuth();
  if (auth.isConfigured) {
    return null;
  }

  return (
    <div className="border-b border-border px-4 py-3 sm:px-6">
      <div className="mx-auto w-full max-w-7xl">
        <Alert variant="warning" className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <AlertDescription>
            Supabase is not configured yet. Missing: <strong>{auth.missingEnvKeys.join(', ')}</strong>
          </AlertDescription>
          <Link
            to="/login"
            className={cn(
              buttonVariants({ variant: 'outline', size: 'sm' }),
              'border-amber-300 bg-amber-100 text-amber-900 hover:bg-amber-200 hover:text-amber-950',
            )}
          >
            Configure auth settings
          </Link>
        </Alert>
      </div>
    </div>
  );
}
