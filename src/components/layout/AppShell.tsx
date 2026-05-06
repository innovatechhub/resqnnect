import { Link, NavLink, Outlet } from 'react-router-dom';

import { ROLE_NAV_LINKS } from '../../constants/navigation';
import { ROLE_LABELS } from '../../constants/roles';
import { useAuth } from '../../features/auth/useAuth';
import { cn } from '../../lib/utils';
import { EnvBanner } from '../system/EnvBanner';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Card } from '../ui/card';

export function AppShell() {
  const auth = useAuth();
  const currentRole = auth.role ?? 'household';
  const navLinks = ROLE_NAV_LINKS[currentRole];

  async function handleSignOut() {
    await auth.signOut();
  }

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-10 border-b border-border bg-card/85 backdrop-blur">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
          <Link to="/" className="font-display text-xl font-bold text-foreground">
            ResQnnect
          </Link>
          <div className="flex items-center gap-3">
            <Badge variant="secondary" className="inline-flex items-center gap-2 rounded-full px-3 py-1">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              {ROLE_LABELS[currentRole]}
            </Badge>
            {auth.status === 'authenticated' ? (
              <Button type="button" variant="outline" size="sm" onClick={handleSignOut}>
                Sign Out
              </Button>
            ) : null}
          </div>
        </div>
      </header>

      <EnvBanner />
      {auth.warningMessage ? (
        <div className="border-b border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-900 sm:px-6">
          <div className="mx-auto w-full max-w-7xl">{auth.warningMessage}</div>
        </div>
      ) : null}

      <div className="mx-auto grid w-full max-w-7xl grid-cols-1 gap-4 px-4 py-4 sm:px-6 lg:grid-cols-[260px_1fr]">
        <Card className="h-fit border-border/80 bg-card/90 p-4 shadow-card">
          <p className="mb-4 text-xs uppercase tracking-[0.2em] text-muted-foreground">Role Navigation</p>
          <nav className="space-y-1">
            {navLinks.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  cn(
                    'block rounded-md px-3 py-2 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'text-muted-foreground hover:bg-accent/70 hover:text-accent-foreground',
                  )
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
        </Card>

        <main className="rounded-xl border border-border/80 bg-card/95 p-4 shadow-card sm:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
