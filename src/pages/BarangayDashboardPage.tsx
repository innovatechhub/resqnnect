import { StatCard } from '../components/system/StatCard';
import { SectionHeader } from '../components/system/SectionHeader';
import { Card, CardContent } from '../components/ui/card';

const barangayStats = [
  { label: 'Registered Households', value: '-' },
  { label: 'Pending Verifications', value: '-' },
  { label: 'Open Rescue Requests', value: '-' },
  { label: 'Relief Queue', value: '-' },
];

export function BarangayDashboardPage() {
  return (
    <section className="space-y-5">
      <SectionHeader
        eyebrow="Barangay Dashboard"
        title="Barangay Operations Panel"
        summary="Household management, verification workflow, and local rescue request monitoring."
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {barangayStats.map((item) => (
          <StatCard key={item.label} label={item.label} value={item.value} />
        ))}
      </div>

      <Card className="border-dashed">
        <CardContent className="p-5 text-sm text-muted-foreground">
          Barangay CRUD and verification flows will be connected in Missions 5, 6, and 9.
        </CardContent>
      </Card>
    </section>
  );
}
