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
  const isEmpty = recentActivity.length === 0 && latestNotes.length === 0 && recentAssignments.length === 0;

  return (
    <div className="space-y-6">
      {isEmpty ? (
        <section className="rounded-3xl border border-dashed border-border/60 bg-gradient-to-br from-card/85 to-background/70 p-8 text-center shadow-sm">
          <div className="mx-auto max-w-md">
            <h3 className="text-lg font-semibold text-foreground">Your profile will fill out as you use the app</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Join a group, upload a note, or submit an assignment and your recent activity will start showing up here.
            </p>
          </div>
        </section>
      ) : null}
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
