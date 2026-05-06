import { StatCard } from '../components/system/StatCard';
import { SectionHeader } from '../components/system/SectionHeader';
import { Card, CardContent } from '../components/ui/card';

const householdStats = [
  { label: 'Current Request Status', value: '-' },
  { label: 'Household Members', value: '-' },
  { label: 'QR Verification Logs', value: '-' },
  { label: 'Evacuation Center', value: '-' },
];

export function HouseholdDashboardPage() {
  return (
    <section className="space-y-5">
      <SectionHeader
        eyebrow="Household Dashboard"
        title="Resident Rescue and Evacuation View"
        summary="Submit and monitor rescue requests, view household QR profile, and track evacuation updates."
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {householdStats.map((item) => (
          <StatCard key={item.label} label={item.label} value={item.value} />
        ))}
      </div>

      <Card className="border-dashed">
        <CardContent className="p-5 text-sm text-muted-foreground">
          Resident request and QR workflows are planned for Missions 6 and 9.
        </CardContent>
      </Card>
    </section>
  );
}
