import { Card, CardContent } from '../ui/card';

interface StatCardProps {
  label: string;
  value: string;
}

export function StatCard({ label, value }: StatCardProps) {
  return (
    <Card className="border-border/80 bg-card/95">
      <CardContent className="p-4">
        <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">{label}</p>
        <p className="mt-2 text-2xl font-bold text-foreground">{value}</p>
      </CardContent>
    </Card>
  );
}
