import { Link } from 'react-router-dom';
import { type LucideIcon } from 'lucide-react';
import { Button } from '../ui/button';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: {
    label: string;
    to: string;
  };
}

export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-border/50 bg-muted/20 px-4 py-12 text-center">
      <div className="rounded-lg bg-muted/40 p-3 mb-4">
        <Icon className="h-6 w-6 text-muted-foreground" />
      </div>
      <h3 className="font-semibold text-foreground">{title}</h3>
      {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      {action && (
        <Link to={action.to}>
          <Button variant="outline" size="sm" className="mt-4">
            {action.label}
          </Button>
        </Link>
      )}
    </div>
  );
}
