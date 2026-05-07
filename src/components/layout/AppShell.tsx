import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet } from 'react-router-dom';
import {
  BarChart3,
  Boxes,
  Building2,
  ClipboardList,
  History,
  LayoutDashboard,
  MapPinned,
  Menu,
  PackageCheck,
  QrCode,
  ScanLine,
  ShieldPlus,
  Siren,
  Tent,
  UserCog,
  UsersRound,
  X,
  type LucideIcon,
} from 'lucide-react';

import { ROLE_NAV_LINKS } from '../../constants/navigation';
import { ROLE_LABELS } from '../../constants/roles';
import { useAuth } from '../../features/auth/useAuth';
import { cn } from '../../lib/utils';
import brandLogo from '../../assets/logo.png';
import { EnvBanner } from '../system/EnvBanner';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Card } from '../ui/card';

const NAV_ICON_MAP: Record<string, LucideIcon> = {
  'bar-chart-3': BarChart3,
  boxes: Boxes,
  'building-2': Building2,
  'clipboard-list': ClipboardList,
  history: History,
  'layout-dashboard': LayoutDashboard,
  'map-pinned': MapPinned,
  'package-check': PackageCheck,
  'qr-code': QrCode,
  'scan-line': ScanLine,
  'shield-plus': ShieldPlus,
  siren: Siren,
  tent: Tent,
  'user-cog': UserCog,
  'users-round': UsersRound,
};

const NAV_COLLAPSE_STORAGE_KEY = 'resqnnect-nav-collapsed';

export function AppShell() {
  const auth = useAuth();
  const currentRole = auth.role ?? 'household';
  const navLinks = ROLE_NAV_LINKS[currentRole];
  const [isNavCollapsed, setIsNavCollapsed] = useState(false);
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);

  useEffect(() => {
    const storedValue = window.localStorage.getItem(NAV_COLLAPSE_STORAGE_KEY);
    setIsNavCollapsed(storedValue === 'true');
  }, []);

  useEffect(() => {
    window.localStorage.setItem(NAV_COLLAPSE_STORAGE_KEY, String(isNavCollapsed));
  }, [isNavCollapsed]);

  async function handleSignOut() {
    await auth.signOut();
  }

  function toggleNavCollapsed() {
    setIsNavCollapsed((value) => !value);
  }

  function renderNavCard(isMobile: boolean) {
    return (
      <Card
        className={cn(
          'h-fit border-border/80 bg-card/95 shadow-card',
          isNavCollapsed && !isMobile ? 'p-3' : 'p-4',
        )}
      >
        <div className="mb-4 flex items-center justify-between gap-2">
          {!isNavCollapsed || isMobile ? (
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Role Navigation</p>
          ) : (
            <span className="sr-only">Role Navigation</span>
          )}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={isMobile ? () => setIsMobileNavOpen(false) : toggleNavCollapsed}
            title={isMobile ? 'Close navigation' : isNavCollapsed ? 'Expand navigation' : 'Collapse navigation'}
            className="h-8 w-8 text-muted-foreground"
          >
            {isMobile ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </Button>
        </div>
        <nav className="space-y-1">
          {navLinks.map((item) => {
            const Icon = NAV_ICON_MAP[item.icon] ?? LayoutDashboard;

            return (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={() => setIsMobileNavOpen(false)}
                title={isNavCollapsed && !isMobile ? item.label : undefined}
                className={({ isActive }) =>
                  cn(
                    'flex items-center rounded-md text-sm font-medium transition-colors',
                    isNavCollapsed && !isMobile ? 'justify-center px-2 py-2.5' : 'gap-3 px-3 py-2.5',
                    isActive
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'text-muted-foreground hover:bg-accent/70 hover:text-accent-foreground',
                  )
                }
              >
                <Icon className="h-4 w-4 shrink-0" />
                {!isNavCollapsed || isMobile ? <span className="truncate">{item.label}</span> : null}
              </NavLink>
            );
          })}
        </nav>
      </Card>
    );
  }

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 border-b border-border bg-card/85 backdrop-blur">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => setIsMobileNavOpen(true)}
              className="lg:hidden"
              title="Open navigation"
            >
              <Menu className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={toggleNavCollapsed}
              className="hidden lg:inline-flex"
              title={isNavCollapsed ? 'Expand navigation' : 'Collapse navigation'}
            >
              <Menu className="h-4 w-4" />
            </Button>
            <Link to="/" className="flex items-center gap-2">
              <img src={brandLogo} alt="ResQnnect logo" className="h-9 w-auto" />
              <span className="font-display text-xl font-bold text-foreground">ResQnnect</span>
            </Link>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden flex-col items-end sm:flex">
              {auth.profile?.fullName ? (
                <span className="text-sm font-medium text-foreground leading-tight">{auth.profile.fullName}</span>
              ) : null}
              <Badge variant="secondary" className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                {ROLE_LABELS[currentRole]}
              </Badge>
            </div>
            <Badge variant="secondary" className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs sm:hidden">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
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

      {isMobileNavOpen ? (
        <div className="fixed inset-0 z-40 bg-slate-950/35 p-4 lg:hidden" onClick={() => setIsMobileNavOpen(false)}>
          <div className="max-w-[290px]" onClick={(event) => event.stopPropagation()}>
            {renderNavCard(true)}
          </div>
        </div>
      ) : null}

      <div
        className={cn(
          'mx-auto grid w-full max-w-7xl grid-cols-1 gap-4 px-4 py-4 sm:px-6',
          isNavCollapsed ? 'lg:grid-cols-[84px_1fr]' : 'lg:grid-cols-[280px_1fr]',
        )}
      >
        <div className="hidden lg:block">{renderNavCard(false)}</div>

        <main className="rounded-xl border border-border/80 bg-card/95 p-4 shadow-card sm:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
