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
  Moon,
  PackageCheck,
  QrCode,
  ScanLine,
  ShieldPlus,
  Siren,
  Sun,
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
import { ToastContainer } from '../ui/toast';
import { Breadcrumb } from '../system/Breadcrumb';
import { NotificationBell } from '../system/NotificationBell';
import { CommandPalette } from '../system/CommandPalette';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';

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
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    const storedValue = window.localStorage.getItem(NAV_COLLAPSE_STORAGE_KEY);
    setIsNavCollapsed(storedValue === 'true');

    const storedDarkMode = window.localStorage.getItem('resqnnect-dark-mode') === 'true';
    setIsDarkMode(storedDarkMode);
    if (storedDarkMode) {
      document.documentElement.classList.add('dark');
    }
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

  function toggleDarkMode() {
    const newDarkMode = !isDarkMode;
    setIsDarkMode(newDarkMode);
    window.localStorage.setItem('resqnnect-dark-mode', String(newDarkMode));
    if (newDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }

  function renderNavCard(isMobile: boolean) {
    return (
      <aside
        className={cn(
          isMobile
            ? 'h-fit rounded-xl border border-border/80 bg-card/95 p-4 shadow-card'
            : 'h-full border-r border-border bg-card',
          !isMobile && (isNavCollapsed ? 'p-3' : 'p-4'),
        )}
      >
        <div
          className={cn(
            'mb-4 flex items-center gap-2',
            isNavCollapsed && !isMobile ? 'justify-center' : 'justify-between',
          )}
        >
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
                    'flex w-full items-center rounded-md text-sm font-medium transition-colors',
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
      </aside>
    );
  }

  return (
    <div className="min-h-screen">
      <ToastContainer />
      {auth.status === 'authenticated' && <CommandPalette />}
      <header className="sticky top-0 z-30 border-b border-border bg-card/85 backdrop-blur">
        <div className="flex w-full items-center justify-between gap-3 px-4 py-3 sm:px-6">
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
            {auth.status === 'authenticated' && <NotificationBell />}
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={toggleDarkMode}
              title={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {isDarkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
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
          <div className="w-full">{auth.warningMessage}</div>
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
          'grid w-full grid-cols-1 pb-16 lg:pb-0 lg:min-h-[calc(100vh-73px)]',
          isNavCollapsed ? 'lg:grid-cols-[84px_1fr]' : 'lg:grid-cols-[260px_1fr]',
        )}
      >
        <div className="hidden lg:block">{renderNavCard(false)}</div>

        <main className="bg-card p-4 sm:p-6">
          <Breadcrumb />
          <Outlet />
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-30 border-t border-border bg-card/95 backdrop-blur lg:hidden">
        <div className="flex items-center justify-around px-2 py-1">
          {navLinks.slice(0, 4).map((item) => {
            const Icon = NAV_ICON_MAP[item.icon] ?? LayoutDashboard;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  cn(
                    'flex flex-col items-center gap-0.5 rounded-lg px-3 py-2 text-xs font-medium transition-colors min-w-[60px]',
                    isActive
                      ? 'text-primary'
                      : 'text-muted-foreground hover:text-foreground',
                  )
                }
              >
                <Icon className="h-5 w-5" />
                <span className="truncate text-[10px]">{item.label.split(' ')[0]}</span>
              </NavLink>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
