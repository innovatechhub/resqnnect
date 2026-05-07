import type { ReactNode } from 'react';
import { Badge } from '../ui/badge';

interface SectionHeaderProps {
  eyebrow?: string;
  missionTag?: string;
  title: string;
  summary: string;
  actions?: ReactNode;
}

export function SectionHeader({ eyebrow, missionTag, title, summary, actions }: SectionHeaderProps) {
  return (
    <header className="flex flex-wrap items-start justify-between gap-3">
      <div className="space-y-1.5">
        <div className="flex flex-wrap items-center gap-2">
          {eyebrow ? (
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">{eyebrow}</p>
          ) : null}
          {missionTag ? (
            <Badge variant="secondary" className="rounded-full px-2 py-0.5 text-xs">
              {missionTag}
            </Badge>
          ) : null}
        </div>
        <h1 className="font-display text-2xl font-bold text-foreground">{title}</h1>
        <p className="text-sm text-muted-foreground">{summary}</p>
      </div>
      {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
    </header>
  );
}
