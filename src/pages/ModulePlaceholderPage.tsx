import { SectionHeader } from '../components/system/SectionHeader';
import { Card, CardContent } from '../components/ui/card';

interface ModulePlaceholderPageProps {
  moduleName: string;
  summary?: string;
}

export function ModulePlaceholderPage({ moduleName, summary }: ModulePlaceholderPageProps) {
  return (
    <section className="space-y-3">
      <SectionHeader
        title={moduleName}
        summary={summary ?? 'This module is scaffolded. Functional implementation will follow the mission order.'}
      />
      <Card>
        <CardContent className="p-4 text-sm text-muted-foreground">
          Includes role route grouping, guard enforcement, and shared layout integration.
        </CardContent>
      </Card>
    </section>
  );
}
