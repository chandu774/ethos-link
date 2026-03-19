import { ActivityFeed } from "@/components/profile/ActivityFeed";
import type { ProfileActivityItem } from "@/hooks/useProfileInsights";

interface ActivityTabContentProps {
  activity: ProfileActivityItem[];
}

export function ActivityTabContent({ activity }: ActivityTabContentProps) {
  return (
    <section className="space-y-3">
      <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Activity Timeline</h3>
      <ActivityFeed items={activity} />
    </section>
  );
}
