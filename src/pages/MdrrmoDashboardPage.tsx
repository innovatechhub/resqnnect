import { StatCard } from '../components/system/StatCard';
import { SectionHeader } from '../components/system/SectionHeader';
import { Card, CardContent } from '../components/ui/card';

const adminStats = [
  { label: 'Active Rescue Requests', value: '-' },
  { label: 'Assigned Missions', value: '-' },
  { label: 'Open Evacuation Centers', value: '-' },
  { label: 'Barangays Reporting', value: '-' },
];

export function MdrrmoDashboardPage() {
  return (
    <section className="space-y-5">
      <SectionHeader
        eyebrow="MDRRMO Dashboard"
        title="Municipality Operations Overview"
        summary="Consolidated view for rescue coordination, evacuation monitoring, and relief oversight."
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {adminStats.map((item) => (
          <StatCard key={item.label} label={item.label} value={item.value} />
        ))}
      </div>

      <Card className="border-dashed">
        <CardContent className="p-5 text-sm text-muted-foreground">
          Municipality-level dashboards, reports, and assignment controls will be implemented in Missions 6-11.
        </CardContent>
      </Card>
    </section>
  );
}
