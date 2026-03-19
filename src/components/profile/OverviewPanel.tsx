import { ActivityFeed } from "@/components/profile/ActivityFeed";
import { AssignmentList } from "@/components/profile/AssignmentList";
import { NotesGrid } from "@/components/profile/NotesGrid";
import type { ProfileActivityItem, ProfileAssignmentItem, ProfileNoteItem } from "@/hooks/useProfileInsights";

interface OverviewPanelProps {
  recentActivity: ProfileActivityItem[];
  latestNotes: ProfileNoteItem[];
  recentAssignments: ProfileAssignmentItem[];
}

export function OverviewPanel({ recentActivity, latestNotes, recentAssignments }: OverviewPanelProps) {
  return (
    <div className="space-y-6">
      <section className="space-y-3">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Recent Activity</h3>
        <ActivityFeed items={recentActivity} emptyLabel="No activity yet. Start by uploading a note." />
      </section>

      <section className="space-y-3">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Latest Notes</h3>
        <NotesGrid notes={latestNotes} />
      </section>

      <section className="space-y-3">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Recent Assignments</h3>
        <AssignmentList items={recentAssignments} />
      </section>
    </div>
  );
}
