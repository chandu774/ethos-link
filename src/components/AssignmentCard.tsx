import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDeadline } from "@/lib/collaboration";
import type { CollaborationAssignment } from "@/lib/collaboration";
import { useNavigate } from "react-router-dom";

export function AssignmentCard({
  assignment,
  onSubmit,
}: {
  assignment: CollaborationAssignment;
  onSubmit?: (assignment: CollaborationAssignment) => void;
}) {
  const navigate = useNavigate();

  return (
    <Card
      className="cursor-pointer border-border/60 bg-card/85 transition-transform duration-200 hover:-translate-y-0.5"
      onClick={() => navigate(`/assignments/${assignment.id}`)}
      role="button"
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          navigate(`/assignments/${assignment.id}`);
        }
      }}
    >
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div>
          <CardTitle className="text-base">{assignment.title}</CardTitle>
          <p className="mt-1 text-sm text-muted-foreground">{formatDeadline(assignment.deadline)}</p>
        </div>
        <Badge variant="secondary">Assignment</Badge>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">
          {assignment.description || "No description provided."}
        </p>
        {assignment.attachment_url && (
          <a
            href={assignment.attachment_url}
            target="_blank"
            rel="noreferrer"
            className="block text-sm text-primary underline-offset-4 hover:underline"
            onClick={(event) => event.stopPropagation()}
          >
            {assignment.attachment_name || "Open attachment"}
          </a>
        )}
        {onSubmit && (
          <Button
            size="sm"
            variant="outline"
            onClick={(event) => {
              event.stopPropagation();
              onSubmit(assignment);
            }}
          >
            Submit work
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
