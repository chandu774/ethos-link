import { CalendarClock, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { CollaborationAssignment } from "@/lib/collaboration";
import { formatDeadline } from "@/lib/collaboration";

interface AssignmentCardProps {
  assignment: CollaborationAssignment;
}

export function AssignmentCard({ assignment }: AssignmentCardProps) {
  return (
    <Card className="relative overflow-hidden border-primary/30 bg-gradient-to-br from-primary/15 via-card/90 to-card/70 p-5 shadow-lg transition-all duration-300 hover:shadow-xl">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary/90 to-cyan-400/70" />
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="truncate text-lg font-semibold text-foreground">{assignment.title}</p>
          <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
            {assignment.description || "No assignment description."}
          </p>
        </div>
        <div className="rounded-xl bg-background/60 p-2 text-primary">
          <FileText className="h-4 w-4" />
        </div>
      </div>
      <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
        <CalendarClock className="h-3.5 w-3.5" />
        Due {formatDeadline(assignment.deadline)}
      </div>
      <div className="mt-5 flex flex-wrap gap-2">
        <Button asChild size="sm">
          <a href="/assignments">Open Assignments</a>
        </Button>
        {assignment.attachment_url ? (
          <Button asChild size="sm" variant="outline">
            <a href={assignment.attachment_url} target="_blank" rel="noreferrer">
              View Attachment
            </a>
          </Button>
        ) : null}
      </div>
    </Card>
  );
}

