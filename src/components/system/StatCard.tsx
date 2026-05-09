import { type LucideIcon } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Card, CardContent } from '../ui/card';

interface StatCardProps {
  label: string;
  value: string;
  icon?: LucideIcon;
  iconColor?: string;
  iconBg?: string;
  trend?: number;
  trendLabel?: string;
  description?: string;
}

export function StatCard({
  label,
  value,
  icon: Icon,
  iconColor = 'text-blue-600',
  iconBg = 'bg-blue-100',
  trend,
  trendLabel,
  description,
}: StatCardProps) {
  const trendColor = trend && trend > 0 ? 'text-emerald-600' : trend && trend < 0 ? 'text-red-600' : 'text-muted-foreground';
  const trendBg = trend && trend > 0 ? 'bg-emerald-50' : trend && trend < 0 ? 'bg-red-50' : 'bg-muted/30';

  return (
    <Card className="border-border/80 bg-card/95">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1">
            <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">{label}</p>
            <p className="mt-2 text-2xl font-bold text-foreground">{value}</p>
            {description && <p className="mt-1 text-xs text-muted-foreground">{description}</p>}
            {trend !== undefined && (
              <div className={cn('mt-2 inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium', trendBg, trendColor)}>
                <span>{trend > 0 ? '+' : ''}{trend}%</span>
                {trendLabel && <span className="opacity-75">{trendLabel}</span>}
              </div>
            )}
          </div>
          {Icon && (
            <div className={cn('rounded-lg p-2.5', iconBg)}>
              <Icon className={cn('h-5 w-5', iconColor)} />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
