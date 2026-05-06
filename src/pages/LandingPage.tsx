import { Link } from 'react-router-dom';

import { cn } from '../lib/utils';
import { buttonVariants } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';

export function LandingPage() {
  return (
    <div className="landing-bg min-h-screen px-4 py-10 sm:px-6">
      <Card className="mx-auto w-full max-w-4xl border-border/70 bg-card/90 shadow-card backdrop-blur">
        <CardHeader className="space-y-3">
          <p className="inline-flex w-fit rounded-full border border-primary/25 bg-primary/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.16em] text-primary">
            Barbaza Emergency Platform
          </p>
          <CardTitle className="font-display text-3xl leading-tight sm:text-4xl">
            ResQnnect Mission 4 Role Routing
          </CardTitle>
          <CardDescription className="max-w-2xl text-sm sm:text-base">
            Role-based route groups, dashboard shells, and Supabase-backed authentication flow are ready for feature modules.
          </CardDescription>
        </CardHeader>

        <CardContent className="flex flex-wrap gap-3">
          <Link
            to="/app"
            className={buttonVariants({ variant: 'default' })}
          >
            Open Role Dashboard
          </Link>
          <Link
            to="/login"
            className={cn(buttonVariants({ variant: 'outline' }))}
          >
            Open Sign In
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
