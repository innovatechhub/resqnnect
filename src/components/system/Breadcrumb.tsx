import { useLocation, Link } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';

const SEGMENT_LABELS: Record<string, string> = {
  dashboard: 'Dashboard',
  'rescue-requests': 'Rescue Requests',
  'rescue-operations': 'Rescue Operations',
  'evacuation-centers': 'Evacuation Centers',
  households: 'Households',
  'evacuee-verification': 'Evacuee Verification',
  relief: 'Relief Distribution',
  reports: 'Reports',
  'user-access': 'User Access',
  missions: 'Missions',
  'live-location': 'Live Location',
  'live-map': 'Live Map',
  'mission-history': 'Mission History',
  'qr-profile': 'QR Profile',
  'evacuation-status': 'Evacuation Status',
  map: 'Live Map',
};

export function Breadcrumb() {
  const { pathname } = useLocation();
  const segments = pathname.split('/').filter(Boolean);

  if (segments.length < 2) return null;

  const breadcrumbs: Array<{ label: string; path: string }> = [{ label: 'Home', path: '/app' }];

  let currentPath = '';
  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i];
    currentPath += `/${segment}`;

    if (segment === 'app') continue;

    const label = SEGMENT_LABELS[segment] || segment.replace(/-/g, ' ');
    breadcrumbs.push({ label, path: currentPath });
  }

  if (breadcrumbs.length === 1) return null;

  const lastBreadcrumb = breadcrumbs[breadcrumbs.length - 1];
  const parentBreadcrumbs = breadcrumbs.slice(0, -1);

  return (
    <nav className="mb-4 flex items-center gap-1.5 text-sm" aria-label="Breadcrumb">
      {parentBreadcrumbs.map((breadcrumb, index) => (
        <div key={breadcrumb.path} className="flex items-center gap-1.5">
          {index === 0 ? (
            <Link to={breadcrumb.path} className="text-muted-foreground hover:text-foreground transition-colors">
              <Home className="h-4 w-4" />
            </Link>
          ) : (
            <Link to={breadcrumb.path} className="text-muted-foreground hover:text-foreground transition-colors">
              {breadcrumb.label}
            </Link>
          )}
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </div>
      ))}
      <span className="font-medium text-foreground">{lastBreadcrumb.label}</span>
    </nav>
  );
}
