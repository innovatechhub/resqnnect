import { Link } from 'react-router-dom';

import { buttonVariants } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';

export function NotFoundPage() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10">
      <Card className="w-full max-w-md text-center shadow-card">
        <CardHeader>
          <CardTitle className="font-display text-2xl">Page Not Found</CardTitle>
          <CardDescription>The route you visited is not defined in the current role route map.</CardDescription>
        </CardHeader>
        <CardContent>
          <Link to="/" className={buttonVariants({ variant: 'default' })}>
            Go to Landing
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
