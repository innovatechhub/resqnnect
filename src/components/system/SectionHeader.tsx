interface SectionHeaderProps {
  missionTag?: string;
  eyebrow?: string;
  title: string;
  summary: string;
}

export function SectionHeader({ missionTag, eyebrow, title, summary }: SectionHeaderProps) {
  return (
    <header className="space-y-2">
      {missionTag || eyebrow ? (
        <p className="text-xs uppercase tracking-[0.2em] text-primary">
          {missionTag ? `${missionTag}${eyebrow ? ` • ${eyebrow}` : ''}` : eyebrow}
        </p>
      ) : null}
      <h1 className="font-display text-2xl font-bold text-foreground">{title}</h1>
      <p className="text-sm text-muted-foreground">{summary}</p>
    </header>
  );
}
