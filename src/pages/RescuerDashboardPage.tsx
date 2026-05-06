import { useAuth } from '../features/auth/useAuth';
import { StatCard } from '../components/system/StatCard';
import { SectionHeader } from '../components/system/SectionHeader';
import { Card, CardContent } from '../components/ui/card';

const rescuerStats = [
  { label: 'Assigned Missions', value: '-' },
  { label: 'En Route', value: '-' },
  { label: 'On-Site', value: '-' },
  { label: 'Completed Today', value: '-' },
];

export function RescuerDashboardPage() {
  const auth = useAuth();

  return (
    <section className="space-y-5">
      <SectionHeader
        eyebrow="Rescuer Dashboard"
        title="Field Mission Overview"
        summary="Track assigned missions, status updates, and live location reporting."
      />
      {auth.user?.email ? <p className="text-xs text-muted-foreground">Signed in as {auth.user.email}</p> : null}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {rescuerStats.map((item) => (
          <StatCard key={item.label} label={item.label} value={item.value} />
        ))}
      </div>

      <Card className="border-dashed">
        <CardContent className="p-5 text-sm text-muted-foreground">
          Assignment timelines and live location map tracking are now active in Missions 7 and 8.
        </CardContent>
      </Card>
    </section>
  );
}
